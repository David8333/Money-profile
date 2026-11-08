import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { PieChart as PieIcon, Tag, AlertCircle } from 'lucide-react';
import { CategoryBreakdownResult } from '../../services/dashboard/dashboardAnalytics';
import { formatCurrency } from '../../utils/currency';

interface CategoryPieChartProps {
  breakdown: CategoryBreakdownResult;
  period: 'this_month' | 'last_month' | 'this_year';
  onPeriodChange: (p: 'this_month' | 'last_month' | 'this_year') => void;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  breakdown,
  period,
  onPeriodChange,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 border border-slate-800 shadow-xl">
          <div className="font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name}</span>
          </div>
          <div className="font-mono text-emerald-400 font-bold">
            {formatCurrency(data.amount)}
          </div>
          <div className="text-[11px] text-slate-300">
            佔比：{data.percentage}%
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header and Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-600" />
            <span>支出分類分析</span>
          </h3>
          <p className="text-xs text-slate-500">前 5 大分類獨立呈現，其餘合併為「其它」</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          {[
            { id: 'this_month', label: '本月' },
            { id: 'last_month', label: '上月' },
            { id: 'this_year', label: '今年' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onPeriodChange(tab.id as any)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                period === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {breakdown.totalExpense === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
          <div>此區間尚無任何支出紀錄</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Pie Chart Canvas (5 cols) */}
          <div className="md:col-span-5 h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={breakdown.items}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="amount"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {breakdown.items.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={activeIndex === index ? '#0f172a' : '#ffffff'}
                      strokeWidth={activeIndex === index ? 2 : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Summary Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] text-slate-400 font-medium">總支出</span>
              <span className="text-sm font-bold font-mono text-slate-800">
                {formatCurrency(breakdown.totalExpense)}
              </span>
            </div>
          </div>

          {/* Category List & Percentage Legend (7 cols) */}
          <div className="md:col-span-7 space-y-2">
            {breakdown.items.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-slate-800">{item.name}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-mono font-semibold text-slate-900">
                    {formatCurrency(item.amount)}
                  </span>
                  <span className="w-12 text-right font-mono text-[11px] font-bold text-slate-500">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
