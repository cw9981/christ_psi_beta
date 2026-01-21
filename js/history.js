/**
 * History Module Logic
 * Adheres to: psi-history-view skill
 */

window.HistoryModule = {
    currentYear: new Date().getFullYear(),

    init: function () {
        this.setupEventListeners();
    },

    setupEventListeners: function () {
        const btnBack = document.getElementById('btn-history-back');
        if (btnBack) {
            btnBack.onclick = () => window.AppRouter.showHome();
        }

        const yearSelect = document.getElementById('select-history-year');
        if (yearSelect) {
            yearSelect.onchange = (e) => {
                this.currentYear = e.target.value;
                this.loadYearlyData();
            };
        }
    },

    show: function (product) {
        if (!product) return;
        document.getElementById('history-title').textContent = `${product.model_spec} - 年度歷史資料`;
        document.getElementById('history-subtitle').textContent = `客戶: ${product.client}`;

        // Ensure the select matches our default
        document.getElementById('select-history-year').value = this.currentYear;

        this.loadYearlyData();
    },

    loadYearlyData: async function () {
        const p = window.AppState.currentProduct;
        if (!p) return;

        // Call API to fetch yearly history
        const data = await window.fetchYearlyHistory(p.client, p.model_spec, this.currentYear);
        this.renderTable(data);
    },

    renderTable: function (data) {
        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:2rem; color:#999;">該年度尚無相關歷史資料</td></tr>`;
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.date_month}</td>
                <td>${row.p_value}</td>
                <td>${row.s_value}</td>
                <td style="font-weight:bold;">${row.i_value}</td>
                <td style="color:#666; font-size:0.85rem;">${row.last_updated || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
};
