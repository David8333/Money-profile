import React from 'react';
import { AlertTriangle, Database, CheckCircle, ExternalLink, Key } from 'lucide-react';

interface ConnectionStatusBannerProps {
  isConfigured: boolean;
  onOpenSetupGuide: () => void;
}

export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({
  isConfigured,
  onOpenSetupGuide,
}) => {
  if (isConfigured) {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 sm:px-6 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2 text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">Supabase 雲端資料庫已連線</span>
          <span className="hidden md:inline text-emerald-600 text-xs">（PostgreSQL RLS 防護已就緒）</span>
        </div>
        <button
          onClick={onOpenSetupGuide}
          className="text-xs text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
        >
          <span>查看資料庫結構與說明</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-sky-50 border-b border-sky-200 px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
      <div className="flex items-start sm:items-center space-x-2.5 text-sky-900">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 sm:mt-0 flex-shrink-0" />
        <div>
          <span className="font-semibold text-slate-800">本機離線體驗模式中</span>
          <span className="text-xs text-slate-600 ml-2">
            所有記帳、CSV 匯入、分析圖表與分類帳戶資料均即時保存在目前瀏覽器中（支援完整操作）。
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        <button
          onClick={onOpenSetupGuide}
          className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium shadow-2xs transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>雲端同步設定</span>
        </button>
      </div>
    </div>
  );
};
