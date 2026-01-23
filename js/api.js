/**
 * Christ PSI System - API Layer
 * Updated: Supports Forecast vs Actual columns.
 */

const API_CONFIG = {
    // Replace with your actual deployed GAS Web App URL
    GAS_URL: 'https://script.google.com/macros/s/AKfycbw8EunSENH8YfMKzhfrzx5j5WvkjExglIWE-kzBrhHohXPtcykz0Q6s6o1uBfRPwad4/exec',
    USE_MOCK: false
};

// --- API Functions ---

window.fetchModelSpecs = async function () {
    try {
        const res = await fetch('./data/products.json?v=' + Date.now());
        return await res.json();
    } catch (e) {
        return [];
    }
};

window.fetchClients = async function () {
    try {
        const res = await fetch('./data/client.json?v=' + Date.now());
        return await res.json();
    } catch (e) {
        return [];
    }
};

/**
 * Fetch Home List (Active Products)
 */
window.fetchProducts = async function () {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            return [
                { id: '1', client: 'MOCK', model_spec: 'DEMO', initialInventory: 100, monthsData: Array(6).fill({ p: 0, s: 0, i: 0 }) }
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
            // Use prev_item's Actual I value as current inventory start
            initialInventory: (r.prev_item && r.prev_item.actual_i) || 0,
            // Map full Context Data for Detail View
            contextData: r.prev_item ? {
                date_month: r.prev_item.date_month,
                actual_p: r.prev_item.actual_p || 0,
                actual_s: r.prev_item.actual_s || 0,
                actual_i: r.prev_item.actual_i || 0,
                forecast_p: r.prev_item.forecast_p || 0,
                forecast_s: r.prev_item.forecast_s || 0,
                forecast_i: r.prev_item.forecast_i || 0
            } : null,
            monthsData: r.forecast_items.map(f => ({
                date_month: f.date_month, // Keep date_month for reference
                p: f.forecast_p,
                s: f.forecast_s,
                i: f.forecast_i
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
 * Fetch 7 Months of PSI Data
 */
window.fetchContextPSI = async function (client, model_spec, startMonth) {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            return null; // Mock handled in calling logic if needed or enhance here
        }

        let url = `${API_CONFIG.GAS_URL}?action=getPSIContext&client=${encodeURIComponent(client)}&model_spec=${encodeURIComponent(model_spec)}`;
        if (startMonth) {
            url += `&startMonth=${startMonth}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const json = await response.json();

        if (json.status === 'error') throw new Error(json.message);

        const records = json.data || [];
        if (records.length === 0) return null;
        return records[0];

    } catch (e) {
        alert('Data Load Failed: ' + e.message);
        return null;
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
        const url = `${API_CONFIG.GAS_URL}?action=getPSIHistory&client=${encodeURIComponent(client)}&model_spec=${encodeURIComponent(model_spec)}&year=${year}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        return data.history || [];
    } catch (e) {
        alert('History Load Failed: ' + e.message);
        return [];
    } finally {
        this.showLoading(false);
    }
};

/**
 * Save PSI Data
 * UPDATED: Uses forecast_*, actual_* fields
 */
window.saveProductData = async function (product) {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            await new Promise(r => setTimeout(500));
            return { status: 'success' };
        }

        // Create a single flat array of 7 PSI objects (1 Context + 6 Forecast)
        const psiPayload = [];

        // 1. Context Month (Index 0)
        if (product.contextData) {
            psiPayload.push({
                client: product.client,
                model_spec: product.model_spec,
                date_month: product.contextData.date_month,
                forecast_p: product.contextData.forecast_p || 0,
                forecast_s: product.contextData.forecast_s || 0,
                forecast_i: product.contextData.forecast_i || 0,
                actual_p: product.contextData.actual_p || 0,
                actual_s: product.contextData.actual_s || 0,
                actual_i: product.contextData.actual_i || 0
            });
        }

        // 2. Forecast Months (Index 1-6)
        product.monthsData.forEach(m => {
            psiPayload.push({
                client: product.client,
                model_spec: product.model_spec,
                date_month: m.date_month,
                forecast_p: m.p || 0,
                forecast_s: m.s || 0,
                forecast_i: m.i || 0,
                actual_p: 0, // Actuals are for the past
                actual_s: 0,
                actual_i: 0
            });
        });

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
