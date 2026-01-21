/**
 * Christ PSI System - Main Logic
 * Skill: psi-logic-visualizer (Logic part)
 */

// --- State Management ---
const AppState = {
    products: [],      // Active products (with inventory) from GAS/Mock
    specs: [],        // Model Catalog from products.json
    currentProduct: null,
    currentDate: new Date(),
    clients: [],      // Client List from client.json
};

// --- Utils ---
const formatMonth = (date) => {
    // Format: "Jan 2026"
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
};

const getFutureMonths = (startDate, count = 6) => {
    const months = [];
    const d = new Date(startDate);
    for (let i = 0; i < count; i++) {
        months.push(new Date(d));
        d.setMonth(d.getMonth() + 1);
    }
    return months;
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    initApp();
});

async function initApp() {
    updateTitle();
    await loadData();
    setupEventListeners();
    renderHome();
}

function updateTitle() {
    const titleEl = document.getElementById('app-title');
    const today = new Date();
    // Requirements: "2026 一月"
    const year = today.getFullYear();
    const month = today.toLocaleString('zh-Hant', { month: 'long' });
    titleEl.textContent = `Christ PSI - ${year} ${month}`;
}

async function loadData() {
    // Parallel loading
    const [products, clients, specs] = await Promise.all([
        fetchProducts(),
        fetchClients(),
        fetchModelSpecs()
    ]);

    AppState.products = products;
    AppState.specs = specs;

    // Process clients: API returns array of objects {client: "NAME", contact: ""}
    // We just want the names for the filter.
    AppState.clients = clients.map(c => c.client).filter(Boolean);
}

function setupEventListeners() {
    // Navigation
    document.getElementById('btn-back').addEventListener('click', showHome);

    // Filters & Search
    const clientSelect = document.getElementById('filter-client');
    clientSelect.addEventListener('change', renderHome);

    // Add Product Dialog
    const btnAdd = document.getElementById('btn-add-product');
    const dialogAdd = document.getElementById('dialog-add');
    const formAdd = document.getElementById('form-add');

    btnAdd.addEventListener('click', () => {
        populateAddDialog();
        dialogAdd.showModal();
    });

    document.getElementById('btn-cancel-add').addEventListener('click', () => dialogAdd.close());

    formAdd.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddProductSubmit();
    });

    // Edit Month Dialog
    const dialogEdit = document.getElementById('dialog-edit-month');
    const formEdit = document.getElementById('form-edit-month');
    document.getElementById('btn-cancel-edit').addEventListener('click', () => dialogEdit.close());
    formEdit.addEventListener('submit', (e) => {
        e.preventDefault();
        handleEditMonthSubmit();
    });

    // Detail Page - Initial Inventory Change
    document.getElementById('detail-initial-inventory').addEventListener('change', (e) => {
        if (!AppState.currentProduct) return;
        AppState.currentProduct.initialInventory = parseInt(e.target.value) || 0;
        recalculatePSI();
        renderPSIGrid(); // Re-render grid to update I values
        renderChart();
        // save changes
        saveProductData({ productId: AppState.currentProduct.id, ...AppState.currentProduct });
    });
}

// --- View Switching ---
function showHome() {
    document.getElementById('view-home').classList.add('active');
    document.getElementById('view-detail').classList.remove('active');
}

function showDetail(product) {
    AppState.currentProduct = product; // Clone if needed, but ref is okay for now
    document.getElementById('view-home').classList.remove('active');
    document.getElementById('view-detail').classList.add('active');

    renderDetailHeader();
    renderPSIGrid();
    renderChart();
}

// --- Home Renderer (Table View) ---
function renderHome() {
    const listBody = document.getElementById('product-list-body');
    const filterClient = document.getElementById('filter-client');
    const statsEl = document.getElementById('list-stats');

    const filterVal = filterClient.value;

    // Populate Client Filter if empty (only once)
    if (filterClient.options.length === 1 && AppState.clients.length > 0) {
        AppState.clients.forEach(client => {
            const opt = document.createElement('option');
            opt.value = client;
            opt.textContent = client;
            filterClient.appendChild(opt);
        });
    }

    listBody.innerHTML = '';

    const filtered = AppState.products.filter(p => {
        // Client Filter
        if (filterVal !== 'all' && p.client !== filterVal) return false;
        return true;
    });

    // Update Stats (繁體中文)
    statsEl.textContent = `顯示 ${filtered.length} 筆，共 ${AppState.products.length} 筆`;

    // Render Rows
    filtered.forEach(p => {
        const row = document.createElement('tr');

        // Client
        const tdClient = document.createElement('td');
        tdClient.textContent = p.client;
        row.appendChild(tdClient);

        // Model Spec
        const tdModel = document.createElement('td');
        tdModel.textContent = p.model_spec;
        row.appendChild(tdModel);

        // Inventory
        const tdInv = document.createElement('td');
        tdInv.textContent = calculateCurrentInventory(p);
        row.appendChild(tdInv);

        // Action
        const tdAction = document.createElement('td');
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.textContent = '編輯'; // TC: Edit -> 編輯
        btnEdit.onclick = () => showDetail(p);
        tdAction.appendChild(btnEdit);
        row.appendChild(tdAction);

        listBody.appendChild(row);
    });

    if (filtered.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" style="text-align:center; color:#888;">無符合資料 (No products found)</td>`;
        listBody.appendChild(row);
    }
}

function calculateCurrentInventory(product) {
    return product.currentInventory || product.initialInventory || 0;
}

// --- Detail Renderer (PSI Core) ---
function renderDetailHeader() {
    const p = AppState.currentProduct;
    document.getElementById('detail-product-name').textContent = p.model_spec;
    document.getElementById('detail-client-name').textContent = p.client;
    document.getElementById('detail-initial-inventory').value = p.initialInventory || 0;
}

function recalculatePSI() {
    const p = AppState.currentProduct;
    let runningInventory = p.initialInventory || 0;

    // Ensure months data structure
    if (!p.monthsData) p.monthsData = [];

    // We project 6 months
    const monthDates = getFutureMonths(new Date(), 6);

    // Align data with dates (simple index match for prototype)
    for (let i = 0; i < 6; i++) {
        if (!p.monthsData[i]) {
            p.monthsData[i] = { p: 0, s: 0, date: monthDates[i].toISOString() };
        }

        const m = p.monthsData[i];
        m.i = runningInventory + (parseInt(m.p) || 0) - (parseInt(m.s) || 0);
        runningInventory = m.i;
    }

    p.currentInventory = runningInventory; // Update last known
}

function renderPSIGrid() {
    recalculatePSI(); // Ensure I is fresh

    const grid = document.getElementById('psi-grid');
    grid.innerHTML = '';

    const monthDates = getFutureMonths(new Date(), 6);
    const pData = AppState.currentProduct.monthsData;

    // 1. Header Row
    createCell(grid, 'Metric', 'psi-header-cell'); // Corner
    monthDates.forEach((d, index) => {
        const cell = createCell(grid, formatMonth(d), 'psi-header-cell month-col-header');
        cell.title = "Click to Edit";
        cell.onclick = () => openEditModal(index);
    });

    // 2. Production Row (P)
    createCell(grid, 'Production (P)', 'psi-label-cell');
    pData.forEach((m, index) => {
        const cell = createCell(grid, m.p || 0, 'psi-cell');
        cell.style.color = 'green';
        // Also clickable for edit convenience
        cell.onclick = () => openEditModal(index);
        cell.style.cursor = 'pointer';
    });

    // 3. Sales Row (S)
    createCell(grid, 'Sales (S)', 'psi-label-cell');
    pData.forEach((m, index) => {
        const cell = createCell(grid, m.s || 0, 'psi-cell');
        cell.style.color = 'red';
        cell.onclick = () => openEditModal(index);
        cell.style.cursor = 'pointer';
    });

    // 4. Inventory Row (I)
    createCell(grid, 'Inventory (I)', 'psi-label-cell');
    pData.forEach(m => {
        const cell = createCell(grid, m.i, 'psi-cell');
        cell.style.fontWeight = 'bold';
        cell.style.backgroundColor = '#e3f2fd'; // Highlight I
    });
}

function createCell(parent, text, className) {
    const div = document.createElement('div');
    div.className = className;
    div.textContent = text;
    parent.appendChild(div);
    return div;
}

// --- Chart Rendering ---
let psiChartInstance = null;

function renderChart() {
    const ctx = document.getElementById('psi-chart').getContext('2d');
    const pData = AppState.currentProduct.monthsData;
    const labels = getFutureMonths(new Date(), 6).map(d => formatMonth(d));

    const dataS = pData.map(m => m.s);
    const dataP = pData.map(m => m.p);
    const dataI = pData.map(m => m.i);

    if (psiChartInstance) {
        psiChartInstance.destroy();
    }

    psiChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Sales',
                    data: dataS,
                    borderColor: 'red',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.3
                },
                {
                    label: 'Inventory',
                    data: dataI,
                    borderColor: 'blue',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Production',
                    data: dataP,
                    borderColor: 'green',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    hidden: true // Optional visibility
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: { display: true, text: 'PSI Forecast Trend' }
            }
        }
    });
}

// --- Modal Editing Logic ---
let editingMonthIndex = -1;

function openEditModal(monthIndex) {
    editingMonthIndex = monthIndex;
    const monthData = AppState.currentProduct.monthsData[monthIndex];
    const monthDate = getFutureMonths(new Date(), 6)[monthIndex];

    document.getElementById('edit-month-title').textContent = formatMonth(monthDate);
    document.getElementById('edit-p').value = monthData.p;
    document.getElementById('edit-s').value = monthData.s;

    document.getElementById('dialog-edit-month').showModal();
}

function handleEditMonthSubmit() {
    if (editingMonthIndex < 0 || !AppState.currentProduct) return;

    const pVal = parseInt(document.getElementById('edit-p').value) || 0;
    const sVal = parseInt(document.getElementById('edit-s').value) || 0;

    // Update Data
    const monthData = AppState.currentProduct.monthsData[editingMonthIndex];
    monthData.p = pVal;
    monthData.s = sVal;

    // Recalculate & Render
    recalculatePSI(); // Updates I for future months
    renderPSIGrid(); // Refreshes DOM
    renderChart();

    // Save
    saveProductData({ productId: AppState.currentProduct.id, ...AppState.currentProduct });

    document.getElementById('dialog-edit-month').close();
}

// --- Add Product Logic ---
function populateAddDialog() {
    // Populate Client Select (from AppState.clients)
    const sClient = document.getElementById('add-client');
    sClient.innerHTML = '';
    AppState.clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sClient.appendChild(opt);
    });

    // Populate Model Select (from AppState.specs)
    const sModel = document.getElementById('add-model');
    sModel.innerHTML = '';

    if (AppState.specs && AppState.specs.length > 0) {
        AppState.specs.forEach(spec => {
            const opt = document.createElement('option');
            opt.value = spec.model_spec; // Use model_spec as identifier
            opt.textContent = spec.model_spec;
            sModel.appendChild(opt);
        });
    } else {
        const opt = document.createElement('option');
        opt.textContent = "No models available";
        sModel.appendChild(opt);
    }
}

function handleAddProductSubmit() {
    const client = document.getElementById('add-client').value;
    const model = document.getElementById('add-model').value || 'Custom Model';
    const initialInv = parseInt(document.getElementById('add-initial-inv').value) || 0;

    // Create new product object
    const newProduct = {
        id: 'new_' + Date.now(),
        client: client,
        model_spec: model,
        initialInventory: initialInv,
        monthsData: [] // Empty init
    };

    AppState.products.push(newProduct);
    showDetail(newProduct); // Go to detail
    document.getElementById('dialog-add').close();
}
