/**
 * Personal CFO Storage & Configuration Service
 * Handles persistence of annual budget planning and surplus allocations
 */

import { CfoBudgetItem, CfoSurplusAllocationItem } from '../../types/cfo';
import { loadMockData, saveMockData } from '../mock/mockPersistence';

/**
 * 預設年度預算範本（包含三大群組）
 */
export const DEFAULT_BUDGET_TEMPLATES: CfoBudgetItem[] = [
  // A. 必要生活支出
  { id: 'b-mortgage', name: '房貸/房租', group: 'essential', annual_budget: 360000, monthly_budget: 30000, linked_category_name: '房貸', sort_order: 1 },
  { id: 'b-insurance', name: '保險', group: 'essential', annual_budget: 60000, monthly_budget: 5000, linked_category_name: '保險', sort_order: 2 },
  { id: 'b-food', name: '飲食餐飲', group: 'essential', annual_budget: 180000, monthly_budget: 15000, linked_category_name: '餐飲食品', sort_order: 3 },
  { id: 'b-transport', name: '交通運輸', group: 'essential', annual_budget: 48000, monthly_budget: 4000, linked_category_name: '交通運輸', sort_order: 4 },
  { id: 'b-housing', name: '居家生活/水電水瓦斯', group: 'essential', annual_budget: 36000, monthly_budget: 3000, linked_category_name: '居家水電', sort_order: 5 },
  { id: 'b-health', name: '醫療保健', group: 'essential', annual_budget: 24000, monthly_budget: 2000, linked_category_name: '醫療健康', sort_order: 6 },
  { id: 'b-telecom', name: '電話網路通信', group: 'essential', annual_budget: 18000, monthly_budget: 1500, linked_category_name: '通訊網路', sort_order: 7 },
  { id: 'b-tax', name: '稅金規費', group: 'essential', annual_budget: 30000, monthly_budget: 2500, linked_category_name: '稅金規費', sort_order: 8 },

  // B. 生活品質與未來規劃
  { id: 'b-travel-domestic', name: '國內旅遊', group: 'lifestyle', annual_budget: 40000, monthly_budget: 3333, linked_category_name: '國內旅遊', sort_order: 9 },
  { id: 'b-travel-abroad', name: '出國旅遊', group: 'lifestyle', annual_budget: 120000, monthly_budget: 10000, linked_category_name: '出國旅遊', sort_order: 10 },
  { id: 'b-entertainment', name: '休閒娛樂', group: 'lifestyle', annual_budget: 36000, monthly_budget: 3000, linked_category_name: '休閒娛樂', sort_order: 11 },
  { id: 'b-education', name: '學習進修', group: 'lifestyle', annual_budget: 24000, monthly_budget: 2000, linked_category_name: '學習進修', sort_order: 12 },
  { id: 'b-social', name: '交際應酬/人情禮金', group: 'lifestyle', annual_budget: 30000, monthly_budget: 2500, linked_category_name: '交際人情', sort_order: 13 },
  { id: 'b-shopping', name: '購物血拼', group: 'lifestyle', annual_budget: 48000, monthly_budget: 4000, linked_category_name: '購物消費', sort_order: 14 },

  // C. 財富累積與資產配置 (盈餘用途，非生活支出)
  { id: 'b-stock', name: '股票投資', group: 'wealth', annual_budget: 120000, monthly_budget: 10000, linked_category_name: '股票投資', sort_order: 15 },
  { id: 'b-etf', name: 'ETF 投資', group: 'wealth', annual_budget: 120000, monthly_budget: 10000, linked_category_name: 'ETF 投資', sort_order: 16 },
  { id: 'b-other-invest', name: '其他投資', group: 'wealth', annual_budget: 36000, monthly_budget: 3000, linked_category_name: '其他投資', sort_order: 17 },
  { id: 'b-savings', name: '現金儲蓄', group: 'wealth', annual_budget: 120000, monthly_budget: 10000, linked_category_name: '現金儲蓄', sort_order: 18 },
  { id: 'b-emergency', name: '緊急預備金', group: 'wealth', annual_budget: 120000, monthly_budget: 10000, linked_category_name: '緊急預備金', sort_order: 19 },
  { id: 'b-longterm', name: '長期資產累積', group: 'wealth', annual_budget: 60000, monthly_budget: 5000, linked_category_name: '長期資產累積', sort_order: 20 },
];

/**
 * 預設盈餘分配項目範本
 */
export const DEFAULT_SURPLUS_ALLOCATIONS: CfoSurplusAllocationItem[] = [
  { id: 'alloc-emergency', name: '緊急預備金', target_amount: 60000, actual_funded_amount: 30000, color: '#0ea5e9', note: '確保有 6 個月基本生活費' },
  { id: 'alloc-etf', name: '股票與 ETF 投資', target_amount: 180000, actual_funded_amount: 90000, color: '#10b981', note: '定期定額高股息與市值型' },
  { id: 'alloc-savings', name: '現金儲蓄', target_amount: 60000, actual_funded_amount: 35000, color: '#f59e0b', note: '高利活存數位帳戶' },
  { id: 'alloc-travel', name: '出國旅遊基金', target_amount: 80000, actual_funded_amount: 40000, color: '#8b5cf6', note: '年度家庭旅遊儲備' },
  { id: 'alloc-insurance', name: '保險預留基金', target_amount: 40000, actual_funded_amount: 25000, color: '#ec4899', note: '年度重大保費預備金' },
  { id: 'alloc-other', name: '其他資產配置', target_amount: 40000, actual_funded_amount: 15000, color: '#64748b', note: '彈性理財資金' },
];

/**
 * 讀取特定年度的預算設定
 */
export function loadYearlyBudgets(year: number): CfoBudgetItem[] {
  const key = `fin_cfo_budgets_${year}`;
  return loadMockData<CfoBudgetItem[]>(key, DEFAULT_BUDGET_TEMPLATES);
}

/**
 * 儲存特定年度的預算設定
 */
export function saveYearlyBudgets(year: number, budgets: CfoBudgetItem[]): void {
  const key = `fin_cfo_budgets_${year}`;
  saveMockData(key, budgets);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cfo_data_updated', { detail: { year } }));
  }
}

/**
 * 讀取特定年度的盈餘分配設定
 */
export function loadYearlyAllocations(year: number): CfoSurplusAllocationItem[] {
  const key = `fin_cfo_allocations_${year}`;
  return loadMockData<CfoSurplusAllocationItem[]>(key, DEFAULT_SURPLUS_ALLOCATIONS);
}

/**
 * 儲存特定年度的盈餘分配設定
 */
export function saveYearlyAllocations(year: number, allocations: CfoSurplusAllocationItem[]): void {
  const key = `fin_cfo_allocations_${year}`;
  saveMockData(key, allocations);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cfo_data_updated', { detail: { year } }));
  }
}

/**
 * 重設為預設範本
 */
export function resetYearlyToDefaults(year: number): { budgets: CfoBudgetItem[]; allocations: CfoSurplusAllocationItem[] } {
  saveYearlyBudgets(year, DEFAULT_BUDGET_TEMPLATES);
  saveYearlyAllocations(year, DEFAULT_SURPLUS_ALLOCATIONS);
  return {
    budgets: DEFAULT_BUDGET_TEMPLATES,
    allocations: DEFAULT_SURPLUS_ALLOCATIONS,
  };
}
