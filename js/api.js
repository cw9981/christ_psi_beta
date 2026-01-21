/**
 * Christ PSI System - API Layer
 * Adheres to: google-sheets-connector skill
 */

const API_CONFIG = {
    GAS_URL: '', // Replace with actual GAS URL
    USE_MOCK: true
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
 */
window.fetchProducts = async function () {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            return [
                { id: '1', client: 'SUPERBOND', model_spec: 'D3450_250mm×100M', initialInventory: 120, monthsData: [] },
                { id: '2', client: 'HUAQIN', model_spec: 'NP605_400mm×100M', initialInventory: 50, monthsData: [] },
                { id: '3', client: 'AVARY', model_spec: 'T4000_1020mm×50M', initialInventory: 300, monthsData: [] },
            ];
        }

        const response = await fetch(API_CONFIG.GAS_URL + "?action=getProducts");
        if (!response.ok) throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);
        const data = await response.json();
        return data.products || [];
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

        const url = `${API_CONFIG.GAS_URL}?action=getContext&client=${encodeURIComponent(client)}&model_spec=${encodeURIComponent(model_spec)}&startMonth=${startMonth}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);

        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        return data.months || [];
    } catch (e) {
        alert('載入資料失敗: ' + e.message);
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

        const url = `${API_CONFIG.GAS_URL}?action=getHistory&client=${encodeURIComponent(client)}&model_spec=${encodeURIComponent(model_spec)}&year=${year}`;
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
            await new Promise(r => setTimeout(r, 600));
            return { status: 'success' };
        }

        const response = await fetch(API_CONFIG.GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'saveData',
                client: product.client,
                model_spec: product.model_spec,
                rows: product.monthsData
            })
        });

        if (!response.ok) throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        return data;
    } catch (e) {
        alert('資料儲存失敗: ' + e.message);
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
