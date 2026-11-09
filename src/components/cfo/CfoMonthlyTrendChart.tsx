import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  Award,
  DollarSign,
  ArrowRight,
  Info
} from 'lucide-react';
import { CfoMonthlyStat } from '../../types/cfo';

interface CfoMonthlyTrendChartProps {
  monthlyStats: CfoMonthlyStat[];
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  avgMonthlySurplus: number;
  ytdSurplus: number;
  highestExpenseMonth: CfoMonthlyStat | null;
  highestSurplusMonth: CfoMonthlyStat | null;
  selectedMonth: number | 'all';
  onSelectMonth: (month: number | 'all') => void;
  targetYear: number;
}

export const CfoMonthlyTrendChart: React.FC<CfoMonthlyTrendChartProps> = ({
  monthlyStats,
  avgMonthlyIncome,
  avgMonthlyExpense,
  avgMonthlySurplus,
  ytdSurplus,
  highestExpenseMonth,
  highestSurplusMonth,
  selectedMonth,
  onSelectMonth,
  targetYear,
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const formatTwd = (val: number) => `NT$ ${Math.round(val).toLocaleString('en-US')}`;

  const chartData = monthlyStats.map((stat) => ({
    name: stat.monthLabel,
    monthNumber: stat.monthNumber,
    income: Math.round(stat.income),
    expense: Math.round(stat.expense),
    surplus: Math.round(stat.surplus),
  }));

  const activeFocusMonth = selectedMonth !== 'all'
    ? monthlyStats.find((s) => s.monthNumber === selectedMonth)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 mb-8 shadow-xs">
      {/* Title & 4 Summary Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>第二區：{targetYear} 全年 12 個月收支與盈餘分析圖</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            長條圖代表收入與支出消長，折線圖呈現當月實際盈餘趨勢（點選月份可聚焦檢視）
          </p>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-slate-500 font-medium block">月平均收入</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-600 block mt-0.5">
              {formatTwd(avgMonthlyIncome)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-slate-500 font-medium block">月平均支出</span>
            <span className="text-xs sm:text-sm font-bold text-rose-600 block mt-0.5">
              {formatTwd(avgMonthlyExpense)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-slate-500 font-medium block">月平均盈餘</span>
            <span className={`text-xs sm:text-sm font-bold block mt-0.5 ${
              avgMonthlySurplus >= 0 ? 'text-indigo-600' : 'text-rose-600'
            }`}>
              {formatTwd(avgMonthlySurplus)}
            </span>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-emerald-800 font-medium block">累計至今盈餘</span>
            <span className={`text-xs sm:text-sm font-bold block mt-0.5 ${
              ytdSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {formatTwd(ytdSurplus)}
            </span>
          </div>
        </div>
      </div>

      {/* Highlights & Callouts */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {highestSurplusMonth && highestSurplusMonth.surplus > 0 && (
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs">
            <Award className="w-3.5 h-3.5" />
            <span>盈餘最高月份：</span>
            <strong className="font-semibold">{highestSurplusMonth.monthLabel}（{formatTwd(highestSurplusMonth.surplus)}）</strong>
          </div>
        )}

        {highestExpenseMonth && highestExpenseMonth.expense > 0 && (
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>開銷最高月份：</span>
            <strong className="font-semibold">{highestExpenseMonth.monthLabel}（{formatTwd(highestExpenseMonth.expense)}）</strong>
          </div>
        )}

        {selectedMonth !== 'all' && (
          <button
            onClick={() => onSelectMonth('all')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer ml-auto"
          >
            <span>清除聚焦（顯示全年）</span>
          </button>
        )}
      </div>

      {/* Main Chart */}
      <div className="h-72 sm:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload[0]) {
                const monthNum = state.activePayload[0].payload.monthNumber;
                onSelectMonth(monthNum);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: any, name: any) => {
                const label = name === 'income' ? '月收入' : name === 'expense' ? '月支出' : '月盈餘';
                return [formatTwd(Number(value) || 0), label];
              }}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                if (value === 'income') return '月收入 (Income)';
                if (value === 'expense') return '月支出 (Expense)';
                if (value === 'surplus') return '月盈餘 (Net Surplus)';
                return value;
              }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
            <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line
              type="monotone"
              dataKey="surplus"
              name="surplus"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 1, stroke: '#ffffff' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Selected Month Detail Callout */}
      {activeFocusMonth && (
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800 text-sm">
              {activeFocusMonth.monthLabel} 詳細經營數字：
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <div>收入：<strong className="text-emerald-600 font-semibold">{formatTwd(activeFocusMonth.income)}</strong></div>
            <div>支出：<strong className="text-rose-600 font-semibold">{formatTwd(activeFocusMonth.expense)}</strong></div>
            <div>盈餘：<strong className={`${activeFocusMonth.surplus >= 0 ? 'text-indigo-600' : 'text-rose-600'} font-semibold`}>
              {formatTwd(activeFocusMonth.surplus)}
            </strong></div>
            <div>盈餘率：<strong className="text-slate-800 font-semibold">{activeFocusMonth.surplusRate.toFixed(1)}%</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};
