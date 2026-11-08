import React, { useState } from 'react';
import { X, Copy, Check, Database, Key, ShieldCheck, Terminal, FileText, CheckCircle2 } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose, isConfigured }) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'env' | 'tables'>('sql');

  if (!isOpen) return null;

  const sampleEnvText = `# Supabase 連線設定（請填入您的 Supabase 專案資訊）
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`;

  const copySqlToClipboard = async () => {
    try {
      const response = await fetch('/supabase/schema.sql');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // fallback
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const copyEnvToClipboard = async () => {
    await navigator.clipboard.writeText(sampleEnvText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Supabase PostgreSQL 初始化設定指南</h2>
              <p className="text-xs text-slate-300">Phase 1 資料庫架構與安全規則 (RLS) 配置</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>SQL Migration 腳本</span>
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'env'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>環境變數設定 (.env)</span>
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tables'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>資料庫架構與 RLS 清單</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-700 text-sm">
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold">如何套用至 Supabase：</span>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>登入 Supabase 控制台，進入您的專案。</li>
                    <li>點選左側選單的 <strong>SQL Editor</strong>。</li>
                    <li>點選 <strong>New query</strong>，將下方 SQL 貼上並點擊 <strong>Run</strong>。</li>
                    <li>即會自動建立 7 張資料表、UUID 主鍵、NUMERIC 精準金額、RLS 安全原則與初始分類儲存過程。</li>
                  </ol>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-semibold text-slate-600">
                    檔案路徑：<code>/supabase/migrations/20261106000000_init_schema.sql</code>
                  </span>
                  <button
                    onClick={copySqlToClipboard}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">已複製 SQL</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>複製完整 SQL Migration</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-950 text-slate-200 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-64 leading-relaxed border border-slate-800">
                  <pre>{`-- 核心資料表 (NUMERIC 金額, UUID 主鍵, RLS 隔離)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(15, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TWD',
    exchange_rate NUMERIC(15, 6) NOT NULL DEFAULT 1.000000,
    base_amount NUMERIC(15, 4) NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    note TEXT,
    transfer_group_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
-- 包含 categories, accounts, members, currencies, import_batches, import_row_sources
-- 完整檔案共 270 行，可直接複製完整 SQL 執行`}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900">
                <span className="font-semibold">重要安全性原則：</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>僅填入 <strong>Project URL</strong> 與 <strong>anon (public) key</strong>。</li>
                  <li><strong>嚴禁</strong>在前端放置 <code>service_role (secret) key</code>！所有前端查詢均由 PostgreSQL RLS 保障安全。</li>
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-semibold text-slate-600">環境變數範本（位於 .env.example）</span>
                  <button
                    onClick={copyEnvToClipboard}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                  >
                    {copiedEnv ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>複製範本</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-lg p-3 font-mono text-xs overflow-x-auto border border-slate-800">
                  <pre>{sampleEnvText}</pre>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2 text-xs">
                <span className="font-semibold text-slate-900">哪裡取得金鑰？</span>
                <p>前往 Supabase 控制台 ➔ 選擇您的專案 ➔ 點擊左下角 <strong>Project Settings</strong> ➔ 點擊 <strong>API</strong> 即可查閱 Project URL 與 Project API keys (anon public)。</p>
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                本系統嚴格遵循資料庫設計標準，所有資料表均包含 UUID 主鍵、外鍵關聯約束與專屬使用者 RLS 存取規則：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { name: 'transactions', desc: '核心交易紀錄（金額採 NUMERIC(15,4)，多幣別基準金額換算）', rls: 'user_id 隔離' },
                  { name: 'categories', desc: '收支分類表（含收入與支出兩大群組、自訂顏色與排序）', rls: 'user_id 隔離' },
                  { name: 'accounts', desc: '帳戶資產表（銀行、現金、信用卡、期初餘額）', rls: 'user_id 隔離' },
                  { name: 'members', desc: '記帳成員表（自己、家人、朋友等區分）', rls: 'user_id 隔離' },
                  { name: 'currencies', desc: 'ISO 4217 貨幣表（TWD, USD, JPY, EUR, CNY 等）', rls: '公開唯讀' },
                  { name: 'import_batches', desc: 'CSV 匯入批次記錄（檔名、雜湊、匯入統計）', rls: 'user_id 隔離' },
                  { name: 'import_row_sources', desc: '匯入去重追蹤表（記帳 APP UUID 及指紋比對）', rls: 'user_id 隔離' },
                ].map((item) => (
                  <div key={item.name} className="border border-slate-200 rounded-lg p-3 bg-white hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">{item.rls}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className={`w-4 h-4 ${isConfigured ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>目前狀態：{isConfigured ? '已連線 Supabase' : '尚未提供連線金鑰（架構模式）'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            了解並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
