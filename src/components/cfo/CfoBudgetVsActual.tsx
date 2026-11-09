import React, { useState } from 'react';
import {
  CfoBudgetComparisonItem,
  CfoCategoryGroup,
} from '../../types/cfo';
import {
  ShieldCheck,
  Sparkles,
  Coins,
  AlertTriangle,
  CheckCircle,
  SlidersHorizontal,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

interface CfoBudgetVsActualProps {
  comparisonItems: CfoBudgetComparisonItem[];
  onOpenBudgetModal: () => void;
  targetYear: number;
}

export const CfoBudgetVsActual: React.FC<CfoBudgetVsActualProps> = ({
  comparisonItems,
  onOpenBudgetModal,
  targetYear,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<CfoCategoryGroup | 'all'>('all');

  const formatTwd = (val: number) => `NT$ ${Math.round(val).toLocaleString('en-US')}`;

  const filteredItems = selectedGroup === 'all'
    ? comparisonItems
    : comparisonItems.filter((item) => item.budgetItem.group === selectedGroup);

  // 計算群組彙總
  const groupStats = {
    essential: comparisonItems
      .filter((i) => i.budgetItem.group === 'essential')
      .reduce((acc, cur) => ({ budget: acc.budget + cur.budgetItem.annual_budget, actual: acc.actual + cur.actualSpent }), { budget: 0, actual: 0 }),
    lifestyle: comparisonItems
      .filter((i) => i.budgetItem.group === 'lifestyle')
      .reduce((acc, cur) => ({ budget: acc.budget + cur.budgetItem.annual_budget, actual: acc.actual + cur.actualSpent }), { budget: 0, actual: 0 }),
    wealth: comparisonItems
      .filter((i) => i.budgetItem.group === 'wealth')
      .reduce((acc, cur) => ({ budget: acc.budget + cur.budgetItem.annual_budget, actual: acc.actual + cur.actualSpent }), { budget: 0, actual: 0 }),
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 mb-8 shadow-xs">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>第三區 & 第五區：{targetYear} 年度預算規劃與實際執行對比</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            各項目均可自訂年度目標並自動換算每月目標；真實收支即時比對執行進度
          </p>
        </div>

        <button
          onClick={onOpenBudgetModal}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>調整項目與預算額度</span>
        </button>
      </div>

      {/* Group Quick Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setSelectedGroup('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            selectedGroup === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部項目 ({comparisonItems.length})
        </button>

        <button
          onClick={() => setSelectedGroup('essential')}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            selectedGroup === 'essential'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>A. 必要生活支出 ({formatTwd(groupStats.essential.budget)})</span>
        </button>

        <button
          onClick={() => setSelectedGroup('lifestyle')}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            selectedGroup === 'lifestyle'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>B. 生活品質與規劃 ({formatTwd(groupStats.lifestyle.budget)})</span>
        </button>

        <button
          onClick={() => setSelectedGroup('wealth')}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            selectedGroup === 'wealth'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>C. 財富累積與配置（盈餘用途）</span>
        </button>
      </div>

      {/* Segregation Notice banner */}
      <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-800 flex items-start space-x-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">重要原則提示：</strong>
          「保險」與「旅遊」之實際消費屬於生活支出；而「股票、ETF 投資與儲蓄」屬於<strong>年度盈餘的資產配置用途</strong>，系統嚴格隔離，絕不會被重複算入日常消費支出！
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/70">
              <th className="py-3 px-3">預算項目名稱</th>
              <th className="py-3 px-3">大類群組</th>
              <th className="py-3 px-3 text-right">年度預算目標</th>
              <th className="py-3 px-3 text-right">每月換算目標</th>
              <th className="py-3 px-3 text-right">實際金額</th>
              <th className="py-3 px-3 text-right">剩餘額度</th>
              <th className="py-3 px-3 text-center">使用率進度</th>
              <th className="py-3 px-3 text-center">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const isWealth = item.budgetItem.group === 'wealth';
              const progressPct = Math.min(100, Math.max(0, item.usageRate));

              return (
                <tr key={item.budgetItem.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-900">
                    <div className="flex items-center space-x-1.5">
                      <span>{item.budgetItem.name}</span>
                      {item.budgetItem.note && (
                        <span className="text-[10px] text-slate-400">({item.budgetItem.note})</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    {item.budgetItem.group === 'essential' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-800">
                        必要生活
                      </span>
                    )}
                    {item.budgetItem.group === 'lifestyle' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800">
                        生活品質
                      </span>
                    )}
                    {item.budgetItem.group === 'wealth' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                        盈餘配置
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right font-medium text-slate-800">
                    {formatTwd(item.budgetItem.annual_budget)}
                  </td>

                  <td className="py-3 px-3 text-right text-slate-500">
                    {formatTwd(item.budgetItem.annual_budget / 12)} /月
                  </td>

                  <td className="py-3 px-3 text-right font-semibold text-slate-900">
                    {formatTwd(item.actualSpent)}
                  </td>

                  <td className={`py-3 px-3 text-right font-medium ${
                    item.remainingBudget >= 0 ? 'text-slate-700' : 'text-rose-600 font-semibold'
                  }`}>
                    {formatTwd(item.remainingBudget)}
                  </td>

                  <td className="py-3 px-3 w-36">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.usageRate > 100
                              ? 'bg-rose-500'
                              : item.usageRate >= 85
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 w-10 text-right">
                        {item.usageRate.toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    {item.status === 'exceeded' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                        超支
                      </span>
                    ) : item.status === 'warning' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                        預警
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        正常
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
