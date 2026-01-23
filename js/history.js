/**
 * History Module Logic
 * Updated: To show Forecast vs Actuals in Horizontal Grid and 6-Line Chart
 */

window.HistoryModule = {
    currentYear: new Date().getFullYear(),
    chartInstance: null,

    init: function () {
        const btnBack = document.getElementById('btn-back-from-history');
        if (btnBack) btnBack.onclick = () => window.AppRouter.showHome();

        const btnPrev = document.getElementById('btn-prev-year');
        if (btnPrev) btnPrev.onclick = () => this.changeYear(-1);

        const btnNext = document.getElementById('btn-next-year');
        if (btnNext) btnNext.onclick = () => this.changeYear(1);
    },

    show: function (product) {
        if (!product) return;
        this.currentYear = new Date().getFullYear();
        this.render();
    },

    changeYear: function (offset) {
        this.currentYear += offset;
        this.render();
    },

    render: async function () {
        const p = window.AppState.currentProduct;
        const displayYearEl = document.getElementById('display-year');
        const infoEl = document.getElementById('history-product-info');
        const grid = document.getElementById('history-grid');
        const emptyEl = document.getElementById('history-empty');

        if (displayYearEl) displayYearEl.textContent = this.currentYear;
        // Check for p existence just in case
        if (infoEl && p) infoEl.textContent = `${p.client} - ${p.model_spec}`;

        // Fetch Data
        let historyData = [];
        try {
            historyData = await window.fetchYearlyHistory(p.client, p.model_spec, this.currentYear);
        } catch (e) {
            console.error("Failed to fetch history:", e);
        }

        grid.innerHTML = '';
        if (!historyData || historyData.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            this.renderChart([]); // Clear chart
            return;
        } else {
            if (emptyEl) emptyEl.style.display = 'none';
        }

        // Sort by month ascending "YYYY-MM"
        historyData.sort((a, b) => a.date_month.localeCompare(b.date_month));

        // Render Grid
        this.renderGrid(grid, historyData);

        // Render Chart
        this.renderChart(historyData);
    },

    renderGrid: function (grid, data) {
        // Label + 12 Months
        const addCell = (text, className) => {
            const div = document.createElement('div');
            div.className = 'psi-cell ' + (className || '');
            div.innerHTML = text;
            grid.appendChild(div);
        };
        const val = (v) => (v !== undefined && v !== null && v !== "" && v !== 0) ? v : '-';

        // Prepare 12 months data map
        const monthsData = Array.from({ length: 12 }, (_, i) => {
            const mStr = `${this.currentYear}-${String(i + 1).padStart(2, '0')}`;
            return data.find(d => d.date_month === mStr) || { date_month: mStr };
        });

        // 1. Month Header
        addCell('月份', 'psi-label-cell');
        monthsData.forEach((d, i) => addCell((i + 1) + '月', 'psi-header-cell'));

        // 2. Forecast Rows
        addCell('預測到貨 (P)', 'psi-label-cell');
        monthsData.forEach(d => addCell(val(d.forecast_p), 'col-forecast-p'));

        addCell('預測銷售 (S)', 'psi-label-cell');
        monthsData.forEach(d => addCell(val(d.forecast_s), 'col-forecast-s'));

        addCell('庫存預測 (I)', 'psi-label-cell');
        monthsData.forEach(d => addCell(val(d.forecast_i), 'col-forecast-i'));

        // 3. Actual Rows (Italic)
        addCell('實際到貨 (P)', 'psi-label-cell');
        monthsData.forEach(d => addCell(val(d.actual_p), 'col-actual-p'));

        addCell('實際銷售 (S)', 'psi-label-cell');
        monthsData.forEach(d => addCell(val(d.actual_s), 'col-actual-s'));

        addCell('實際庫存 (I)', 'psi-label-cell');
        monthsData.forEach(d => addCell(val(d.actual_i), 'col-actual-i'));
    },

    renderChart: function (data) {
        const ctx = document.getElementById('history-chart');
        if (!ctx) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const monthsData = Array.from({ length: 12 }, (_, i) => {
            const mStr = `${this.currentYear}-${String(i + 1).padStart(2, '0')}`;
            return data.find(d => d.date_month === mStr) || { date_month: mStr, forecast_p: 0, forecast_s: 0, forecast_i: 0 };
        });

        const labels = monthsData.map((_, i) => (i + 1) + '月');

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    // Actuals (Solid)
                    {
                        label: '實際庫存 (Actual I)',
                        data: monthsData.map(d => d.actual_i || null),
                        borderColor: '#000000',
                        backgroundColor: '#000000',
                        borderWidth: 3,
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: '實際到貨 (Actual P)',
                        data: monthsData.map(d => d.actual_p || null),
                        borderColor: '#2E7D32',
                        backgroundColor: '#2E7D32',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: '實際銷售 (Actual S)',
                        data: monthsData.map(d => d.actual_s || null),
                        borderColor: '#C62828',
                        backgroundColor: '#C62828',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    },
                    // Forecasts (Dashed)
                    {
                        label: '預測庫存 (Forecast I)',
                        data: monthsData.map(d => d.forecast_i || 0),
                        borderColor: '#333333',
                        borderDash: [5, 5],
                        borderWidth: 1.5,
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: '預測到貨 (Forecast P)',
                        data: monthsData.map(d => d.forecast_p || 0),
                        borderColor: '#4CAF50',
                        borderDash: [5, 5],
                        borderWidth: 1.5,
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: '預測銷售 (Forecast S)',
                        data: monthsData.map(d => d.forecast_s || 0),
                        borderColor: '#F44336',
                        borderDash: [5, 5],
                        borderWidth: 1.5,
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: {
                        display: true,
                        text: `${this.currentYear} 年度 PSI 趨勢 (實線=實際, 虛線=預測)`,
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
};
