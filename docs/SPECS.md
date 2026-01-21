# Christ PSI  - 庫存預測管理系統 (Inventory Prediction System)

這是一個基於 Web 的庫存預測與管理系統，旨在協助企業進行 PSI (Production, Sales, Inventory) 管理。系統結合了靜態網頁前端與 Google Sheets 後端，提供靈活且低成本的解決方案。

## 專案總覽

### 技術架構
- **Frontend:** 純 HTML, HTML5, Vanilla JavaScript, CSS 
- **Backend / Database:** Google Sheets (作為資料庫)
- **API 中介:** Google Apps Script (GAS)

## 主要功能

### 1. 產品總覽 (Home)
- **Title 顯示:** 顯示當前月份，例如 "2026 一月"。

- **篩選 (Filter):** 支援依據「客戶 (Client)」進行篩選。
    - **資料來源:** `client.json`。 資料統計：顯示篩選後/總共的筆數  
- **新增功能 (Add):**
    - 提供 "Add" 按鈕。
    - 點擊後彈出對話框 (Dialog)。
    - **輸入欄位:** 
        - 選擇 **Client** (資料來源: `client.json`)。
        - 選擇 **Model Spec** (資料來源: `products.json`)。
        - 設定 **預設庫存 (Default Inventory)** (即上個月月底庫存)。
    - **動作:**確認後進入該產品的 Detail Page。
- **資料預覽與導出:** 
    - 支援預覽所有產品的 PSI 表格。
    - 支援導出功能 (Json format / Excel)。

- **列表顯示:** 改為 **傳統表格 (Table)** 顯示。
    - 每行顯示一筆產品資料。每行都有「編輯」按鈕。
    - **欄位:** Client, Model Spec, 上個月月底庫存 (從 GAS/Mock 載入)。    
    - **動作:**點擊「編輯」按鈕進入該產品的 Detail Page。
    
    
### 2. 詳細預測頁面 (Detail Page)
- **PSI 預測模型:** 
    - 針對單一產品進行 6 個月 (當月 + 未來 5 個月) 的庫存預測。
    - **邏輯 (PSI Logic):**
        > **月底庫存 (I) = 上月庫存 + 預測到貨 (P) - 預測銷售 (S)**
    - *註: $P$ (Production/Purchase), $S$ (Sales), $I$ (Inventory)*
    - **顯示方式:** 參考 Excel UI 風格 (如下圖)，採用橫式佈局。
        - ![Excel UI Reference](excel_ui.jpg)
- **資料編輯:**
    - **預設庫存 (Default Inventory):** 可編輯上個月的庫存數值 (做為初始 I)。
    - **P (預測到貨) & S (預測銷售):** 
        - 當月及未來 5 個月皆可編輯。
        - 點擊月份開啟編輯對話框 (Modal Editing)。
    - **I (庫存):** 自動計算，不可直接編輯。
- **互動式圖表:** 頁面下方顯示庫存與銷售趨勢的折線圖 (Line Chart)，視覺化呈現預測結果。

### 3. 設計規範 (Design Guidelines)
- **語言:** 全站使用 **繁體中文 (Traditional Chinese)**。
- **平台:** **PC First** (不需特別針對手機優化)。
- **主題:** 白天模式 (Light Mode)，主色調為 **藍色 (Blue)**。
- **Footer (頁尾):**
    - 移除 Header 版本號。
    - 顯示版權宣告: `Copyright © 2026 Christ Huang. Developed by CW9981.`
    - 顯示兩個圖示 (Icons): Christ Logo, CW9981 Logo。
- **UI 風格:** 專業、簡潔、高密度資訊顯示。
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

