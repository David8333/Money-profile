/**
 * Advanced Financial Analytics Engine (Phase 5)
 * Implements category ranking, account analysis (balance vs. volume distinction),
 * member contributions, daily/monthly averages, and Year-over-Year (YoY) comparisons.
 *
 * Rules:
 * 1. Non-TWD transactions MUST use base_amount for all aggregations; raw amounts are never mixed.
 * 2. Transfers are strictly excluded from income, expense, and savings calculations.
 * 3. Account balance reflects net worth, while account volume reflects transaction turnover.
 */

import { EnrichedTransaction, CategoryRankingResult, CategoryRankItem, AccountAnalysisResult, AccountAnalysisItem, MemberAnalysisResult, MemberAnalysisItem, AveragesResult, YoYComparisonResult } from '../../types/finance';
import { DbAccount, DbMember } from '../../types/database';
import { getSafeBaseAmount } from '../dashboard/dashboardAnalytics';
import { getExchangeRateForDate } from '../currencies/rateService';
import { getTodayDateString } from '../../utils/date';

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  飲食: '#f97316',
  日常用品: '#06b6d4',
  機車: '#3b82f6',
  大眾運輸: '#6366f1',
  房貸: '#e11d48',
  居家: '#14b8a6',
  電話網路: '#0ea5e9',
  娛樂: '#ec4899',
  交際應酬: '#a855f7',
  醫療保健: '#10b981',
  服飾: '#f59e0b',
  學習深造: '#8b5cf6',
  美容美髮: '#f43f5e',
  稅金: '#64748b',
  旅遊: '#0284c7',
  工資: '#10b981',
  獎金: '#14b8a6',
  投資收益: '#8b5cf6',
  兼職副業: '#f59e0b',
  其它: '#94a3b8',
};

const PALETTE = [
  '#f97316', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6',
  '#06b6d4', '#e11d48', '#f59e0b', '#64748b', '#14b8a6'
];

/**
 * 1. 分類排行榜與佔比分析 (支出 / 收入)
 */
export function calculateCategoryRanking(
  transactions: EnrichedTransaction[],
  type: 'expense' | 'income' = 'expense',
  period: 'month' | 'quarter' | 'year' | 'all' = 'month',
  anchorDateStr?: string
): CategoryRankingResult {
  const targetDate = anchorDateStr ? new Date(anchorDateStr) : new Date();
  const targetYear = targetDate.getFullYear();
  const targetMonthNum = targetDate.getMonth() + 1; // 1-12
  const targetMonthStr = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;

  let periodLabel = '';
  let filterFn: (tx: EnrichedTransaction) => boolean;
  let prevFilterFn: ((tx: EnrichedTransaction) => boolean) | null = null;

  if (period === 'month') {
    periodLabel = `${targetYear}年${targetMonthNum}月`;
    filterFn = tx => tx.transaction_date.startsWith(targetMonthStr);
    
    // 前期比較：上個月
    const prevDate = new Date(targetYear, targetDate.getMonth() - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    prevFilterFn = tx => tx.transaction_date.startsWith(prevMonthStr);
  } else if (period === 'quarter') {
    const q = Math.ceil(targetMonthNum / 3);
    const qStartMonth = (q - 1) * 3 + 1;
    const qEndMonth = q * 3;
    periodLabel = `${targetYear}年 第${q}季`;
    filterFn = tx => {
      if (!tx.transaction_date.startsWith(String(targetYear))) return false;
      const m = parseInt(tx.transaction_date.slice(5, 7), 10);
      return m >= qStartMonth && m <= qEndMonth;
    };
  } else if (period === 'year') {
    periodLabel = `${targetYear}年度`;
    filterFn = tx => tx.transaction_date.startsWith(String(targetYear));
    prevFilterFn = tx => tx.transaction_date.startsWith(String(targetYear - 1));
  } else {
    periodLabel = '全部期間';
    filterFn = () => true;
  }

  // 統計當期分類
  const categoryStats = new Map<string, {
    categoryId: string;
    categoryName: string;
    color: string;
    amount: number;
    count: number;
  }>();

  let totalAmount = 0;

  transactions.forEach(tx => {
    if (tx.type !== type || !filterFn(tx)) return;
    const { amount } = getSafeBaseAmount(tx);
    totalAmount += amount;

    const catId = tx.category_id || 'uncategorized';
    const catName = tx.category?.name || '未分類';
    const catColor = tx.category?.color || DEFAULT_CATEGORY_COLORS[catName] || '#94a3b8';

    if (!categoryStats.has(catId)) {
      categoryStats.set(catId, {
        categoryId: catId,
        categoryName: catName,
        color: catColor,
        amount: 0,
        count: 0,
      });
    }

    const item = categoryStats.get(catId)!;
    item.amount += amount;
    item.count += 1;
  });

  // 統計前期分類金額（若有）
  const prevAmountMap = new Map<string, number>();
  if (prevFilterFn) {
    transactions.forEach(tx => {
      if (tx.type !== type || !prevFilterFn!(tx)) return;
      const { amount } = getSafeBaseAmount(tx);
      const catId = tx.category_id || 'uncategorized';
      prevAmountMap.set(catId, (prevAmountMap.get(catId) || 0) + amount);
    });
  }

  // 排序並產生排名
  const sorted = Array.from(categoryStats.values()).sort((a, b) => b.amount - a.amount);

  const items: CategoryRankItem[] = sorted.map((item, idx) => {
    const percentage = totalAmount > 0 ? Math.round((item.amount / totalAmount) * 1000) / 10 : 0;
    const prevAmount = prevAmountMap.get(item.categoryId);
    let growthRate: number | undefined;

    if (prevAmount !== undefined) {
      if (prevAmount === 0 && item.amount > 0) {
        growthRate = 100;
      } else if (prevAmount > 0) {
        growthRate = Math.round(((item.amount - prevAmount) / prevAmount) * 1000) / 10;
      } else {
        growthRate = 0;
      }
    }

    return {
      rank: idx + 1,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      color: item.color || PALETTE[idx % PALETTE.length],
      amount: Math.round(item.amount * 100) / 100,
      percentage,
      transactionCount: item.count,
      previousPeriodAmount: prevAmount !== undefined ? Math.round(prevAmount * 100) / 100 : undefined,
      growthRate,
    };
  });

  return {
    type,
    periodLabel,
    totalAmount: Math.round(totalAmount * 100) / 100,
    items,
  };
}

/**
 * 2. 帳戶深度分析
 * 嚴格區分：
 * - currentBalance (帳戶當前餘額: 期初 + 收入 - 支出 + 轉入 - 轉出)
 * - totalVolume (帳戶總交易額: 收入 + 支出 + 轉入 + 轉出 之總資金週轉量)
 */
export function calculateAccountAnalysis(
  transactions: EnrichedTransaction[],
  accounts: DbAccount[]
): AccountAnalysisResult {
  const accountMap = new Map<string, AccountAnalysisItem>();

  // 初始化所有帳戶預設值
  accounts.forEach(acc => {
    const opening = Number(acc.opening_balance) || 0;
    const rate = getExchangeRateForDate(acc.currency, getTodayDateString(), 'TWD');
    const baseOpening = Math.round(opening * rate * 100) / 100;

    accountMap.set(acc.id, {
      accountId: acc.id,
      accountName: acc.name,
      accountType: acc.account_type,
      currency: acc.currency,
      currentBalance: opening,
      baseCurrentBalance: baseOpening,
      totalVolume: 0,
      baseTotalVolume: 0,
      totalIncome: 0,
      totalExpense: 0,
      totalTransferIn: 0,
      totalTransferOut: 0,
      transactionCount: 0,
    });
  });

  // 累加交易紀錄
  transactions.forEach(tx => {
    const rawAmount = Number(tx.amount) || 0;
    const { amount: baseAmount } = getSafeBaseAmount(tx);

    let item = accountMap.get(tx.account_id);
    if (!item) {
      const fallbackName = tx.account?.name || '未知帳戶';
      const fallbackCurrency = tx.currency || 'TWD';
      item = {
        accountId: tx.account_id,
        accountName: fallbackName,
        accountType: 'bank',
        currency: fallbackCurrency,
        currentBalance: 0,
        baseCurrentBalance: 0,
        totalVolume: 0,
        baseTotalVolume: 0,
        totalIncome: 0,
        totalExpense: 0,
        totalTransferIn: 0,
        totalTransferOut: 0,
        transactionCount: 0,
      };
      accountMap.set(tx.account_id, item);
    }

    item.transactionCount += 1;
    item.totalVolume += rawAmount;
    item.baseTotalVolume += baseAmount;

    if (tx.type === 'income') {
      item.currentBalance += rawAmount;
      item.baseCurrentBalance += baseAmount;
      item.totalIncome += baseAmount;
    } else if (tx.type === 'expense') {
      item.currentBalance -= rawAmount;
      item.baseCurrentBalance -= baseAmount;
      item.totalExpense += baseAmount;
    } else if (tx.type === 'transfer') {
      // Phase 6A: 嚴格依據 transfer_direction 欄位判定轉出或轉入，徹底廢除對 note 備註字串的依賴
      if (tx.transfer_direction === 'out') {
        item.currentBalance -= rawAmount;
        item.baseCurrentBalance -= baseAmount;
        item.totalTransferOut += baseAmount;
      } else if (tx.transfer_direction === 'in') {
        item.currentBalance += rawAmount;
        item.baseCurrentBalance += baseAmount;
        item.totalTransferIn += baseAmount;
      } else {
        // 向下相容歷史資料：若未明確定義 transfer_direction，嚴格標記為待確認，不隨意猜測
        // 此時僅累計進入總交易流動量 (totalVolume)，不任意竄改 currentBalance
        console.warn(`[Phase 6A 警示] 發現未標註 transfer_direction 之歷史轉帳紀錄 (ID: ${tx.id})，已標示為待確認，不自動猜測影響帳戶餘額`);
      }
    }
  });

  const accountList = Array.from(accountMap.values()).map(a => ({
    ...a,
    currentBalance: Math.round(a.currentBalance * 100) / 100,
    baseCurrentBalance: Math.round(a.baseCurrentBalance * 100) / 100,
    totalVolume: Math.round(a.totalVolume * 100) / 100,
    baseTotalVolume: Math.round(a.baseTotalVolume * 100) / 100,
    totalIncome: Math.round(a.totalIncome * 100) / 100,
    totalExpense: Math.round(a.totalExpense * 100) / 100,
    totalTransferIn: Math.round(a.totalTransferIn * 100) / 100,
    totalTransferOut: Math.round(a.totalTransferOut * 100) / 100,
  }));

  // 計算淨資產 (正餘額為資產，負餘額為負債)
  let totalBaseAssets = 0;
  let totalBaseLiabilities = 0;
  let totalVolumeAllAccounts = 0;

  accountList.forEach(a => {
    if (a.baseCurrentBalance > 0) {
      totalBaseAssets += a.baseCurrentBalance;
    } else {
      totalBaseLiabilities += Math.abs(a.baseCurrentBalance);
    }
    totalVolumeAllAccounts += a.baseTotalVolume;
  });

  return {
    accounts: accountList,
    totalBaseAssets: Math.round(totalBaseAssets * 100) / 100,
    totalBaseLiabilities: Math.round(totalBaseLiabilities * 100) / 100,
    netWorth: Math.round((totalBaseAssets - totalBaseLiabilities) * 100) / 100,
    totalVolumeAllAccounts: Math.round(totalVolumeAllAccounts * 100) / 100,
  };
}

/**
 * 3. 家庭/成員收支貢獻分析
 */
export function calculateMemberAnalysis(
  transactions: EnrichedTransaction[],
  members: DbMember[]
): MemberAnalysisResult {
  const memberMap = new Map<string, {
    memberId: string;
    memberName: string;
    totalExpense: number;
    totalIncome: number;
    transactionCount: number;
    categorySpending: Map<string, number>;
  }>();

  // 初始化成員
  members.forEach(m => {
    memberMap.set(m.id, {
      memberId: m.id,
      memberName: m.name,
      totalExpense: 0,
      totalIncome: 0,
      transactionCount: 0,
      categorySpending: new Map(),
    });
  });

  let totalExpenseAll = 0;
  let totalIncomeAll = 0;

  transactions.forEach(tx => {
    if (tx.type === 'transfer') return; // 轉帳完全排除

    const { amount } = getSafeBaseAmount(tx);
    const mId = tx.member_id || 'unassigned';
    const mName = tx.member?.name || '預設成員';

    if (!memberMap.has(mId)) {
      memberMap.set(mId, {
        memberId: mId,
        memberName: mName,
        totalExpense: 0,
        totalIncome: 0,
        transactionCount: 0,
        categorySpending: new Map(),
      });
    }

    const item = memberMap.get(mId)!;
    item.transactionCount += 1;

    if (tx.type === 'expense') {
      item.totalExpense += amount;
      totalExpenseAll += amount;

      const catName = tx.category?.name || '其它';
      item.categorySpending.set(
        catName,
        (item.categorySpending.get(catName) || 0) + amount
      );
    } else if (tx.type === 'income') {
      item.totalIncome += amount;
      totalIncomeAll += amount;
    }
  });

  const memberList: MemberAnalysisItem[] = Array.from(memberMap.values()).map(m => {
    // 找出該成員最大消費分類
    let topCatName = '無支出';
    let maxSpend = 0;
    m.categorySpending.forEach((spend, cat) => {
      if (spend > maxSpend) {
        maxSpend = spend;
        topCatName = cat;
      }
    });

    const expensePct = totalExpenseAll > 0 ? Math.round((m.totalExpense / totalExpenseAll) * 1000) / 10 : 0;
    const incomePct = totalIncomeAll > 0 ? Math.round((m.totalIncome / totalIncomeAll) * 1000) / 10 : 0;

    return {
      memberId: m.memberId,
      memberName: m.memberName,
      totalExpense: Math.round(m.totalExpense * 100) / 100,
      totalIncome: Math.round(m.totalIncome * 100) / 100,
      netBalance: Math.round((m.totalIncome - m.totalExpense) * 100) / 100,
      expensePercentage: expensePct,
      incomePercentage: incomePct,
      transactionCount: m.transactionCount,
      topExpenseCategory: topCatName,
    };
  });

  return {
    members: memberList,
    totalExpense: Math.round(totalExpenseAll * 100) / 100,
    totalIncome: Math.round(totalIncomeAll * 100) / 100,
  };
}

/**
 * 4. 日均與月均收支統計
 * 提供明確的分母計算與雙指標 (日曆天 vs 有消費天)
 */
export function calculateAverages(
  transactions: EnrichedTransaction[],
  periodRange?: { startDate: string; endDate: string }
): AveragesResult {
  let totalExpense = 0;
  let totalIncome = 0;
  const activeDays = new Set<string>();
  const activeMonths = new Set<string>();

  transactions.forEach(tx => {
    if (tx.type === 'transfer') return; // 轉帳完全排除

    if (periodRange) {
      if (tx.transaction_date < periodRange.startDate || tx.transaction_date > periodRange.endDate) {
        return;
      }
    }

    const { amount } = getSafeBaseAmount(tx);
    if (tx.type === 'expense') {
      totalExpense += amount;
      activeDays.add(tx.transaction_date);
      activeMonths.add(tx.transaction_date.slice(0, 7));
    } else if (tx.type === 'income') {
      totalIncome += amount;
      activeDays.add(tx.transaction_date);
      activeMonths.add(tx.transaction_date.slice(0, 7));
    }
  });

  // 計算日曆總天數
  let periodDays = activeDays.size;
  if (periodRange && periodRange.startDate && periodRange.endDate) {
    const start = new Date(periodRange.startDate).getTime();
    const end = new Date(periodRange.endDate).getTime();
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) periodDays = diff;
  }
  if (periodDays <= 0) periodDays = 1;

  const monthsCount = activeMonths.size > 0 ? activeMonths.size : 1;

  const dailyAverageExpense = Math.round((totalExpense / periodDays) * 100) / 100;
  const activeDailyAverageExpense = Math.round((totalExpense / (activeDays.size || 1)) * 100) / 100;
  const dailyAverageIncome = Math.round((totalIncome / periodDays) * 100) / 100;

  const monthlyAverageExpense = Math.round((totalExpense / monthsCount) * 100) / 100;
  const monthlyAverageIncome = Math.round((totalIncome / monthsCount) * 100) / 100;

  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10
    : 0;

  return {
    periodDays,
    activeDaysCount: activeDays.size,
    dailyAverageExpense,
    activeDailyAverageExpense,
    dailyAverageIncome,
    monthlyAverageExpense,
    monthlyAverageIncome,
    savingsRate,
  };
}

/**
 * 5. 年度同期比較 (YoY - Year-over-Year)
 */
export function calculateYoYComparison(
  transactions: EnrichedTransaction[],
  currentYear: number,
  previousYear: number = currentYear - 1
): YoYComparisonResult {
  const currentPrefix = `${currentYear}-`;
  const previousPrefix = `${previousYear}-`;

  let currentYearIncome = 0;
  let previousYearIncome = 0;
  let currentYearExpense = 0;
  let previousYearExpense = 0;

  const currentCatMap = new Map<string, number>();
  const prevCatMap = new Map<string, number>();

  transactions.forEach(tx => {
    if (tx.type === 'transfer') return; // 轉帳完全排除

    const { amount } = getSafeBaseAmount(tx);
    const catName = tx.category?.name || '其它';

    if (tx.transaction_date.startsWith(currentPrefix)) {
      if (tx.type === 'income') {
        currentYearIncome += amount;
      } else if (tx.type === 'expense') {
        currentYearExpense += amount;
        currentCatMap.set(catName, (currentCatMap.get(catName) || 0) + amount);
      }
    } else if (tx.transaction_date.startsWith(previousPrefix)) {
      if (tx.type === 'income') {
        previousYearIncome += amount;
      } else if (tx.type === 'expense') {
        previousYearExpense += amount;
        prevCatMap.set(catName, (prevCatMap.get(catName) || 0) + amount);
      }
    }
  });

  const calcGrowth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  const incomeGrowthRate = calcGrowth(currentYearIncome, previousYearIncome);
  const expenseGrowthRate = calcGrowth(currentYearExpense, previousYearExpense);

  const currentYearNet = currentYearIncome - currentYearExpense;
  const previousYearNet = previousYearIncome - previousYearExpense;
  const netGrowthRate = calcGrowth(currentYearNet, previousYearNet);

  // 計算分類變化
  const allCategoryNames = new Set([...currentCatMap.keys(), ...prevCatMap.keys()]);
  const categoryShifts = Array.from(allCategoryNames).map(catName => {
    const curr = currentCatMap.get(catName) || 0;
    const prev = prevCatMap.get(catName) || 0;
    const delta = curr - prev;
    const growth = calcGrowth(curr, prev);

    return {
      categoryName: catName,
      currentAmount: Math.round(curr),
      previousAmount: Math.round(prev),
      deltaAmount: Math.round(delta),
      growthRate: growth,
    };
  }).sort((a, b) => Math.abs(b.deltaAmount) - Math.abs(a.deltaAmount));

  return {
    currentYear,
    previousYear,
    currentYearIncome: Math.round(currentYearIncome),
    previousYearIncome: Math.round(previousYearIncome),
    incomeGrowthRate,
    currentYearExpense: Math.round(currentYearExpense),
    previousYearExpense: Math.round(previousYearExpense),
    expenseGrowthRate,
    currentYearNet: Math.round(currentYearNet),
    previousYearNet: Math.round(previousYearNet),
    netGrowthRate,
    categoryShifts,
  };
}
