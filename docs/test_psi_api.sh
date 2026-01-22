#!/bin/bash

# 設定您的 Web App URL
GAS_URL="https://script.google.com/macros/s/AKfycbw8EunSENH8YfMKzhfrzx5j5WvkjExglIWE-kzBrhHohXPtcykz0Q6s6o1uBfRPwad4/exec"

# 檢查是否已設定 URL
if [ "$GAS_URL" == "YOUR_GAS_WEB_APP_URL_HERE" ]; then
    echo "錯誤: 請先編輯此腳本，將 GAS_URL 替換為您的 Google Apps Script 部署網址。"
    exit 1
fi

echo "=== 1. 測試儲存跨年度 PSI 資料 (Save PSI - Cross Year) ==="
# 儲存 2025-12 (Context) 與 2026-01 (Forecast) 的資料
# 使用真實客戶與型號: SUPERBOND / D3450_250mm×100M
wget --quiet \
     --method=POST \
     --header="Content-Type: application/json" \
     --body-data='{
           "action": "savePSI",
           "psi": [
             { "client": "SUPERBOND", "model_spec": "D3450_250mm×100M", "date_month": "2025-12", "p_value": 100, "s_value": 50, "i_value": 200 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-01", "p_value": 605, "s_value": 1, "i_value": 260 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-02", "p_value": 605, "s_value": 2, "i_value": 88 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-03", "p_value": 605, "s_value": 3, "i_value": 88 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-04", "p_value": 605, "s_value": 4, "i_value": 260 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-05", "p_value": 605, "s_value": 5, "i_value": 88 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-06", "p_value": 605, "s_value": 6, "i_value": 88 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-07", "p_value": 605, "s_value": 7, "i_value": 88 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-08", "p_value": 605, "s_value": 8, "i_value": 260 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-09", "p_value": 605, "s_value": 9, "i_value": 88 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-10", "p_value": 605, "s_value": 10, "i_value": 88 }
           ]
         }' \
     -O - \
     "$GAS_URL"
echo -e "\n"


echo "=== 2. 測試讀取 PSI Context (Get Context) ==="
# 查詢 2026-01 起始的 Context
# 預期結果: 應包含 2025-12 (上個月) + 2026-01 ~ 2026-06 (共 7 個月)
wget --quiet \
     -O - \
     "${GAS_URL}?action=getPSIContext&client=SUPERBOND&model_spec=D3450_250mm×100M&startMonth=2026-09"
echo -e "\n"
wget --quiet \
     -O - \
     "${GAS_URL}?action=getPSIContext&startMonth=2026-09"
echo -e "\n"



echo "=== 3. 測試讀取年度歷史 (Get History) ==="
# 查詢 2025 年的完整歷史數據
wget --quiet \
     -O - \
     "${GAS_URL}?action=getPSIHistory&client=SUPERBOND&model_spec=D3450_250mm×100M&year=2026"
echo -e "\n"