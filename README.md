# Christ PSI  - 庫存預測管理系統 (Inventory Prediction System)

這是一個基於 Web 的庫存預測與管理系統，旨在協助企業進行 PSI (Production, Sales, Inventory) 管理。系統結合了靜態網頁前端與 Google Sheets 後端，提供靈活且低成本的解決方案。

## 專案總覽

- **總覽網站:** [https://cw9981.github.io/christ_psi_beta/](https://cw9981.github.io/christ_psi_beta/)
- **原始碼:** [GitHub Repository](https://github.com/cw9981/christ_psi_beta)

### 技術架構
- **Frontend:** HTML5, Vanilla JavaScript, CSS (Tailwind CSS 規劃中)
- **Backend / Database:** Google Sheets (作為資料庫)
- **API 中介:** Google Apps Script (GAS)

## 主要功能

### 1. 產品總覽 (Home)
- **產品品項列表:** 固定不變 顯示約 40 個定義於 `products.json` 的 客戶+產品。
- **搜尋與篩選:** 支援依據「客戶 (Client)」進行篩選。
- **資料預覽與導出:** 
    - 支援預覽所有產品的 PSI 表格。
    - 支援導出功能 (Json format / Excel)。

### 2. 詳細預測頁面 (Detail Page)
- **PSI 預測模型:** 
    - 針對單一產品進行 6 個月 (當月 + 未來 5 個月) 的庫存預測。
    - **邏輯 (PSI Logic):**
        > **月底庫存 (I) = 上月庫存 + 預測到貨 (P) - 預測銷售 (S)**
    - *註: $P$ (Production/Purchase), $S$ (Sales), $I$ (Inventory)*
    - **顯示方式:** 針對 PC 優化，採用 **橫式緊湊佈局 (Compact Horizontal Layout)**，讓使用者能一眼瀏覽 6 個月的完整數據，無需捲動。
- **互動式圖表:** 頁面下方顯示庫存與銷售趨勢的折線圖 (Line Chart)，視覺化呈現預測結果。

### 3. 設計規範 (Design Guidelines)
- **平台:** **PC First** (不需特別針對手機優化)。
- **主題:** 白天模式 (Light Mode)，主色調為 **藍色 (Blue)**。
- **UI 風格:** 專業、簡潔、高密度資訊顯示。
- **資料編輯:**
    - 可設定「上個月月底庫存」作為初始值。
    - 可編輯未來 6 個月的 P 與 S 數值，系統自動重算 I。
-  載入/儲存 GAS 資料  要出現 UI 等待中 

## 資料與整合 (Google Sheets Integration)

本系統使用 Google Sheets 來讀取與儲存庫存及銷售數據。

### 資料結構
- **Products:** 定義於 `products.json`。
- **Inventory Data (Google Sheets):**
    - 每個產品對應一個 Sheet (分頁)。
    - **欄位格式:** `日期月份`, `預測到貨 (P)`, `預測銷售 (S)`, `庫存 (I)`, `最新編輯時間 (Last Updated)`

### Google Apps Script (GAS) 實作
完整程式碼與部署教學請參考: [Google Apps Script 設定指南](docs/google_apps_script_setup.md)
*(前端透過 API 讀寫 Google Sheets)*

## 快速開始

1. Clone 專案:
   ```bash
   git clone https://github.com/cw9981/christ_psi_beta.git
   ```
2. 開啟 `index.html` 即可在本地瀏覽。

## 授權
MIT License
