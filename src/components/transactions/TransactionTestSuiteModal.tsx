import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { runAllPhase3AcceptanceTests, Phase3TestResult } from '../../services/transactions/__tests__/transactionTestSuite';

interface TransactionTestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const TransactionTestSuiteModal: React.FC<TransactionTestSuiteModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<Phase3TestResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    await new Promise(r => setTimeout(r, 200));
    try {
      const outcome = await runAllPhase3AcceptanceTests();
      setTestResults(outcome.results);
      setSummary(outcome.summary);
      onRefreshData?.();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Phase 3 記帳與交易管理自動化驗收測試</h3>
              <p className="text-xs text-slate-400">執行收支 CRUD、轉帳配對、統計隔離與多維篩選驗證</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            {summary ? (
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-semibold text-slate-700">測試結果：</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {summary.passed} 通過
                </span>
                {summary.failed > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                    {summary.failed} 失敗
                  </span>
                )}
                <span className="text-slate-400">共 {summary.total} 項</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">點擊右側按鈕立即執行所有驗收測試</span>
            )}
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>執行中...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>執行 Phase 3 驗收測試</span>
              </>
            )}
          </button>
        </div>

        {/* Results List */}
        <div className="p-5 overflow-y-auto space-y-3 text-xs">
          {!testResults ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
              <p>尚未執行測試。本驗收項目包含：</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                1. 新增收入 · 2. 新增支出 · 3. 編輯交易 · 4. 刪除交易 · 5. 複製交易 · 6. 轉帳配對 (相同 transfer_group_id) · 7. 轉帳不計入收支統計驗證 · 8. 多維度篩選與搜尋 · 9. 轉帳整組連鎖刪除
              </p>
            </div>
          ) : (
            testResults.map((t, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border transition-all ${
                  t.passed
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {t.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{t.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed">{t.message}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                    {t.durationMs.toFixed(1)} ms
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
