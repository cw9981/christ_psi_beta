/**
 * Home Module Logic
 * Adheres to: product-list-view skill
 */

window.HomeModule = {
    init: function () {
        this.setupEventListeners();
        this.render();
    },

    setupEventListeners: function () {
        const clientSelect = document.getElementById('filter-client');
        if (clientSelect) {
            clientSelect.addEventListener('change', () => this.render());
        }

        const btnAdd = document.getElementById('btn-add-product');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => this.openAddDialog());
        }

        const formAdd = document.getElementById('form-add');
        if (formAdd) {
            formAdd.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddProduct();
            });
        }

        const btnCancelAdd = document.getElementById('btn-cancel-add');
        if (btnCancelAdd) {
            btnCancelAdd.addEventListener('click', () => document.getElementById('dialog-add').close());
        }
    },

    render: function () {
        const listBody = document.getElementById('product-list-body');
        const filterClient = document.getElementById('filter-client');
        const statsEl = document.getElementById('list-stats');

        if (!listBody) return;

        const filterVal = filterClient.value;

        // One-time population of filter
        if (filterClient.options.length === 1 && window.AppState.clients.length > 0) {
            window.AppState.clients.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c;
                filterClient.appendChild(opt);
            });
        }

        // 1. Update Dynamic Headers
        const monthHeaders = document.querySelectorAll('#product-list-header .dynamic-month');
        // Calculate dynamic month labels starting from next month
        const today = new Date();
        for (let i = 0; i < 6; i++) {
            // Logic: The API returns Current Month + 5 Future Months.
            // So index 0 is Current Month.
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthHeaders[i]) monthHeaders[i].textContent = mStr;
        }

        listBody.innerHTML = '';
        const products = window.AppState.products;
        const filtered = products.filter(p => filterVal === 'all' || p.client === filterVal);

        statsEl.textContent = `顯示 ${filtered.length} 筆，共 ${products.length} 筆`;

        filtered.forEach(p => {
            const row = document.createElement('tr');

            // Generate the 6 monthly PSI cells
            let forecastCells = '';
            for (let i = 0; i < 6; i++) {
                // API (fetchProducts) maps data to 'monthsData'
                const mData = p.monthsData && p.monthsData[i] ? p.monthsData[i] : { p: 0, s: 0, i: 0 };

                // Use correct properties: p, s, i (not p_value)
                forecastCells += `
                    <td style="font-size: 0.8rem; border-left: 1px solid #eee; text-align:center;">
                        <div style="color:#007bff">P:${mData.p || 0}</div>
                        <div style="color:#28a745">S:${mData.s || 0}</div>
                        <div style="font-weight:bold">I:${mData.i || 0}</div>
                    </td>
                `;
            }

            row.innerHTML = `
                <td>${p.client}</td>
                <td>${p.model_spec}</td>
                <td style="text-align:center; font-weight:bold; background:#eef7ff">${p.initialInventory || 0}</td>
                ${forecastCells}
                <td style="display:flex; gap: 0.5rem; vertical-align: middle;">
                    <button class="btn-edit-row">編輯</button>
                    <button class="btn-history-row btn-secondary">歷史</button>
                </td>
            `;
            row.querySelector('.btn-edit-row').onclick = () => window.AppRouter.showDetail(p);
            row.querySelector('.btn-history-row').onclick = () => window.AppRouter.showHistory(p);
            listBody.appendChild(row);
        });

        if (filtered.length === 0) {
            listBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999; padding:2rem;">無符合資料</td></tr>`;
        }
    },

    openAddDialog: function () {
        const dialog = document.getElementById('dialog-add');
        const sClient = document.getElementById('add-client');
        const sModel = document.getElementById('add-model');

        // Populate selects
        sClient.innerHTML = window.AppState.clients.map(c => `<option value="${c}">${c}</option>`).join('');
        sModel.innerHTML = window.AppState.specs.map(s => `<option value="${s.model_spec}">${s.model_spec}</option>`).join('');

        dialog.showModal();
    },

    handleAddProduct: async function () {
        const client = document.getElementById('add-client').value;
        const model = document.getElementById('add-model').value;
        const initInv = parseInt(document.getElementById('add-initial-inv').value) || 0;

        // Initialize 6 months data with proper date_month
        const today = new Date();
        const monthsData = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthsData.push({ date_month: mStr, p: 0, s: 0, i: 0 });
        }

        // Calculate initial I for first month? 
        // Logic: runningInv = initInv + p - s.
        let runningInv = initInv;
        monthsData.forEach(m => {
            m.i = runningInv + m.p - m.s;
            runningInv = m.i;
        });

        const newP = {
            id: 'new_' + Date.now(),
            client: client,
            model_spec: model,
            initialInventory: initInv,
            monthsData: monthsData
        };

        window.AppState.products.push(newP);
        document.getElementById('dialog-add').close();

        // Optimistic UI: Show Detail Immediately
        window.AppRouter.showDetail(newP);

        // Persist to Backend
        try {
            await window.saveProductData(newP);
        } catch (e) {
            console.error("Failed to save new product:", e);
            // API layer handles alert, but we might want to flag UI if save failed?
        }
    }
};
