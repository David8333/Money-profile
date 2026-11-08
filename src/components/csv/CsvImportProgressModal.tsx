import React from 'react';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  ArrowRight,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { ImportProgress, ImportExecutionResult } from '../../services/csv/csvImporter';

interface CsvImportProgressModalProps {
  isOpen: boolean;
  progress: ImportProgress | null;
  result: ImportExecutionResult | null;
  onClose: () => void;
  onGoToTransactions: () => void;
}

export const CsvImportProgressModal: React.FC<CsvImportProgressModalProps> = ({
  isOpen,
  progress,
  result,
  onClose,
  onGoToTransactions,
}) => {
  if (!isOpen) return null;

  const isCompleted = progress?.stage === 'completed';
  const isFailed = progress?.stage === 'failed';
  const isLoading = !isCompleted && !isFailed;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isLoading && '正在寫入資料庫...'}
                {isCompleted && 'CSV 匯入成功！'}
                {isFailed && '匯入過程發生異常'}
              </h3>
              <p className="text-xs text-slate-400">
                {isLoading && '保證資料一致性，分批安全寫入中'}
                {isCompleted && '交易紀錄與去重識別碼已成功同步'}
                {isFailed && '請檢查錯誤說明'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Progress Bar */}
          {isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{progress?.currentStepMessage}</span>
                <span className="font-bold text-emerald-600 font-mono">{progress?.percent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress?.percent || 10}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>請勿關閉視窗，正在嚴格處理關聯與 RLS 驗證...</span>
              </div>
            </div>
          )}

          {/* Completed Report */}
          {isCompleted && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-xs text-emerald-700 font-medium">成功匯入</div>
                  <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
                    {result.importedRows}
                  </div>
                  <div className="text-[10px] text-emerald-600">筆交易紀錄</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <div className="text-xs text-amber-700 font-medium">重複略過</div>
                  <div className="text-2xl font-bold text-amber-700 font-mono mt-1">
                    {result.duplicateRows}
                  </div>
                  <div className="text-[10px] text-amber-600">UUID 比對一致</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-xs text-slate-600 font-medium">錯誤排除</div>
                  <div className="text-2xl font-bold text-slate-700 font-mono mt-1">
                    {result.errorRows}
                  </div>
                  <div className="text-[10px] text-slate-500">筆格式異常</div>
                </div>
              </div>

              {/* Newly Created Metadata Details */}
              {(result.createdCategories.length > 0 ||
                result.createdAccounts.length > 0 ||
                result.createdMembers.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>系統已自動為您補建以下項目：</span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {result.createdCategories.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        分類: {c}
                      </span>
                    ))}
                    {result.createdAccounts.map((a) => (
                      <span key={a} className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        帳戶: {a}
                      </span>
                    ))}
                    {result.createdMembers.map((m) => (
                      <span key={m} className="px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        成員: {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Failed Message */}
          {isFailed && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">匯入失敗</div>
                <div className="mt-1 leading-relaxed">
                  {result?.errorMessage || progress?.currentStepMessage || '無法連線至 Supabase 資料庫'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          {isLoading ? (
            <span className="text-xs text-slate-400">處理中...</span>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                關閉
              </button>
              {isCompleted && (
                <button
                  onClick={onGoToTransactions}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>查看交易明細</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
