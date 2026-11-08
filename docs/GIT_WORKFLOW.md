# GitHub 版本管理與安全作業建議 (Git Workflow & Security)

為確保 **Personal Finance Manager** 符合商業軟體之品質要求與隱私保護標準，請參照以下規範進行版本管理與持續整合。

---

## 一、嚴格隱私與資安保護原則（最高警戒）

### 1. 嚴禁提交敏感財務資料
個人匯出的記帳 CSV、Excel 試算表或本機 JSON 備份檔，**絕對不可**納入 Git 版本控管。
`.gitignore` 已包含以下規則：
```gitignore
# 財務私密資料與本機備份
*.csv
*.tsv
*.xlsx
*.bak
*backup*.json
*finance_export*
```

### 2. 嚴禁提交 Service Role Key 與機密金鑰
- **Service Role Key** 擁有略過 PostgreSQL RLS 的最高管理者權限，**永遠不得**寫入前端代碼或提交至 GitHub。
- `.env` 與 `.env.local` 必須列入 `.gitignore`，僅維護 `.env.example` 作為範本。

---

## 二、推薦分支模型（Branching Strategy）

```
main (生產分支 / Vercel 正式部署環境)
  └── phase-1-architecture (專案架構與資料庫)
  └── phase-2-csv-import   (CSV 匯入引擎)
  └── phase-3-transactions (手動記帳與交易明細)
  └── phase-4-dashboard    (統計儀表板)
  └── phase-5-currencies   (多幣別與進階分析)
  └── phase-6-backup-deploy(JSON 備份與上線驗證)
```

1. **`main` 分支**：保護分支，僅允許通過測試與驗證的程式碼合併；連接 Vercel Production 自動部署。
2. **`phase-*` 功能分支**：每完成一個開發階段並經確認無誤後，發起 Pull Request (PR) 進行合併。

---

## 三、Commit 語意化命名規範 (Conventional Commits)

建議採用標準語意化 Commit 格式：
`<type>(<scope>): <subject>`

- `feat(db)`: 新增 transactions 與 RLS 移轉腳本
- `feat(csv)`: 實裝 UTF-8 CSV 解析與 UUID 去重邏輯
- `feat(auth)`: 串接 Supabase 驗證與使用者預設資料初始化
- `fix(import)`: 修復無 UUID 交易之指紋比對問題
- `style(ui)`: 優化手機版底部導覽列觸控區域
- `docs(db)`: 新增資料庫初始化與 Migration 說明文件

---

## 四、Vercel 部署注意事項

1. **環境變數設定**：
   在 Vercel 專案設定中的 **Environment Variables**，填入：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **建置指令**：
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. **SPA 路由重導向 (Rewrites)**：
   若使用客戶端路由，需在專案根目錄確認 `vercel.json` 包含 SPA rewrites 規則。
