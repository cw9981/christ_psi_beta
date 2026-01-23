# Google Apps Script (GAS) 設定與部署指南

本指南說明如何建立與部署 Google Sheets 後端，並支援跨年度 (Sheet-per-Year) 的資料管理與 `wget` 單元測試。

## 1. 資料結構規範 (Sheet-per-Year)

- **分頁命名:** 以年度命名 (例如: `2025`, `2026`)。
- **欄位格式:**
  - `Column A (client)`: 客戶名稱
  - `Column B (model_spec)`: 型號規格
  - `Column C (date_month)`: 日期月份 (YYYY-MM)
  - `Column D (forecast_p)`: 預測到貨 (P)
  - `Column E (forecast_s)`: 預測銷售 (S)
  - `Column F (forecast_i)`: 庫存預測 (I)
  - `Column G (actual_p)`: 實際到貨 (Actual P)
  - `Column H (actual_s)`: 實際銷售 (Actual S)
  - `Column I (actual_i)`: 實際庫存 (Actual I)
  - `Column J (last_updated)`: 最後更新時間

## 2. API 說明與規範



### A. 取得半年PSI資料 (`getPSIContext`)
用於「首頁產品總覽」與「PSI 詳情頁」。
- **資料範圍**: 讀取 **上個月(Context)** + **當前及未來 5 個月(Forecast)**，共 7 個月的資料。
- **目的**: 獲取上個月期末庫存 (`actual_i`) 作為本月計算基礎，並顯示未來半年的趨勢。

- **Method:** `GET`
- **參數:**
  - `action`: `getPSIContext`
  - `client`: 客戶名稱 (選填，未填則查詢所有客戶)
  - `model_spec`: 型號規格 (選填，未填則查詢所有型號)
  - `startMonth`: 起始月份 (YYYY-MM，選填，預設為當前月份)

### B. 取得年度歷史 (`getPSIHistory`)
用於「歷史數據頁」，讀取特定年度 12 個月的資料。

- **Method:** `GET`
- **參數:**
  - `action`: `getPSIHistory`
  - `client`: 客戶名稱
  - `model_spec`: 型號規格
  - `year`: 年度 (YYYY)

### C. 儲存 PSI 資料 (`savePSI`)
執行 PSI 資料更新或新增。若對象年度分頁不存在，應自動建立。

- **Method:** `POST`
- **Payload (JSON):**
  ```json
  {
    "action": "savePSI",
    "psi": [
      {
        "client": "...",
        "model_spec": "...",
        "date_month": "YYYY-MM",
        "forecast_p": 0,
        "forecast_s": 0,
        "forecast_i": 0,
        "actual_p": 0,
        "actual_s": 0,
        "actual_i": 0
      },
      ...
    ]
  }
  ```


## 3. GAS 核心代碼

請將以下代碼貼入 Google Apps Script 編輯器中：

> [!IMPORTANT]
> The Google Apps Script code has been moved to [docs/psi_code.gs](psi_code.gs). Please copy the content from that file into your Google Apps Script project.

## 4. 單元測試 (Unit Test using wget)

部署 Web App 後，您可以使用以下 `wget` 指令在終端機測試 API 是否運作正常。請將 `[URL]` 替換為您的 Web App URL。

- A. 測試讀取 7 個月上下文 (Get Context)
- B. 測試讀取年度歷史 (Get History)
- C. 測試儲存資料 (Post Save)


###  測試指令腳本
完整的測試指令已整理於 `docs/test_psi_api.sh`，包含：
1. **跨年度資料儲存**: 同時寫入 2025 年底與 2026 年初的資料。
2. **Context 讀取驗證**: 驗證是否能正確抓取上個月的期末庫存。
3. **歷史資料查詢**: 驗證單一年度資料讀取。

**使用方式:**
1. 打開 `docs/test_psi_api.sh`。
2. 將 `GAS_URL` 替換為您的 Web App URL。
3. 在終端機執行: `bash docs/test_psi_api.sh`


## 5. 部署說明

1. 點擊 **部署 (Deploy)** > **新增部署 (New deployment)**。
2. 類型選擇 **網頁應用程式 (Web app)**。
3. **執行身分:** 我 (Me)。
4. **誰可以存取:** 任何人 (Anyone)。
5. 複製生成的 **Web App URL** 並更新至前端 `js/api.js`。
6. google 設定權限 
