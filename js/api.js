/**
 * Christ PSI System - API Layer
 * Adheres to: google-sheets-connector skill
 */

const API_CONFIG = {
    GAS_URL: 'https://script.google.com/macros/s/AKfycbw8EunSENH8YfMKzhfrzx5j5WvkjExglIWE-kzBrhHohXPtcykz0Q6s6o1uBfRPwad4/exec',
    USE_MOCK: false
};

// --- API Functions ---

window.fetchModelSpecs = async function () {
    try {
        const res = await fetch('./data/products.json?v=' + Date.now());
        return await res.json();
    } catch (e) {
        console.error("fetchModelSpecs error:", e);
        return [];
    }
};

window.fetchClients = async function () {
    try {
        const res = await fetch('./data/client.json?v=' + Date.now());
        return await res.json();
    } catch (e) {
        console.error("fetchClients error:", e);
        return [];
    }
};

/**
 * Fetch Home List (Active Products)
 * Consumes getPSIContext to get 7-month data (Previous + 6 Forecast)
 */
window.fetchProducts = async function () {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            // Mock data structure tailored for new logic
            return [
                { id: '1', client: 'SUPERBOND', model_spec: 'D3450_250mm×100M', initialInventory: 120, monthsData: Array(6).fill({ p: 0, s: 0, i: 0 }) },
                { id: '2', client: 'HUAQIN', model_spec: 'NP605_400mm×100M', initialInventory: 50, monthsData: Array(6).fill({ p: 0, s: 0, i: 0 }) },
                { id: '3', client: 'AVARY', model_spec: 'T4000_1020mm×50M', initialInventory: 300, monthsData: Array(6).fill({ p: 0, s: 0, i: 0 }) },
            ];
        }

        const response = await fetch(API_CONFIG.GAS_URL + "?action=getPSIContext");
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const json = await response.json();
        if (json.status === 'error') throw new Error(json.message);

        const records = json.data || [];

        return records.map(r => ({
            id: `${r.client}_${r.model_spec}`,
            client: r.client,
            model_spec: r.model_spec,
            initialInventory: r.i_stock || 0,
            monthsData: r.forecast_items.map(f => ({
                date_month: f.date_month, // Keep date_month for reference
                p: f.p_value,
                s: f.s_value,
                i: f.i_value
            }))
        }));

    } catch (e) {
        console.error("fetchProducts error:", e);
        return [];
    } finally {
        this.showLoading(false);
    }
};

/**
 * Fetch 7 Months of PSI Data (Spanning Years)
 */
window.fetchContextPSI = async function (client, model_spec, startMonth) {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK && window.fetchContextPSI_Mock) {
            return await window.fetchContextPSI_Mock(client, model_spec, startMonth);
        }

        // New API takes startMonth, defaults to current if empty.
        // It returns { data: [ResultObject] } where ResultObject has { i_stock, forecast_items }
        let url = `${API_CONFIG.GAS_URL}?action=getPSIContext&client=${encodeURIComponent(client)}&model_spec=${encodeURIComponent(model_spec)}`;
        if (startMonth) {
            url += `&startMonth=${startMonth}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const json = await response.json();
        if (json.status === 'error') throw new Error(json.message);

        const records = json.data || [];
        if (records.length === 0) return [];

        // Return the full record object so consumers can access i_stock (Initial Inventory)
        // Record structure: { client, model_spec, last_updated, i_stock, forecast_items }
        return records[0];

    } catch (e) {
        alert('Data Load Failed: ' + e.message);
        console.error(e);
        return [];
    } finally {
        this.showLoading(false);
    }
};

/**
 * Fetch Full Year History
 */
window.fetchYearlyHistory = async function (client, model_spec, year) {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK && window.fetchYearlyHistory_Mock) {
            return await window.fetchYearlyHistory_Mock(client, model_spec, year);
        }

        const url = `${API_CONFIG.GAS_URL}?action=getPSIHistory&client=${encodeURIComponent(client)}&model_spec=${encodeURIComponent(model_spec)}&year=${year}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);

        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        return data.history || [];
    } catch (e) {
        alert('載入歷史失敗: ' + e.message);
        console.error(e);
        return [];
    } finally {
        this.showLoading(false);
    }
};

window.saveProductData = async function (product) {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            console.log("Mock Save:", product);
            await new Promise(r => setTimeout(600));
            return { status: 'success' };
        }

        // Map product.monthsData back to rows for GAS
        // Format: { date_month, p_value, s_value, i_value }
        // monthsData in product has p, s, i, date? (Wait, fetchProducts maps date_month -> date_month, detail.js maps it to 'date' or keeps it?)
        // In fetchProducts I kept date_month. In detail.js it maps to 'date' but might lose date_month if not careful.
        // Let's check detail.js render again.
        // detail.js uses `m.date`? No, it uses `getFutureMonths` for labels. 
        // But `product.monthsData` needs to store the date string for saving!

        // We must ensure product.monthsData has `date_month`.
        // The fetchProducts mapping: `date_month: f.date_month`.
        // So we are good.

        const psiPayload = product.monthsData.map(m => ({
            client: product.client,
            model_spec: product.model_spec,
            date_month: m.date_month,
            p_value: m.p,
            s_value: m.s,
            i_value: m.i
        }));

        // Insert Previous Month Context (Initial Inventory)
        if (psiPayload.length > 0) {
            // Calculate previous month from the first forecast month
            const firstDateStr = psiPayload[0].date_month; // YYYY-MM
            const [y, m] = firstDateStr.split('-').map(Number);
            // JS Date month is 0-indexed, so m-1. Previous month is m-2.
            const d = new Date(y, m - 2, 1);
            const prevMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            psiPayload.unshift({
                client: product.client,
                model_spec: product.model_spec,
                date_month: prevMonthStr,
                p_value: 0,
                s_value: 0,
                i_value: product.initialInventory || 0
            });
        }

        const response = await fetch(API_CONFIG.GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'savePSI',
                psi: psiPayload
            })
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        return data;
    } catch (e) {
        alert('Save Failed: ' + e.message);
        console.error(e);
        return { status: 'error', message: e.message };
    } finally {
        this.showLoading(false);
    }
};

window.showLoading = function (show) {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
};
