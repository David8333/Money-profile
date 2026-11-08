import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  ReceiptText,
  Terminal,
  Database,
  Cloud,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DashboardKpiCards } from './DashboardKpiCards';
import { TrendChart } from './TrendChart';
import { CategoryPieChart } from './CategoryPieChart';
import { AnnualSummaryCard } from './AnnualSummaryCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { DashboardTestSuiteModal } from './DashboardTestSuiteModal';
import { TransactionFormModal } from '../transactions/TransactionFormModal';
import {
  calculateKpiStats,
  calculateTwelveMonthsTrend,
  calculateCategoryBreakdown,
  calculateAnnualSummary,
  getRecentTransactions
} from '../../services/dashboard/dashboardAnalytics';
import { fetchTransactions } from '../../services/supabase/transactions';
import { fetchCategories } from '../../services/supabase/categories';
import { fetchAccounts } from '../../services/supabase/accounts';
import { fetchMembers } from '../../services/supabase/members';
import { EnrichedTransaction } from '../../types/finance';
import { DbCategory, DbAccount, DbMember } from '../../types/database';
import { getCurrentMonthRange } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../services/supabase/client';

interface DashboardViewProps {
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const { user } = useAuth();
  const isCloud = isSupabaseConfigured();

  // 交易與元資料狀態
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [members, setMembers] = useState<DbMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 儀表板控制狀態
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthRange().monthString);
  const [categoryPeriod, setCategoryPeriod] = useState<'this_month' | 'last_month' | 'this_year'>('this_month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // 彈窗狀態
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // 載入資料
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txRes, catRes, accRes, memRes] = await Promise.all([
        fetchTransactions(user?.id),
        fetchCategories(user?.id || 'mock-user'),
        fetchAccounts(user?.id || 'mock-user'),
        fetchMembers(user?.id || 'mock-user'),
      ]);
      setTransactions(txRes.data);
      setCategories(catRes.data);
      setAccounts(accRes.data);
      setMembers(memRes.data);
    } catch (err) {
      console.error('載入儀表板資料失敗:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();

    const handleDataUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener('finance_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('finance_data_updated', handleDataUpdate);
    };
  }, [loadDashboardData]);

  // 計算 KPI 指標
  const kpiData = useMemo(() => {
    return calculateKpiStats(transactions, selectedMonth);
  }, [transactions, selectedMonth]);

  // 計算近 12 個月趨勢
  const trendData = useMemo(() => {
    return calculateTwelveMonthsTrend(transactions);
  }, [transactions]);

  // 計算分類佔比
  const categoryData = useMemo(() => {
    return calculateCategoryBreakdown(transactions, categoryPeriod, selectedYear);
  }, [transactions, categoryPeriod, selectedYear]);

  // 計算年度總覽
  const annualData = useMemo(() => {
    return calculateAnnualSummary(transactions, selectedYear);
  }, [transactions, selectedYear]);

  // 取得最新 10 筆
  const recentTransactions = useMemo(() => {
    return getRecentTransactions(transactions, 10);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Phase 4：Dashboard 財務總覽</span>
            </div>

            {/* Data Source Badge */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isCloud
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-amber-100 text-amber-900 border border-amber-200'
            }`}>
              {isCloud ? <Cloud className="w-3.5 h-3.5 text-blue-600" /> : <Database className="w-3.5 h-3.5 text-amber-700" />}
              <span>{isCloud ? '雲端資料庫 (Supabase)' : '模擬預覽資料 (Mock Store)'}</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            個人財務管理儀表板
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            即時計算本月收支、12 個月趨勢、分類支出結構與年度財務總結，多幣別依 TWD 基準幣精確換算。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
            <span>執行 Phase 4 驗收測試</span>
          </button>

          <button
            onClick={() => onNavigateToTab('import')}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV 匯入</span>
          </button>

          <button
            onClick={() => setIsFormModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>快速新增記帳</span>
          </button>
        </div>
      </div>

      {/* 1. KPI 財務指標卡片區 */}
      <DashboardKpiCards
        kpi={kpiData}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenAddModal={() => setIsFormModalOpen(true)}
      />

      {/* 2 & 3. 趨勢圖 (Bar/Line) 與 分類圓餅圖 (Donut) 雙欄結構 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <TrendChart data={trendData} />
        </div>
        <div className="lg:col-span-5">
          <CategoryPieChart
            breakdown={categoryData}
            period={categoryPeriod}
            onPeriodChange={setCategoryPeriod}
          />
        </div>
      </div>

      {/* 4. 年度財務總覽卡片 */}
      <AnnualSummaryCard
        annual={annualData}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      {/* 5. 近期交易紀錄 (最新 10 筆) */}
      <RecentTransactionsCard
        transactions={recentTransactions}
        onViewAll={() => onNavigateToTab('transactions')}
        onSelectTransaction={() => onNavigateToTab('transactions')}
      />

      {/* 手動記帳彈窗 */}
      <TransactionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => loadDashboardData()}
        mode="create"
        categories={categories}
        accounts={accounts}
        members={members}
      />

      {/* 自動化測試彈窗 */}
      <DashboardTestSuiteModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
};
