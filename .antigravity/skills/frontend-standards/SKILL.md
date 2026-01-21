---
name: 前端開發規範 (Frontend Standards)
description: 統一的 HTML 結構、全域設計系統與程式碼品質指南。
---

# 前端開發規範技能 (Frontend Standards Skill)

此技能整合了 **程式碼品質 (原 HTML Expert)** 與 **全域設計系統 (Theme)** 的要求。

## 1. 全域設計系統 (Global Design System)
-   **主題**: 白天模式 (Light Mode)。
-   **色彩定義**:
    -   **主色 (Primary)**: 藍色 (`#0056b3`)。
    -   **次色 (Secondary)**: 淺藍色 (`#e3f2fd`)，用於標題背景或高亮。
    -   **背景色**: 極淺灰色 (`#f9f9f9`)。
-   **字體規範**:
    -   Font Family: `'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans TC', Arial, sans-serif`。
    -   語系：**繁體中文 (Traditional Chinese)**（請參閱 `localization-rules`）。
-   **元件樣式**:
    -   **按鈕 (Buttons)**: 藍色背景、白色文字、圓角 (4px)。
    -   **輸入框 (Inputs)**: 1px 實線邊框 (`#ddd`)、圓角 (4px)。
    -   **卡片/容器**: 白色背景、細微陰影 (`box-shadow: 0 1px 3px rgba(0,0,0,0.1)`)。

## 2. HTML 專家指南 (結構與品質)
-   **語意化結構**: 正確使用 `<header>`, `<main>`, `<footer>`。
-   **無障礙設計 (a11y)**:
    -   圖片 **必須** 包含 `alt` 屬性。
    -   互動元素 **必須** 使用正確的標籤 (`<button>`, `<a>`) 或 `role` 屬性。
    -   所有輸入項 **必須** 關聯 `<label>`。
-   **效能優化**:
    -   對下方圖片使用 `loading="lazy"`。
    -   確保包含 `meta charset="UTF-8"` 與 `viewport` 標籤。

## 3. 程式碼慣例
-   **禁止內聯樣式**: 使用 `style.css` 中定義的 CSS 類別。
-   **關注點分離**: 保持結構 (HTML)、樣式 (CSS) 與行為 (JS) 的獨立性。
