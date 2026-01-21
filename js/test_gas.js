/**
 * Christ PSI - GAS Implementation & Test API
 * This file serves as:
 * 1. Documentation for the GAS side implementation.
 * 2. Mock API for local testing of the advanced Year-by-Year structure.
 */

/* --- GAS SIDE CODE (Conceptual) --- */

/**
 * // Google Apps Script - Code.gs
 * 
 * function doGet(e) {
 *   const action = e.parameter.action;
 *   if (action === 'getContext') {
 *     return fetchContext(e.parameter.client, e.parameter.model_spec, e.parameter.startMonth);
 *   }
 *   if (action === 'getHistory') {
 *     return fetchHistory(e.parameter.client, e.parameter.model_spec, e.parameter.year);
 *   }
 * }
 * 
 * function doPost(e) {
 *   const payload = JSON.parse(e.postData.contents);
 *   if (payload.action === 'saveData') {
 *     return saveData(payload);
 *   }
 * }
 */


/* --- FRONTEND MOCK API --- */

/**
 * Fetch 7 Months (Spanning Years)
 */
window.fetchContextPSI_Mock = async function (client, model_spec, startMonth) {
    console.log(`[Mock GAS] FetchContext for ${client} from ${startMonth}`);
    await new Promise(r => setTimeout(r, 600));

    const months = [];
    let [y, m] = startMonth.split('-').map(Number);
    for (let i = 0; i < 7; i++) {
        const dateStr = `${y}-${String(m).padStart(2, '0')}`;
        months.push({
            date_month: dateStr,
            p_value: Math.floor(Math.random() * 200),
            s_value: Math.floor(Math.random() * 150),
            i_value: 0,
            last_updated: new Date().toISOString()
        });
        m++; if (m > 12) { m = 1; y++; }
    }
    return months;
};

/**
 * Fetch Full Year History
 */
window.fetchYearlyHistory_Mock = async function (client, model_spec, year) {
    console.log(`[Mock GAS] FetchHistory for ${client} in year ${year}`);
    await new Promise(r => setTimeout(r, 600));

    const results = [];
    for (let m = 1; m <= 12; m++) {
        results.push({
            date_month: `${year}-${String(m).padStart(2, '0')}`,
            p_value: Math.floor(Math.random() * 500),
            s_value: Math.floor(Math.random() * 400),
            i_value: Math.floor(Math.random() * 1000),
            last_updated: "2026-01-21 15:30"
        });
    }
    return results;
};
