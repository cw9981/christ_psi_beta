/**
 * Christ PSI System - GAS Backend
 * --------------------------------------------------
 * Updated with robust error handling, locking, and batch processing.
 * Follows strict implementation rules from SKILL.md.
 */

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action;

    if (!action) {
      return makeResponse({ status: 'error', message: 'Missing parameter: action' });
    }

    // A. 取得 7 個月 PSI 上下文
    if (action === 'getPSIContext') {
      return fetchContext(params);
    }
    
    // B. 取得年度歷史
    if (action === 'getPSIHistory') {
      return fetchHistory(params);
    }

    return makeResponse({ status: 'error', message: 'Invalid Action: ' + action });
  } catch (error) {
    return makeResponse({ status: 'error', message: 'System Error: ' + error.toString() });
  }
}

function doPost(e) {
  // 1. Mandatory Locking (Global for POST)
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) { // Wait up to 30 seconds
      return makeResponse({ status: 'error', message: 'Server Busy: Please try again later.' });
    }

    if (!e.postData || !e.postData.contents) {
      return makeResponse({ status: 'error', message: 'Empty POST body' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // C. 儲存 PSI 資料
    if (action === 'savePSI') {
      return savePSIData(payload);
    }

    return makeResponse({ status: 'error', message: 'Invalid Action: ' + action });
  } catch (error) {
    return makeResponse({ status: 'error', message: 'System Error: ' + error.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * ------------------------------------------------------------------
 * Implementation: fetchContext
 * ------------------------------------------------------------------
 * Specification:
 * - Read 7 months: Previous Month (Context) + Current ~ Future 5 Months (Forecast)
 * - Cross-year support
 * - Structured response grouped by Client + Model
 */
function fetchContext(params) {
  const client = params.client || '';
  const modelSpec = params.model_spec || '';
  // Default startMonth is current month
  const startMonth = params.startMonth || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM");
  
  // 1. Calculate the 7 months range
  const monthsToFetch = []; // Array of 'YYYY-MM'
  const startParts = startMonth.split("-");
  // Set date to 1st of startMonth
  const baseDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, 1);
  
  // Range: i = -1 (Prev) to 5 (Future 5), total 7
  for (let i = -1; i <= 5; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    monthsToFetch.push(Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM"));
  }

  // 2. Identify involved years
  const requiredYears = [...new Set(monthsToFetch.map(m => m.split('-')[0]))];
  
  // 3. Batch Read Data
  const rawRows = [];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  requiredYears.forEach(year => {
    const sheet = ss.getSheetByName(year);
    if (!sheet) return; // Ignore missing years (treat as empty)

    const values = sheet.getDataRange().getValues();
    // Skip header (Assuming row 1 is header)
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      // row: [0]client, [1]model, [2]date_month, [3]p, [4]s, [5]i, [6]updated
      const rowDate = formatDateSafe(row[2]);
      
      // Filter by Month Range
      if (!monthsToFetch.includes(rowDate)) continue;

      // Filter by Client / Model (if provided)
      if (client && row[0] !== client) continue;
      if (modelSpec && row[1] !== modelSpec) continue;

      rawRows.push({
        client: row[0],
        model_spec: row[1],
        date_month: rowDate,
        p_value: Number(row[3]) || 0,
        s_value: Number(row[4]) || 0,
        i_value: Number(row[5]) || 0,
        last_updated: row[6]
      });
    }
  });

  // 4. Group by Client + Model
  const groupedHelper = {};
  
  rawRows.forEach(item => {
    const key = item.client + '||' + item.model_spec;
    if (!groupedHelper[key]) {
      groupedHelper[key] = {
        client: item.client,
        model_spec: item.model_spec,
        rows: [],
        last_updated: null
      };
    }
    groupedHelper[key].rows.push(item);
    
    // Update max last_updated
    const itemTime = item.last_updated ? new Date(item.last_updated).getTime() : 0;
    const currTime = groupedHelper[key].last_updated ? new Date(groupedHelper[key].last_updated).getTime() : 0;
    if (itemTime > currTime) {
      groupedHelper[key].last_updated = item.last_updated;
    }
  });

  // 5. Build Final Response Structure
  const responseData = Object.keys(groupedHelper).map(key => {
    const group = groupedHelper[key];
    const groupRows = group.rows;
    
    // Extract Previous Month (Context)
    // The previous month is index 0 in monthsToFetch
    const prevMonthStr = monthsToFetch[0];
    const prevRow = groupRows.find(r => r.date_month === prevMonthStr);
    const iStock = prevRow ? prevRow.i_value : 0;

    // Extract Forecast Items (Current + 5 Months)
    // Indexes 1 to 6 in monthsToFetch
    const forecastItems = [];
    for (let i = 1; i < monthsToFetch.length; i++) {
      const mStr = monthsToFetch[i];
      const found = groupRows.find(r => r.date_month === mStr);
      if (found) {
        forecastItems.push({
          date_month: mStr,
          p_value: found.p_value,
          s_value: found.s_value,
          i_value: found.i_value
        });
      } else {
        // Fill missing months with 0
        forecastItems.push({
          date_month: mStr,
          p_value: 0,
          s_value: 0,
          i_value: 0 // Logic: Should we simulate I? No, just raw data.
        });
      }
    }

    return {
      client: group.client,
      model_spec: group.model_spec,
      last_updated: group.last_updated,
      i_stock: iStock,
      forecast_items: forecastItems
    };
  });

  return makeResponse({ status: 'success', data: responseData });
}

/**
 * ------------------------------------------------------------------
 * Implementation: fetchHistory
 * ------------------------------------------------------------------
 * Specification:
 * - Fetch specific year
 * - Robust error handling for missing sheet
 * - Correct date formatting
 */
function fetchHistory(params) {
  const client = params.client;
  const modelSpec = params.model_spec;
  const year = String(params.year); // Ensure string

  if (!year) {
    return makeResponse({ status: 'error', message: 'Missing year parameter' });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(year);

  if (!sheet) {
    // Return empty success if sheet doesn't exist
    return makeResponse({ status: 'success', history: [] });
  }

  const values = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // Filter
    if ((!client || row[0] === client) && (!modelSpec || row[1] === modelSpec)) {
      results.push({
        date_month: formatDateSafe(row[2]),
        p_value: Number(row[3]) || 0,
        s_value: Number(row[4]) || 0,
        i_value: Number(row[5]) || 0,
        last_updated: row[6]
      });
    }
  }

  // Sort by date string
  results.sort((a, b) => a.date_month.localeCompare(b.date_month));

  return makeResponse({ status: 'success', history: results });
}

/**
 * ------------------------------------------------------------------
 * Implementation: savePSIData
 * ------------------------------------------------------------------
 * Specification:
 * - Group by Year
 * - Read Once, Modify In-Memory, Write Once (Batch)
 * - Auto-create missing sheets
 * - Locked context (handled in doPost)
 */
function savePSIData(payload) {
  // New Specification: payload.psi is an array of objects
  // Each object has { client, model_spec, date_month, p_value, s_value, i_value }
  const rows = payload.psi;

  if (!rows || !Array.isArray(rows)) {
    return makeResponse({ status: 'error', message: 'Invalid data: expected "psi" array' });
  }

  // 1. Group rows by Year
  const rowsByYear = {};
  rows.forEach(row => {
    if (!row.date_month) return;
    const y = row.date_month.split('-')[0];
    if (!rowsByYear[y]) rowsByYear[y] = [];
    rowsByYear[y].push(row);
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();

  // 2. Process each year
  Object.keys(rowsByYear).forEach(year => {
    let sheet = ss.getSheetByName(year);
    if (!sheet) {
      sheet = ss.insertSheet(year);
      sheet.appendRow(['client', 'model_spec', 'date_month', 'p_value', 's_value', 'i_value', 'last_updated']);
    }

    const yearRows = rowsByYear[year];
    
    // Read ALL data
    const range = sheet.getDataRange();
    const values = range.getValues(); // 2D array
    
    // Build Index Map: "client_model_date" -> rowIndex
    // Skip header (row 0)
    const indexMap = new Map();
    for (let r = 1; r < values.length; r++) {
      const key = `${values[r][0]}_${values[r][1]}_${formatDateSafe(values[r][2])}`;
      indexMap.set(key, r);
    }

    // Apply updates or inserts
    yearRows.forEach(item => {
      // Must ensure item values are safe numbers
      const p = Number(item.p_value) || 0;
      const s = Number(item.s_value) || 0;
      const i = Number(item.i_value) || 0;
      const d = item.date_month;
      const client = item.client;
      const model = item.model_spec;

      if (!client || !model || !d) return; // Skip invalid items

      const key = `${client}_${model}_${d}`;
      
      if (indexMap.has(key)) {
        // Update existing row
        const rIndex = indexMap.get(key);
        // values[rIndex] structure: [client, model, date, p, s, i, last_updated]
        values[rIndex][3] = p;
        values[rIndex][4] = s;
        values[rIndex][5] = i;
        values[rIndex][6] = now;
      } else {
        // Insert new row
        const newRow = [client, model, d, p, s, i, now];
        values.push(newRow);
        // Update map
        indexMap.set(key, values.length - 1);
      }
    });

    // Write BACK the entire dataset (Write Once)
    if (values.length > 0) {
      // If we added rows, values.length > original range height
      // We must set the range to the new size
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    }
  });

  return makeResponse({ status: 'success', message: 'Data saved successfully.' });
}

/**
 * Helper: Format Date safely
 * Handles Date objects (GAS behavior) or strings
 */
function formatDateSafe(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  return String(val);
}

function makeResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ------------------------------------------------------------------
 * Verification Functions (Internal Test)
 * ------------------------------------------------------------------
 */

function test_savePSI_Flow() {
  const mockPayload = {
    action: 'savePSI',
    psi: [
      { client: 'TEST_CLIENT', model_spec: 'TEST_MODEL', date_month: '2025-12', p_value: 10, s_value: 5, i_value: 100 },
      { client: 'TEST_CLIENT', model_spec: 'TEST_MODEL', date_month: '2026-01', p_value: 20, s_value: 10, i_value: 110 }
    ]
  };
  
  // Simulate POST event object
  const e = {
    postData: {
      contents: JSON.stringify(mockPayload)
    }
  };
  
  const result = doPost(e);
  Logger.log(result.getContent());
}

function test_getContext_CrossYear() {
  // Assume we have data in 2025 and 2026 from previous test
  const params = {
    action: 'getPSIContext',
    client: 'TEST_CLIENT',
    model_spec: 'TEST_MODEL',
    startMonth: '2026-01'
  };
  
  // Should fetch Dec 2025 (stock) + Jan 2026 ~ Jun 2026
  const data = fetchContext(params);
  Logger.log(data.getContent());
}
