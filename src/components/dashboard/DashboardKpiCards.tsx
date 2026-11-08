import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowRightLeft,
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import { DashboardKpi } from '../../services/dashboard/dashboardAnalytics';
import { formatCurrency } from '../../utils/currency';

interface DashboardKpiCardsProps {
  kpi: DashboardKpi;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onOpenAddModal: () => void;
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  kpi,
  selectedMonth,
  onMonthChange,
  onOpenAddModal,
}) => {
  return (
    <div className="space-y-3">
      {/* Month Picker Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs sm:text-sm font-bold text-slate-800">統計月份：</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="px-2.5 py-1 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
          />
          <span className="text-xs text-slate-400 hidden md:inline">
            (金額均以 TWD 基準幣換算統計)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {kpi.transferVolume > 0 && (
            <div className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium flex items-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3 text-blue-500" />
              <span>本月帳戶轉帳 {formatCurrency(kpi.transferVolume)}（不計入收支）</span>
            </div>
          )}
        </div>
      </div>

      {/* Incomplete Data Alert if any foreign transaction lacked base_amount */}
      {kpi.hasIncompleteData && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>部分外幣交易缺少換算基準金額 (base_amount)，為保證財務數據嚴謹，未換算項目已排除在 TWD 統計外。</span>
        </div>
      )}

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. 本月總收入 */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">本月總收入</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono mt-2 tracking-tight">
            +{formatCurrency(kpi.totalIncome)}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>僅包含 income 收入</span>
            <span className="text-emerald-700 font-medium">工資、獎金等</span>
          </div>
        </div>

        {/* 2. 本月總支出 */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">本月總支出</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono mt-2 tracking-tight">
            -{formatCurrency(kpi.totalExpense)}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>僅包含 expense 支出</span>
            <span className="text-rose-700 font-medium">生活開銷</span>
          </div>
        </div>

        {/* 3. 本月收支結餘 */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">本月收支結餘</span>
            <div className={`p-2 rounded-lg ${kpi.netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono mt-2 tracking-tight ${
            kpi.netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {kpi.netBalance >= 0 ? '+' : ''}{formatCurrency(kpi.netBalance)}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>收入扣除支出</span>
            <span className={`font-medium ${kpi.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {kpi.netBalance >= 0 ? '有盈餘' : '超支'}
            </span>
          </div>
        </div>

        {/* 4. 本月儲蓄率 */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">本月儲蓄率</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-mono mt-2 tracking-tight">
            {kpi.savingsRate}%
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>結餘佔收入比例</span>
            <span className="text-indigo-700 font-medium">
              {kpi.savingsRate >= 30 ? '達標(>30%)' : '需注意'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
