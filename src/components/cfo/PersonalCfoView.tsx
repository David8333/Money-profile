import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchTransactions } from '../../services/supabase/transactions';
import { fetchCategories } from '../../services/supabase/categories';
import { EnrichedTransaction } from '../../types/finance';
import { DbCategory } from '../../types/database';
import {
  CfoBudgetItem,
  CfoSurplusAllocationItem
} from '../../types/cfo';
import {
  loadYearlyBudgets,
  saveYearlyBudgets,
  loadYearlyAllocations,
  saveYearlyAllocations,
  resetYearlyToDefaults
} from '../../services/cfo/cfoStorage';
import {
  calculateExecutiveSummary,
  calculateMonthlyStats,
  compareBudgetVsActual,
  calculateFinancialHealth
} from '../../services/cfo/cfoEngine';
import { CfoHeaderControls } from './CfoHeaderControls';
import { CfoExecutiveSummary } from './CfoExecutiveSummary';
import { CfoMonthlyTrendChart } from './CfoMonthlyTrendChart';
import { CfoBudgetVsActual } from './CfoBudgetVsActual';
import { CfoSurplusAllocation } from './CfoSurplusAllocation';
import { CfoFinancialHealthKpis } from './CfoFinancialHealthKpis';
import { CfoBudgetEditModal } from './CfoBudgetEditModal';
import {
  Building2,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface PersonalCfoViewProps {
  onNavigateToTab: (tab: string) => void;
}

export const PersonalCfoView: React.FC<PersonalCfoViewProps> = ({ onNavigateToTab }) => {
  const { user } = useAuth();

  // 狀態管理
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // 預設當前年份，若系統有資料則自動對齊
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // 資料狀態
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [budgets, setBudgets] = useState<CfoBudgetItem[]>([]);
  const [allocations, setAllocations] = useState<CfoSurplusAllocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 載入交易與分類資料
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txRes, catRes] = await Promise.all([
        fetchTransactions(user?.id),
        fetchCategories(user?.id || 'mock-user'),
      ]);
      setTransactions(txRes.data || []);
      setCategories(catRes.data || []);

      // 載入該年度預算與配置
      setBudgets(loadYearlyBudgets(selectedYear));
      setAllocations(loadYearlyAllocations(selectedYear));
    } catch (err) {
      console.error('載入 CFO 經營中心資料失敗:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 監聽全域事件（交易異動與 CFO 設定更新）
  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('finance_data_updated', handleUpdate);
    window.addEventListener('cfo_data_updated', handleUpdate);
    return () => {
      window.removeEventListener('finance_data_updated', handleUpdate);
      window.removeEventListener('cfo_data_updated', handleUpdate);
    };
  }, [loadData]);

  // 當切換年度時重新載入該年預算與配置
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setBudgets(loadYearlyBudgets(year));
    setAllocations(loadYearlyAllocations(year));
  };

  // 儲存預算與配置
  const handleSaveBudgetAndAllocations = (
    newBudgets: CfoBudgetItem[],
    newAllocations: CfoSurplusAllocationItem[]
  ) => {
    setBudgets(newBudgets);
    setAllocations(newAllocations);
    saveYearlyBudgets(selectedYear, newBudgets);
    saveYearlyAllocations(selectedYear, newAllocations);
  };

  // 重設為預設範本
  const handleResetDefaults = () => {
    if (confirm(`確定將 ${selectedYear} 年度的預算規劃重設為預設標準範本嗎？`)) {
      const res = resetYearlyToDefaults(selectedYear);
      setBudgets(res.budgets);
      setAllocations(res.allocations);
    }
  };

  // --- 計算引擎 ---
  // 第一區：年度執行總覽
  const executiveSummary = useMemo(() => {
    return calculateExecutiveSummary(transactions, selectedYear, budgets, allocations);
  }, [transactions, selectedYear, budgets, allocations]);

  // 第二區：12 個月收支分析
  const monthlyAnalysis = useMemo(() => {
    return calculateMonthlyStats(transactions, selectedYear);
  }, [transactions, selectedYear]);

  // 第三區 & 第五區：預算 vs 實際執行
  const budgetComparisons = useMemo(() => {
    return compareBudgetVsActual(transactions, selectedYear, budgets, allocations);
  }, [transactions, selectedYear, budgets, allocations]);

  // 第六區：財務經營體質指標
  const financialHealth = useMemo(() => {
    return calculateFinancialHealth(transactions, selectedYear, budgets, allocations);
  }, [transactions, selectedYear, budgets, allocations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 頂部控制列 */}
      <CfoHeaderControls
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        onResetDefaults={handleResetDefaults}
      />

      {/* 第一區：年度財務總覽 (Executive Summary KPI Cards) */}
      <CfoExecutiveSummary
        summary={executiveSummary}
        targetYear={selectedYear}
      />

      {/* 第二區：每月收入、支出與盈餘圖表 */}
      <CfoMonthlyTrendChart
        monthlyStats={monthlyAnalysis.monthlyStats}
        avgMonthlyIncome={monthlyAnalysis.avgMonthlyIncome}
        avgMonthlyExpense={monthlyAnalysis.avgMonthlyExpense}
        avgMonthlySurplus={monthlyAnalysis.avgMonthlySurplus}
        ytdSurplus={monthlyAnalysis.ytdSurplus}
        highestExpenseMonth={monthlyAnalysis.highestExpenseMonth}
        highestSurplusMonth={monthlyAnalysis.highestSurplusMonth}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        targetYear={selectedYear}
      />

      {/* 第三區 & 第五區：年度預算規劃與實際執行對比 */}
      <CfoBudgetVsActual
        comparisonItems={budgetComparisons}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        targetYear={selectedYear}
      />

      {/* 第四區：盈餘分配與資金配置 */}
      <CfoSurplusAllocation
        summary={executiveSummary}
        allocations={allocations}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        targetYear={selectedYear}
      />

      {/* 第六區：個人財務經營指標 */}
      <CfoFinancialHealthKpis
        health={financialHealth}
        targetYear={selectedYear}
      />

      {/* 編輯預算與配置彈窗 */}
      <CfoBudgetEditModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        targetYear={selectedYear}
        budgets={budgets}
        allocations={allocations}
        onSave={handleSaveBudgetAndAllocations}
      />
    </div>
  );
};
