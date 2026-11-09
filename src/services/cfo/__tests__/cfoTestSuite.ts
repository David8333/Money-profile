/**
 * Personal CFO Financial Engine Acceptance Test Suite
 */

import { EnrichedTransaction } from '../../../types/finance';
import {
  CfoBudgetItem,
  CfoSurplusAllocationItem
} from '../../../types/cfo';
import {
  calculateExecutiveSummary,
  calculateMonthlyStats,
  compareBudgetVsActual,
  calculateFinancialHealth
} from '../cfoEngine';
import { DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS } from '../cfoStorage';

export interface CfoTestResult {
  id: number;
  title: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface CfoTestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: CfoTestResult[];
}

function makeTx(partial: Partial<EnrichedTransaction> & { id: string; transaction_date: string; type: any; amount: number }): EnrichedTransaction {
  return {
    id: partial.id,
    user_id: partial.user_id || 'u1',
    transaction_date: partial.transaction_date,
    type: partial.type,
    amount: partial.amount,
    currency: partial.currency || 'TWD',
    exchange_rate: partial.exchange_rate ?? 1,
    base_amount: partial.base_amount ?? partial.amount,
    account_id: partial.account_id || 'a1',
    category_id: partial.category_id || null,
    member_id: partial.member_id || null,
    note: partial.note || null,
    transfer_group_id: partial.transfer_group_id || null,
    transfer_direction: partial.transfer_direction || null,
    category: partial.category,
    account: partial.account,
    member: partial.member,
    created_at: partial.created_at || '',
    updated_at: partial.updated_at || '',
  };
}

export async function runAllCfoAcceptanceTests(): Promise<CfoTestSuiteSummary> {
  const results: CfoTestResult[] = [];
  let testCounter = 1;

  function record(title: string, fn: () => { passed: boolean; message: string }) {
    const start = performance.now();
    try {
      const res = fn();
      const durationMs = parseFloat((performance.now() - start).toFixed(2));
      results.push({
        id: testCounter++,
        title,
        passed: res.passed,
        message: res.message,
        durationMs,
      });
    } catch (err: any) {
      const durationMs = parseFloat((performance.now() - start).toFixed(2));
      results.push({
        id: testCounter++,
        title,
        passed: false,
        message: `例外異常: ${err?.message || err}`,
        durationMs,
      });
    }
  }

  // 模擬測試交易資料 (2026 年度)
  const mockTransactions: EnrichedTransaction[] = [
    // 收入
    makeTx({
      id: 'tx-inc-1',
      transaction_date: '2026-01-15',
      type: 'income',
      amount: 100000,
    }),
    makeTx({
      id: 'tx-inc-2',
      transaction_date: '2026-02-15',
      type: 'income',
      amount: 120000,
    }),
    // 必要生活支出 (飲食)
    makeTx({
      id: 'tx-exp-1',
      transaction_date: '2026-01-10',
      type: 'expense',
      amount: 25000,
      category: { id: 'c-food', user_id: 'u1', name: '餐飲食品', type: 'expense', color: '#10b981', sort_order: 1, is_active: true, created_at: '' },
    }),
    // 必要生活支出 (房貸)
    makeTx({
      id: 'tx-exp-2',
      transaction_date: '2026-02-05',
      type: 'expense',
      amount: 30000,
      category: { id: 'c-mortgage', user_id: 'u1', name: '房貸', type: 'expense', color: '#0ea5e9', sort_order: 2, is_active: true, created_at: '' },
    }),
    // 品質規劃支出 (出國旅遊 - 外幣 JPY 換算 TWD)
    makeTx({
      id: 'tx-exp-3',
      transaction_date: '2026-02-20',
      type: 'expense',
      amount: 150000,
      currency: 'JPY',
      exchange_rate: 0.22,
      base_amount: 33000, // 33,000 TWD
      category: { id: 'c-travel', user_id: 'u1', name: '出國旅遊', type: 'expense', color: '#8b5cf6', sort_order: 3, is_active: true, created_at: '' },
    }),
    // 純轉帳紀錄 (必須嚴格排除於收入與支出！)
    makeTx({
      id: 'tx-tr-out',
      transaction_date: '2026-01-20',
      type: 'transfer',
      transfer_direction: 'out',
      transfer_group_id: 'tg-1',
      amount: 50000,
    }),
    makeTx({
      id: 'tx-tr-in',
      transaction_date: '2026-01-20',
      type: 'transfer',
      transfer_direction: 'in',
      transfer_group_id: 'tg-1',
      amount: 50000,
      account_id: 'a2',
    }),
  ];

  // 1. 全年總收入與支出計算（排除轉帳）
  record('1. 全年總收入與支出計算（轉帳嚴格排除）', () => {
    const summary = calculateExecutiveSummary(mockTransactions, 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const expectedIncome = 100000 + 120000; // 220,000
    const expectedExpense = 25000 + 30000 + 33000; // 88,000
    const passed = summary.totalAnnualIncome === expectedIncome && summary.totalAnnualExpense === expectedExpense;
    return {
      passed,
      message: passed
        ? `總收入 ${summary.totalAnnualIncome} 元，總支出 ${summary.totalAnnualExpense} 元，轉帳 50,000 元正確排除`
        : `計算不符: 預期收入 ${expectedIncome} 實際 ${summary.totalAnnualIncome}; 預期支出 ${expectedExpense} 實際 ${summary.totalAnnualExpense}`,
    };
  });

  // 2. 實際盈餘與盈餘率計算
  record('2. 全年實際盈餘與盈餘率計算', () => {
    const summary = calculateExecutiveSummary(mockTransactions, 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const expectedSurplus = 220000 - 88000; // 132,000
    const expectedSurplusRate = (132000 / 220000) * 100; // 60%
    const passed = summary.annualNetSurplus === expectedSurplus && Math.abs(summary.annualSurplusRate - expectedSurplusRate) < 0.01;
    return {
      passed,
      message: passed
        ? `年度盈餘 ${summary.annualNetSurplus} 元，盈餘率 ${summary.annualSurplusRate.toFixed(1)}%`
        : `盈餘計算不符: 實際 ${summary.annualNetSurplus}, 率 ${summary.annualSurplusRate}%`,
    };
  });

  // 3. 財富累積預算項目不計入生活預算支出
  record('3. 財富累積預算項目與生活預算嚴格隔離', () => {
    const summary = calculateExecutiveSummary(mockTransactions, 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const essentialSum = DEFAULT_BUDGET_TEMPLATES.filter(b => b.group === 'essential').reduce((s, b) => s + b.annual_budget, 0);
    const lifestyleSum = DEFAULT_BUDGET_TEMPLATES.filter(b => b.group === 'lifestyle').reduce((s, b) => s + b.annual_budget, 0);
    const wealthSum = DEFAULT_BUDGET_TEMPLATES.filter(b => b.group === 'wealth').reduce((s, b) => s + b.annual_budget, 0);
    const expectedBudget = essentialSum + lifestyleSum;
    const passed = summary.totalAnnualBudgetExpense === expectedBudget && !isNaN(wealthSum);
    return {
      passed,
      message: passed
        ? `生活預算支出總額 ${summary.totalAnnualBudgetExpense} 元（已排除財富累積 ${wealthSum} 元）`
        : `預算總和錯誤: 實際 ${summary.totalAnnualBudgetExpense}, 預期 ${expectedBudget}`,
    };
  });

  // 4. 12 個月收支分析與排序
  record('4. 全年 12 個月收支與盈餘分析統計', () => {
    const stats = calculateMonthlyStats(mockTransactions, 2026);
    const passed = stats.monthlyStats.length === 12 &&
      stats.monthlyStats[0].income === 100000 &&
      stats.monthlyStats[0].expense === 25000 &&
      stats.monthlyStats[0].surplus === 75000 &&
      stats.monthlyStats[1].income === 120000 &&
      stats.monthlyStats[1].expense === 63000 &&
      stats.monthlyStats[2].income === 0; // 3月為 0
    return {
      passed,
      message: passed
        ? `12 個月時間序正確，1月盈餘 75,000 元，2月盈餘 57,000 元，無交易月份平穩補 0`
        : `月份統計不符`,
    };
  });

  // 5. 盈餘最高與開銷最高月份自動標識
  record('5. 盈餘與花費極值月份正確識別', () => {
    const stats = calculateMonthlyStats(mockTransactions, 2026);
    const passed = stats.highestSurplusMonth?.monthNumber === 1 &&
      stats.highestExpenseMonth?.monthNumber === 2;
    return {
      passed,
      message: passed
        ? `正確辨識最高盈餘月份為 1月（75,000 元），最高支出月份為 2月（63,000 元）`
        : `極值月份辨識錯誤`,
    };
  });

  // 6. 預算 vs 實際執行比對（多幣別換算與分類映射）
  record('6. 預算 vs 實際支出比對與分類對應', () => {
    const comparisons = compareBudgetVsActual(mockTransactions, 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const travelItem = comparisons.find(c => c.budgetItem.name === '出國旅遊');
    const foodItem = comparisons.find(c => c.budgetItem.name === '飲食餐飲');
    const passed = !!travelItem && travelItem.actualSpent === 33000 &&
      !!foodItem && foodItem.actualSpent === 25000;
    return {
      passed,
      message: passed
        ? `出國旅遊實際消耗 33,000 元 (由 JPY 正確換算)，飲食實際消耗 25,000 元`
        : `預算執行比對不符`,
    };
  });

  // 7. 盈餘分配方案與超額警告防護
  record('7. 盈餘分配方案與超額警告防護', () => {
    const summary = calculateExecutiveSummary(mockTransactions, 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const passed = summary.availableSurplus === 132000 &&
      summary.isOverAllocated === true &&
      summary.isDeficit === false;
    return {
      passed,
      message: passed
        ? `可分配盈餘 132,000 元，預定配置 460,000 元，正確觸發超額配置提醒`
        : `盈餘分配計算不符`,
    };
  });

  // 8. 赤字狀態安全防護（負數不得作為可分配資金）
  record('8. 赤字狀態安全防護（負數不得作為可分配資金）', () => {
    const deficitTxs: EnrichedTransaction[] = [
      makeTx({
        id: 'd-inc',
        transaction_date: '2026-03-01',
        type: 'income',
        amount: 30000,
      }),
      makeTx({
        id: 'd-exp',
        transaction_date: '2026-03-02',
        type: 'expense',
        amount: 80000,
      }),
    ];
    const summary = calculateExecutiveSummary(deficitTxs, 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const passed = summary.annualNetSurplus === -50000 &&
      summary.availableSurplus === 0 &&
      summary.isDeficit === true;
    return {
      passed,
      message: passed
        ? `年度赤字 -50,000 元時，可分配盈餘安全歸零（0元），正確標記為赤字狀態`
        : `赤字防護失效: availableSurplus=${summary.availableSurplus}`,
    };
  });

  // 9. 空白資料狀態平穩防護（零交易時無 NaN）
  record('9. 空白資料平穩防護（無資料時顯示 0 不崩潰）', () => {
    const summary = calculateExecutiveSummary([], 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const stats = calculateMonthlyStats([], 2026);
    const health = calculateFinancialHealth([], 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const passed = summary.totalAnnualIncome === 0 &&
      summary.totalAnnualExpense === 0 &&
      !isNaN(summary.annualSurplusRate) &&
      stats.avgMonthlyIncome === 0 &&
      !isNaN(health.surplusRate);
    return {
      passed,
      message: passed
        ? `無交易狀態下指標平穩為 0，未出現 NaN 或程式崩潰`
        : `空白資料處理異常`,
    };
  });

  // 10. 個人財務經營指標與歷史同期 (YoY)
  record('10. 財務經營指標與前一年成長率 (YoY) 評估', () => {
    const multiYearTxs: EnrichedTransaction[] = [
      ...mockTransactions,
      makeTx({
        id: 'tx-2025-inc',
        transaction_date: '2025-05-10',
        type: 'income',
        amount: 200000,
      }),
      makeTx({
        id: 'tx-2025-exp',
        transaction_date: '2025-05-15',
        type: 'expense',
        amount: 80000,
      }),
    ];
    const health = calculateFinancialHealth(multiYearTxs, 2026, DEFAULT_BUDGET_TEMPLATES, DEFAULT_SURPLUS_ALLOCATIONS);
    const passed = health.hasPriorYearData === true &&
      health.yoyIncomeGrowth !== null &&
      Math.abs(health.yoyIncomeGrowth - 10) < 0.01;
    return {
      passed,
      message: passed
        ? `2026 收入 220,000 元較 2025 年（200,000 元）成長 +10.0%`
        : `YoY 計算不符: actual=${health.yoyIncomeGrowth}`,
    };
  });

  const passedCount = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}
