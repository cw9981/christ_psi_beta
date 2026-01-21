/**
 * Christ PSI System - App Shell Controller
 * Handles routing, template loading, and shared state.
 */

window.AppState = {
    products: [],      // Active PSI data from Sheets
    clients: [],       // Client catalog from client.json
    specs: [],         // Model catalog from products.json
    currentProduct: null,
    currentDate: new Date()
};

document.addEventListener('DOMContentLoaded', async () => {
    await initAppShell();
});

async function initAppShell() {
    updateHeaderTitle();

    // 1. Initial Data Load
    await loadBaseData();

    // 2. Load Templates into Shell
    await loadTemplates();

    // 3. Initialize Home View (Default)
    if (window.HomeModule) {
        window.HomeModule.init();
    }
}

function updateHeaderTitle() {
    const titleEl = document.getElementById('app-title');
    const today = new Date();
    const year = today.getFullYear();
    const month = today.toLocaleString('zh-Hant', { month: 'long' });
    titleEl.textContent = `Christ PSI - ${year} ${month}`;
}

async function loadBaseData() {
    try {
        const [products, clients, specs] = await Promise.all([
            window.fetchProducts(),     // From api.js
            window.fetchClients(),      // From api.js
            window.fetchModelSpecs()    // From api.js
        ]);

        window.AppState.products = products;
        window.AppState.specs = specs;
        window.AppState.clients = clients.map(c => c.client).filter(Boolean);

    } catch (e) {
        console.error("Base data loading error:", e);
    }
}

async function loadTemplates() {
    const container = document.getElementById('app-content');
    try {
        const [homeHtml, detailHtml] = await Promise.all([
            fetch('./home_list.html').then(r => r.text()),
            fetch('./psi_detail.html').then(r => r.text())
        ]);

        container.innerHTML = homeHtml + detailHtml;
    } catch (e) {
        console.error("Template loading error:", e);
        container.innerHTML = `<h2 style="color:red; text-align:center; margin-top:5rem;">模組載入失敗 (Module Load Error)</h2>`;
    }
}

// --- Global Navigation Helper ---
window.AppRouter = {
    showHome: () => {
        document.getElementById('view-home').classList.add('active');
        document.getElementById('view-detail').classList.remove('active');
        if (window.HomeModule) window.HomeModule.render();
    },

    showDetail: (product) => {
        window.AppState.currentProduct = product;
        document.getElementById('view-home').classList.remove('active');
        document.getElementById('view-detail').classList.add('active');
        if (window.DetailModule) window.DetailModule.init(product);
    }
};
