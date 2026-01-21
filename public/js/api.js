/**
 * API Layer for Christ PSI System
 * Skill: google-sheets-connector
 */

const API_CONFIG = {
    // Replace with actual GAS URL when available
    GAS_URL: '',
    USE_MOCK: true // Set to false when GAS_URL is ready
};

/**
 * Show or hide the global loading indicator
 * @param {boolean} show 
 */
function showLoading(show) {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Fetch generic Model Specs from products.json
 * Used for "Add Product" dropdown
 */
async function fetchModelSpecs() {
    // showLoading(true); // Optional for minor data
    try {
        const response = await fetch('./data/products.json?v=' + Date.now());
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error('Failed to load products.json:', e);
        return [];
    }
}

/**
 * Fetch Clients from client.json
 * Used for Filter and "Add Product" dropdown
 */
async function fetchClients() {
    try {
        const response = await fetch('./data/client.json?v=' + Date.now());
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error('Failed to load client.json:', e);
        return [];
    }
}

/**
 * Fetch Active Products (The PSI Data)
 * In real app: Calls GAS (doGet).
 * In Mock: Returns a generated list because local products.json is just a catalog.
 */
async function fetchProducts() {
    showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            // Mock Data: Since we don't have a real DB json, we mock the "Active Products" state
            // This represents what GAS would return: a list of tracked products with inventory.
            return [
                { id: '1', client: 'SUPERBOND', model_spec: 'D3450_250mm×100M', initialInventory: 120, monthsData: [] },
                { id: '2', client: 'HUAQIN', model_spec: 'NP605_400mm×100M', initialInventory: 50, monthsData: [] },
                { id: '3', client: 'AVARY', model_spec: 'T4000_1020mm×50M', initialInventory: 300, monthsData: [] },
            ];
        } else {
            // Real GAS
            const response = await fetch(API_CONFIG.GAS_URL);
            if (!response.ok) throw new Error(`GAS error! status: ${response.status}`);
            const data = await response.json();
            if (data.status === 'error') throw new Error(data.message);
            return data;
        }
    } catch (e) {
        alert('Failed to load products: ' + e.message);
        console.error(e);
        return [];
    } finally {
        showLoading(false);
    }
}


/**
 * Save PSI Data for a specific product
 * @param {Object} payload { productId, monthData: [...] }
 */
async function saveProductData(payload) {
    showLoading(true);
    try {
        if (API_CONFIG.USE_MOCK) {
            // Mock: Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log('Mock Save:', payload);
            return { status: 'success' };
        } else {
            // Real GAS: doPost
            const response = await fetch(API_CONFIG.GAS_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // GAS content type quirk
                },
                body: JSON.stringify({
                    action: 'save',
                    data: payload
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message);
            return result;
        }
    } catch (e) {
        alert('Failed to save data: ' + e.message);
        console.error(e);
        throw e;
    } finally {
        showLoading(false);
    }
}
