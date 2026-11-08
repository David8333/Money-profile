/**
 * Dashboard Analytics Engine
 * Calculates financial metrics, 12-month trends, category breakdowns,
 * annual summaries, and recent transactions with strict currency base_amount handling
 * and transfer exclusion.
 */

import { EnrichedTransaction, CategorySummary } from '../../types/finance';
import { getCurrentMonthRange } from '../../utils/date';

export interface DashboardKpi {
  month: string;           // YYYY-MM
  totalIncome: number;     // in TWD base_amount
  totalExpense: number;    // in TWD base_amount
  netBalance: number;      // totalIncome - totalExpense
  savingsRate: number;     // percentage: (netBalance / totalIncome) * 100
  transferVolume: number;  // total transfer volume (excluded from income/expense)
  hasIncompleteData: boolean; // flags if any foreign transaction lacked base_amount
}

export interface MonthlyTrendPoint {
  month: string;      // YYYY-MM
  monthLabel: string; // e.g. "2024/03" or "3月"
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdownResult {
  periodLabel: string;
  totalExpense: number;
  items: Array<{
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
}

export interface AnnualFinancialSummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  monthlyAverageIncome: number;
  monthlyAverageExpense: number;
  activeMonthsCount: number;
}

/**
 * 取得交易的基準金額（TWD）
 * 嚴格遵循規則：優先使用 base_amount，不同幣別不可直接累加原始金額
 */
export function getSafeBaseAmount(tx: EnrichedTransaction): { amount: number; isValid: boolean } {
  if (tx.base_amount !== undefined && tx.base_amount !== null && !isNaN(Number(tx.base_amount))) {
    return { amount: Number(tx.base_amount), isValid: true };
  }
  // 若無 base_amount 但為 TWD，安全使用 amount
  if (tx.currency === 'TWD' && tx.amount !== undefined && !isNaN(Number(tx.amount))) {
    return { amount: Number(tx.amount), isValid: true };
  }
  // 外幣若無 base_amount，標記為不完整，避免隨意以 1:1 計算
  return { amount: 0, isValid: false };
}

/**
 * 計算指定月份的 KPI 指標（本月收入、本月支出、結餘、儲蓄率）
 * 轉帳 (transfer) 嚴格排除
 */
export function calculateKpiStats(
  transactions: EnrichedTransaction[],
  targetMonth?: string
): DashboardKpi {
  const currentMonth = targetMonth || getCurrentMonthRange().monthString; // YYYY-MM
  let totalIncome = 0;
  let totalExpense = 0;
  let transferVolume = 0;
  let hasIncompleteData = false;

  transactions.forEach((tx) => {
    // 檢查月份邊界 (YYYY-MM)
    if (!tx.transaction_date.startsWith(currentMonth)) {
      return;
    }

    const { amount, isValid } = getSafeBaseAmount(tx);
    if (!isValid) {
      hasIncompleteData = true;
    }

    // 轉帳完全排除於收支統計之外
    if (tx.type === 'transfer') {
      transferVolume += amount;
      return;
    }

    if (tx.type === 'income') {
      totalIncome += amount;
    } else if (tx.type === 'expense') {
      totalExpense += amount;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 1000) / 10 : 0;

  return {
    month: currentMonth,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
    savingsRate,
    transferVolume: Math.round((transferVolume / 2) * 100) / 100, // 轉帳成對除以2
    hasIncompleteData,
  };
}

/**
 * 計算近 12 個月收支趨勢（即使無交易之月份亦補 0）
 */
export function calculateTwelveMonthsTrend(
  transactions: EnrichedTransaction[],
  anchorDate?: Date
): MonthlyTrendPoint[] {
  const anchor = anchorDate || new Date();
  const months: string[] = [];

  // 產生過去 12 個月份清單 (從 11 個月前到當月)
  for (let i = 11; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }

  // 建立快速查詢字典
  const trendMap = new Map<string, { income: number; expense: number }>();
  months.forEach((m) => trendMap.set(m, { income: 0, expense: 0 }));

  transactions.forEach((tx) => {
    // 排除轉帳
    if (tx.type === 'transfer') return;

    const monthKey = tx.transaction_date.slice(0, 7);
    if (trendMap.has(monthKey)) {
      const entry = trendMap.get(monthKey)!;
      const { amount } = getSafeBaseAmount(tx);
      if (tx.type === 'income') {
        entry.income += amount;
      } else if (tx.type === 'expense') {
        entry.expense += amount;
      }
    }
  });

  return months.map((m) => {
    const entry = trendMap.get(m)!;
    const parts = m.split('-');
    const label = `${parseInt(parts[1], 10)}月`;
    return {
      month: m,
      monthLabel: label,
      income: Math.round(entry.income),
      expense: Math.round(entry.expense),
      net: Math.round(entry.income - entry.expense),
    };
  });
}

/**
 * 預設分類顏色集
 */
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
  其它: '#94a3b8',
};

const PALETTE = [
  '#f97316', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6',
  '#06b6d4', '#e11d48', '#f59e0b', '#64748b', '#14b8a6'
];

/**
 * 計算支出分類佔比與排行
 * 前五大分類獨立呈現，其餘合併為「其它」
 */
export function calculateCategoryBreakdown(
  transactions: EnrichedTransaction[],
  period: 'this_month' | 'last_month' | 'this_year',
  selectedYear?: number,
  targetMonth?: string
): CategoryBreakdownResult {
  const now = new Date();
  const year = selectedYear || now.getFullYear();
  let filterFn: (tx: EnrichedTransaction) => boolean;
  let periodLabel = '';

  if (period === 'this_month') {
    const thisMonth = targetMonth || getCurrentMonthRange().monthString;
    periodLabel = '本月支出分析';
    filterFn = (tx) => tx.transaction_date.startsWith(thisMonth);
  } else if (period === 'last_month') {
    const lastMonthDate = new Date(year, now.getMonth() - 1, 1);
    const lm = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    periodLabel = '上月支出分析';
    filterFn = (tx) => tx.transaction_date.startsWith(lm);
  } else {
    periodLabel = `${year}年度支出分析`;
    filterFn = (tx) => tx.transaction_date.startsWith(`${year}`);
  }

  // 篩選純支出交易
  const expenseMap = new Map<string, { name: string; amount: number; color?: string }>();
  let totalExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type !== 'expense' || !filterFn(tx)) return;

    const { amount } = getSafeBaseAmount(tx);
    totalExpense += amount;

    const catName = tx.category?.name || '其它';
    const catColor = tx.category?.color || DEFAULT_CATEGORY_COLORS[catName];

    if (!expenseMap.has(catName)) {
      expenseMap.set(catName, { name: catName, amount: 0, color: catColor });
    }
    expenseMap.get(catName)!.amount += amount;
  });

  if (totalExpense === 0) {
    return {
      periodLabel,
      totalExpense: 0,
      items: [],
    };
  }

  // 由大到小排序
  const sorted = Array.from(expenseMap.values()).sort((a, b) => b.amount - a.amount);

  // 取前五名
  const top5 = sorted.slice(0, 5);
  const remaining = sorted.slice(5);

  const items = top5.map((item, idx) => ({
    name: item.name,
    amount: Math.round(item.amount),
    percentage: Math.round((item.amount / totalExpense) * 1000) / 10,
    color: item.color || PALETTE[idx % PALETTE.length],
  }));

  // 若有剩餘項目，合併為「其它」
  if (remaining.length > 0) {
    const remainingAmount = remaining.reduce((sum, r) => sum + r.amount, 0);
    items.push({
      name: '其它支出',
      amount: Math.round(remainingAmount),
      percentage: Math.round((remainingAmount / totalExpense) * 1000) / 10,
      color: '#94a3b8',
    });
  }

  return {
    periodLabel,
    totalExpense: Math.round(totalExpense),
    items,
  };
}

/**
 * 計算年度財務總覽（總收入、總支出、結餘、月平均收入、月平均支出）
 */
export function calculateAnnualSummary(
  transactions: EnrichedTransaction[],
  targetYear?: number
): AnnualFinancialSummary {
  const year = targetYear || new Date().getFullYear();
  const yearPrefix = `${year}-`;

  let totalIncome = 0;
  let totalExpense = 0;
  const activeMonths = new Set<string>();

  transactions.forEach((tx) => {
    if (!tx.transaction_date.startsWith(yearPrefix)) return;
    if (tx.type === 'transfer') return; // 轉帳完全排除

    const { amount } = getSafeBaseAmount(tx);
    if (tx.type === 'income') {
      totalIncome += amount;
      activeMonths.add(tx.transaction_date.slice(0, 7));
    } else if (tx.type === 'expense') {
      totalExpense += amount;
      activeMonths.add(tx.transaction_date.slice(0, 7));
    }
  });

  const netBalance = totalIncome - totalExpense;
  // 年度月平均除以 12 個月
  const monthlyAverageIncome = Math.round((totalIncome / 12) * 100) / 100;
  const monthlyAverageExpense = Math.round((totalExpense / 12) * 100) / 100;

  return {
    year,
    totalIncome: Math.round(totalIncome),
    totalExpense: Math.round(totalExpense),
    netBalance: Math.round(netBalance),
    monthlyAverageIncome,
    monthlyAverageExpense,
    activeMonthsCount: activeMonths.size,
  };
}

/**
 * 取得最近 10 筆交易（最新在前）
 */
export function getRecentTransactions(
  transactions: EnrichedTransaction[],
  limit: number = 10
): EnrichedTransaction[] {
  return [...transactions]
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, limit);
}
