---
description: 專門負責 GAS PSI API 的實作查核與邏輯優化。針對每個 API 的特定痛點 (Race Condition, Cross-Year, I/O) 提供強制性實作規範。
---

# GAS API Implementation Specialist

本技能不涉及架構設計，僅專注於 **實作與修復** 下列 API。
當使用者要求實作或重構代碼時，請逐一核對下列 **「API 特定注意事項」**，確保程式碼符合生產環境要求。
程式碼位於 `docs/psi_code.gs`，請直接修改該檔案。
測試碼位於 `docs/test_psi_api.sh`，請直接修改該檔案。

## 1. API: `savePSI` (資料寫入)

這是最關鍵的 API，過去常發生 **寫入衝突** 與 **效能逾時** 問題。實作時必須嚴格遵守：

### 🛑 關鍵注意事項 (Critical Checklist)
1.  **強制併發鎖定 (Mandatory Locking)**
    * **痛點**: 多人同時儲存時，後寫入者會覆蓋先寫入者的資料。
    * **規範**: 進入邏輯前，**必須** 呼叫 `LockService.getScriptLock()`。
    * **設定**: `tryLock(30000)` (等待 30 秒)，若拿不到鎖則報錯 `Server Busy`。
    * **釋放**: 務必在 `finally` 區塊釋放鎖。

2.  **批次處理策略 (Batch Strategy)**
    * **痛點**: 迴圈內逐行 `appendRow` 會導致 Script Timeout。
    * **規範**: 
        * 先將 Payload 中的資料依照 `Year` 分組 (Group by Year)。
        * 針對每個年份，**只開一次 Sheet**，**只讀一次資料 (`getValues`)**，**只寫一次資料 (`setValues`)**。

3.  **記憶體比對 (In-Memory Mapping)**
    * **痛點**: 使用 `TextFinder` 或雙重迴圈查找舊資料太慢。
    * **規範**: 
        * 讀取該年份所有數據後，建立 `Map<Key, RowIndex>` 索引。
        * `Key` 建議組合: `${Client}_${Model}_${Month}`。
        * 透過 Map 判斷是 Update (更新舊列) 還是 Insert (新增列)。

4.  **自動建表 (Auto-Provisioning)**
    * **規範**: 檢查目標年份 (如 `2026`) 的 Sheet 是否存在。若不存在，必須自動 `insertSheet` 並寫入標準 Header (`client`, `model_spec` ...)。

---

## 2. API: `getPSIContext` (主要讀取資料區)

用於「首頁產品總覽」與「PSI 詳情頁」。核心是取得 **上個月庫存 (Context)** + **未來半年預測 (Forecast)**，並將其結構化。

### 🛑 關鍵注意事項 (Critical Checklist)
1.  **跨年度邊界處理 (Cross-Year Boundary)**
    * **痛點**: 當起始月份為 `2025-08` 時，需要六個月範圍會跨越到 `2026` 年。 當起始月份為 `2026-01` 時，需要上個月庫存資料會跨越到 `2025` 年。 
    * **規範**: 
        * 計算出需要的月份清單後 (如 `['2025-12', '2026-01', ...]`)，必須動態判斷涉及哪些年份的 Sheet。
        * 不能只讀取單一年份 Sheet。

2.  **處理缺漏資料 (Handling Missing Data)**
    * **痛點**: 某個年份的 Sheet 可能還沒建立 (例如剛過年)。
    * **規範**: 若計算出的年份 Sheet 不存在，程式碼不能報錯 (Error)，應該視為「該年份無資料」並回傳空陣列，讓前端補 0 處理。

3.  **效能優化 (Read Optimization)**
    * **規範**: 若涉及 2 個年份 (如 2025, 2026)，最多只能呼叫 2 次 `getValues()`。禁止對每個月份都去呼叫一次 Sheet。
    * **邏輯**: 讀取整年資料 -> 在記憶體中 filter 出需要的 7 個月 -> Sort 排序 





### 📋 規格摘要
* **資料範圍**: 起始月份的前 1 個月 (Context) ~ 後 5 個月 (Forecast)，共 7 個月。
* **參數**: `client` (選填), `model_spec` (選填), `startMonth` (預設本月)。

### 📦 回傳資料結構 (Response Structure)
API 回傳的 `data` 必須是一個 Array，每個元素代表一個「產品型號 (`client` + `model_spec`)」，包含三個部分：
1.  **`i_stock`**: 上個月的單筆資料的庫存 (用於顯示期初庫存)。 不存在時是 0。
2.  **`forecast_items`**:  6 個月的資料陣列。
3.  **`last_updated`**: 該型號最新的更新時間。

```json
// 回傳範例
{
  "status": "success",
  "data": [
    {
      "client": "A_Client",
      "model_spec": "Model_X",
      "last_updated": "2026-01-22T10:00:00.000Z", // 來源資料中最新的時間
      "i_stock": 200,
      "forecast_items": [
        { "date_month": "2026-01", "p_value": 100, "s_value": 50, "i_value": 250 },
        { "date_month": "2026-02", ... },
        ... // 共 6 筆
      ]
    },
    ...
  ]
}


---

## 3. API: `getPSIHistory` (讀取歷史)

用於報表分析，資料量較大。

### 🛑 關鍵注意事項 (Critical Checklist)
1.  **防呆機制 (Safety Check)**
    * **規範**: 前端傳來的 `year` 必須轉為字串並檢查 Sheet 是否存在。若不存在，回傳 `success` 但 `data: []`，不要拋出 Exception。

2.  **時區格式化 (Timezone Formatting)**
    * **痛點**: GAS 預設時區可能與 Sheet 不同，導致日期字串 (YYYY-MM) 誤差。
    * **規範**: 讀取日期欄位時，若為 Date 物件，必須使用 `Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM')` 統一格式。

---

## 4. 全局實作守則 (Global Rules)

適用於所有 API 的通用規範。

1.  **輸入防禦 (Input Defense)**: 所有 Handler 第一行必須驗證 `e.parameter` 或 Payload。缺少必要欄位 (如 `action`, `client`) 直接回傳 Error JSON。
2.  **錯誤回傳 (Standard Response)**: 所有 `catch` 區塊捕獲的錯誤，必須包裝成 JSON 回傳 (`{status: 'error', message: '...'}`)，禁止直接讓 Script 當機 (Crash)。
3.  **不可信任前端**: 即使前端說它是數字，後端運算前最好再做一次 `Number()` 或 `parseInt()` 轉換 (特別是 `p_value`, `s_value`)。

## 5. 測試驗證函式 (Verification Functions)

實作完成後，必須提供「內部測試函式」以供驗證 (免部署測試)。

* **`test_savePSI_Flow`**: 模擬 Payload，測試「鎖定」與「跨年份寫入」。
* **`test_getContext_CrossYear`**: 測試從 `12月` 開始抓取，驗證是否能拿到隔年 `1月` 的資料。