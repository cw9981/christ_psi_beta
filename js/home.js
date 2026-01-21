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

        listBody.innerHTML = '';
        const products = window.AppState.products;
        const filtered = products.filter(p => filterVal === 'all' || p.client === filterVal);

        statsEl.textContent = `顯示 ${filtered.length} 筆，共 ${products.length} 筆`;

        filtered.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.client}</td>
                <td>${p.model_spec}</td>
                <td>${p.currentInventory || p.initialInventory || 0}</td>
                <td><button class="btn-edit-row">編輯</button></td>
            `;
            row.querySelector('.btn-edit-row').onclick = () => window.AppRouter.showDetail(p);
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

    handleAddProduct: function () {
        const client = document.getElementById('add-client').value;
        const model = document.getElementById('add-model').value;
        const initInv = parseInt(document.getElementById('add-initial-inv').value) || 0;

        const newP = {
            id: 'new_' + Date.now(),
            client: client,
            model_spec: model,
            initialInventory: initInv,
            monthsData: []
        };

        window.AppState.products.push(newP);
        document.getElementById('dialog-add').close();
        window.AppRouter.showDetail(newP);
    }
};
