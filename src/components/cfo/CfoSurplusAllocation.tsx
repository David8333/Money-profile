import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import {
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Coins,
  ShieldCheck,
  TrendingUp,
  Layers,
  Info
} from 'lucide-react';
import {
  CfoSurplusAllocationItem,
  CfoExecutiveSummaryData
} from '../../types/cfo';

interface CfoSurplusAllocationProps {
  summary: CfoExecutiveSummaryData;
  allocations: CfoSurplusAllocationItem[];
  onOpenBudgetModal: () => void;
  targetYear: number;
}

export const CfoSurplusAllocation: React.FC<CfoSurplusAllocationProps> = ({
  summary,
  allocations,
  onOpenBudgetModal,
  targetYear,
}) => {
  const formatTwd = (val: number) => `NT$ ${Math.round(val).toLocaleString('en-US')}`;

  const pieData = allocations.map((a) => ({
    name: a.name,
    value: Math.max(0, a.target_amount),
    actual: Math.max(0, a.actual_funded_amount),
    color: a.color || '#10b981',
    note: a.note,
  }));

  const totalFunded = allocations.reduce((sum, a) => sum + (Number(a.actual_funded_amount) || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 mb-8 shadow-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>第四區：{targetYear} 盈餘分配與資金配置（資本經營）</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            第一步計算「年度總收入 - 總支出 = 年度盈餘」；第二步將淨盈餘依重要性分配給投資、儲備與重大目標
          </p>
        </div>

        <button
          onClick={onOpenBudgetModal}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Coins className="w-3.5 h-3.5" />
          <span>調整盈餘配置方案</span>
        </button>
      </div>

      {/* Warnings & Notices */}
      {summary.isDeficit && (
        <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-sm text-rose-900">
              警告：{targetYear} 年度累計收支處於赤字狀態（{formatTwd(summary.annualNetSurplus)}）
            </strong>
            <p className="mt-1">
              依財務原則，年度赤字不得當作可分配盈餘！建議優先縮減非必要的品質娛樂開銷，確保現金流轉正後再行提撥投資或儲蓄。
            </p>
          </div>
        </div>
      )}

      {summary.isOverAllocated && !summary.isDeficit && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-800 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-sm text-amber-900">
              提示：預計配置總額（{formatTwd(summary.totalAllocated)}）超出可分配盈餘（{formatTwd(summary.availableSurplus)}）
            </strong>
            <p className="mt-1">
              超出額度達 {formatTwd(summary.totalAllocated - summary.availableSurplus)}。請適度調整配置目標或提升收入，以免產生資金缺口。
            </p>
          </div>
        </div>
      )}

      {/* 4 Main Capital Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
          <span className="text-[11px] font-medium text-slate-500 block">可分配盈餘</span>
          <span className="text-base sm:text-lg font-bold text-slate-900 block mt-1">
            {formatTwd(summary.availableSurplus)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            年度收入扣除支出之剩餘
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
          <span className="text-[11px] font-medium text-slate-500 block">預定配置總額</span>
          <span className="text-base sm:text-lg font-bold text-indigo-600 block mt-1">
            {formatTwd(summary.totalAllocated)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            目標規劃分配之總額度
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
          <span className="text-[11px] font-medium text-slate-500 block">未配置緩衝盈餘</span>
          <span className={`text-base sm:text-lg font-bold block mt-1 ${
            summary.unallocatedSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatTwd(summary.unallocatedSurplus)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            {summary.unallocatedSurplus >= 0 ? '保有之安全彈性現金' : '超額配置缺口'}
          </span>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5">
          <span className="text-[11px] font-medium text-emerald-800 block">實際已到位資金</span>
          <span className="text-base sm:text-lg font-bold text-emerald-700 block mt-1">
            {formatTwd(totalFunded)}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-1">
            累計已劃撥至專戶金額
          </span>
        </div>
      </div>

      {/* Chart & Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Pie / Donut Chart */}
        <div className="lg:col-span-5 h-64 sm:h-72 w-full flex items-center justify-center">
          {summary.totalAllocated > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${formatTwd(Number(val))}`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-xs text-slate-400">
              尚無配置項目，點選右上角進行規劃
            </div>
          )}
        </div>

        {/* Allocation List with Progress */}
        <div className="lg:col-span-7 space-y-3">
          {allocations.map((item) => {
            const pctOfAlloc = summary.totalAllocated > 0
              ? (item.target_amount / summary.totalAllocated) * 100
              : 0;
            const fundingProgress = item.target_amount > 0
              ? Math.min(100, (item.actual_funded_amount / item.target_amount) * 100)
              : 0;

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <strong className="font-semibold text-slate-900">{item.name}</strong>
                    {item.note && (
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        — {item.note}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800">{formatTwd(item.target_amount)}</span>
                    <span className="text-[11px] text-slate-400 ml-1.5">
                      ({pctOfAlloc.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Progress toward funded */}
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${fundingProgress}%`,
                        backgroundColor: item.color || '#10b981',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    已到位: {formatTwd(item.actual_funded_amount)} ({fundingProgress.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
