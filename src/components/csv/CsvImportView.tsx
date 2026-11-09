import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Database,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { CsvUploader } from './CsvUploader';
import { CsvPreviewSummary } from './CsvPreviewSummary';
import { CsvPreviewTable } from './CsvPreviewTable';
import { CsvImportProgressModal } from './CsvImportProgressModal';
import { CsvTestSuiteModal } from './CsvTestSuiteModal';
import { parseCsvContent, CsvParseResult } from '../../services/csv/csvParser';
import { validateAndDeduplicateCsv, CsvValidationSummary } from '../../services/csv/csvValidator';
import { executeCsvImport, ImportProgress, ImportExecutionResult } from '../../services/csv/csvImporter';
import { fetchCategories } from '../../services/supabase/categories';
import { fetchAccounts } from '../../services/supabase/accounts';
import { fetchMembers } from '../../services/supabase/members';
import { DbCategory, DbAccount, DbMember } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../services/supabase/client';

interface CsvImportViewProps {
  onNavigateToTab: (tab: string) => void;
}

export const CsvImportView: React.FC<CsvImportViewProps> = ({ onNavigateToTab }) => {
  const { user } = useAuth();
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [validationSummary, setValidationSummary] = useState<CsvValidationSummary | null>(null);

  // 現有元資料快取
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [members, setMembers] = useState<DbMember[]>([]);

  // 篩選分頁 Tab
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'duplicate' | 'error'>('all');

  // 匯入執行進度與彈窗
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);

  // 自動化驗收測試彈窗
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // 載入使用者現有分類、帳戶與成員（支援雲端或本機 Mock 模式）
  useEffect(() => {
    fetchCategories(user?.id || 'mock-user').then(r => setCategories(r.data));
    fetchAccounts(user?.id || 'mock-user').then(r => setAccounts(r.data));
    fetchMembers(user?.id || 'mock-user').then(r => setMembers(r.data));
  }, [user?.id]);

  // 步驟 1 & 2: 解析檔案並執行去重比對
  const handleFileLoaded = async (content: string, fileName: string) => {
    setIsParsing(true);
    try {
      // 1. 解析 CSV 內容
      const parsed = await parseCsvContent(content, fileName);
      setParseResult(parsed);

      // 2. 執行 UUID 去重與資料庫比對
      const summary = await validateAndDeduplicateCsv(
        parsed.rows,
        parsed.fileHash,
        fileName,
        user?.id,
        categories,
        accounts,
        members
      );
      setValidationSummary(summary);
      setActiveTab('all');
    } catch (err) {
      console.error('CSV 解析失敗:', err);
    } finally {
      setIsParsing(false);
    }
  };

  // 步驟 5 & 6: 使用者確認後執行匯入
  const handleConfirmImport = async () => {
    if (!validationSummary) return;

    setIsImportModalOpen(true);
    setImportResult(null);

    const res = await executeCsvImport(
      validationSummary.validatedRows,
      validationSummary.fileHash,
      validationSummary.fileName,
      user?.id,
      categories,
      accounts,
      members,
      (progress) => setImportProgress(progress)
    );

    setImportResult(res);

    // 若匯入成功，更新本機快取
    if (res.success) {
      fetchCategories(user?.id || 'mock-user').then(r => setCategories(r.data));
      fetchAccounts(user?.id || 'mock-user').then(r => setAccounts(r.data));
      fetchMembers(user?.id || 'mock-user').then(r => setMembers(r.data));
    }
  };

  const handleReset = () => {
    setParseResult(null);
    setValidationSummary(null);
    setImportProgress(null);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV 智慧匯入引擎</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            手機記帳 CSV 資料匯入
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            支援 UTF-8、自動欄位順序對應、UUID 優先去重、金額零誤差處理與匯入前完整預覽。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {validationSummary && (
            <button
              onClick={handleReset}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>更換檔案</span>
            </button>
          )}

          <button
            onClick={() => setIsTestModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>執行 7 項驗收測試</span>
          </button>
        </div>
      </div>

      {/* Main Flow: Upload vs Preview */}
      {!validationSummary ? (
        <CsvUploader onFileLoaded={handleFileLoaded} isLoading={isParsing} />
      ) : (
        <div className="space-y-6">
          {/* File Info Bar */}
          <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-100 text-sm">
                  {validationSummary.fileName}
                </span>
                <span className="text-slate-400 text-xs ml-2 font-mono">
                  SHA-256: {validationSummary.fileHash.slice(0, 16)}...
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-slate-300">
                可匯入 <strong className="text-emerald-400 font-mono text-sm">{validationSummary.validCount}</strong> 筆
              </span>
              <button
                onClick={handleConfirmImport}
                disabled={validationSummary.validCount === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>確認匯入 {validationSummary.validCount} 筆交易</span>
              </button>
            </div>
          </div>

          {/* Step 3: Statistics Summary Cards */}
          <CsvPreviewSummary
            summary={validationSummary}
            detectedHeaders={parseResult?.detectedHeaders || {}}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
          />

          {/* Step 4: Preview Table */}
          <CsvPreviewTable
            rows={validationSummary.validatedRows}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
          />

          {/* Bottom Action Footer */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              ※ 系統已對齊 NUMERIC(15, 4) 金融高精度。確認匯入後，UUID 與指紋將寫入 <code>import_row_sources</code> 作為未來去重基準。
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                取消並返回
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validationSummary.validCount === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>立即執行匯入 ({validationSummary.validCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress & Result Modal */}
      <CsvImportProgressModal
        isOpen={isImportModalOpen}
        progress={importProgress}
        result={importResult}
        onClose={() => {
          setIsImportModalOpen(false);
          if (importResult?.success) {
            handleReset();
          }
        }}
        onGoToTransactions={() => {
          setIsImportModalOpen(false);
          handleReset();
          onNavigateToTab('transactions');
        }}
      />

      {/* Automated Test Suite Modal */}
      <CsvTestSuiteModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
};
