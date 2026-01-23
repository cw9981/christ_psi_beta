/**
 * Home Module Controller
 * Refactored to match SKILL.md: Client Filter, Stats, Add Product Dialog
 */

window.HomeModule = {
    currentFilterClient: "",
    masterModels: [], // Cache for product specs

    init: function () {
        // 0. Hide Month Display (Moved to static header)
        const dateDisplay = document.getElementById('current-month-display');
        if (dateDisplay) {
            dateDisplay.style.display = 'none';
        }

        // 1. Client Filter
        const filterSelect = document.getElementById('filter-client');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilterClient = e.target.value;
                this.render();
            });
        }

        // 2. Add Product Button
        const btnAdd = document.getElementById('btn-add-product');
        if (btnAdd) {
            btnAdd.onclick = () => this.openAddDialog();
        }

        // 3. Dialog Events
        const dialog = document.getElementById('dialog-add');
        const form = document.getElementById('form-add-product');
        const btnCancel = document.getElementById('btn-cancel-add');

        if (dialog) {
            btnCancel.onclick = () => {
                form.reset();
                this.hideError();
                dialog.close();
            };

            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleAddSubmit();
            };

            // Dynamic Model Filtering (Delegated Listener for reliability)
            dialog.addEventListener('change', (e) => {
                if (e.target && e.target.id === 'add-client') {
                    this.updateModelOptions(e.target.value);
                }
            });
        }
    },

    /**
     * Main Render Function
     */
    render: function () {
        const tbody = document.getElementById('product-list-body');
        const emptyState = document.getElementById('home-empty-state');
        const filterSelect = document.getElementById('filter-client');
        const statsEl = document.getElementById('list-stats');

        if (!tbody) return;

        // 1. Get All Products
        const allProducts = window.AppState.products || [];

        // 2. Populate Client Filter (if empty)
        // Only populate if it has only the default option
        if (filterSelect && filterSelect.options.length <= 1) {
            this.populateClientOptions(filterSelect);
        }

        // 3. Filter Data
        let displayProducts = allProducts;
        if (this.currentFilterClient) {
            displayProducts = allProducts.filter(p => p.client === this.currentFilterClient);
        }

        // 4. Update Stats
        if (statsEl) {
            statsEl.textContent = `顯示 ${displayProducts.length} 筆，共 ${allProducts.length} 筆`;
        }

        // 5. Render Table
        tbody.innerHTML = '';
        if (displayProducts.length === 0) {
            emptyState.style.display = 'block';
            return;
        } else {
            emptyState.style.display = 'none';
        }

        displayProducts.forEach(p => {
            const tr = document.createElement('tr');

            // Inventory Context: Priority actual_i > forecast_i > initialInventory
            const lastMonthInv = (p.contextData)
                ? (p.contextData.actual_i !== undefined ? p.contextData.actual_i : p.contextData.forecast_i)
                : (p.initialInventory || 0);

            const isForecastOnly = p.contextData && p.contextData.actual_p === 0 && p.contextData.actual_s === 0;
            const invColorClass = isForecastOnly ? 'inv-forecast' : 'inv-actual';

            // Logic A: Zero Actuals Status
            const isPending = !p.contextData || (p.contextData.actual_p === 0 && p.contextData.actual_s === 0);
            const statusHtml = isPending
                ? `<td style="text-align:center;"><span class="status-dot pending" title="尚未編輯 (實際值為零)"></span></td>`
                : `<td style="text-align:center;"><span class="status-dot completed" title="編輯完成"></span></td>`;

            tr.innerHTML = `
                ${statusHtml}
                <td><span style="font-weight:600; color:#555;">${p.client}</span></td>
                <td>${p.model_spec}</td>
                <td style="text-align:center;">
                    <span class="inventory-badge ${invColorClass}">${lastMonthInv}</span>
                </td>
                <td style="text-align:right; white-space:nowrap; padding-right: 1.5rem;">
                    <button class="btn-primary btn-sm" style="margin-right:0.25rem;" onclick="AppRouter.showDetail(window.AppState.products.find(x => x.id === '${p.id}'))">編輯</button>
                    <button class="btn-ghost btn-sm" onclick="AppRouter.showHistory(window.AppState.products.find(x => x.id === '${p.id}'))">歷史</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * Populate Client Dropdown Unique Values
     * Updated: Uses Master Client List (AppState.clients), not just active products
     */
    populateClientOptions: function (selectEl) {
        // AppState.clients is loaded from fetchClients() in app.js
        const clients = (window.AppState.clients || []).sort();

        // Clear existing except first
        while (selectEl.options.length > 1) {
            selectEl.remove(1);
        }
        clients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            selectEl.appendChild(opt);
        });
        // Restore selection if any
        selectEl.value = this.currentFilterClient;
    },

    /**
     * Open Add Product Dialog
     */
    openAddDialog: async function () {
        const dialog = document.getElementById('dialog-add');
        const clientSelect = document.getElementById('add-client');
        const modelSelect = document.getElementById('add-model');
        this.hideError();

        // 1. Ensure master models from AppState (Refined)
        if (!window.AppState.specs || window.AppState.specs.length === 0) {
            try {
                window.AppState.specs = await window.fetchModelSpecs();
            } catch (e) {
                console.warn("Failed to fetch master models", e);
            }
        }

        // 2. Populate Clients (列出所有客戶)
        const clients = (window.AppState.clients || []).sort();
        clientSelect.innerHTML = '<option value="" disabled selected>請選擇客戶</option>';
        clients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            clientSelect.appendChild(opt);
        });

        // 3. Logic: If there is an active filter, pre-select it and trigger filtering
        if (this.currentFilterClient && clients.includes(this.currentFilterClient)) {
            clientSelect.value = this.currentFilterClient;
            this.updateModelOptions(this.currentFilterClient);
        } else {
            // Reset Model Select
            modelSelect.innerHTML = '<option value="" disabled selected>請先選擇客戶</option>';
            modelSelect.disabled = true;
        }

        dialog.showModal();
    },

    /**
     * Update Model Options based on Client
     * Updated: Robust filtering using AppState.specs
     */
    updateModelOptions: function (clientName) {
        const modelSelect = document.getElementById('add-model');
        if (!modelSelect) return;

        modelSelect.innerHTML = '<option value="" disabled selected>請選擇型號規格</option>';

        if (!clientName) {
            modelSelect.disabled = true;
            return;
        }

        // Use AppState.specs directly
        const specs = window.AppState.specs || [];

        // Helper to normalize strings for comparison
        const normalize = (str) => String(str || '').toLowerCase().replace(/\s+/g, '').replace(/x/g, '×');

        // Get currently active models for this client
        const activeModels = (window.AppState.products || [])
            .filter(p => p.client === clientName)
            .map(p => normalize(p.model_spec));

        // Filter available from master
        const available = specs.filter(m => {
            return !activeModels.includes(normalize(m.model_spec));
        });

        if (available.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = "無可用型號 (此客戶之型號已全部新增)";
            opt.disabled = true;
            modelSelect.appendChild(opt);
            modelSelect.disabled = true;
            return;
        }

        available.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.model_spec;
            opt.textContent = m.model_spec;
            modelSelect.appendChild(opt);
        });

        modelSelect.disabled = false;
    },

    /**
     * Handle Add Submit
     */
    handleAddSubmit: async function () {
        const client = document.getElementById('add-client').value;
        const model = document.getElementById('add-model').value; // Now a select
        const invStr = document.getElementById('add-inventory').value;
        const inv = parseInt(invStr);

        // Validation
        if (!client || !model) {
            this.showError("請填寫客戶與型號");
            return;
        }
        if (isNaN(inv) || inv < 0) {
            this.showError("庫存必須為非負整數");
            return;
        }

        // Duplicate Check
        const exists = window.AppState.products.some(p => p.client === client && p.model_spec === model);
        if (exists) {
            this.showError(`產品已存在: ${client} - ${model}`);
            return;
        }

        // Create New Product Object with Rolling Inventory Logic
        const prevMonthStr = this.getPrevMonthStr();
        const newProduct = {
            id: `${client}_${model}`,
            client: client,
            model_spec: model,
            initialInventory: inv,
            contextData: {
                date_month: prevMonthStr,
                actual_p: 0,
                actual_s: 0,
                actual_i: inv
            },
            // Initialize 6 months with Rolling Inventory
            // Since P=0, S=0, Forecast I should equal Initial Inv (inv)
            monthsData: Array.from({ length: 6 }, (_, i) => {
                return { p: 0, s: 0, i: inv };
            })
        };

        const btnSubmit = document.querySelector('#form-add-product button[type="submit"]');
        const originalText = btnSubmit.textContent;
        btnSubmit.disabled = true;
        btnSubmit.textContent = "儲存中...";

        try {
            const result = await window.saveProductData(newProduct);

            if (result.status === 'success') {
                document.getElementById('dialog-add').close();
                document.getElementById('form-add-product').reset();

                await window.loadBaseData();



                this.render();
                // No Alert as requested
                // alert('新增成功');
            } else {
                this.showError("儲存失敗: " + (result.message || '未知錯誤'));
            }
        } catch (e) {
            this.showError("系統錯誤: " + e.message);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = originalText;
        }
    },

    showError: function (msg) {
        const el = document.getElementById('add-error-msg');
        el.textContent = msg;
        el.style.display = 'block';
    },

    hideError: function () {
        const el = document.getElementById('add-error-msg');
        el.style.display = 'none';
    },

    getPrevMonthStr: function () {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
};
