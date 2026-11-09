import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  PieChart,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CfoExecutiveSummaryData } from '../../types/cfo';

interface CfoExecutiveSummaryProps {
  summary: CfoExecutiveSummaryData;
  targetYear: number;
}

export const CfoExecutiveSummary: React.FC<CfoExecutiveSummaryProps> = ({
  summary,
  targetYear,
}) => {
  const formatTwd = (amount: number) => {
    return `NT$ ${Math.round(amount).toLocaleString('en-US')}`;
  };

  const isPositiveSurplus = summary.annualNetSurplus >= 0;
  const isBudgetSurplus = summary.remainingBudget >= 0;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span>第一區：{targetYear} 年度財務經營總覽</span>
          <span className="text-xs font-normal text-slate-500">
            （即時統計真實現金收支，嚴格排除純轉帳）
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. 全年總收入 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">全年總收入</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {formatTwd(summary.totalAnnualIncome)}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            實際入帳營業淨額 (TWD)
          </div>
        </div>

        {/* 2. 全年總支出 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">全年總支出</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {formatTwd(summary.totalAnnualExpense)}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
            實際生活與品質開銷
          </div>
        </div>

        {/* 3. 全年實際盈餘 */}
        <div className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-shadow ${
          isPositiveSurplus ? 'border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20' : 'border-rose-300 bg-rose-50/30'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">全年實際盈餘</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isPositiveSurplus ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold tracking-tight ${
            isPositiveSurplus ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {formatTwd(summary.annualNetSurplus)}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-600">
            {isPositiveSurplus ? (
              <span className="text-emerald-700 font-medium flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                正向經營盈餘（可配置）
              </span>
            ) : (
              <span className="text-rose-700 font-medium flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                財務赤字（超支）
              </span>
            )}
          </div>
        </div>

        {/* 4. 全年盈餘率 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">全年盈餘率</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold tracking-tight ${
            summary.annualSurplusRate >= 30 ? 'text-emerald-600' : summary.annualSurplusRate > 0 ? 'text-sky-700' : 'text-rose-600'
          }`}>
            {summary.annualSurplusRate.toFixed(1)}%
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500">
            盈餘 ÷ 總收入 (目標 ≥ 30%)
          </div>
        </div>

        {/* 5. 全年預算支出 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">全年預算支出</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {formatTwd(summary.totalAnnualBudgetExpense)}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500">
            必要 + 生活品質總額度
          </div>
        </div>

        {/* 6. 預算剩餘金額 */}
        <div className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-shadow ${
          isBudgetSurplus ? 'border-slate-200/90' : 'border-amber-300 bg-amber-50/20'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">預算剩餘金額</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isBudgetSurplus ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-100 text-amber-700'
            }`}>
              {isBudgetSurplus ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-xl font-bold tracking-tight ${
            isBudgetSurplus ? 'text-slate-900' : 'text-amber-700'
          }`}>
            {formatTwd(summary.remainingBudget)}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-500">
            預算執行率：{summary.budgetExecutionRate.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};
