/**
 * Finance Domain Models, View Models, and Filter Definitions
 */

import {
  DbCategory,
  DbAccount,
  DbMember,
  DbCurrency,
  DbTransaction,
  TransactionType,
  AccountType
} from './database';

export interface EnrichedTransaction extends DbTransaction {
  category?: DbCategory | null;
  account?: DbAccount | null;
  member?: DbMember | null;
}

export interface TransactionFormData {
  id?: string;
  transaction_date: string;
  type: TransactionType;
  category_id?: string | null;
  amount: number | string;
  currency: string;
  account_id: string;       // For regular transaction or transfer from-account
  to_account_id?: string;   // For transfer to-account
  member_id?: string | null;
  note?: string;
  transfer_group_id?: string | null;
  transfer_direction?: 'out' | 'in' | null;
}

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  type?: TransactionType | 'all';
  categoryId?: string;
  accountId?: string;
  memberId?: string;
  currency?: string;
  searchQuery?: string;
  sortBy?: 'transaction_date' | 'amount' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number; // percentage
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  color: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface AccountBalanceSummary {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  currency: string;
  currentBalance: number;
  baseCurrencyBalance: number; // in TWD
}

export interface RawCsvRow {
  date: string;         // A: 日期 (YYYYMMDD or YYYY-MM-DD)
  categoryName: string; // B: 類別
  amount: number;       // D: 金額
  currency: string;     // E: 貨幣
  memberName: string;   // F: 成員
  accountName: string;  // G: 帳戶
  note?: string;        // I: 備註
  direction: string;    // J: 收支區分 ('支' -> 'expense', '收' -> 'income')
  uuid?: string;        // L: UUID
  rawRecord: Record<string, string>;
}

export interface ParsedCsvPreviewRow {
  rowIndex: number;
  transactionDate: string; // standard YYYY-MM-DD
  type: TransactionType;
  categoryName: string;
  matchedCategoryId?: string;
  amount: number;
  currency: string;
  accountName: string;
  matchedAccountId?: string;
  memberName: string;
  matchedMemberId?: string;
  note: string;
  sourceUuid?: string;
  fingerprint: string;
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
}

export interface CsvImportValidationResult {
  fileName: string;
  fileHash: string;
  totalCount: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  missingCategories: string[];
  missingAccounts: string[];
  missingMembers: string[];
  rows: ParsedCsvPreviewRow[];
}

// ============================================================================
// Phase 5: Multi-Currency & Advanced Financial Analytics Models
// ============================================================================

export interface ExchangeRateEntry {
  id: string;
  fromCurrency: string;
  toCurrency: string; // default 'TWD'
  rate: number;
  effectiveDate: string; // YYYY-MM-DD
  note?: string;
  updatedAt: string;
}

export interface CategoryRankItem {
  rank: number;
  categoryId: string;
  categoryName: string;
  color: string;
  amount: number;         // TWD base_amount
  percentage: number;     // % of total
  transactionCount: number;
  previousPeriodAmount?: number;
  growthRate?: number;    // % change compared to previous period
}

export interface CategoryRankingResult {
  type: 'expense' | 'income';
  periodLabel: string;
  totalAmount: number;
  items: CategoryRankItem[];
}

export interface AccountAnalysisItem {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  currency: string;
  // 重要區別：帳戶當前餘額 vs 帳戶總交易額 (Volume)
  currentBalance: number;       // 原幣餘額
  baseCurrentBalance: number;   // 換算 TWD 餘額
  totalVolume: number;          // 原幣總交易額 (轉入+轉出+收入+支出)
  baseTotalVolume: number;      // 換算 TWD 總交易額
  totalIncome: number;          // 累計收入 (TWD)
  totalExpense: number;         // 累計支出 (TWD)
  totalTransferIn: number;      // 累計轉入 (TWD)
  totalTransferOut: number;     // 累計轉出 (TWD)
  transactionCount: number;
}

export interface AccountAnalysisResult {
  accounts: AccountAnalysisItem[];
  totalBaseAssets: number;      // 所有帳戶正餘額合計 (TWD)
  totalBaseLiabilities: number; // 所有帳戶負餘額合計 (TWD)
  netWorth: number;             // 淨資產 = 總資產 - 總負債
  totalVolumeAllAccounts: number; // 全帳戶交易週轉總額
}

export interface MemberAnalysisItem {
  memberId: string;
  memberName: string;
  totalExpense: number;     // TWD
  totalIncome: number;      // TWD
  netBalance: number;       // TWD
  expensePercentage: number;// % of total family expense
  incomePercentage: number; // % of total family income
  transactionCount: number;
  topExpenseCategory?: string;
}

export interface MemberAnalysisResult {
  members: MemberAnalysisItem[];
  totalExpense: number;
  totalIncome: number;
}

export interface AveragesResult {
  periodDays: number;
  activeDaysCount: number;
  dailyAverageExpense: number;       // 總支出 / 總天數
  activeDailyAverageExpense: number; // 總支出 / 有消費天數
  dailyAverageIncome: number;
  monthlyAverageExpense: number;     // 總支出 / 月數
  monthlyAverageIncome: number;
  savingsRate: number;               // 儲蓄率 %
}

export interface YoYComparisonResult {
  currentYear: number;
  previousYear: number;
  currentYearIncome: number;
  previousYearIncome: number;
  incomeGrowthRate: number;      // %
  currentYearExpense: number;
  previousYearExpense: number;
  expenseGrowthRate: number;     // %
  currentYearNet: number;
  previousYearNet: number;
  netGrowthRate: number;         // %
  categoryShifts: Array<{
    categoryName: string;
    currentAmount: number;
    previousAmount: number;
    deltaAmount: number;
    growthRate: number;
  }>;
}

