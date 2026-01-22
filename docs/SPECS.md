# Christ PSI  - 庫存預測管理系統 (Inventory Prediction System)

這是一個基於 Web 的庫存預測與管理系統，旨在協助企業進行 PSI (Production, Sales, Inventory) 管理。系統結合了靜態網頁前端與 Google Sheets 後端，提供靈活且低成本的解決方案。

## 專案總覽

index.html: 主外殼 (App Shell)，負責加載 CSS/JS。
home_list.html: 包含產品清單表格、篩選器以及「新增產品」的對話框。
psi_detail.html: 包含 PSI 預測網格、初始庫存輸入、趨勢圖表以及「編輯月份」的對話框。
psi_history.html: 包含年度歷史視圖的表格。

### 技術架構
- **Frontend:** 純 HTML, HTML5, Vanilla JavaScript, CSS 
- **Backend / Database:** Google Sheets (作為資料庫)
- **API 中介:** Google Apps Script (GAS)

## 主要功能

### 1. 產品總覽 (Home List)
> **UI 規範:** 請參閱 `.antigravity/skills/product-list-view/SKILL.md`

- **Title 顯示:** 顯示當前月份，例如 "2026 年 1 月"。
- **資料來源:** 
    - 列表資料: Mock / GAS API (Active Products).
    - 篩選資料: `client.json`.
    - 新增選項: `products.json`.

### 2. 詳細預測頁面 (PSI Detail)
> **UI 規範:** 請參閱 `.antigravity/skills/psi-detail-view/SKILL.md`

- **功能重點:**
    - 6 個月 PSI 預測。
    - 點擊編輯 (Click-to-Edit) 模式。
    - 前端即時庫存遞移計算 (Inventory Rolling Calculation).

### 3. 年度歷史視圖 (Yearly History)
> **UI 規範:** 請參閱 `.antigravity/skills/psi-history-view/SKILL.md`

- **功能:** 檢視特定產品在一整年度的 PSI 歷史數據。
- **年度切換:** 支援下拉選單切換年份 (如 2024, 2025, 2026)。
- **資料來源:** 從對應年度的 Sheet 分頁讀取。

### 4. 設計規範 (Design Guidelines)
- **語言:** 全站使用 **繁體中文 (Traditional Chinese)** (參閱 `localization-rules`).
- **Footer (頁尾):**
    - 顯示版權宣告: `Copyright © 2026 Christ Huang. Developed by CW9981.`
    - 顯示兩個圖示 (Icons): Christ Logo, CW9981 Logo。
- **UI 風格:** 專業、簡潔、高密度資訊顯示。
- **Loading 狀態:** 發起 GAS 請求時需顯示全域載入指示器。

## 資料與整合 (Google Sheets Integration)

本系統使用 Google Sheets 作為後端資料庫，透過 Google Apps Script (GAS) 進行 API 介接。

### 應用場景
- 產品總覽 (Home List)：
從 API 取得半年度 PSI 資料。資料包含兩個部分：
上個月的 i_value：即庫存預測值 (I)。
當前月份起連續六個月的 PSI 資料列表。

- 年度歷史視圖 (Yearly History)：
從 API 取得完整年度的 PSI 歷史資料。


### 資料與部署規範
完整的資料結構定義、GAS 程式碼範例以及單元測試指令，請參閱專屬文件：

> [!IMPORTANT]
> **[Google Apps Script 設定與部署指南](gas_setup.md)**

### 核心整合要求
- **年度分頁:** 資料依年度 (如 `2025`, `2026`) 分頁儲存。
- **跨年讀取:** 前端請求資料時，GAS 需具備自動合併跨年度數據的能力。
- **自動化維護:** 儲存新年度資料時，若該年度分頁不存在，應由 GAS 自動建立。
- **測試:** 支援使用 `wget` 進行 API 功能驗證。 



