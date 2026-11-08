import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Coins,
  ShieldCheck,
  Terminal,
  Calendar,
  Layers,
  CreditCard,
  Users,
  BarChart3,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wallet,
  Sparkles,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPie,
  Pie,
  Legend
} from 'recharts';
import { EnrichedTransaction } from '../../types/finance';
import { DbAccount, DbMember, DbCategory } from '../../types/database';
import { fetchTransactions } from '../../services/supabase/transactions';
import { fetchAccounts } from '../../services/supabase/accounts';
import { fetchMembers } from '../../services/supabase/members';
import { fetchCategories } from '../../services/supabase/categories';
import {
  calculateCategoryRanking,
  calculateAccountAnalysis,
  calculateMemberAnalysis,
  calculateAverages,
  calculateYoYComparison,
} from '../../services/analytics/advancedAnalytics';
import { findTransactionsWithMissingRates } from '../../services/currencies/rateService';
import { CurrencyManagerModal } from '../currencies/CurrencyManagerModal';
import { AnalyticsTestSuiteModal } from './AnalyticsTestSuiteModal';
import { formatCurrency } from '../../utils/currency';
import { useAuth } from '../../hooks/useAuth';

interface AnalyticsViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigateToTab }) => {
  const { user } = useAuth();

  // 資料狀態
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [members, setMembers] = useState<DbMember[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 分析維度
  const [activeTab, setActiveTab] = useState<'ranking' | 'accounts' | 'members' | 'yoy' | 'health'>('ranking');
  const [rankingType, setRankingType] = useState<'expense' | 'income'>('expense');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  // 彈窗狀態
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // 載入資料
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [txRes, accRes, memRes, catRes] = await Promise.all([
        fetchTransactions(user?.id),
        fetchAccounts(user?.id || 'mock-user'),
        fetchMembers(user?.id || 'mock-user'),
        fetchCategories(user?.id || 'mock-user'),
      ]);
      setTransactions(txRes.data);
      setAccounts(accRes.data);
      setMembers(memRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  // 計算平均數值
  const averages = useMemo(() => {
    return calculateAverages(transactions);
  }, [transactions]);

  // 計算分類排行榜
  const rankingResult = useMemo(() => {
    return calculateCategoryRanking(transactions, rankingType, period);
  }, [transactions, rankingType, period]);

  // 計算帳戶分析
  const accountResult = useMemo(() => {
    return calculateAccountAnalysis(transactions, accounts);
  }, [transactions, accounts]);

  // 計算成員分析
  const memberResult = useMemo(() => {
    return calculateMemberAnalysis(transactions, members);
  }, [transactions, members]);

  // 計算 YoY 同期比較
  const yoyResult = useMemo(() => {
    return calculateYoYComparison(transactions, selectedYear, selectedYear - 1);
  }, [transactions, selectedYear]);

  // 檢測缺少匯率之交易
  const missingRateTransactions = useMemo(() => {
    return findTransactionsWithMissingRates(transactions);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* 頂部功能列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
              Phase 5 完成版
            </span>
            <span className="text-xs text-slate-400 font-mono">Multi-Currency & Analytics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            多幣別管理與進階財務統計
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            以新台幣 (TWD) 基準金額精確換算，嚴格隔離轉帳，確保零虛增與無跨幣別直加混算
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCurrencyModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>幣別與匯率設定</span>
          </button>
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Terminal className="w-4 h-4" />
            <span>執行 Phase 5 自動化測試 (15項)</span>
          </button>
        </div>
      </div>

      {/* 頂部核心指標卡片 (KPI Summary) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 日均支出 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>日均支出</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {formatCurrency(averages.dailyAverageExpense)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>有消費天均:</span>
            <span className="font-mono font-semibold text-slate-600">
              {formatCurrency(averages.activeDailyAverageExpense)}
            </span>
          </div>
        </div>

        {/* 月均支出 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>月均支出</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-rose-600 font-mono">
            {formatCurrency(averages.monthlyAverageExpense)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>月均收入:</span>
            <span className="font-mono font-semibold text-emerald-600">
              {formatCurrency(averages.monthlyAverageIncome)}
            </span>
          </div>
        </div>

        {/* 儲蓄率 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>平均儲蓄率</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-purple-700 font-mono">
            {averages.savingsRate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            (總結餘 / 總收入) * 100
          </div>
        </div>

        {/* 淨資產 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>帳戶總淨資產</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono">
            {formatCurrency(accountResult.netWorth)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>負債總計:</span>
            <span className="font-mono text-slate-600">
              {formatCurrency(accountResult.totalBaseLiabilities)}
            </span>
          </div>
        </div>

        {/* 帳戶總週轉交易額 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>帳戶總交易額 (Volume)</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-blue-700 font-mono">
            {formatCurrency(accountResult.totalVolumeAllAccounts)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            資金總流動週轉量 (非餘額)
          </div>
        </div>
      </div>

      {/* 分析視圖分頁切換 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ranking'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>分類排行榜</span>
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'accounts'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>帳戶深度分析 (餘額 vs 交易額)</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>家庭成員收支貢獻</span>
          </button>
          <button
            onClick={() => setActiveTab('yoy')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'yoy'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>年度同期比較 (YoY)</span>
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'health'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>匯率健康稽核</span>
            {missingRateTransactions.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>
        </div>

        {/* Tab 1: 分類排行榜 */}
        {activeTab === 'ranking' && (
          <div className="p-6 space-y-6">
            {/* 控制項 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setRankingType('expense')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    rankingType === 'expense'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  支出排行榜
                </button>
                <button
                  onClick={() => setRankingType('income')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    rankingType === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  收入排行榜
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">統計期間:</span>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value as any)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-semibold"
                >
                  <option value="month">當前月份</option>
                  <option value="quarter">當前季度</option>
                  <option value="year">年度累計</option>
                  <option value="all">全部歷史期間</option>
                </select>
              </div>
            </div>

            {/* 排行榜表格與視覺化進度條 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
                  <span>排行與分類名稱</span>
                  <span>金額 (TWD) ｜ 佔比</span>
                </div>

                {rankingResult.items.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                    此期間尚無相關交易紀錄
                  </div>
                ) : (
                  rankingResult.items.map(item => (
                    <div
                      key={item.categoryId}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${
                            item.rank === 1 ? 'bg-amber-100 text-amber-800' :
                            item.rank === 2 ? 'bg-slate-200 text-slate-800' :
                            item.rank === 3 ? 'bg-amber-50 text-amber-900' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            #{item.rank}
                          </span>
                          <span className="text-slate-900">{item.categoryName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({item.transactionCount} 筆)
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-slate-900">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700 min-w-[40px] text-center">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* 百分比進度條 */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>

                      {/* 前期環比增長標記 */}
                      {item.growthRate !== undefined && (
                        <div className="flex items-center justify-end text-[10px] text-slate-400 mt-1.5 gap-1">
                          <span>較前期:</span>
                          <span className={`font-semibold flex items-center ${
                            item.growthRate > 0 ? 'text-rose-600' : item.growthRate < 0 ? 'text-emerald-600' : 'text-slate-500'
                          }`}>
                            {item.growthRate > 0 ? '+' : ''}{item.growthRate}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Recharts 分布圖 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center min-h-[300px]">
                <h4 className="text-xs font-bold text-slate-700 mb-2">前五大佔比分布</h4>
                {rankingResult.items.length > 0 ? (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={rankingResult.items.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="amount"
                          nameKey="categoryName"
                        >
                          {rankingResult.items.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`${formatCurrency(Number(value))}`, '金額']}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">尚無圖表資料</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 帳戶深度分析 */}
        {activeTab === 'accounts' && (
          <div className="p-6 space-y-6">
            {/* 重要原則提示卡 */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-1 text-emerald-900">
                  工程規範：清楚區分「帳戶當前餘額」與「總交易額 (Volume)」
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                    <strong className="text-emerald-900">帳戶當前餘額 (Balance):</strong>
                    <p className="text-slate-600 mt-0.5 text-[11px]">
                      期初餘額 + 累計收入 - 累計支出 + 轉入 - 轉出。反映帳戶當前淨資產總值。
                    </p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                    <strong className="text-emerald-900">總交易額 (Volume):</strong>
                    <p className="text-slate-600 mt-0.5 text-[11px]">
                      累計收入 + 累計支出 + 轉出 + 轉入 之絕對值總和。反映資金通過該帳戶的總流動週轉頻率。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 帳戶明細表格 */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">帳戶名稱 / 幣別</th>
                    <th className="py-2.5 px-3 text-right">當前餘額 (Balance)</th>
                    <th className="py-2.5 px-3 text-right">換算 TWD 餘額</th>
                    <th className="py-2.5 px-3 text-right">總交易額 (Volume)</th>
                    <th className="py-2.5 px-3 text-right">累計收入</th>
                    <th className="py-2.5 px-3 text-right">累計支出</th>
                    <th className="py-2.5 px-3 text-right">轉入 / 轉出</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountResult.accounts.map(acc => (
                    <tr key={acc.accountId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{acc.accountName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {acc.currency} ｜ {acc.accountType} ｜ {acc.transactionCount} 筆交易
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {acc.currentBalance.toLocaleString()} {acc.currency}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${
                        acc.baseCurrentBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {formatCurrency(acc.baseCurrentBalance)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(acc.baseTotalVolume)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600">
                        +{formatCurrency(acc.totalIncome)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        -{formatCurrency(acc.totalExpense)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 text-[11px]">
                        <div>入: +{formatCurrency(acc.totalTransferIn)}</div>
                        <div>出: -{formatCurrency(acc.totalTransferOut)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: 成員貢獻分析 */}
        {activeTab === 'members' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberResult.members.map(m => (
                <div key={m.memberId} className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                        {m.memberName.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{m.memberName}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {m.transactionCount} 筆記帳
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                      佔家庭支出 {m.expensePercentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400">總支出</div>
                      <div className="font-bold text-rose-600">{formatCurrency(m.totalExpense)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">總收入</div>
                      <div className="font-bold text-emerald-600">{formatCurrency(m.totalIncome)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">個人淨結餘</div>
                      <div className="font-bold text-slate-900">{formatCurrency(m.netBalance)}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>主要消費分類:</span>
                    <span className="font-semibold text-slate-800">{m.topExpenseCategory}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: 年度同期比較 (YoY) */}
        {activeTab === 'yoy' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  年度財務同期比較分析 (YoY)
                </h4>
                <p className="text-xs text-slate-500">
                  比較目標年份與前一年度之收入、支出、結餘與各大分類變化
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-600">基準年份:</span>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold font-mono bg-white"
                >
                  <option value={2026}>2026 年</option>
                  <option value={2025}>2025 年</option>
                  <option value={2024}>2024 年</option>
                </select>
              </div>
            </div>

            {/* YoY 指標卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 mb-1">年度總收入 YoY</div>
                <div className="text-lg font-bold text-emerald-700 font-mono">
                  {formatCurrency(yoyResult.currentYearIncome)}
                </div>
                <div className="text-xs mt-1 flex items-center gap-1">
                  <span className="text-slate-400">前一年: {formatCurrency(yoyResult.previousYearIncome)}</span>
                  <span className={`font-bold font-mono ml-auto ${
                    yoyResult.incomeGrowthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {yoyResult.incomeGrowthRate >= 0 ? '+' : ''}{yoyResult.incomeGrowthRate}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 mb-1">年度總支出 YoY</div>
                <div className="text-lg font-bold text-rose-600 font-mono">
                  {formatCurrency(yoyResult.currentYearExpense)}
                </div>
                <div className="text-xs mt-1 flex items-center gap-1">
                  <span className="text-slate-400">前一年: {formatCurrency(yoyResult.previousYearExpense)}</span>
                  <span className={`font-bold font-mono ml-auto ${
                    yoyResult.expenseGrowthRate <= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {yoyResult.expenseGrowthRate >= 0 ? '+' : ''}{yoyResult.expenseGrowthRate}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 mb-1">年度結餘 YoY</div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {formatCurrency(yoyResult.currentYearNet)}
                </div>
                <div className="text-xs mt-1 flex items-center gap-1">
                  <span className="text-slate-400">前一年: {formatCurrency(yoyResult.previousYearNet)}</span>
                  <span className={`font-bold font-mono ml-auto ${
                    yoyResult.netGrowthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {yoyResult.netGrowthRate >= 0 ? '+' : ''}{yoyResult.netGrowthRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* 各大分類變動清單 */}
            <div>
              <h5 className="text-xs font-bold text-slate-800 mb-2">分類支出消長明細</h5>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                {yoyResult.categoryShifts.map(cat => (
                  <div key={cat.categoryName} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <span className="font-bold text-slate-900">{cat.categoryName}</span>
                    <div className="flex items-center space-x-4 font-mono">
                      <span className="text-slate-400">前年: {formatCurrency(cat.previousAmount)}</span>
                      <span className="text-slate-900">今年: {formatCurrency(cat.currentAmount)}</span>
                      <span className={`font-bold min-w-[70px] text-right ${
                        cat.deltaAmount > 0 ? 'text-rose-600' : cat.deltaAmount < 0 ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {cat.deltaAmount > 0 ? '+' : ''}{formatCurrency(cat.deltaAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: 匯率與多幣別健康稽核 */}
        {activeTab === 'health' && (
          <div className="p-6 space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                資料庫多幣別與匯率完整性報告
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                本系統嚴格遵循 Phase 5 規定：不允許將未折算為基準幣 (TWD) 的外幣與新台幣直接加總。
                所有非 TWD 交易必須在交易建立當下記錄當時的 `exchange_rate` 與折算後之 `base_amount`。
              </p>
            </div>

            {missingRateTransactions.length === 0 ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                <h5 className="text-sm font-bold text-emerald-900">匯率健全度 100%</h5>
                <p className="text-xs text-emerald-700">
                  所有外幣交易紀錄皆已具備合規的 exchange_rate 與 base_amount，無資料遺失風險。
                </p>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>發現 {missingRateTransactions.length} 筆缺少匯率或基準金額之外幣交易</span>
                </div>
                <div className="border border-rose-200 rounded-lg overflow-hidden bg-white text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-rose-100/50 text-rose-900">
                      <tr>
                        <th className="p-2">日期</th>
                        <th className="p-2">幣別 / 原幣金額</th>
                        <th className="p-2">備註</th>
                        <th className="p-2">缺失原因</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {missingRateTransactions.map(tx => (
                        <tr key={tx.id}>
                          <td className="p-2 font-mono">{tx.transaction_date}</td>
                          <td className="p-2 font-mono font-bold">{tx.amount} {tx.currency}</td>
                          <td className="p-2">{tx.note || '-'}</td>
                          <td className="p-2 text-rose-600 font-semibold">缺少 exchange_rate 或 base_amount</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 彈窗元件 */}
      <CurrencyManagerModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        transactions={transactions}
        onCurrenciesUpdated={loadData}
      />

      <AnalyticsTestSuiteModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
};
