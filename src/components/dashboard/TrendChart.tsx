import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon, Info } from 'lucide-react';
import { MonthlyTrendPoint } from '../../services/dashboard/dashboardAnalytics';
import { formatCurrency } from '../../utils/currency';

interface TrendChartProps {
  data: MonthlyTrendPoint[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
      const expense = payload.find((p: any) => p.dataKey === 'expense')?.value || 0;
      const net = income - expense;

      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800">
          <div className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label} 收支狀況</div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-400 font-medium">● 收入:</span>
            <span className="font-mono font-bold">+{formatCurrency(income)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-rose-400 font-medium">● 支出:</span>
            <span className="font-mono font-bold">-{formatCurrency(expense)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1">
            <span className="text-slate-400">結餘:</span>
            <span className={`font-mono font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header and Chart Type Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <span>近 12 個月收支趨勢</span>
            <span className="text-[11px] font-normal text-slate-400">（自動補齊無交易月份）</span>
          </h3>
          <p className="text-xs text-slate-500">每月純收入與純支出比較（排除轉帳）</p>
        </div>

        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setChartType('bar')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              chartType === 'bar'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>柱狀圖</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              chartType === 'line'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            <span>折線圖</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${v >= 10000 ? `${v / 10000}萬` : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
              <Bar name="收入" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar name="支出" dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${v >= 10000 ? `${v / 10000}萬` : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
              <Line type="monotone" name="收入" dataKey="income" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
              <Line type="monotone" name="支出" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
