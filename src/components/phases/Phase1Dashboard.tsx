import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  Layers,
  Database,
  Shield,
  FileCode2,
  GitBranch,
  ArrowRight,
  Server,
  Key,
  Copy,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Settings2,
  FolderTree
} from 'lucide-react';

interface Phase1DashboardProps {
  isConfigured: boolean;
  onOpenSetupGuide: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const Phase1Dashboard: React.FC<Phase1DashboardProps> = ({
  isConfigured,
  onOpenSetupGuide,
  onNavigateToTab,
}) => {
  const [copiedEnv, setCopiedEnv] = useState(false);

  const sampleEnv = `VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-publishable-key"`;

  const copyEnv = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const checklistItems = [
    {
      title: '專案環境與相依套件檢查',
      desc: '已配置 React 19、TypeScript 7、Tailwind CSS v4、Lucide 圖示集、Recharts 圖表庫與 @supabase/supabase-js 核心 SDK。',
      status: 'completed',
    },
    {
      title: '模組化目錄架構分離',
      desc: '嚴格分離 UI 元件 (/components)、資料庫服務層 (/services/supabase)、領域型別定義 (/types)、工具函式 (/utils) 與 SQL 移轉檔 (/supabase)。',
      status: 'completed',
    },
    {
      title: 'Supabase 連線與安全性保護層',
      desc: '建立安全客戶端連線池，自動偵測環境變數完整性，防止因缺少金鑰造成未捕捉的 Runtime 崩潰；實裝 RLS 身份隔離原則。',
      status: 'completed',
    },
    {
      title: '完整 PostgreSQL Migration 腳本',
      desc: '建立 7 大資料表（transactions, categories, accounts, members, currencies, import_batches, import_row_sources），金額一律採 NUMERIC(15,4)。',
      status: 'completed',
    },
    {
      title: '初始種子資料與預存程序',
      desc: '內建 19 項預設分類（飲食、機車、房貸等）、3 大帳戶（華南銀行、Line Bank、信用卡）與 3 名成員（自己、家人、朋友），並具備避免重複建立之保護。',
      status: 'completed',
    },
    {
      title: '資料庫初始化與 GitHub 版本管理指南',
      desc: '產出詳細 DATABASE_SETUP.md 與 GIT_WORKFLOW.md 文件，嚴格預防敏感個人記帳資料及 Service Role Key 外洩至代碼庫。',
      status: 'completed',
    },
    {
      title: '使用者環境變數設定與資料庫連線驗證',
      desc: '等待使用者提供 Supabase Project URL 及 Publishable Anon Key，並在 Supabase SQL Editor 執行 Migration。',
      status: isConfigured ? 'completed' : 'pending',
    },
  ];

  const dbTables = [
    {
      name: 'transactions',
      rows: 'id (UUID), user_id, transaction_date, type, category_id, amount (NUMERIC), currency, exchange_rate, base_amount, account_id, member_id, note, transfer_group_id',
      note: '核心交易表，金額採 NUMERIC 避免浮點數誤差，支援轉帳與多幣別換算',
    },
    {
      name: 'categories',
      rows: 'id (UUID), user_id, name, type (income/expense), color, is_active, sort_order',
      note: '收支分類，支援自訂顏色與排序，UNIQUE(user_id, name, type)',
    },
    {
      name: 'accounts',
      rows: 'id (UUID), user_id, name, account_type, currency, opening_balance (NUMERIC), is_active',
      note: '資產與負債帳戶（銀行、現金、信用卡），期初餘額',
    },
    {
      name: 'members',
      rows: 'id (UUID), user_id, name, is_active',
      note: '記帳成員（自己、家人、朋友等）',
    },
    {
      name: 'currencies',
      rows: 'code (ISO 4217), name, symbol, decimal_places, is_active',
      note: '支援 TWD, USD, JPY, EUR, CNY, HKD, KRW, GBP，預設基準幣為 TWD',
    },
    {
      name: 'import_batches',
      rows: 'id (UUID), user_id, file_name, file_hash, total_rows, imported_rows, duplicate_rows, error_rows, status',
      note: 'CSV 匯入記錄追蹤，包含檔案雜湊與匯入狀態統計',
    },
    {
      name: 'import_row_sources',
      rows: 'id (UUID), user_id, transaction_id, import_batch_id, source_uuid, source_fingerprint',
      note: '記錄來源 UUID 去重與複合指紋比對，防止重複上傳相同交易',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Phase Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Phase 1 階段檢核：專案架構與 Supabase 資料庫</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Personal Finance Manager 架構建置完成
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              遵循正式商用軟體工程規範，完成前端 React + TypeScript 模組化目錄切分、Supabase PostgreSQL Schema、安全 RLS 原則與環境變數範本。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenSetupGuide}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              <span>查看 SQL Migration 與設定指南</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Checklist & Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Phase 1 Checklist (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Phase 1 執行檢核清單（已完成 6/7 項）</span>
            </h3>

            <div className="space-y-3">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-lg border transition-all ${
                    item.status === 'completed'
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {item.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900">
                          {idx + 1}. {item.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'completed' ? '已就緒' : '待確認'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Directory Structure Visualizer */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <FolderTree className="w-4 h-4 text-slate-700" />
              <span>模組化專案目錄劃分</span>
            </h3>
            <div className="bg-slate-950 text-slate-300 font-mono text-xs p-4 rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
              <pre>{`├── supabase/
│   ├── migrations/
│   │   └── 20261106000000_init_schema.sql  # 完整 PostgreSQL Migration
│   └── schema.sql                          # 一鍵執行之完整結構
├── src/
│   ├── types/
│   │   ├── database.ts                     # Supabase 資料表 TypeScript 定義
│   │   └── finance.ts                      # 財務商業領域與 CSV 匯入模型
│   ├── services/
│   │   └── supabase/
│   │       ├── client.ts                   # 安全連線實體與金鑰偵測
│   │       ├── auth.ts                     # 使用者登入與初始化預存程序
│   │       ├── transactions.ts             # 交易查詢、篩選與寫入
│   │       ├── categories.ts               # 分類維護與預設分類
│   │       ├── accounts.ts                 # 帳戶維護與期初餘額
│   │       ├── members.ts                  # 記帳成員資料庫操作
│   │       └── currencies.ts               # ISO 4217 貨幣管理
│   ├── components/
│   │   ├── layout/                         # Header, Sidebar, MobileNav, Layout
│   │   ├── common/                         # 狀態橫幅、按鈕、通用卡片
│   │   ├── setup/                          # 資料庫初始化教學 Modal
│   │   └── phases/                         # 階段檢核儀表板
│   ├── hooks/                              # useAuth, useSupabaseConfig
│   └── utils/                              # 貨幣換算、日期處理、格式化
└── docs/
    ├── DATABASE_SETUP.md                   # 資料庫初始化操作說明
    └── GIT_WORKFLOW.md                     # GitHub 版本控制與安全守則`}</pre>
            </div>
          </div>
        </div>

        {/* Right: Database Schema & Env Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Supabase Connection Setup Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-emerald-600" />
              <span>環境變數設定說明 (.env)</span>
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              請在您的本機 <code>.env</code> 或 AI Studio Secrets 設定以下變數：
            </p>

            <div className="relative">
              <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 rounded-lg border border-slate-800 overflow-x-auto">
                <pre>{sampleEnv}</pre>
              </div>
              <button
                onClick={copyEnv}
                className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEnv ? '已複製' : '複製'}</span>
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
              <div className="font-semibold text-slate-700">安全提醒：</div>
              <div>• 絕不將 Service Role Key 放在前端。</div>
              <div>• 所有查詢均透過 Row Level Security (RLS) 保障資料隔離。</div>
            </div>
          </div>

          {/* Database Tables Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-700" />
                <span>7 大 PostgreSQL 資料表</span>
              </h3>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                RLS 全部啟用
              </span>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {dbTables.map((t) => (
                <div key={t.name} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/70 hover:bg-white transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800">{t.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">UUID PK</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">{t.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 2 Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-xs">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Phase 2 開發完成：CSV 智慧匯入引擎</span>
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              手機記帳 CSV 匯入與 UUID 去重引擎已就緒
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              支援 UTF-8、自動辨識欄位名稱（不依賴固定欄位順序）、UUID 去重、無 UUID 交易指紋識別、不存在分類/帳戶動態建立、0元合法保留與資料預覽確認。
            </p>
            <button
              onClick={() => onNavigateToTab('import')}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>立即前往 CSV 匯入功能</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
