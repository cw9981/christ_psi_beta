/**
 * Christ PSI System - GAS Backend
 * --------------------------------------------------
 * Purpose: API for PSI Management System
 * Updated: To match `gas_setup.md` with separated Forecast and Actual columns.
 */

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action;

    if (!action) {
      return makeResponse({ status: 'error', message: 'Missing parameter: action' });
    }

    // A. Fetch Context (7 Months: Prev + 6 Forecast)
    if (action === 'getPSIContext') {
      return fetchContext(params);
    }
    
    // B. Fetch Yearly History
    if (action === 'getPSIHistory') {
      return fetchHistory(params);
    }

    return makeResponse({ status: 'error', message: 'Invalid Action: ' + action });
  } catch (error) {
    return makeResponse({ status: 'error', message: 'System Error: ' + error.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) { 
      return makeResponse({ status: 'error', message: 'Server Busy: Please try again later.' });
    }

    if (!e.postData || !e.postData.contents) {
      return makeResponse({ status: 'error', message: 'Empty POST body' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // C. Save PSI Data
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
 * Returns data for: Previous Month (index -1) + Next 6 Months (index 0 to 5)
 */
function fetchContext(params) {
  const client = params.client || '';
  const modelSpec = params.model_spec || '';
  const startMonth = params.startMonth || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM");
  
  // 1. Calculate 7 months range
  const monthsToFetch = []; 
  const startParts = startMonth.split("-");
  const baseDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, 1);
  
  for (let i = -1; i <= 5; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    monthsToFetch.push(Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM"));
  }

  // 2. Identify involved years
  const requiredYears = [...new Set(monthsToFetch.map(m => m.split('-')[0]))];
  
  // 3. Batch Read
  const rawRows = [];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  requiredYears.forEach(year => {
    const sheet = ss.getSheetByName(year);
    if (!sheet) return; 

    const values = sheet.getDataRange().getValues();
    // Header Skip
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const rowDate = formatDateSafe(row[2]);
      
      if (!monthsToFetch.includes(rowDate)) continue;
      if (client && row[0] !== client) continue;
      if (modelSpec && row[1] !== modelSpec) continue;

      // Map Columns: D(3)=F_P, E(4)=F_S, F(5)=F_I, G(6)=A_P, H(7)=A_S, I(8)=A_I
      rawRows.push({
        client: row[0],
        model_spec: row[1],
        date_month: rowDate,
        forecast_p: Number(row[3]) || 0,
        forecast_s: Number(row[4]) || 0,
        forecast_i: Number(row[5]) || 0,
        actual_p: Number(row[6]) || 0,
        actual_s: Number(row[7]) || 0,
        actual_i: Number(row[8]) || 0,
        last_updated: row[9]
      });
    }
  });

  // 4. Group
  const groupedHelper = {};
  
  rawRows.forEach(item => {
    const key = item.client + '||' + item.model_spec;
    if (!groupedHelper[key]) {
      groupedHelper[key] = { client: item.client, model_spec: item.model_spec, rows: [],_updated: null };
    }
    groupedHelper[key].rows.push(item);
  });

  // 5. Build Response
  const responseData = Object.keys(groupedHelper).map(key => {
    const group = groupedHelper[key];
    const groupRows = group.rows;
    
    // A. Previous Month Data (Context)
    const prevMonthStr = monthsToFetch[0]; 
    const prevRow = groupRows.find(r => r.date_month === prevMonthStr);
    
    // SKILL.md Spec: "prev_item" containing all 6 fields
    const prevItem = {
        date_month: prevMonthStr,
        forecast_p: prevRow ? prevRow.forecast_p : 0,
        forecast_s: prevRow ? prevRow.forecast_s : 0,
        forecast_i: prevRow ? prevRow.forecast_i : 0,
        actual_p: prevRow ? prevRow.actual_p : 0,
        actual_s: prevRow ? prevRow.actual_s : 0,
        actual_i: prevRow ? prevRow.actual_i : 0
    };

    // B. Forecast Items (Current + 5 Months)
    const forecastItems = [];
    for (let i = 1; i < monthsToFetch.length; i++) {
      const mStr = monthsToFetch[i];
      const found = groupRows.find(r => r.date_month === mStr);
      if (found) {
        forecastItems.push({
          date_month: mStr,
          forecast_p: found.forecast_p,
          forecast_s: found.forecast_s,
          forecast_i: found.forecast_i,
          actual_p: found.actual_p,
          actual_s: found.actual_s,
          actual_i: found.actual_i
        });
      } else {
        forecastItems.push({
          date_month: mStr,
          forecast_p: 0, forecast_s: 0, forecast_i: 0,
          actual_p: 0, actual_s: 0, actual_i: 0
        });
      }
    }

    return {
      client: group.client,
      model_spec: group.model_spec,
      last_updated: group.last_updated,
      prev_item: prevItem, 
      forecast_items: forecastItems
    };
  });

  return makeResponse({ status: 'success', data: responseData });
}

/**
 * ------------------------------------------------------------------
 * Implementation: fetchHistory
 * ------------------------------------------------------------------
 */
function fetchHistory(params) {
  const client = params.client;
  const modelSpec = params.model_spec;
  const year = String(params.year); 

  if (!year) return makeResponse({ status: 'error', message: 'Missing year parameter' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(year);

  if (!sheet) return makeResponse({ status: 'success', history: [] });

  const values = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if ((!client || row[0] === client) && (!modelSpec || row[1] === modelSpec)) {
      results.push({
        date_month: formatDateSafe(row[2]),
        forecast_p: Number(row[3]) || 0,
        forecast_s: Number(row[4]) || 0,
        forecast_i: Number(row[5]) || 0,
        actual_p: Number(row[6]) || 0,
        actual_s: Number(row[7]) || 0,
        actual_i: Number(row[8]) || 0
      });
    }
  }

  results.sort((a, b) => a.date_month.localeCompare(b.date_month));
  return makeResponse({ status: 'success', history: results });
}

/**
 * ------------------------------------------------------------------
 * Implementation: savePSIData
 * ------------------------------------------------------------------
 */
function savePSIData(payload) {
  const rows = payload.psi;
  if (!rows || !Array.isArray(rows)) {
    return makeResponse({ status: 'error', message: 'Invalid data: expected "psi" array' });
  }

  const rowsByYear = {};
  rows.forEach(row => {
    if (!row.date_month) return;
    const y = row.date_month.split('-')[0];
    if (!rowsByYear[y]) rowsByYear[y] = [];
    rowsByYear[y].push(row);
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();

  Object.keys(rowsByYear).forEach(year => {
    let sheet = ss.getSheetByName(year);
    if (!sheet) {
      sheet = ss.insertSheet(year);
      // Header: client, model, date, f_p, f_s, f_i, a_p, a_s, a_i, updated
      sheet.appendRow([
        'client', 'model_spec', 'date_month', 
        'forecast_p', 'forecast_s', 'forecast_i', 
        'actual_p', 'actual_s', 'actual_i', 
        'last_updated'
      ]);
    }

    const yearRows = rowsByYear[year];
    const range = sheet.getDataRange();
    const values = range.getValues(); 
    
    // Index Map: "client_model_date" -> rowIndex
    const indexMap = new Map();
    for (let r = 1; r < values.length; r++) {
      const key = `${values[r][0]}_${values[r][1]}_${formatDateSafe(values[r][2])}`;
      indexMap.set(key, r);
    }

    yearRows.forEach(item => {
      // Inputs might be explicitly forecast_ or actual_ or mixed?
      // The API payload structure is:
      // { forecast_p, forecast_s, forecast_i, actual_p, actual_s, actual_i }
      // We assume incoming payload respects this structure.
      
      const d = item.date_month;
      const client = item.client;
      const model = item.model_spec;

      if (!client || !model || !d) return; 

      const key = `${client}_${model}_${d}`;
      
      // Determine values to write
      // Note: If payload doesn't send a field, we might overwrite with 0 or undefined?
      // It's safer if payload sends everything for that row, OR we merge.
      // But for simplicity/PSI logic: usually we save the whole state of that month.
      // IF we are saving "Previous Month" context, payload might only have Actuals.
      // IF we are saving "Forecast", payload might only have Forecasts.
      // We should probably read existing if we want partial updates, but for now let's assume valid payloads or defaults.
      
      // However, to be safe, if we are overwriting a row, let's keep existing values if input is undefined? 
      // No, `Number(undefined) || 0` results in 0. We'd overwrite with 0.
      // This is OK for PSI usually as we calculate the whole row on frontend.
      
      let rowData;
      if (indexMap.has(key)) {
        // Update existing row
        rowData = values[indexMap.get(key)];
      } else {
        // New row structure (init with 0s)
        rowData = [client, model, d, 0, 0, 0, 0, 0, 0, now];
      }
      
      // Update fields if present in payload (using hasOwnProperty or undefined check)
      if (item.forecast_p !== undefined) rowData[3] = Number(item.forecast_p);
      if (item.forecast_s !== undefined) rowData[4] = Number(item.forecast_s);
      if (item.forecast_i !== undefined) rowData[5] = Number(item.forecast_i);
      
      if (item.actual_p !== undefined) rowData[6] = Number(item.actual_p);
      if (item.actual_s !== undefined) rowData[7] = Number(item.actual_s);
      if (item.actual_i !== undefined) rowData[8] = Number(item.actual_i);
      
      rowData[9] = now;
      
      if (indexMap.has(key)) {
        // Updated in place (reference to values array row)
      } else {
         values.push(rowData);
         indexMap.set(key, values.length - 1);
      }
    });

    if (values.length > 0) {
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    }
  });

  return makeResponse({ status: 'success', message: 'Data saved successfully.' });
}

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
