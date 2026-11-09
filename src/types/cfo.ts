/**
 * Personal CFO Domain Types & Interfaces
 */

export type CfoCategoryGroup = 'essential' | 'lifestyle' | 'wealth';

export interface CfoBudgetItem {
  id: string;
  name: string;
  group: CfoCategoryGroup;
  annual_budget: number;
  monthly_budget: number;
  linked_category_id?: string | null;
  linked_category_name?: string | null;
  note?: string;
  sort_order: number;
}

export interface CfoSurplusAllocationItem {
  id: string;
  name: string;
  target_amount: number;      // 年度預定分配額
  actual_funded_amount: number; // 實際已投入/已配置額
  color: string;
  category_hint?: string;
  note?: string;
}

export interface CfoMonthlyStat {
  month: string;       // YYYY-MM
  monthNumber: number; // 1 - 12
  monthLabel: string;  // e.g. "1月", "2025/01"
  income: number;
  expense: number;
  surplus: number;
  surplusRate: number; // %
  hasTransactions: boolean;
}

export interface CfoBudgetComparisonItem {
  budgetItem: CfoBudgetItem;
  actualSpent: number;
  remainingBudget: number;
  usageRate: number;  // %
  status: 'normal' | 'warning' | 'exceeded';
}

export interface CfoExecutiveSummaryData {
  totalAnnualIncome: number;
  totalAnnualExpense: number;
  annualNetSurplus: number;
  annualSurplusRate: number;
  totalAnnualBudgetExpense: number;
  remainingBudget: number;
  budgetExecutionRate: number;
  // Allocation
  availableSurplus: number;
  totalAllocated: number;
  unallocatedSurplus: number;
  isOverAllocated: boolean;
  isDeficit: boolean;
}

export interface CfoFinancialHealthData {
  yoyIncomeGrowth: number | null;   // % growth compared to previous year
  yoyExpenseChange: number | null;  // % change compared to previous year
  hasPriorYearData: boolean;
  surplusRate: number;
  wealthAllocationRatio: number;   // 投資儲蓄配置額 / 總收入
  topExpenseCategory: { name: string; amount: number; percentage: number } | null;
  avgMonthlyLivingCost: number;     // 月均必要生活支出
  annualBudgetExecutionRate: number;
}
