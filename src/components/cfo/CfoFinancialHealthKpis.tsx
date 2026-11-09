import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Award,
  Zap,
  Info,
  Layers,
  Percent
} from 'lucide-react';
import { CfoFinancialHealthData } from '../../types/cfo';

interface CfoFinancialHealthKpisProps {
  health: CfoFinancialHealthData;
  targetYear: number;
}

export const CfoFinancialHealthKpis: React.FC<CfoFinancialHealthKpisProps> = ({
  health,
  targetYear,
}) => {
  const formatTwd = (val: number) => `NT$ ${Math.round(val).toLocaleString('en-US')}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 mb-8 shadow-xs">
      <div className="mb-5">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>第六區：{targetYear} 個人財務經營指標（經營體質評估）</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          檢視個人財務的安全邊際、成長力與資本累積效能；若歷史紀錄不足時真實呈現，不推估虛假數字
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. 年度收入成長 (YoY) */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">年度收入成長率</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {health.hasPriorYearData && health.yoyIncomeGrowth !== null ? (
              <span className={health.yoyIncomeGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {health.yoyIncomeGrowth >= 0 ? '+' : ''}{health.yoyIncomeGrowth.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-normal">首年數據，尚無同期比較</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1.5">
            與 {targetYear - 1} 年度同期對比
          </span>
        </div>

        {/* 2. 年度支出變化 (YoY) */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">年度支出變化率</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {health.hasPriorYearData && health.yoyExpenseChange !== null ? (
              <span className={health.yoyExpenseChange <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {health.yoyExpenseChange >= 0 ? '+' : ''}{health.yoyExpenseChange.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-normal">首年數據，尚無同期比較</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1.5">
            負值代表支出收斂節制
          </span>
        </div>

        {/* 3. 實際盈餘率 */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">經營盈餘率</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className={`text-lg font-bold mt-1 ${
            health.surplusRate >= 30 ? 'text-emerald-600' : health.surplusRate > 0 ? 'text-indigo-600' : 'text-rose-600'
          }`}>
            {health.surplusRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 block mt-1.5">
            淨收入留存率 (財務防禦力)
          </span>
        </div>

        {/* 4. 儲蓄與投資配置比例 */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">財富累積配置比</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {health.wealthAllocationRatio.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 block mt-1.5">
            投資儲備佔總收入比例
          </span>
        </div>

        {/* 5. 最大支出類別 */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">最大開銷分類</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 truncate">
            {health.topExpenseCategory ? (
              <span title={`${health.topExpenseCategory.name} (${formatTwd(health.topExpenseCategory.amount)})`}>
                {health.topExpenseCategory.name}
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-normal">尚無支出</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1.5">
            {health.topExpenseCategory ? `佔總支出 ${health.topExpenseCategory.percentage.toFixed(0)}%` : '無'}
          </span>
        </div>

        {/* 6. 每月平均生活成本 */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">月均基本生活成本</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {formatTwd(health.avgMonthlyLivingCost)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1.5">
            必要日常維持基本月開銷
          </span>
        </div>
      </div>
    </div>
  );
};
