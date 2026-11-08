/**
 * Backup and Restore Management View (Phase 6B)
 * Provides JSON export download, drag-and-drop JSON import,
 * pre-restore audit preview, safe merge restore, protected full restore,
 * and built-in interactive acceptance test verification.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  RefreshCw,
  Info,
  Clock,
  ArrowRight,
  PlayCircle,
  FileSpreadsheet,
  Check,
  X,
} from 'lucide-react';
import {
  generateBackupData,
  downloadBackupFile,
} from '../../services/backup/backupEngine';
import {
  validateAndAnalyzeBackupJson,
  executeRestore,
} from '../../services/backup/restoreEngine';
import {
  FinanceBackupFile,
  RestoreMode,
  RestorePreviewAnalysis,
  RestoreResult,
} from '../../types/backup';
import {
  runAllPhase6bAcceptanceTests,
  TestCaseResult,
} from '../../services/backup/__tests__/backupTestSuite';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseConfig } from '../../hooks/useSupabaseConfig';

interface BackupRestoreViewProps {
  onNavigateToTab: (tab: string) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const { isConfigured } = useSupabaseConfig();
  const currentUserId = user?.id || 'mock-user';

  // 匯出狀態
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportedFile, setLastExportedFile] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // 匯入與還原狀態
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<FinanceBackupFile | null>(null);
  const [previewAnalysis, setPreviewAnalysis] = useState<RestorePreviewAnalysis | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // 還原設定
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [confirmSafetyPhrase, setConfirmSafetyPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // 測試套件狀態
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [testSummary, setTestSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);

  // 處理下載備份
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      const backup = await generateBackupData(currentUserId);
      const fileName = downloadBackupFile(backup);
      setLastExportedFile(fileName);
    } catch (err: any) {
      setExportError(err.message || '產生備份失敗');
    } finally {
      setIsExporting(false);
    }
  };

  // 處理檔案選取與驗證
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setRestoreResult(null);
    setRestoreError(null);
    setParseError(null);
    setConfirmSafetyPhrase('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { isValid, analysis, error } = validateAndAnalyzeBackupJson(content, currentUserId);

      if (!isValid || !analysis) {
        setParseError(error || '備份檔案驗證不通過');
        setPreviewAnalysis(null);
        setParsedBackup(null);
      } else {
        try {
          const parsedObj = JSON.parse(content) as FinanceBackupFile;
          setParsedBackup(parsedObj);
          setPreviewAnalysis(analysis);
          setParseError(null);
        } catch (jsonErr: any) {
          setParseError(`JSON 解析異常: ${jsonErr.message}`);
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // 執行還原
  const handleExecuteRestore = async () => {
    if (!parsedBackup || !previewAnalysis) return;

    try {
      setIsRestoring(true);
      setRestoreError(null);

      const result = await executeRestore(parsedBackup, currentUserId, {
        mode: restoreMode,
        confirmedUserIdCheck: true,
        confirmationText: confirmSafetyPhrase,
        safetySnapshotDownloaded: restoreMode === 'full',
      });

      setRestoreResult(result);
    } catch (err: any) {
      setRestoreError(err.message || '還原執行失敗');
    } finally {
      setIsRestoring(false);
    }
  };

  // 執行自動化測試套件
  const handleRunAcceptanceTests = async () => {
    setIsRunningTests(true);
    try {
      const outcome = await runAllPhase6bAcceptanceTests();
      setTestResults(outcome.results);
      setTestSummary({
        total: outcome.total,
        passed: outcome.passed,
        failed: outcome.failed,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const resetRestoreState = () => {
    setSelectedFile(null);
    setParsedBackup(null);
    setPreviewAnalysis(null);
    setRestoreResult(null);
    setRestoreError(null);
    setParseError(null);
    setConfirmSafetyPhrase('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* 標題橫幅 */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 mb-3 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Phase 6B 規格認證・全量資料隔離保護
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              系統資料備份與還原管理
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              支援涵蓋交易、外幣匯率、自訂分類、資產帳戶、成員及 CSV 去重識別碼之 8 大資料表 JSON 匯出與還原。具備 Schema 版本驗證、使用者資料隔離與強制安全快照機制。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={handleRunAcceptanceTests}
              disabled={isRunningTests}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isRunningTests ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              跑 Phase 6B 驗收測試 (16 項)
            </button>
          </div>
        </div>
      </div>

      {/* 測試結果展示面板（若已執行） */}
      {testSummary && testResults && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Phase 6B 自動化測試驗收結果
                </h3>
                <p className="text-xs text-slate-500">
                  共 {testSummary.total} 項測試・通過: {testSummary.passed} 項・失敗: {testSummary.failed} 項
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                testSummary.failed === 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {testSummary.failed === 0 ? '全數 100% 通過' : '部分未通過'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {testResults.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0 text-[10px]">
                    ✓
                  </span>
                  <span className="font-medium text-slate-800 truncate">
                    {r.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {r.durationMs.toFixed(1)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 主要操作區域：左右分欄 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左側：JSON 備份卡片 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  一、資料完整備份 (JSON 匯出)
                </h2>
                <p className="text-xs text-slate-500">
                  匯出當前帳號專屬之所有財務資料與元數據
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">
                本備份檔將包含完整 8 大資料表：
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>currencies (幣別表)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>exchange_rates (歷史匯率)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>categories (收支分類)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>accounts (資產與負債帳戶)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>members (成員管理)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>transactions (全量收支轉帳)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>import_batches (CSV 匯入批次)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>import_row_sources (去重來源)</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-blue-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-blue-950">
                <Info className="w-4 h-4 shrink-0 text-blue-600" />
                <span>資料一致性保證</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                備份過程中將 100% 保留每筆交易的原始幣別、原始金額、當時換算匯率（exchange_rate）與基準金額（base_amount），成對轉帳關聯群組（transfer_group_id）與方向標記，歷史 NULL 欄位絕不擅自猜測補值。
              </p>
            </div>

            {exportError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{exportError}</span>
              </div>
            )}

            {lastExportedFile && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">已下載: {lastExportedFile}</span>
                </div>
                <span className="text-[10px] text-emerald-600 shrink-0 font-medium">UTF-8 JSON</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  正在封裝全量資料表...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  立即下載完整備份 (JSON)
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              檔名將自動帶入當前日期與時間戳記（例: personal_finance_backup_20261107_091530.json）
            </p>
          </div>
        </div>

        {/* 右側：JSON 還原卡片 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  二、資料還原 (JSON 匯入)
                </h2>
                <p className="text-xs text-slate-500">
                  解析本機備份檔、執行結構稽核並選擇還原模式
                </p>
              </div>
            </div>

            {/* 檔案上傳框 */}
            {!previewAnalysis && !restoreResult && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <FileJson className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    點擊選擇或拖曳 JSON 備份檔至此
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    支援 UTF-8 編碼與 Schema Version 1.0.0
                  </p>
                </div>
              </div>
            )}

            {/* 解析錯誤提示 */}
            {parseError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">備份檔案校驗未通過：</p>
                  <p className="text-[11px] leading-relaxed">{parseError}</p>
                </div>
              </div>
            )}

            {/* 還原預覽與稽核面板 */}
            {previewAnalysis && !restoreResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <FileJson className="w-4 h-4 text-indigo-600" />
                      {selectedFile?.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      匯出時間: {new Date(previewAnalysis.backupMetadata.exported_at).toLocaleString()}・基準幣別: {previewAnalysis.backupMetadata.base_currency}
                    </p>
                  </div>
                  <button
                    onClick={resetRestoreState}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    更換檔案
                  </button>
                </div>

                {/* 資料表筆數網格 */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-xs font-bold text-slate-800">
                      {previewAnalysis.tableCounts.transactions}
                    </span>
                    <span className="text-[10px] text-slate-500">交易紀錄</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-xs font-bold text-slate-800">
                      {previewAnalysis.tableCounts.categories}
                    </span>
                    <span className="text-[10px] text-slate-500">分類</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-xs font-bold text-slate-800">
                      {previewAnalysis.tableCounts.accounts}
                    </span>
                    <span className="text-[10px] text-slate-500">帳戶</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-xs font-bold text-slate-800">
                      {previewAnalysis.tableCounts.exchange_rates}
                    </span>
                    <span className="text-[10px] text-slate-500">匯率紀錄</span>
                  </div>
                </div>

                {/* 交易細項統計 */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>收支分布：</span>
                    <span className="font-medium text-slate-800">
                      收入 {previewAnalysis.transactionBreakdown.incomeCount} 筆 / 支出 {previewAnalysis.transactionBreakdown.expenseCount} 筆 / 轉帳 {previewAnalysis.transactionBreakdown.transferCount} 筆
                    </span>
                  </div>
                  {previewAnalysis.transactionBreakdown.legacyTransferMissingDirectionCount > 0 && (
                    <div className="flex justify-between text-amber-700 font-medium">
                      <span>舊格式未標記方向轉帳：</span>
                      <span>{previewAnalysis.transactionBreakdown.legacyTransferMissingDirectionCount} 筆 (保留 null)</span>
                    </div>
                  )}
                  {previewAnalysis.existingConflictCounts.duplicateTransactionUuids > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>已存在之相同交易 (UUID 重複)：</span>
                      <span>{previewAnalysis.existingConflictCounts.duplicateTransactionUuids} 筆</span>
                    </div>
                  )}
                </div>

                {/* 警示清單 */}
                {previewAnalysis.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>還原安全提示：</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                      {previewAnalysis.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 還原模式選擇 */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-800">
                    選擇還原模式：
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-colors ${
                        restoreMode === 'merge'
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="accent-indigo-600"
                        />
                        <span className="text-xs">A. 合併還原</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">
                        推薦・保留現有交易，自動略過相同 UUID，絕不覆蓋既有紀錄。
                      </span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-colors ${
                        restoreMode === 'full'
                          ? 'border-rose-600 bg-rose-50/40 text-rose-950 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="full"
                          checked={restoreMode === 'full'}
                          onChange={() => setRestoreMode('full')}
                          className="accent-rose-600"
                        />
                        <span className="text-xs text-rose-700">B. 完整覆蓋還原</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">
                        高風險・強制先下載安全快照，需輸入文字確認。
                      </span>
                    </label>
                  </div>
                </div>

                {/* 完整覆蓋模式專屬：強制文字確認框 */}
                {restoreMode === 'full' && (
                  <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50/80 space-y-2">
                    <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
                      完整覆蓋還原原子性安全程序 (Phase 6B.1 規格)
                    </p>
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                      <strong>⚠️ 雲端安全鎖提示：</strong>正式雲端環境之完整還原已強制由資料庫端單一 Transaction RPC (<code>restore_finance_full</code>) 執行。若您的 Supabase 專案尚未套用 <code>20261107020000_full_restore_rpc.sql</code>，系統將立即安全終止並完整保留現有資料，絕不容許清空後部分還原。
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      執行前系統將<strong>自動下載當前狀態安全備份檔</strong>。請於下方手動輸入「<strong>確認覆蓋還原</strong>」以解鎖執行：
                    </p>
                    <input
                      type="text"
                      placeholder="請輸入：確認覆蓋還原"
                      value={confirmSafetyPhrase}
                      onChange={(e) => setConfirmSafetyPhrase(e.target.value.trim())}
                      className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg bg-white text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 還原結果報表 */}
            {restoreResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>資料還原成功！(模式: {restoreResult.mode === 'merge' ? '合併還原' : '完整還原'})</span>
                </div>
                <div className="text-xs text-emerald-700 space-y-1">
                  <p>
                    ✓ 交易寫入：{restoreResult.restoredCounts.transactions} 筆
                    {restoreResult.skippedDuplicateCounts.transactions > 0 &&
                      ` (已跳過重複 ${restoreResult.skippedDuplicateCounts.transactions} 筆)`}
                  </p>
                  <p>
                    ✓ 分類與帳戶：新增 {restoreResult.restoredCounts.categories + restoreResult.restoredCounts.accounts} 筆
                  </p>
                  <p>
                    ✓ 歷史匯率：更新 {restoreResult.restoredCounts.exchange_rates} 筆
                  </p>
                  {restoreResult.safetyBackupFileName && (
                    <p className="text-amber-800 font-medium">
                      🛡️ 已建立安全快照備份檔：{restoreResult.safetyBackupFileName}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onNavigateToTab('transactions')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    查看交易清單
                  </button>
                  <button
                    onClick={resetRestoreState}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    完成
                  </button>
                </div>
              </div>
            )}

            {restoreError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{restoreError}</span>
              </div>
            )}
          </div>

          {/* 底部執行按鈕 */}
          {previewAnalysis && !restoreResult && (
            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={resetRestoreState}
                className="py-2.5 px-4 rounded-xl text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={
                  isRestoring ||
                  (restoreMode === 'full' && confirmSafetyPhrase !== '確認覆蓋還原')
                }
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-colors shadow-xs disabled:opacity-40 cursor-pointer ${
                  restoreMode === 'full'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在執行還原作業...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    確認執行{restoreMode === 'merge' ? '合併還原' : '覆蓋還原'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
