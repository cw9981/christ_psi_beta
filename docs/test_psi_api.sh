#!/bin/bash

# 設定您的 Web App URL
GAS_URL="https://script.google.com/macros/s/AKfycbw8EunSENH8YfMKzhfrzx5j5WvkjExglIWE-kzBrhHohXPtcykz0Q6s6o1uBfRPwad4/exec"

# 檢查是否已設定 URL
if [ "$GAS_URL" == "YOUR_GAS_WEB_APP_URL_HERE" ]; then
    echo "錯誤: 請先編輯此腳本，將 GAS_URL 替換為您的 Google Apps Script 部署網址。"
    exit 1
fi

echo "=== 1. 測試儲存跨年度 PSI 資料 (Save PSI - Cross Year) ==="
# 儲存 2025-12 (Context - Actuals) 與 2026-01 (Forecast) 的資料
# 使用真實客戶與型號: SUPERBOND / D3450_250mm×100M
# 注意: Payload 已更新為 forecast_* 與 actual_* 欄位
wget --quiet \
     --method=POST \
     --header="Content-Type: application/json" \
     --body-data='{
           "action": "savePSI",
           "psi": [
             { "client": "SUPERBOND", "model_spec": "D3450_250mm×100M", "date_month": "2025-12", "forecast_p": 600, "forecast_s": 1, "forecast_i": 260, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-01", "forecast_p": 605, "forecast_s": 1, "forecast_i": 260, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-02", "forecast_p": 605, "forecast_s": 2, "forecast_i": 88, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-03", "forecast_p": 605, "forecast_s": 3, "forecast_i": 88, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-04", "forecast_p": 605, "forecast_s": 4, "forecast_i": 260, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-05", "forecast_p": 605, "forecast_s": 5, "forecast_i": 88, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-06", "forecast_p": 605, "forecast_s": 6, "forecast_i": 88, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-07", "forecast_p": 605, "forecast_s": 7, "forecast_i": 88, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-08", "forecast_p": 605, "forecast_s": 8, "forecast_i": 260, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-09", "forecast_p": 605, "forecast_s": 9, "forecast_i": 88, "actual_p": 0, "actual_s": 0, "actual_i": 0 },
             { "client": "AVARY", "model_spec": "NP605_400mm×100M", "date_month": "2026-10", "forecast_p": 605, "forecast_s": 10, "forecast_i": 88,"actual_p": 0, "actual_s": 0, "actual_i": 0 }
           ]
         }' \
     -O - \
     "$GAS_URL"
echo -e "\n"


echo "=== 2. 測試讀取 PSI Context (Get Context) ==="
# 查詢 2026-01 起始的 Context
# 預期結果: 應包含 2025-12 (Context Actuals) + 2026-01 ~ 2026-06 (Forecasts)
wget --quiet \
     -O - \
     "${GAS_URL}?action=getPSIContext&client=AVARY&model_spec=NP605_400mm×100M&startMonth=2026-09"
echo -e "\n"
wget --quiet \
     -O - \
     "${GAS_URL}?action=getPSIContext&startMonth=2026-09"
echo -e "\n"



echo "=== 3. 測試讀取年度歷史 (Get History) ==="
# 查詢 2026 年的完整歷史數據
wget --quiet \
     -O - \
     "${GAS_URL}?action=getPSIHistory&client=SUPERBOND&model_spec=D3450_250mm×100M&year=2025"
echo -e "\n"