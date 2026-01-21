# Google Apps Script (GAS) 設定與部署指南

本指南說明如何建立與部署 Google Sheets 後端，並支援跨年度 (Sheet-per-Year) 的資料管理與 `wget` 單元測試。

## 1. 資料結構規範 (Sheet-per-Year)

- **分頁命名:** 以年度命名 (例如: `2025`, `2026`)。
- **欄位格式:**
  - `Column A (client)`: 客戶名稱
  - `Column B (model_spec)`: 型號規格
  - `Column C (date_month)`: 日期月份 (YYYY-MM)
  - `Column D (p_value)`: 預測到貨 (P)
  - `Column E (s_value)`: 預測銷售 (S)
  - `Column F (i_value)`: 庫存預測 (I)
  - `Column G (last_updated)`: 最後更新時間

## 2. GAS 核心代碼範例

請將以下代碼貼入 Google Apps Script 編輯器中：

```javascript
/**
 * Christ PSI System - GAS Backend
 */

function doGet(e) {
  const action = e.parameter.action;
  const client = e.parameter.client;
  const modelSpec = e.parameter.model_spec;

  if (action === 'getContext') {
    // 讀取 7 個月資料 (跨年度邏輯)
    return fetchContext(client, modelSpec, e.parameter.startMonth);
  }
  
  if (action === 'getHistory') {
    // 讀取單一年度 12 個月資料
    return fetchHistory(client, modelSpec, e.parameter.year);
  }

  return makeResponse({ status: 'error', message: 'Invalid Action' });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  if (payload.action === 'saveData') {
    return saveData(payload);
  }
  return makeResponse({ status: 'error', message: 'Invalid Action' });
}

function saveData(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rows = payload.rows; // Array of {date_month, p, s, i}
  
  rows.forEach(row => {
    const year = row.date_month.split('-')[0];
    let sheet = ss.getSheetByName(year);
    if (!sheet) {
      sheet = ss.insertSheet(year);
      sheet.appendRow(['client', 'model_spec', 'date_month', 'p_value', 's_value', 'i_value', 'last_updated']);
    }
    // TODO: 實作增量更新邏輯 (Find row by client + model + month and update)
  });
  
  return makeResponse({ status: 'success' });
}

function makeResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. 單元測試 (Unit Test using wget)

部署 Web App 後，您可以使用以下 `wget` 指令在終端機測試 API 是否運作正常。請將 `[URL]` 替換為您的 Web App URL。

### A. 測試讀取 7 個月上下文 (Get Context)
```bash
curl -L -w "\n\n--- 耗時: %{time_total} 秒 ---\n" "[URL]?action=getContext&client=SUPERBOND&model_spec=D3450&startMonth=2025-12"

```

### B. 測試讀取年度歷史 (Get History)
```bash
curl -L -w "\n\n--- 耗時: %{time_total} 秒 ---\n" "[URL]?action=getContext&client=SUPERBOND&model_spec=D3450&year=2026"

```

### C. 測試儲存資料 (Post Save)
由於 GAS `doPost` 不支援簡單的 `-d` 參數傳送 JSON (因重新導向問題)，建議使用以下方式或透過前端 `fetch` 測試：
```bash
curl -L -X POST -H "Content-Type: application/json" \
     -d '{"action":"saveData", "client":"SUPERBOND", "model_spec":"D3450", "rows":[{"date_month":"2026-01","p_value":100,"s_value":50,"i_value":50}]}' \
     "[URL]"
```

## 4. 進階驗證與測試方法 (Advanced Testing)

除了 `wget` 外，以下是更專業的驗證方式：

### A. GAS 內部開發測試 (推薦)
在 GAS 編輯器中建立一個 `testMain` 函式，直接執行以模擬 API 入口，不需經過 Web 部署即可調試。

```javascript
// 在 Code.gs 中新增測試函式
function test_fetchContext() {
  const dummyEvent = {
    parameter: {
      action: 'getContext',
      client: 'SUPERBOND',
      model_spec: 'D3450_250mm×100M',
      startMonth: '2025-12'
    }
  };
  const result = doGet(dummyEvent);
  Logger.log(result.getContent());
}
```
*   **優點:** 可以直接看 `Logger.log` 的詳細輸出，且不需要每次修改都重新部署版本。

### B. 使用 Postman / Thunder Client
如果您使用 VS Code，可以使用 [Thunder Client](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client) 或 [Postman](https://www.postman.com/)。
- 建立一個 **POST** 請求。
- **Body** 選擇 `JSON`。
- **Redirects:** 確保勾選「Follow Redirects」(因為 GAS 會進行 302 導向)。

### C. 建立「測試日誌」Sheet
在 GAS 中實作一個 `logToSheet` 函式，將每一次 API 請求的 Payload 記錄在試算表中。

```javascript
function logToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('System_Logs');
  if (!logSheet) logSheet = ss.insertSheet('System_Logs');
  logSheet.appendRow([new Date(), JSON.stringify(data)]);
}
```

## 5. 部署說明

1. 點擊 **部署 (Deploy)** > **新增部署 (New deployment)**。
2. 類型選擇 **網頁應用程式 (Web app)**。
3. **執行身分:** 我 (Me)。
4. **誰可以存取:** 任何人 (Anyone)。
5. 複製生成的 **Web App URL** 並更新至前端 `js/api.js`。
