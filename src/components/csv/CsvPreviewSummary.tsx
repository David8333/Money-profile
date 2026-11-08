import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  Copy,
  AlertTriangle,
  Info,
  Clock,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { CsvValidationSummary } from '../../services/csv/csvValidator';

interface CsvPreviewSummaryProps {
  summary: CsvValidationSummary;
  detectedHeaders: Record<string, string>;
  activeTab: 'all' | 'valid' | 'duplicate' | 'error';
  onSelectTab: (tab: 'all' | 'valid' | 'duplicate' | 'error') => void;
}

export const CsvPreviewSummary: React.FC<CsvPreviewSummaryProps> = ({
  summary,
  detectedHeaders,
  activeTab,
  onSelectTab,
}) => {
  const hasMissingMetadata =
    summary.missingCategories.length > 0 ||
    summary.missingAccounts.length > 0 ||
    summary.missingMembers.length > 0;

  return (
    <div className="space-y-4">
      {/* 4 Cards Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <button
          onClick={() => onSelectTab('all')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTab === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              總筆數
            </span>
            <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'all' ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-bold mt-2 tracking-tight">
            {summary.totalRows}
          </div>
          <p className={`text-[11px] mt-1 ${activeTab === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            檔案解析總紀錄
          </p>
        </button>

        {/* Valid */}
        <button
          onClick={() => onSelectTab('valid')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'valid'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white border-emerald-200 text-slate-800 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTab === 'valid' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              可匯入筆數
            </span>
            <CheckCircle className={`w-4 h-4 ${activeTab === 'valid' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold mt-2 tracking-tight ${activeTab === 'valid' ? 'text-white' : 'text-emerald-600'}`}>
            {summary.validCount}
          </div>
          <p className={`text-[11px] mt-1 ${activeTab === 'valid' ? 'text-emerald-100' : 'text-slate-500'}`}>
            通過驗證無重複
          </p>
        </button>

        {/* Duplicate */}
        <button
          onClick={() => onSelectTab('duplicate')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'duplicate'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white border-amber-200 text-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTab === 'duplicate' ? 'text-amber-100' : 'text-amber-700'}`}>
              重複筆數
            </span>
            <Copy className={`w-4 h-4 ${activeTab === 'duplicate' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold mt-2 tracking-tight ${activeTab === 'duplicate' ? 'text-white' : 'text-amber-600'}`}>
            {summary.duplicateCount}
          </div>
          <p className={`text-[11px] mt-1 ${activeTab === 'duplicate' ? 'text-amber-100' : 'text-slate-500'}`}>
            UUID 或指紋已存在
          </p>
        </button>

        {/* Error */}
        <button
          onClick={() => onSelectTab('error')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'error'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white border-rose-200 text-slate-800 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTab === 'error' ? 'text-rose-100' : 'text-rose-700'}`}>
              錯誤筆數
            </span>
            <AlertTriangle className={`w-4 h-4 ${activeTab === 'error' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold mt-2 tracking-tight ${activeTab === 'error' ? 'text-white' : 'text-rose-600'}`}>
            {summary.errorCount}
          </div>
          <p className={`text-[11px] mt-1 ${activeTab === 'error' ? 'text-rose-100' : 'text-slate-500'}`}>
            格式不符或必填遺漏
          </p>
        </button>
      </div>

      {/* Duplicate Re-import Notification */}
      {summary.existingBatch && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">重複匯入提醒：</span>
            本檔案雜湊與先前的匯入批次比對一致（先前曾於 {new Date(summary.existingBatch.createdAt).toLocaleString('zh-TW')} 匯入過 {summary.existingBatch.totalRows} 筆）。系統已自動辨識並略過已經存在之資料。
          </div>
        </div>
      )}

      {/* Missing Metadata Notice */}
      {hasMissingMetadata && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>偵測到尚未建立之分類、帳戶或成員（確認匯入時將自動建立）</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {summary.missingCategories.map(cat => (
                <span key={cat} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                  + 新分類：{cat}
                </span>
              ))}
              {summary.missingAccounts.map(acc => (
                <span key={acc} className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">
                  + 新帳戶：{acc}
                </span>
              ))}
              {summary.missingMembers.map(mem => (
                <span key={mem} className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-medium">
                  + 新成員：{mem}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Column Auto-Mapping Indicator */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>自動欄位名稱配對結果：</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(detectedHeaders).map(([key, col]) => (
            <span
              key={key}
              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-600"
            >
              <strong className="text-slate-800">{col}</strong>
              <span className="text-slate-400 ml-1">➔ {key}</span>
            </span>
          ))}
          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-400">
            (大類別/標籤/上次更新已依規則忽略)
          </span>
        </div>
      </div>
    </div>
  );
};
