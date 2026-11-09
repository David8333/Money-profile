import React from 'react';
import {
  Calendar,
  Layers,
  SlidersHorizontal,
  RotateCcw,
  Building2,
  ChevronDown
} from 'lucide-react';

interface CfoHeaderControlsProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number | 'all';
  onMonthChange: (month: number | 'all') => void;
  viewMode: 'yearly' | 'monthly';
  onViewModeChange: (mode: 'yearly' | 'monthly') => void;
  onOpenBudgetModal: () => void;
  onResetDefaults: () => void;
}

export const CfoHeaderControls: React.FC<CfoHeaderControlsProps> = ({
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  viewMode,
  onViewModeChange,
  onOpenBudgetModal,
  onResetDefaults,
}) => {
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title & Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-emerald-400 flex items-center justify-center shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                財務經營中心
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Personal CFO
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              以企業經營思維管理個人資產：年度預算規劃、收支盈餘控管與資本累積配置
            </p>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 年度選擇器 */}
          <div className="relative inline-flex items-center">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
              aria-label="選擇統計年度"
              className="pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors appearance-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} 年度
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* 月份選擇器 */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const val = e.target.value;
                onMonthChange(val === 'all' ? 'all' : parseInt(val, 10));
              }}
              aria-label="選擇檢視月份"
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
            >
              <option value="all">全年 12 個月</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} 月份
                </option>
              ))}
            </select>
          </div>

          {/* 年度 / 月度 切換 */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            <button
              onClick={() => onViewModeChange('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'yearly'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              年度總覽
            </button>
            <button
              onClick={() => onViewModeChange('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              月度聚焦
            </button>
          </div>

          {/* 編輯預算按鈕 */}
          <button
            onClick={onOpenBudgetModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>編輯年度預算與配置</span>
          </button>

          {/* 重設預設範本 */}
          <button
            onClick={onResetDefaults}
            title="將此年度預算與配置重設為標準範本"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
