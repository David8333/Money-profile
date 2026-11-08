# Supabase PostgreSQL 資料庫初始化指南

本文件說明如何為 **Personal Finance Manager (個人財務管理系統)** 在 Supabase 建立正式資料庫結構。

---

## 一、架構特點與工程規範

1. **UUID 主鍵**：所有資料表皆採用 `UUID DEFAULT gen_random_uuid()` 作為主鍵。
2. **金融高精度數值**：所有金額欄位（`amount`, `base_amount`, `opening_balance`）皆使用 `NUMERIC(15, 4)`，匯率使用 `NUMERIC(15, 6)`，嚴禁使用浮點數（FLOAT / DOUBLE）。
3. **行級安全性（Row Level Security, RLS）**：
   - 每張使用者資料表皆包含 `user_id UUID REFERENCES auth.users(id)`。
   - 所有 SELECT, INSERT, UPDATE, DELETE 動作皆強制驗證 `auth.uid() = user_id`。
   - 系統通用資料表（如 `currencies`）設為僅認證使用者唯讀（`TO authenticated USING (true)`）。
4. **去重與資料追蹤機制**：
   - 建立 `import_batches` 記錄匯入檔案雜湊、成功筆數與重複筆數。
   - 建立 `import_row_sources`，透過手機記帳 APP 匯出的 `source_uuid` 以及無 UUID 時的複合交易指紋（`source_fingerprint`）進行兩層去重保護。

---

## 二、7 大資料表清單

| 資料表名稱 | 用途說明 | RLS 原則 |
|---|---|---|
| `currencies` | ISO 4217 系統貨幣（TWD, USD, JPY, EUR, CNY, HKD, KRW, GBP 等） | 全登入使用者唯讀 |
| `categories` | 使用者收支分類（收入與支出、排序、顏色標記） | 本人存取（`user_id`） |
| `accounts` | 使用者帳戶（銀行、現金、信用卡、期初餘額） | 本人存取（`user_id`） |
| `members` | 記帳成員（自己、家人、朋友等） | 本人存取（`user_id`） |
| `transactions` | 核心交易紀錄（支援 income, expense, transfer，關聯分類、帳戶與成員） | 本人存取（`user_id`） |
| `import_batches` | CSV 匯入批次歷史紀錄 | 本人存取（`user_id`） |
| `import_row_sources` | 匯入來源去重與指紋追蹤 | 本人存取（`user_id`） |

---

## 三、快速設定步驟

### 步驟 1：開啟 Supabase 控制台
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 進入您的專案，點擊左側選單的 **SQL Editor**

### 步驟 2：貼上並執行 Migration 腳本
1. 點擊 **New query**
2. 將本專案中的 `/supabase/schema.sql` 內容完整複製並貼上
3. 點擊右下角的 **Run (Ctrl + Enter)** 執行
4. 確認訊息顯示 `Success. No rows returned`

### 步驟 3：取得專案連線金鑰
1. 點擊 Supabase 左側選單最下方的 **Project Settings**（齒輪圖示）
2. 點選 **API** 分頁
3. 複製以下兩個資訊：
   - **Project URL**（格式類似 `https://xxxxxxxxx.supabase.co`）
   - **Project API keys** 中的 **`anon` `public`** 金鑰

### 步驟 4：設定環境變數
在專案根目錄的 `.env` 中設定（注意：絕不可提交至 GitHub）：
```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-publishable-key"
```

---

## 四、初始種子資料

SQL Migration 內建預存程序 `initialize_user_default_data(p_user_id)`，當使用者首次登入時，系統會自動建立：
- **預設分類（19 項）**：飲食、日常用品、機車、大眾運輸、房貸、居家、電話網路、娛樂、交際應酬、醫療保健、服飾、學習深造、美容美髮、稅金、旅遊、其它、工資、獎金、旅遊補助。
- **預設帳戶（3 個）**：華南銀行、Line Bank、信用卡。
- **預設成員（3 位）**：自己、家人、朋友。
- **預設基準幣別**：新台幣（TWD）。

此預存程序具備冪等性（Idempotent），多次執行不會產生重複資料。
