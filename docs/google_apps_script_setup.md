# Google Apps Script (GAS) Setup Guide

本指南將協助您建立 Google Sheets 後端，並透過 Google Apps Script 提供 API 給前端網頁讀寫資料。

## 1. 建立 Google Sheet

1. 前往 [Google Sheets](https://sheets.google.com) 建立一個新的試算表。
2. 命名為 `Christ_PSI_Database` (或您喜歡的名稱)。
3. 記下網址中的 **Spreadsheet ID** (例如: `.../d/1BxiMVs0XRA5.../edit` 中的中間那串亂碼)。

## 2. 設定 Google Apps Script

1. 在試算表中，點選 `擴充功能 (Extensions)` > `Apps Script`。
2. 清空編輯器中的內容，複製並貼上以下程式碼。

### 完整程式碼 (Code.gs)

```javascript
/**
 * Christ PSI System - Backend API
 * Handles interactions between the Frontend and Google Sheets.
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ★ 請在此填入您的試算表 ID (如果腳本綁定在該試算表，可省略並使用 getActiveSpreadsheet)

// 定義資料欄位索引
const COL_DATE = 0; // A欄
const COL_P = 1;    // B欄 (預測到貨)
const COL_S = 2;    // C欄 (預測銷售)
const COL_I = 3;    // D欄 (月底庫存)
const COL_LAST_UPDATED = 4; // E欄 (最新編輯時間)

/**
 * 處理 GET 請求 - 讀取資料
 * 用法: ?action=getAll
 */
function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  
  if (action === 'getAll') {
    return getAllData();
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid action'}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 POST 請求 - 儲存資料
 * Body: { productKey: "Client|Model|Size", data: [...] }
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const productKey = postData.productKey;
    const newData = postData.data; // Array of {date, p, s, i}
    
    // 檢查或建立 Sheet
    const sheetName = sanitizeSheetName(productKey);
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // 初始化標題列
      sheet.appendRow(['Date', 'Production (P)', 'Sales (S)', 'Inventory (I)', 'Last Updated']);
    }
    
    // 清除舊資料 (保留標題)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
    }
    
    // 準備寫入的資料陣列
    if (newData && newData.length > 0) {
      const timestamp = new Date().toLocaleString(); // 統一使用伺服器時間或由前端傳入
      const rows = newData.map(item => [
        item.date,
        item.p || 0,
        item.s || 0,
        item.i || 0,
        item.lastUpdated || timestamp // 優先使用前端傳的時間，否則用當下時間
      ]);
      
      sheet.getRange(2, 1, rows.length, 5).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 取得所有產品的資料
 * Return: { "Client|Model|Size": [ {date, p, s, i}, ... ], ... }
 */
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const result = {};
  
  sheets.forEach(sheet => {
    const name = sheet.getName();
    // 簡單過濾掉非產品的 Sheet (如果有)
    if (name === 'Config' || name.startsWith('Sheet')) return; 
    
    // 還原 Sheet Name 為 Product Key (如果之前有做字元取代)
    const productKey = desanitizeSheetName(name);
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      result[productKey] = [];
      return;
    }
    
    const values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    const productData = values.map(row => ({
      date: row[0],
      p: row[1],
      s: row[2],
      i: row[3],
      lastUpdated: row[4]
    }));
    
    result[productKey] = productData;
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper: 處理 Sheet 名稱 (Google Sheets 不支援某些字元作為名稱)
function sanitizeSheetName(key) {
  // 將 | 替換為 __ (或其他安全字元)
  return key.replace(/\|/g, '__');
}

function desanitizeSheetName(name) {
  return name.replace(/__/g, '|');
}

/**
 * 初始化函式 (手動執行一次)
 * 根據 products.json 結構預先建立所有 Sheet (可選)
 */
function setupSheets() {
  // 您可以將 products.json 的內容貼入這裡進行初始化
  const products = [
    // 範例
    {"client": "ClientA", "model": "ModelA", "size": "L"},
    // ... 
  ];
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  products.forEach(p => {
    const key = `${p.client}|${p.model}|${p.size}`;
    const sheetName = sanitizeSheetName(key);
    if (!ss.getSheetByName(sheetName)) {
      const sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['Date', 'Production (P)', 'Sales (S)', 'Inventory (I)', 'Last Updated']);
    }
  });
}
```

## 3. 部署 Web App

1. 點擊右上角 **部署 (Deploy)** > **新增部署 (New deployment)**。
2. 點擊左側齒輪圖示，選擇 **網頁應用程式 (Web app)**。
3. 設定如下:
   - **說明 (Description):** PSI API v1
   - **執行身分 (Execute as):** **我 (Me)** (您的 Google 帳號) -> *重要！*
   - **誰可以存取 (Who has access):** **任何人 (Anyone)** -> *重要！這是為了讓前端網頁能存取*
4. 點擊 **部署 (Deploy)**。
5. 授權存取 (Authorize access) -> 選擇您的帳號 -> 進階 (Advanced) -> 前往 (Go to...) -> 允許 (Allow)。
6. **複製** 產生的 **Web App URL** (以 `exec` 結尾的網址)。

## 4. 前端整合設定

將複製的 URL 填入您的前端程式碼中 (例如 `config.js` 或直接在 `index.html` 的變數中)。

```javascript
const GAS_API_URL = "https://script.google.com/macros/s/......./exec";
```

---

## 實作過程說明

1. **資料模型設計:**
   我們利用 Google Sheets 的分頁 (Sheet) 特性，將每一個「產品」對應到一個「分頁」。
   - `Product Key`: 由 `Model|Size|Client` 組成唯一鍵值。
   - `Sheet Name`: 為了避免特殊字元問題，將 `|` 轉換為 `__`。

2. **API 設計:**
   - **GET:** 一次性拉取所有 Sheet 的資料，減少請求次數 (Batch Fetch)。前端收到 JSON 後再自行分配給各個產品。
   - **POST:** 針對單一產品更新資料。每次儲存時，會先清空該 Sheet 的舊數據 (保留標題)，再寫入新的 PSI 數據。

3. **安全性:**
   設定為「Anyone」允許匿名讀寫，適合內部工具或原型開發。若需更高安全性，需加入 Token 驗證機制。
