/**
 * Detail Module Logic
 * Refactored to match SKILL.md: Context Display/Edit (Dual State), 7-Point Chart
 */

window.DetailModule = {
    chartInstance: null,
    editingMonthIndex: -1, // For Forecast Edit

    // UI Elements References
    ui: {},

    init: function () {
        this.cacheDOM();
        this.setupEventListeners();
    },

    cacheDOM: function () {
        this.ui = {
            btnBack: document.getElementById('btn-back'),

            // Context Display
            contextDisplayArea: document.getElementById('context-display-area'),

            // State 1 (Initial)
            btnContextInitial: document.getElementById('ctx-display-initial'),
            initMonth: document.getElementById('ctx-init-month'),
            dispInitI: document.getElementById('disp-init-i'),

            // State 2 (Normal)
            btnContextNormal: document.getElementById('ctx-display-normal'),
            normMonth: document.getElementById('ctx-normal-month'),
            dispNormFP: document.getElementById('disp-norm-fp'),
            dispNormFS: document.getElementById('disp-norm-fs'),
            dispNormFI: document.getElementById('disp-norm-fi'),
            dispNormAP: document.getElementById('disp-norm-ap'),
            dispNormAS: document.getElementById('disp-norm-as'),
            dispNormAI: document.getElementById('disp-norm-ai'),
            dispNormAIRow: document.getElementById('disp-norm-ai-row'),

            // Context Dialog
            dialogContext: document.getElementById('dialog-edit-context'),
            formContext: document.getElementById('form-edit-context'),
            btnCancelCtx: document.getElementById('btn-cancel-ctx'),
            ctxDialogTitle: document.getElementById('ctx-dialog-title'),
            ctxFieldsPS: document.getElementById('ctx-fields-ps'),
            ctxInputP: document.getElementById('ctx-actual-p'),
            ctxInputS: document.getElementById('ctx-actual-s'),
            ctxInputI: document.getElementById('ctx-actual-i'),
            ctxCalcHint: document.getElementById('ctx-calc-hint'),
            ctxErrorMsg: document.getElementById('ctx-error-msg'),

            // Forecast Dialog
            dialogForecast: document.getElementById('dialog-edit-month'),
            formForecast: document.getElementById('form-edit-month'),
            btnCancelForecast: document.getElementById('btn-cancel-edit'),
            btnSaveForecast: document.getElementById('btn-save-edit'),
            inputP: document.getElementById('edit-p'),
            inputS: document.getElementById('edit-s'),
            forecastErrorMsg: document.getElementById('edit-error-msg'),

            // Context Dialog Buttons
            btnSaveCtx: document.getElementById('btn-save-ctx'),

            // Grid
            grid: document.getElementById('psi-grid'),

            // New Indicators
            unsavedIndicator: document.getElementById('unsaved-indicator')
        };
    },

    hasUnsavedChanges: false,
    setUnsaved: function (val) {
        this.hasUnsavedChanges = val;
        if (this.ui.unsavedIndicator) {
            this.ui.unsavedIndicator.style.display = val ? 'inline' : 'none';
        }
    },

    /**
     * Helper to ensure non-negative value
     */
    safeVal: (v) => Math.max(0, parseInt(v) || 0),

    setupEventListeners: function () {
        if (this.ui.btnBack) this.ui.btnBack.onclick = () => window.AppRouter.showHome();

        // Context Display Click -> Open Edit Dialog
        if (this.ui.contextDisplayArea) {
            this.ui.contextDisplayArea.onclick = () => this.openContextEdit();
        }

        // Context Dialog Listeners
        if (this.ui.dialogContext) {
            this.ui.btnCancelCtx.onclick = () => {
                this.ui.dialogContext.close();
                this.hideError(this.ui.ctxErrorMsg);
            };
            this.ui.formContext.onsubmit = (e) => {
                e.preventDefault();
                this.handleContextSubmit();
            };
            // Real-time Validation
            ['inputP', 'inputS', 'inputI'].forEach(key => {
                const el = this.ui[`ctx${key.replace('input', 'Input')}`];
                if (el) el.oninput = () => this.validateContext();
            });
        }

        // Forecast Dialog Listeners
        if (this.ui.dialogForecast) {
            this.ui.btnCancelForecast.onclick = () => {
                this.ui.dialogForecast.close();
                this.hideError(this.ui.forecastErrorMsg);
            };
            this.ui.formForecast.onsubmit = (e) => {
                e.preventDefault();
                this.handleForecastSubmit();
            };
            // Real-time Validation
            [this.ui.inputP, this.ui.inputS].forEach(el => {
                if (el) el.oninput = () => this.validateForecast();
            });
        }
    },

    render: async function () {
        const p = window.AppState.currentProduct;
        if (!p) return;

        // 1. Use Cached Data (Zero-Fetch)
        const startMonth = this.getStartMonth();

        // Ensure contextData exists (it should from bulk load)
        if (!p.contextData) {
            // Fallback if somehow missing (e.g. deep link without home load? but AppShell handles loadBaseData)
            // Or new product added locally but not saved?
            // Initialize default structure
            p.contextData = {
                actual_p: 0, actual_s: 0, actual_i: p.initialInventory || 0,
                forecast_p: 0, forecast_s: 0, forecast_i: 0,
                date_month: this.getPrevMonthStr()
            };
        }

        // Ensure monthsData exists
        if (!p.monthsData || p.monthsData.length === 0) {
            const today = new Date();
            p.monthsData = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
                const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return { date_month: mStr, p: 0, s: 0, i: 0 };
            });
        }

        // 2. UI Updates
        const nameEl = document.getElementById('detail-product-name');
        if (nameEl) {
            // Preserving the indicator span if it exists
            const span = document.getElementById('unsaved-indicator');
            nameEl.innerHTML = p.model_spec + ' ';
            if (span) nameEl.appendChild(span);
        }
        document.getElementById('detail-client-name').textContent = p.client;
        this.setUnsaved(false);

        // Render Context Display
        this.renderContextDisplay();

        // 3. Calc & Render Grid & Chart
        this.calculatePSI();
        this.renderGrid();
        this.renderChart();
    },

    renderContextDisplay: function () {
        const prod = window.AppState.currentProduct;
        const ctx = prod.contextData;
        if (!ctx) return;

        const dateStr = ctx.date_month || '上月';

        // Logic: If Actual AND Forecast for P, S, and I are all 0, show Initial State
        const isInitialState = (
            parseInt(ctx.actual_p || 0) === 0 &&
            parseInt(ctx.actual_s || 0) === 0 &&
            parseInt(ctx.forecast_p || 0) === 0 &&
            parseInt(ctx.forecast_s || 0) === 0 &&
            parseInt(ctx.forecast_i || 0) === 0
        );

        if (isInitialState) {
            this.ui.btnContextInitial.style.display = 'flex';
            this.ui.btnContextNormal.style.display = 'none';
            this.ui.initMonth.textContent = dateStr;
            this.ui.dispInitI.textContent = ctx.actual_i;
        } else {
            this.ui.btnContextInitial.style.display = 'none';
            this.ui.btnContextNormal.style.display = 'flex';
            this.ui.normMonth.textContent = dateStr;

            // Row 1: Forecasts
            this.ui.dispNormFP.textContent = ctx.forecast_p || 0;
            this.ui.dispNormFS.textContent = ctx.forecast_s || 0;
            this.ui.dispNormFI.textContent = ctx.forecast_i || 0;

            // Row 2: Actuals
            this.ui.dispNormAP.textContent = ctx.actual_p || 0;
            this.ui.dispNormAS.textContent = ctx.actual_s || 0;
            if (this.ui.dispNormAIRow) this.ui.dispNormAIRow.textContent = ctx.actual_i || 0;
            this.ui.dispNormAI.textContent = ctx.actual_i || 0;
        }
    },

    // --- Context Edit Logic ---

    openContextEdit: async function () {
        this.hideError(this.ui.ctxErrorMsg);
        const prod = window.AppState.currentProduct;
        const ctx = prod.contextData;
        const dialog = this.ui.dialogContext;

        const isInitialState = (
            parseInt(ctx.actual_p || 0) === 0 &&
            parseInt(ctx.actual_s || 0) === 0 &&
            parseInt(ctx.forecast_p || 0) === 0 &&
            parseInt(ctx.forecast_s || 0) === 0 &&
            parseInt(ctx.forecast_i || 0) === 0
        );

        if (isInitialState) {
            this.setDialogState(1);
            this.ui.ctxInputI.value = ctx.actual_i || 0;
            this.ui.ctxInputP.value = 0;
            this.ui.ctxInputS.value = 0;
        } else {
            // First-Time Edit: Copy forecast to actual if actual is 0
            if (parseInt(ctx.actual_p || 0) === 0 && parseInt(ctx.actual_s || 0) === 0) {
                this.ui.ctxInputP.value = ctx.forecast_p || 0;
                this.ui.ctxInputS.value = ctx.forecast_s || 0;
            } else {
                this.ui.ctxInputP.value = ctx.actual_p;
                this.ui.ctxInputS.value = ctx.actual_s;
            }
            this.ui.ctxInputI.value = ctx.actual_i;
            this.setDialogState(2);
        }

        this.validateContext();
        dialog.showModal();
    },

    validateContext: function () {
        const pVal = parseInt(this.ui.ctxInputP.value) || 0;
        const sVal = parseInt(this.ui.ctxInputS.value) || 0;
        const iVal = parseInt(this.ui.ctxInputI.value) || 0;

        const prod = window.AppState.currentProduct;
        let running = iVal;
        let hasNegative = false;

        prod.monthsData.forEach(m => {
            if (running + (parseInt(m.p) || 0) - (parseInt(m.s) || 0) < 0) hasNegative = true;
            running = running + (parseInt(m.p) || 0) - (parseInt(m.s) || 0);
        });

        if (hasNegative || pVal < 0 || sVal < 0 || iVal < 0) {
            this.showError(this.ui.ctxErrorMsg, "修改後將導致後續月份庫存變為負數，或是輸入無效值");
            this.ui.btnSaveCtx.disabled = true;
        } else {
            this.hideError(this.ui.ctxErrorMsg);
            this.ui.btnSaveCtx.disabled = false;
        }
    },

    setDialogState: function (state) {
        if (state === 1) {
            this.ui.ctxDialogTitle.textContent = "設定 PSI 期初庫存";
            this.ui.ctxFieldsPS.style.display = 'none';
        } else {
            this.ui.ctxDialogTitle.textContent = "編輯上月實績";
            this.ui.ctxFieldsPS.style.display = 'block';
        }
    },



    handleContextSubmit: async function () {
        const pVal = parseInt(this.ui.ctxInputP.value) || 0;
        const sVal = parseInt(this.ui.ctxInputS.value) || 0;
        const iVal = parseInt(this.ui.ctxInputI.value) || 0;

        const prod = window.AppState.currentProduct;
        const ctx = prod.contextData;

        // Backup for revert
        const oldP = ctx.actual_p;
        const oldS = ctx.actual_s;
        const oldI = ctx.actual_i;

        // Update values
        ctx.actual_p = pVal;
        ctx.actual_s = sVal;
        ctx.actual_i = iVal;

        // State Check: If P or S is set, it becomes Normal State. If both are 0, might be Initial.
        // But SKILL.md says: if all actual P/S/Forecast P/S/I are 0, it's Initial.
        // Let's just follow: If User sets P or S, it's definitely not Initial anymore for the display.

        // Rolling validation
        let running = iVal;
        let hasNegative = false;
        prod.monthsData.forEach(m => {
            if (running + (parseInt(m.p) || 0) - (parseInt(m.s) || 0) < 0) hasNegative = true;
            running = running + (parseInt(m.p) || 0) - (parseInt(m.s) || 0);
        });

        if (hasNegative) {
            this.showError(this.ui.ctxErrorMsg, "修改後將導致後續月份庫存變為負數，請檢查");
            ctx.actual_p = oldP;
            ctx.actual_s = oldS;
            ctx.actual_i = oldI;
            return;
        }

        this.setUnsaved(true);
        this.ui.dialogContext.close();

        // Immediate UI Update
        this.calculatePSI();
        this.renderContextDisplay();
        this.renderGrid();
        this.renderChart();

        // Save
        try {
            const result = await window.saveProductData(prod);
            if (result.status === 'success') {
                this.setUnsaved(false);
            }
        } catch (e) {
            console.error("Save failed:", e);
        }
    },

    // --- Forecast Edit Logic ---

    openEditModal: function (idx) {
        this.editingMonthIndex = idx;
        this.hideError(this.ui.forecastErrorMsg);

        const m = window.AppState.currentProduct.monthsData[idx];

        document.getElementById('edit-month-title').textContent = m.date_month;
        this.ui.inputP.value = m.p;
        this.ui.inputS.value = m.s;

        this.validateForecast();
        this.ui.dialogForecast.showModal();
    },

    validateForecast: function () {
        const valP = parseInt(this.ui.inputP.value) || 0;
        const valS = parseInt(this.ui.inputS.value) || 0;
        const prod = window.AppState.currentProduct;
        const idx = this.editingMonthIndex;

        // Clone current state and apply temporary change
        const tempMonths = JSON.parse(JSON.stringify(prod.monthsData));
        tempMonths[idx].p = valP;
        tempMonths[idx].s = valS;

        let running = (prod.contextData && parseInt(prod.contextData.actual_i)) || 0;
        let hasNegative = false;
        tempMonths.forEach(m => {
            if (running + (parseInt(m.p) || 0) - (parseInt(m.s) || 0) < 0) hasNegative = true;
            running = running + (parseInt(m.p) || 0) - (parseInt(m.s) || 0);
        });

        if (hasNegative || valP < 0 || valS < 0) {
            this.showError(this.ui.forecastErrorMsg, "修改後將導致庫存變為負數，或是輸入無效值");
            this.ui.btnSaveForecast.disabled = true;
        } else {
            this.hideError(this.ui.forecastErrorMsg);
            this.ui.btnSaveForecast.disabled = false;
        }
    },

    handleForecastSubmit: async function () {
        const idx = this.editingMonthIndex;
        const p = window.AppState.currentProduct.monthsData[idx];

        const valP = parseInt(document.getElementById('edit-p').value) || 0;
        const valS = parseInt(document.getElementById('edit-s').value) || 0;

        // Validation: Results in negative inventory?
        const oldP = p.p;
        const oldS = p.s;

        p.p = valP;
        p.s = valS;

        // Check rolling
        const prod = window.AppState.currentProduct;
        let running = (prod.contextData && prod.contextData.actual_i) || 0;
        let hasNegative = false;
        prod.monthsData.forEach(m => {
            if (running + (m.p || 0) - (m.s || 0) < 0) hasNegative = true;
            running = running + (m.p || 0) - (m.s || 0);
        });

        if (hasNegative) {
            this.showError(this.ui.forecastErrorMsg, "修改後將導致庫存變為負數，或是輸入了無效數值，請檢查");
            p.p = oldP;
            p.s = oldS;
            return;
        }

        this.setUnsaved(true);
        this.ui.dialogForecast.close();

        // Recalc
        this.calculatePSI();
        this.renderGrid();
        this.renderChart();

        try {
            const result = await window.saveProductData(window.AppState.currentProduct);
            if (result.status === 'success') {
                this.setUnsaved(false);
            }
        } catch (e) {
            console.error("Save failed:", e);
        }
    },

    // --- Core Logic ---

    getStartMonth: function () {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    getPrevMonthStr: function () {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    calculatePSI: function () {
        const p = window.AppState.currentProduct;
        if (!p || !p.contextData) return;

        // Start from Actual I of last month (Context)
        // Rule: Current month I = Prev month I + Current P - Current S

        // Context month I calculation
        // actual_i = opening_i + actual_p - actual_s
        // However, SKILL.md says actual_i is "Large text box show Actual I" and it can be edited or calculated.
        // Let's assume actual_i is the "Ending Inventory" of the previous month.
        let runningInv = parseInt(p.contextData.actual_i) || 0;

        p.monthsData.forEach(m => {
            m.i = runningInv + (parseInt(m.p) || 0) - (parseInt(m.s) || 0);
            runningInv = m.i;
        });
    },

    renderGrid: function () {
        const grid = this.ui.grid;
        grid.innerHTML = '';
        const p = window.AppState.currentProduct;

        // Labels
        const labels = p.monthsData.map(m => m.date_month.replace('-', '/'));

        // 1. Header
        this.createCell(grid, '月份', 'psi-label-cell');
        labels.forEach((lab, idx) => {
            const cell = this.createCell(grid, lab, 'psi-header-cell');
            cell.onclick = () => this.openEditModal(idx);
            cell.title = "點擊編輯";
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
            const cell = this.createCell(grid, m.i, 'psi-cell i-val');
            if (m.i < 0) cell.style.color = 'red';
        });
    },

    createCell: function (parent, text, className) {
        const div = document.createElement('div');
        div.className = 'psi-cell ' + className;
        div.textContent = text;
        parent.appendChild(div);
        return div;
    },

    renderChart: function () {
        const ctxCanvas = document.getElementById('psi-chart').getContext('2d');
        const p = window.AppState.currentProduct;

        // Prepare 7 Points: Context + 6 Months
        const labels = [p.contextData.date_month, ...p.monthsData.map(m => m.date_month)];
        const dataS = [p.contextData.actual_s, ...p.monthsData.map(m => m.s)];
        const dataP = [p.contextData.actual_p, ...p.monthsData.map(m => m.p)];
        const dataI = [p.contextData.actual_i, ...p.monthsData.map(m => m.i)];

        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctxCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '預測銷售 (S)',
                        data: dataS,
                        borderColor: '#F44336',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        pointRadius: (ctx) => (ctx.dataIndex === 0 ? 8 : 4),
                        pointStyle: (ctx) => (ctx.dataIndex === 0 ? 'circle' : 'circle'),
                        pointBackgroundColor: (ctx) => (ctx.dataIndex === 0 ? '#F44336' : 'white'),
                        pointBorderColor: '#F44336',
                        pointBorderWidth: 2
                    },
                    {
                        label: '預測到貨 (P)',
                        data: dataP,
                        borderColor: '#4CAF50',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        pointRadius: (ctx) => (ctx.dataIndex === 0 ? 8 : 4),
                        pointBackgroundColor: (ctx) => (ctx.dataIndex === 0 ? '#4CAF50' : 'white'),
                        pointBorderColor: '#4CAF50',
                        pointBorderWidth: 2
                    },
                    {
                        label: '庫存預測 (I)',
                        data: dataI,
                        borderColor: '#000000',
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: (ctx) => (ctx.dataIndex === 0 ? 8 : 4),
                        pointBackgroundColor: (ctx) => (ctx.dataIndex === 0 ? '#000000' : 'white'),
                        pointBorderColor: '#000000',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'PSI 庫存趨勢預測 (含上月實績)',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#e2e8f0' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    },

    showError: function (el, msg) {
        el.textContent = msg;
        el.style.display = 'block';
    },

    hideError: function (el) {
        if (el) el.style.display = 'none';
    }
};
