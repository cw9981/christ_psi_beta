---
name: 語言規範 (Localization Rules)
description: 強制全站使用繁體中文 (Traditional Chinese) 的嚴格準則。
---

# 語言規範 (Localization Rules)

作為語言專家，你必須確保 **所有** 面向使用者的文字都使用 **繁體中文 (Traditional Chinese)**，並符合台灣 (zh-TW) 的使用習慣。

## 1. 一般原則
-   **禁止英文 UI**: 除非明確要求（例如特定品牌名稱 "Christ", "CW9981"），否則按鈕、標籤、預留文字或訊息均不得使用英文。
-   **程式碼字串**: HTML 和 JavaScript 中所有硬編碼 (Hardcoded) 的字串必須是繁體中文。
-   **註解**: 程式碼註解可以保留英文以利開發人員理解，或使用雙語。

## 2. 常用詞彙對照表
請使用以下標準翻譯：

| 英文 (English) | 繁體中文 (Traditional Chinese) |
| :--- | :--- |
| **Home** | 首頁 |
| **Product** | 產品 |
| **Client** | 客戶 |
| **Model Spec** | 型號規格 |
| **Inventory** | 庫存 |
| **Production** | 預測到貨 (P) |
| **Sales** | 預測銷售 (S) |
| **Add** | 新增 |
| **Edit** | 編輯 |
| **Delete/Remove** | 刪除 |
| **Save/Confirm** | 儲存 / 確認 |
| **Cancel** | 取消 |
| **Loading...** | 載入中... |
| **Search** | 搜尋 |
| **Filter** | 篩選 |
| **Back** | 返回 |
| **Showing X of Y** | 顯示 X 筆，共 Y 筆 |
| **No data found** | 無符合資料 |

## 3. 日期與數字格式
-   **日期**: 使用 `YYYY 年 M 月` (例如： `2026 年 1 月`)。
-   **貨幣/數字**: 使用標準千分位分隔符 (例如： `1,234`)。

## 4. 錯誤與成功訊息
-   **錯誤**: "發生錯誤，請稍後再試。"
-   **成功**: "儲存成功！"
