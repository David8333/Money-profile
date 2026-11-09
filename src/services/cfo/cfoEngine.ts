/**
 * Personal CFO Calculation & Financial Analytics Engine
 * Strictly follows rules:
 * - base_amount in TWD only
 * - Excludes transfers from income/expense
 * - Does not recalculate historical exchange rates
 * - Clear segregation between operational expenses and wealth surplus allocations
 */

import { EnrichedTransaction } from '../../types/finance';
import {
  CfoBudgetItem,
  CfoSurplusAllocationItem,
  CfoMonthlyStat,
  CfoBudgetComparisonItem,
  CfoExecutiveSummaryData,
  CfoFinancialHealthData,
} from '../../types/cfo';
import { getSafeBaseAmount } from '../dashboard/dashboardAnalytics';

/**
 * 取得指定年份與月份的所有有效收支交易（排除轉帳）
 */
export function filterTransactionsByYear(
  transactions: EnrichedTransaction[],
  targetYear: number
): EnrichedTransaction[] {
  return transactions.filter((tx) => {
    if (!tx.transaction_date) return false;
    const year = parseInt(tx.transaction_date.substring(0, 4), 10);
    return year === targetYear;
  });
}

/**
 * 計算年度財務總覽數據
 */
export function calculateExecutiveSummary(
  transactions: EnrichedTransaction[],
  targetYear: number,
  budgets: CfoBudgetItem[],
  allocations: CfoSurplusAllocationItem[]
): CfoExecutiveSummaryData {
  const yearTxs = filterTransactionsByYear(transactions, targetYear);

  let totalAnnualIncome = 0;
  let totalAnnualExpense = 0;

  yearTxs.forEach((tx) => {
    if (tx.type === 'transfer') return; // 轉帳嚴格排除

    const { amount, isValid } = getSafeBaseAmount(tx);
    if (!isValid || amount <= 0) return;

    if (tx.type === 'income') {
      totalAnnualIncome += amount;
    } else if (tx.type === 'expense') {
      totalAnnualExpense += amount;
    }
  });

  const annualNetSurplus = totalAnnualIncome - totalAnnualExpense;
  const annualSurplusRate = totalAnnualIncome > 0 ? (annualNetSurplus / totalAnnualIncome) * 100 : 0;

  // 全年預算支出：僅包含 A. 必要生活支出 與 B. 生活品質規劃（C. 財富累積屬於盈餘配置用途）
  const totalAnnualBudgetExpense = budgets
    .filter((b) => b.group === 'essential' || b.group === 'lifestyle')
    .reduce((sum, b) => sum + (Number(b.annual_budget) || 0), 0);

  const remainingBudget = totalAnnualBudgetExpense - totalAnnualExpense;
  const budgetExecutionRate = totalAnnualBudgetExpense > 0 ? (totalAnnualExpense / totalAnnualBudgetExpense) * 100 : 0;

  // 盈餘分配
  const availableSurplus = Math.max(0, annualNetSurplus);
  const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.target_amount) || 0), 0);
  const unallocatedSurplus = availableSurplus - totalAllocated;
  const isOverAllocated = totalAllocated > availableSurplus;
  const isDeficit = annualNetSurplus < 0;

  return {
    totalAnnualIncome,
    totalAnnualExpense,
    annualNetSurplus,
    annualSurplusRate,
    totalAnnualBudgetExpense,
    remainingBudget,
    budgetExecutionRate,
    availableSurplus,
    totalAllocated,
    unallocatedSurplus,
    isOverAllocated,
    isDeficit,
  };
}

/**
 * 計算 12 個月份的收入、支出與盈餘分析
 */
export function calculateMonthlyStats(
  transactions: EnrichedTransaction[],
  targetYear: number
): {
  monthlyStats: CfoMonthlyStat[];
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  avgMonthlySurplus: number;
  ytdSurplus: number;
  highestExpenseMonth: CfoMonthlyStat | null;
  highestSurplusMonth: CfoMonthlyStat | null;
  lowestSurplusMonth: CfoMonthlyStat | null;
} {
  const yearTxs = filterTransactionsByYear(transactions, targetYear);

  // 初始化 1~12 月
  const monthlyStats: CfoMonthlyStat[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${targetYear}-${String(m).padStart(2, '0')}`;
    monthlyStats.push({
      month: monthStr,
      monthNumber: m,
      monthLabel: `${m}月`,
      income: 0,
      expense: 0,
      surplus: 0,
      surplusRate: 0,
      hasTransactions: false,
    });
  }

  // 統計每月
  yearTxs.forEach((tx) => {
    if (tx.type === 'transfer') return;
    if (!tx.transaction_date) return;

    const monthNum = parseInt(tx.transaction_date.substring(5, 7), 10);
    if (monthNum < 1 || monthNum > 12) return;

    const targetStat = monthlyStats[monthNum - 1];
    const { amount, isValid } = getSafeBaseAmount(tx);
    if (!isValid || amount <= 0) return;

    targetStat.hasTransactions = true;
    if (tx.type === 'income') {
      targetStat.income += amount;
    } else if (tx.type === 'expense') {
      targetStat.expense += amount;
    }
  });

  // 計算結餘與率
  let totalIncomeSum = 0;
  let totalExpenseSum = 0;
  let activeMonthsCount = 0;

  monthlyStats.forEach((stat) => {
    stat.surplus = stat.income - stat.expense;
    stat.surplusRate = stat.income > 0 ? (stat.surplus / stat.income) * 100 : 0;

    totalIncomeSum += stat.income;
    totalExpenseSum += stat.expense;
    if (stat.hasTransactions) {
      activeMonthsCount++;
    }
  });

  const divider = activeMonthsCount > 0 ? activeMonthsCount : 12;
  const avgMonthlyIncome = totalIncomeSum / divider;
  const avgMonthlyExpense = totalExpenseSum / divider;
  const avgMonthlySurplus = (totalIncomeSum - totalExpenseSum) / divider;
  const ytdSurplus = totalIncomeSum - totalExpenseSum;

  // 找出高低亮點月份（若全無交易則為 null）
  let highestExpenseMonth: CfoMonthlyStat | null = null;
  let highestSurplusMonth: CfoMonthlyStat | null = null;
  let lowestSurplusMonth: CfoMonthlyStat | null = null;

  const validMonths = monthlyStats.filter((m) => m.hasTransactions);
  if (validMonths.length > 0) {
    highestExpenseMonth = [...validMonths].sort((a, b) => b.expense - a.expense)[0] || null;
    highestSurplusMonth = [...validMonths].sort((a, b) => b.surplus - a.surplus)[0] || null;
    lowestSurplusMonth = [...validMonths].sort((a, b) => a.surplus - b.surplus)[0] || null;
  }

  return {
    monthlyStats,
    avgMonthlyIncome,
    avgMonthlyExpense,
    avgMonthlySurplus,
    ytdSurplus,
    highestExpenseMonth,
    highestSurplusMonth,
    lowestSurplusMonth,
  };
}

/**
 * 比對年度預算與實際執行狀況
 */
export function compareBudgetVsActual(
  transactions: EnrichedTransaction[],
  targetYear: number,
  budgets: CfoBudgetItem[],
  allocations: CfoSurplusAllocationItem[]
): CfoBudgetComparisonItem[] {
  const yearTxs = filterTransactionsByYear(transactions, targetYear);

  return budgets.map((item) => {
    let actualSpent = 0;

    if (item.group === 'wealth') {
      // 財富累積項目：不計為生活費用支出，而是由配置或相關儲蓄投入對應
      const matchingAlloc = allocations.find(
        (a) => a.name.includes(item.name) || item.name.includes(a.name)
      );
      if (matchingAlloc) {
        actualSpent = matchingAlloc.actual_funded_amount || 0;
      }
    } else {
      // 必要與生活消費項目：從實際支出交易累加
      yearTxs.forEach((tx) => {
        if (tx.type !== 'expense') return;

        let isMatch = false;
        // 1. 若設定了 linked_category_id，優先比對 id
        if (item.linked_category_id && tx.category_id === item.linked_category_id) {
          isMatch = true;
        }
        // 2. 若有設定 linked_category_name 或預算項目名稱，比對分類名稱
        else if (item.linked_category_name && tx.category?.name) {
          if (tx.category.name.toLowerCase().includes(item.linked_category_name.toLowerCase()) ||
              item.linked_category_name.toLowerCase().includes(tx.category.name.toLowerCase())) {
            isMatch = true;
          }
        }
        // 3. 預算項目名稱直接比對分類名稱或備註
        else if (tx.category?.name && (
          tx.category.name.toLowerCase().includes(item.name.toLowerCase()) ||
          item.name.toLowerCase().includes(tx.category.name.toLowerCase())
        )) {
          isMatch = true;
        }

        if (isMatch) {
          const { amount, isValid } = getSafeBaseAmount(tx);
          if (isValid && amount > 0) {
            actualSpent += amount;
          }
        }
      });
    }

    const annualBudget = Number(item.annual_budget) || 0;
    const remainingBudget = annualBudget - actualSpent;
    const usageRate = annualBudget > 0 ? (actualSpent / annualBudget) * 100 : 0;

    let status: 'normal' | 'warning' | 'exceeded' = 'normal';
    if (usageRate > 100) {
      status = 'exceeded';
    } else if (usageRate >= 85) {
      status = 'warning';
    }

    return {
      budgetItem: item,
      actualSpent,
      remainingBudget,
      usageRate,
      status,
    };
  });
}

/**
 * 計算個人財務經營指標
 */
export function calculateFinancialHealth(
  transactions: EnrichedTransaction[],
  targetYear: number,
  budgets: CfoBudgetItem[],
  allocations: CfoSurplusAllocationItem[]
): CfoFinancialHealthData {
  const currentYearTxs = filterTransactionsByYear(transactions, targetYear);
  const priorYearTxs = filterTransactionsByYear(transactions, targetYear - 1);

  // 當前年度收支
  let curIncome = 0;
  let curExpense = 0;
  let essentialLivingExpense = 0;
  const categoryExpenses: Record<string, number> = {};

  // 取得必要支出的 category 名稱集合
  const essentialKeywords = budgets
    .filter((b) => b.group === 'essential')
    .map((b) => b.name.toLowerCase());

  currentYearTxs.forEach((tx) => {
    if (tx.type === 'transfer') return;
    const { amount, isValid } = getSafeBaseAmount(tx);
    if (!isValid || amount <= 0) return;

    if (tx.type === 'income') {
      curIncome += amount;
    } else if (tx.type === 'expense') {
      curExpense += amount;
      const catName = tx.category?.name || '未分類';
      categoryExpenses[catName] = (categoryExpenses[catName] || 0) + amount;

      // 判斷是否為必要支出
      const isEssential = essentialKeywords.some((kw) => catName.toLowerCase().includes(kw));
      if (isEssential) {
        essentialLivingExpense += amount;
      }
    }
  });

  // 前一年度收支
  let priorIncome = 0;
  let priorExpense = 0;
  let hasPriorYearData = false;

  priorYearTxs.forEach((tx) => {
    if (tx.type === 'transfer') return;
    const { amount, isValid } = getSafeBaseAmount(tx);
    if (!isValid || amount <= 0) return;

    hasPriorYearData = true;
    if (tx.type === 'income') {
      priorIncome += amount;
    } else if (tx.type === 'expense') {
      priorExpense += amount;
    }
  });

  // YoY
  let yoyIncomeGrowth: number | null = null;
  let yoyExpenseChange: number | null = null;

  if (hasPriorYearData && priorIncome > 0) {
    yoyIncomeGrowth = ((curIncome - priorIncome) / priorIncome) * 100;
  }
  if (hasPriorYearData && priorExpense > 0) {
    yoyExpenseChange = ((curExpense - priorExpense) / priorExpense) * 100;
  }

  // 盈餘率
  const surplusRate = curIncome > 0 ? ((curIncome - curExpense) / curIncome) * 100 : 0;

  // 儲蓄與投資配置比例 (allocations 中投資與儲蓄項目佔總收入之比例)
  const wealthAllocSum = allocations.reduce((sum, a) => sum + (Number(a.target_amount) || 0), 0);
  const wealthAllocationRatio = curIncome > 0 ? (wealthAllocSum / curIncome) * 100 : 0;

  // 最大支出類別
  let topExpenseCategory: { name: string; amount: number; percentage: number } | null = null;
  const sortedCategories = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0 && curExpense > 0) {
    const [topName, topAmount] = sortedCategories[0];
    topExpenseCategory = {
      name: topName,
      amount: topAmount,
      percentage: (topAmount / curExpense) * 100,
    };
  }

  // 每月平均生活成本（必要支出 / 12）
  const avgMonthlyLivingCost = essentialLivingExpense > 0 ? essentialLivingExpense / 12 : (curExpense / 12);

  // 全年預算執行率
  const totalAnnualBudgetExpense = budgets
    .filter((b) => b.group === 'essential' || b.group === 'lifestyle')
    .reduce((sum, b) => sum + (Number(b.annual_budget) || 0), 0);
  const annualBudgetExecutionRate = totalAnnualBudgetExpense > 0 ? (curExpense / totalAnnualBudgetExpense) * 100 : 0;

  return {
    yoyIncomeGrowth,
    yoyExpenseChange,
    hasPriorYearData,
    surplusRate,
    wealthAllocationRatio,
    topExpenseCategory,
    avgMonthlyLivingCost,
    annualBudgetExecutionRate,
  };
}
