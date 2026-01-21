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

window.fetchProducts = async function () {
    this.showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            // Simulated Active Products
            return [
                { id: '1', client: 'SUPERBOND', model_spec: 'D3450_250mm×100M', initialInventory: 120, monthsData: [] },
                { id: '2', client: 'HUAQIN', model_spec: 'NP605_400mm×100M', initialInventory: 50, monthsData: [] },
                { id: '3', client: 'AVARY', model_spec: 'T4000_1020mm×50M', initialInventory: 300, monthsData: [] },
            ];
        }
        // Real GAS call code here...
        return [];
    } finally {
        this.showLoading(false);
    }
};

window.saveProductData = async function (product) {
    this.showLoading(true);
    console.log("Saving product data:", product);
    await new Promise(r => setTimeout(r, 600)); // Mock delay
    this.showLoading(false);
};

window.showLoading = function (show) {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
};
