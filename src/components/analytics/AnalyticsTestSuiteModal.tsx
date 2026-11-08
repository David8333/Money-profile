import React, { useState } from 'react';
import {
  X,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import {
  runAllPhase5AcceptanceTests,
  TestCaseResult,
  Phase5TestSuiteSummary,
} from '../../services/analytics/__tests__/phase5TestSuite';

interface AnalyticsTestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsTestSuiteModal: React.FC<AnalyticsTestSuiteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testSummary, setTestSummary] = useState<Phase5TestSuiteSummary | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    setTestSummary(null);
    try {
      const summary = await runAllPhase5AcceptanceTests();
      setTestSummary(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Phase 5 自動化驗收測試 (15 項核心指標)
              </h3>
              <p className="text-xs text-slate-400">
                覆蓋多幣別、匯率生效日、歷史交易不可變性、跨幣別轉帳、帳戶餘額/交易額區分與 YoY 同期比較
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Top Control & Summary Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Phase 5 測試套件狀態
              </h4>
              <p className="text-xs text-slate-500">
                {testSummary
                  ? `共執行 ${testSummary.total} 項測試：通過 ${testSummary.passed} 項，失敗 ${testSummary.failed} 項`
                  : '點擊右方按鈕即可在瀏覽器環境即時執行全部驗證邏輯'}
              </p>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>執行測試中...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>開始執行 15 項測試</span>
                </>
              )}
            </button>
          </div>

          {/* Test Cases Results List */}
          {testSummary ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {testSummary.results.map((r, idx) => (
                <div key={r.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3">
                  <div className="mt-0.5">
                    {r.passed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <span className="font-mono text-purple-700">[{idx + 1}]</span>
                        <span>{r.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {r.durationMs.toFixed(2)} ms
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${r.passed ? 'text-slate-600' : 'text-rose-600 font-semibold'}`}>
                      {r.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                尚未執行測試，點擊上方按鈕開始驗證 Phase 5 商業邏輯
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            測試嚴格遵守 Phase 5 商業規則與資料安全隔離
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
