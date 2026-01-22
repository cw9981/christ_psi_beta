/**
 * Detail Module Logic
 * Adheres to: psi-detail-view skill
 */

window.DetailModule = {
    chartInstance: null,
    editingMonthIndex: -1,

    init: function (product) {
        this.setupEventListeners();
        this.render();
    },

    setupEventListeners: function () {
        const btnBack = document.getElementById('btn-back');
        if (btnBack) btnBack.onclick = () => window.AppRouter.showHome();

        const formEdit = document.getElementById('form-edit-month');
        if (formEdit) {
            formEdit.onsubmit = (e) => {
                e.preventDefault();
                this.handleEditSubmit();
            };
        }

        const btnCancel = document.getElementById('btn-cancel-edit');
        if (btnCancel) btnCancel.onclick = () => document.getElementById('dialog-edit-month').close();

        const inputInitInv = document.getElementById('detail-initial-inventory');
        if (inputInitInv) {
            inputInitInv.onchange = (e) => {
                window.AppState.currentProduct.initialInventory = parseInt(e.target.value) || 0;
                this.render();
                window.saveProductData(window.AppState.currentProduct);
            };
        }
    },

    render: async function () {
        const p = window.AppState.currentProduct;
        if (!p) return;

        // 1. Fetch 7-month context if not already loaded or if we want fresh data
        const startMonth = this.getStartMonth(); // e.g. "2025-12"
        const contextData = await window.fetchContextPSI(p.client, p.model_spec, startMonth);

        if (contextData) {
            // Update Initial Inventory from Server (Previous Month's Stock)
            if (contextData.i_stock !== undefined) {
                p.initialInventory = contextData.i_stock;
            }

            // Map API forecast items back to p, s, i
            // API returns 'forecast_items' array
            const items = contextData.forecast_items || [];
            p.monthsData = items.map(d => ({
                p: d.p_value || 0,
                s: d.s_value || 0,
                i: d.i_value || 0,
                date_month: d.date_month // Store for saving
            }));
        }

        // 2. UI Updates
        document.getElementById('detail-product-name').textContent = p.model_spec;
        document.getElementById('detail-client-name').textContent = p.client;
        document.getElementById('detail-initial-inventory').value = p.initialInventory || 0;

        this.calculatePSI();
        this.renderGrid();
        this.renderChart();
    },

    getStartMonth: function () {
        // Return current month (YYYY-MM)
        // GAS API will fetch Predecessor (Last Month) + Current...Future 5
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    /**
     * Skill: PSI Logic - Reactive Inventory Rolling
     */
    calculatePSI: function () {
        const p = window.AppState.currentProduct;
        let runningInv = p.initialInventory || 0;

        if (!p.monthsData || p.monthsData.length === 0) {
            const today = new Date();
            p.monthsData = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
                const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return { date_month: mStr, p: 0, s: 0 };
            });
        }

        p.monthsData.forEach(m => {
            m.i = runningInv + (m.p || 0) - (m.s || 0);
            runningInv = m.i;
        });
        p.currentInventory = runningInv;
    },

    renderGrid: function () {
        const grid = document.getElementById('psi-grid');
        grid.innerHTML = '';
        const p = window.AppState.currentProduct;

        // Months array for labels
        const months = this.getFutureMonths();

        // 1. Header
        this.createCell(grid, '時間項目', 'psi-label-cell');
        months.forEach((m, idx) => {
            const cell = this.createCell(grid, m, 'psi-header-cell');
            cell.onclick = () => this.openEditModal(idx);
        });

        // 2. P Row
        this.createCell(grid, '預測到貨 (P)', 'psi-label-cell');
        p.monthsData.forEach((m, idx) => {
            const cell = this.createCell(grid, m.p, 'psi-cell p-val');
            cell.onclick = () => this.openEditModal(idx);
        });

        // 3. S Row
        this.createCell(grid, '預測銷售 (S)', 'psi-label-cell');
        p.monthsData.forEach((m, idx) => {
            const cell = this.createCell(grid, m.s, 'psi-cell s-val');
            cell.onclick = () => this.openEditModal(idx);
        });

        // 4. I Row
        this.createCell(grid, '庫存預測 (I)', 'psi-label-cell');
        p.monthsData.forEach(m => {
            this.createCell(grid, m.i, 'psi-cell i-val');
        });
    },

    createCell: function (parent, text, className) {
        const div = document.createElement('div');
        div.className = 'psi-cell ' + className;
        div.textContent = text;
        parent.appendChild(div);
        return div;
    },

    getFutureMonths: function () {
        const res = [];
        const d = new Date();
        for (let i = 0; i < 6; i++) {
            res.push(`${d.getFullYear()} 年 ${d.getMonth() + 1} 月`);
            d.setMonth(d.getMonth() + 1);
        }
        return res;
    },

    openEditModal: function (idx) {
        this.editingMonthIndex = idx;
        const m = window.AppState.currentProduct.monthsData[idx];
        const dateLabel = this.getFutureMonths()[idx];

        document.getElementById('edit-month-title').textContent = dateLabel;
        document.getElementById('edit-p').value = m.p;
        document.getElementById('edit-s').value = m.s;
        document.getElementById('dialog-edit-month').showModal();
    },

    handleEditSubmit: async function () {
        const idx = this.editingMonthIndex;
        const p = window.AppState.currentProduct.monthsData[idx];

        // 1. Update Local State & UI Immediately (Optimistic)
        p.p = parseInt(document.getElementById('edit-p').value) || 0;
        p.s = parseInt(document.getElementById('edit-s').value) || 0;

        document.getElementById('dialog-edit-month').close();
        this.render(); // Recalculate I and update Grid/Chart

        // 2. Persist to Backend
        try {
            await window.saveProductData(window.AppState.currentProduct);
        } catch (e) {
            console.error("Save failed:", e);
            // Alert is handled in api.js, but we log here just in case.
        }
    },

    renderChart: function () {
        const ctx = document.getElementById('psi-chart').getContext('2d');
        const p = window.AppState.currentProduct;
        const labels = this.getFutureMonths();

        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: '銷售 (S)', data: p.monthsData.map(m => m.s), borderColor: '#d32f2f', tension: 0.3 },
                    { label: '到貨 (P)', data: p.monthsData.map(m => m.p), borderColor: '#388e3c', tension: 0.3 },
                    { label: '庫存 (I)', data: p.monthsData.map(m => m.i), borderColor: '#0056b3', backgroundColor: 'rgba(0,86,179,0.1)', fill: true, tension: 0.3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'PSI 庫存趨勢預測' } }
            }
        });
    }
};
