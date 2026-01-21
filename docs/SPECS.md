# Christ PSI  - 庫存預測管理系統 (Inventory Prediction System)

這是一個基於 Web 的庫存預測與管理系統，旨在協助企業進行 PSI (Production, Sales, Inventory) 管理。系統結合了靜態網頁前端與 Google Sheets 後端，提供靈活且低成本的解決方案。

## 專案總覽

index.html: 主外殼 (App Shell)，負責加載 CSS/JS。
home_list.html: 包含產品清單表格、篩選器以及「新增產品」的對話框。
psi_detail.html: 包含 PSI 預測網格、初始庫存輸入、趨勢圖表以及「編輯月份」的對話框。


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

### 3. 設計規範 (Design Guidelines)
- **語言:** 全站使用 **繁體中文 (Traditional Chinese)** (參閱 `localization-rules`).
- **Footer (頁尾):**
    - 顯示版權宣告: `Copyright © 2026 Christ Huang. Developed by CW9981.`
    - 顯示兩個圖示 (Icons): Christ Logo, CW9981 Logo。
- **UI 風格:** 專業、簡潔、高密度資訊顯示。
-  載入/儲存 GAS 資料  要出現 UI 等待中 

## 資料與整合 (Google Sheets Integration)

本系統使用 Google Sheets 來讀取與儲存庫存及銷售數據。

### 資料結構
- **Inventory Data (Google Sheets):**
    - 每個產品對應一個 Sheet (分頁)。
    - **欄位格式:** `日期月份`, `預測到貨 (P)`, `預測銷售 (S)`, `庫存 (I)`, `最新編輯時間 (Last Updated)`

### Google Apps Script (GAS) 實作
完整程式碼與部署教學請參考: [Google Apps Script 設定指南](docs/google_apps_script_setup.md)
*(前端透過 API 讀寫 Google Sheets)*

