import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Download,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Database,
  ArrowRight
} from 'lucide-react';
import {
  getResetStats,
  executeResetAllTransactions,
  ResetTransactionStats,
  ResetExecutionResult,
} from '../../services/transactions/transactionReset';
import {
  generateBackupData,
  downloadBackupFile,
} from '../../services/backup/backupEngine';

interface ResetTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSuccess?: (result: ResetExecutionResult) => void;
}

export const ResetTransactionsModal: React.FC<ResetTransactionsModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess,
}) => {
  const [stats, setStats] = useState<ResetTransactionStats>({
    transactionCount: 0,
    importSourceCount: 0,
    importBatchCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 安全防呆輸入
  const [confirmText, setConfirmText] = useState('');
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);

  // 執行重置狀態
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<ResetExecutionResult | null>(null);

  // 當彈窗打開時，讀取即將被刪除的筆數
  useEffect(() => {
    if (isOpen) {
      setIsLoadingStats(true);
      setConfirmText('');
      setResetError(null);
      setResetResult(null);
      getResetStats(userId)
        .then((s) => setStats(s))
        .finally(() => setIsLoadingStats(false));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  // 下載安全備份
  const handleDownloadSafetyBackup = async () => {
    try {
      setIsExportingBackup(true);
      const backup = await generateBackupData(userId || 'mock-user');
      const filename = downloadBackupFile(backup);
      setBackupFileName(filename);
      setHasDownloadedBackup(true);
    } catch (err: any) {
      setResetError(`下載安全備份失敗: ${err.message || '未知錯誤'}`);
    } finally {
      setIsExportingBackup(false);
    }
  };

  // 執行重置
  const handleExecuteReset = async () => {
    if (confirmText.trim() !== 'RESET') {
      return;
    }

    setIsResetting(true);
    setResetError(null);

    try {
      const result = await executeResetAllTransactions(userId);
      if (result.success) {
        setResetResult(result);
        onSuccess?.(result);
      } else {
        setResetError(result.error || '重置作業失敗');
      }
    } catch (err: any) {
      setResetError(err.message || '發生未預期之重置異常');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-100 bg-rose-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-rose-800">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">全部記帳資料重置</h3>
              <p className="text-xs text-rose-700">不可逆之高風險資料清除操作</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          {/* Result view if already completed */}
          {resetResult ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-950">記帳資料已成功清空！</h4>
                <p className="text-xs text-emerald-700">
                  已清除 {resetResult.deletedTransactionCount} 筆交易紀錄與 {resetResult.deletedSourceCount} 筆匯入關聯。
                  各項報表與 Dashboard 已即時更新為初始空白狀態。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800 mb-1">已完整保留之重要設定：</div>
                <div>✓ 帳戶資產與負債清單（Accounts）</div>
                <div>✓ 收支分類設定（Categories）</div>
                <div>✓ 家庭成員名冊（Members）</div>
                <div>✓ 幣別與歷史匯率（Currencies & Rates）</div>
                <div>✓ 年度預算與財務經營目標（CFO Budgets）</div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  關閉視窗
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Notice */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-rose-950">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>即將清除的資料範圍：</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white p-2 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-slate-500 block">所有交易紀錄</span>
                    <strong className="text-sm text-rose-700 block mt-0.5">
                      {isLoadingStats ? '計算中...' : `${stats.transactionCount} 筆`}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-slate-500 block">CSV 匯入來源</span>
                    <strong className="text-sm text-rose-700 block mt-0.5">
                      {isLoadingStats ? '計算中...' : `${stats.importSourceCount} 筆`}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-slate-500 block">匯入批次紀錄</span>
                    <strong className="text-sm text-rose-700 block mt-0.5">
                      {isLoadingStats ? '計算中...' : `${stats.importBatchCount} 筆`}
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed pt-1">
                  ※ 包含收入、支出、轉帳配對及所有 CSV 歷史去重資料。重置後各圖表與報表金額將歸零。
                </p>
              </div>

              {/* Preserved list */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <span className="font-semibold text-slate-800 block mb-1">安全防護：以下系統設定將 100% 完整保留</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  使用者帳號、帳戶、收支分類、成員名冊、幣別、匯率歷史及年度預算目標皆不受影響。
                </p>
              </div>

              {/* Safety Step 1: Backup Download */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>步驟 1. 下載安全備份檔案（建議）</span>
                  </span>
                  {hasDownloadedBackup && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                      已下載快照
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  強烈建議在重置前下載一份完整的 JSON 資料備份，萬一需要可隨時一鍵還原。
                </p>
                <button
                  onClick={handleDownloadSafetyBackup}
                  disabled={isExportingBackup}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isExportingBackup ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在封裝資料庫備份...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>下載重置前安全快照備份 (JSON)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Safety Step 2: Confirmation Text Input */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 space-y-2">
                <label className="font-semibold text-rose-950 block">
                  步驟 2. 輸入確認文字以解除鎖定：
                </label>
                <p className="text-[11px] text-slate-600">
                  請在下方輸入大寫文字 <strong className="font-mono text-rose-700">RESET</strong> 以確認執行清除：
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="請在此輸入 RESET"
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-mono font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Error Callout */}
              {resetError && (
                <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{resetError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!resetResult && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isResetting}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              取消
            </button>

            <button
              onClick={handleExecuteReset}
              disabled={confirmText.trim() !== 'RESET' || isResetting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在安全清除中...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>確認永久清除所有交易</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
