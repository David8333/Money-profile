import React from 'react';
import { CalendarRange, TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';
import { AnnualFinancialSummary } from '../../services/dashboard/dashboardAnalytics';
import { formatCurrency } from '../../utils/currency';

interface AnnualSummaryCardProps {
  annual: AnnualFinancialSummary;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export const AnnualSummaryCard: React.FC<AnnualSummaryCardProps> = ({
  annual,
  selectedYear,
  onYearChange,
}) => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header with Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <CalendarRange className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            {selectedYear} 年度財務總覽
          </h3>
          <span className="text-xs text-slate-400">
            （平均值以 12 個月換算）
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500">切換年度：</span>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} 年
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5 Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 年度總收入 */}
        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <div className="text-[11px] font-semibold text-emerald-800 flex items-center justify-between">
            <span>年度總收入</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
            +{formatCurrency(annual.totalIncome)}
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">全年度純收入</div>
        </div>

        {/* 年度總支出 */}
        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
          <div className="text-[11px] font-semibold text-rose-800 flex items-center justify-between">
            <span>年度總支出</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-lg font-bold text-rose-700 font-mono mt-1">
            -{formatCurrency(annual.totalExpense)}
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">全年度純支出</div>
        </div>

        {/* 年度總結餘 */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
            <span>年度總結餘</span>
            <Wallet className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className={`text-lg font-bold font-mono mt-1 ${
            annual.netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {annual.netBalance >= 0 ? '+' : ''}{formatCurrency(annual.netBalance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {annual.netBalance >= 0 ? '整年度盈餘' : '整年度赤字'}
          </div>
        </div>

        {/* 月平均收入 */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-700">
            月平均收入
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-1">
            +{formatCurrency(annual.monthlyAverageIncome)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">總收入 / 12</div>
        </div>

        {/* 月平均支出 */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-700">
            月平均支出
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-1">
            -{formatCurrency(annual.monthlyAverageExpense)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">總支出 / 12</div>
        </div>
      </div>
    </div>
  );
};
