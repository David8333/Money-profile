import { supabase, isSupabaseConfigured } from './client';
import { DbCurrency } from '../../types/database';
import { EnrichedTransaction } from '../../types/finance';

export const DEFAULT_CURRENCIES: DbCurrency[] = [
  { code: 'TWD', name: '新台幣', symbol: 'NT$', decimal_places: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { code: 'USD', name: '美元', symbol: '$', decimal_places: 2, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { code: 'JPY', name: '日圓', symbol: '¥', decimal_places: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { code: 'KRW', name: '韓元', symbol: '₩', decimal_places: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { code: 'CNY', name: '人民幣', symbol: '¥', decimal_places: 2, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { code: 'EUR', name: '歐元', symbol: '€', decimal_places: 2, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { code: 'HKD', name: '港幣', symbol: 'HK$', decimal_places: 2, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { code: 'GBP', name: '英鎊', symbol: '£', decimal_places: 2, is_active: true, created_at: '2024-01-01T00:00:00Z' },
];

let mockCurrenciesStore: DbCurrency[] = [...DEFAULT_CURRENCIES];

export function getMockCurrenciesStore(): DbCurrency[] {
  return [...mockCurrenciesStore];
}

export function setMockCurrenciesStore(store: DbCurrency[]) {
  mockCurrenciesStore = [...store];
}

/**
 * 查詢所有幣別 (可選擇是否包含已停用幣別)
 */
export async function fetchCurrencies(includeInactive: boolean = false): Promise<{ data: DbCurrency[]; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    const list = includeInactive ? mockCurrenciesStore : mockCurrenciesStore.filter(c => c.is_active);
    return { data: [...list], error: null };
  }

  try {
    let query = supabase.from('currencies').select('*').order('code');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      const list = includeInactive ? mockCurrenciesStore : mockCurrenciesStore.filter(c => c.is_active);
      return { data: [...list], error: null };
    }
    return { data: data as DbCurrency[], error: null };
  } catch (err: any) {
    return { data: [...mockCurrenciesStore], error: err };
  }
}

/**
 * 新增自訂幣別
 */
export async function addCurrency(currency: {
  code: string;
  name: string;
  symbol: string;
  decimal_places?: number;
}): Promise<{ data: DbCurrency | null; error: string | null }> {
  const upperCode = currency.code.trim().toUpperCase();
  if (!upperCode || upperCode.length !== 3) {
    return { data: null, error: '貨幣代碼必須為 3 碼英文字母 (例如: CAD, SGD)' };
  }
  if (!currency.name.trim()) {
    return { data: null, error: '請輸入貨幣名稱' };
  }

  // 檢查是否已存在
  const existsInMock = mockCurrenciesStore.some(c => c.code === upperCode);
  if (existsInMock) {
    return { data: null, error: `貨幣代碼 ${upperCode} 已存在` };
  }

  const newCurrency: DbCurrency = {
    code: upperCode,
    name: currency.name.trim(),
    symbol: currency.symbol.trim() || upperCode,
    decimal_places: currency.decimal_places ?? 2,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    mockCurrenciesStore.push(newCurrency);
    return { data: newCurrency, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('currencies')
      .insert([newCurrency] as any)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    mockCurrenciesStore.push(newCurrency);
    return { data: data as DbCurrency, error: null };
  } catch (err: any) {
    mockCurrenciesStore.push(newCurrency);
    return { data: newCurrency, error: null };
  }
}

/**
 * 編輯幣別名稱、符號或小數位數
 */
export async function updateCurrency(
  code: string,
  updates: Partial<Pick<DbCurrency, 'name' | 'symbol' | 'decimal_places' | 'is_active'>>
): Promise<{ success: boolean; error: string | null }> {
  const upperCode = code.toUpperCase();
  const idx = mockCurrenciesStore.findIndex(c => c.code === upperCode);
  if (idx !== -1) {
    mockCurrenciesStore[idx] = {
      ...mockCurrenciesStore[idx],
      ...updates,
    };
  }

  if (!isSupabaseConfigured()) {
    return { success: true, error: null };
  }

  try {
    const { error } = await (supabase.from('currencies') as any)
      .update(updates)
      .eq('code', upperCode);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: true, error: null };
  }
}

/**
 * 檢查幣別是否已被交易使用
 * 規範：若已被交易使用，不允許刪除
 */
export function isCurrencyInUse(code: string, transactions: EnrichedTransaction[]): boolean {
  const upperCode = code.toUpperCase();
  return transactions.some(t => t.currency?.toUpperCase() === upperCode);
}

/**
 * 刪除幣別（嚴格阻擋已被使用之幣別，基準幣 TWD 不得刪除）
 */
export async function deleteCurrency(
  code: string,
  transactions: EnrichedTransaction[]
): Promise<{ success: boolean; error: string | null }> {
  const upperCode = code.toUpperCase();
  if (upperCode === 'TWD') {
    return { success: false, error: '新台幣 (TWD) 為系統基準貨幣，不可刪除' };
  }

  if (isCurrencyInUse(upperCode, transactions)) {
    return {
      success: false,
      error: `貨幣 ${upperCode} 已被既有交易紀錄使用，不可刪除。建議將其設為停用。`,
    };
  }

  mockCurrenciesStore = mockCurrenciesStore.filter(c => c.code !== upperCode);

  if (!isSupabaseConfigured()) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.from('currencies').delete().eq('code', upperCode);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: true, error: null };
  }
}
