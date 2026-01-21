---
name: Google 表格連接器 (Google Sheets Connector)
description: 透過 Google Apps Script (GAS) 連接 Google Sheets 的專家指南。
---

# Google 表格連接器技能 (Google Sheets Connector Skill)

## 定義
當使用者需要從 Google Sheets 後端 **讀取** 或 **寫入** 資料時，請使用此技能。

## 規則

1.  **傳輸機制**: 
    - 必須使用原生 `fetch` 進行所有 API 請求。
    - 除非明確要求，否則不要使用第三方 HTTP 請求函式庫。

2.  **請求處理**:
    - **讀取資料**: 預設使用 `fetch(url)`。若 GAS 端的 `doGet` 有快取問題，可考慮加上時間戳參數 (e.g. `?v=timestamp`)。
    - **寫入資料**: 使用 `doPost` 並確保 payload 正確傳送。
    - **CORS**: 記住 GAS 網網頁應用程式會進行重新導向。`fetch` 會自動處理導向，但需確保 GAS 的 `ContentService` 已正確處理輸出。

3.  **UI 反饋**:
    - **載入狀態**: 當發起資料請求時，**必須** 在 UI 中顯示明顯的「載入中...」指示器。
    - 指示器必須保持顯示，直到請求完成（成功或失敗）為止。

4.  **錯誤處理**:
    - 檢查 `response.ok`。
    - 若回應非 200 OK，或 JSON 內容包含錯誤字元，**必須** 以跳出視窗 (`alert`) 告知使用者錯誤訊息。
    - 使用 `console.error` 記錄詳細的調試資訊。

## 範例模式

```javascript
async function fetchData(url) {
  showLoading(true); // 顯示指示器的實作
  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP 錯誤！狀態碼：${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (e) {
    alert('資料載入失敗：' + e.message);
    console.error(e);
  } finally {
    showLoading(false); // 隱藏指示器
  }
}
```
