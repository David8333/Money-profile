/**
 * Exchange Rate Management Service (Phase 5)
 * Handles foreign currency to TWD exchange rates, manual updates,
 * date-aware historical lookups, and immutability guarantees for historical transactions.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { ExchangeRateEntry, EnrichedTransaction } from '../../types/finance';
import { DbExchangeRate } from '../../types/database';
import { getTodayDateString } from '../../utils/date';

/**
 * 預設外幣兌新台幣 (TWD) 匯率表
 */
export const DEFAULT_RATES_TO_TWD: Record<string, number> = {
  TWD: 1.0,
  USD: 31.5,
  JPY: 0.21,
  EUR: 34.2,
  CNY: 4.35,
  HKD: 4.02,
  KRW: 0.024,
  GBP: 40.1,
};

/**
 * 記憶體歷史匯率資料表（初始種子資料）
 */
let mockExchangeRateHistory: ExchangeRateEntry[] = [
  { id: 'rate-init-twd', fromCurrency: 'TWD', toCurrency: 'TWD', rate: 1.0, effectiveDate: '2020-01-01', note: '基準幣別', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'rate-hist-usd-1', fromCurrency: 'USD', toCurrency: 'TWD', rate: 31.0, effectiveDate: '2024-01-01', note: '年初匯率', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'rate-hist-usd-2', fromCurrency: 'USD', toCurrency: 'TWD', rate: 31.5, effectiveDate: '2024-03-01', note: '春季匯率更新', updatedAt: '2024-03-01T00:00:00Z' },
  { id: 'rate-hist-jpy-1', fromCurrency: 'JPY', toCurrency: 'TWD', rate: 0.22, effectiveDate: '2024-01-01', note: '年初匯率', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'rate-hist-jpy-2', fromCurrency: 'JPY', toCurrency: 'TWD', rate: 0.21, effectiveDate: '2024-02-15', note: '日圓牌告價更新', updatedAt: '2024-02-15T00:00:00Z' },
  { id: 'rate-hist-eur-1', fromCurrency: 'EUR', toCurrency: 'TWD', rate: 34.2, effectiveDate: '2024-01-01', note: '歐元牌告價', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'rate-hist-cny-1', fromCurrency: 'CNY', toCurrency: 'TWD', rate: 4.35, effectiveDate: '2024-01-01', note: '人民幣牌告價', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'rate-hist-hkd-1', fromCurrency: 'HKD', toCurrency: 'TWD', rate: 4.02, effectiveDate: '2024-01-01', note: '港幣牌告價', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'rate-hist-krw-1', fromCurrency: 'KRW', toCurrency: 'TWD', rate: 0.024, effectiveDate: '2024-01-01', note: '韓元牌告價', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'rate-hist-gbp-1', fromCurrency: 'GBP', toCurrency: 'TWD', rate: 40.1, effectiveDate: '2024-01-01', note: '英鎊牌告價', updatedAt: '2024-01-01T00:00:00Z' },
];

/**
 * 取得指定幣別在指定日期適用的匯率 (兌 TWD)
 * 規則：依 effectiveDate 小於等於交易日期的最新一筆紀錄判定；
 * 若查無早於該日期的歷史，則回傳該幣別最接近的第一筆或預設牌告匯率。
 */
export function getExchangeRateForDate(
  fromCurrency: string,
  targetDate: string = getTodayDateString(),
  toCurrency: string = 'TWD'
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return 1.0;

  // 1. 篩選符合幣別對的所有歷史匯率
  const matching = mockExchangeRateHistory
    .filter(r => r.fromCurrency === from && r.toCurrency === to)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

  if (matching.length === 0) {
    return DEFAULT_RATES_TO_TWD[from] || 1.0;
  }

  // 2. 尋找 <= targetDate 中最大的一筆
  const validHistory = matching.filter(r => r.effectiveDate <= targetDate);
  if (validHistory.length > 0) {
    return validHistory[validHistory.length - 1].rate;
  }

  // 3. 若目標日期早於所有紀錄，回傳最早一筆紀錄的匯率
  return matching[0].rate;
}

/**
 * 查詢所有匯率歷史紀錄（支援 Supabase 與離線記憶體）
 */
export async function fetchExchangeRateHistory(
  userId?: string,
  fromCurrency?: string
): Promise<{ data: ExchangeRateEntry[]; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId) {
    let list = [...mockExchangeRateHistory];
    if (fromCurrency) {
      list = list.filter(r => r.fromCurrency === fromCurrency.toUpperCase());
    }
    list.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    return { data: list, error: null };
  }

  try {
    let query = supabase
      .from('exchange_rates')
      .select('*')
      .eq('user_id', userId)
      .order('effective_date', { ascending: false });

    if (fromCurrency) {
      query = query.eq('from_currency', fromCurrency.toUpperCase());
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      let list = [...mockExchangeRateHistory];
      if (fromCurrency) {
        list = list.filter(r => r.fromCurrency === fromCurrency.toUpperCase());
      }
      return { data: list, error: null };
    }

    const formatted: ExchangeRateEntry[] = (data as DbExchangeRate[]).map(row => ({
      id: row.id,
      fromCurrency: row.from_currency,
      toCurrency: row.to_currency,
      rate: Number(row.rate),
      effectiveDate: row.effective_date,
      note: row.note || undefined,
      updatedAt: row.updated_at,
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: mockExchangeRateHistory, error: err };
  }
}

/**
 * 手動新增或更新匯率
 */
export async function setExchangeRate(
  userId: string | undefined,
  entry: {
    fromCurrency: string;
    toCurrency?: string;
    rate: number;
    effectiveDate?: string;
    note?: string;
  }
): Promise<{ data: ExchangeRateEntry | null; error: string | null }> {
  const from = entry.fromCurrency.trim().toUpperCase();
  const to = (entry.toCurrency || 'TWD').trim().toUpperCase();
  const rate = Number(entry.rate);
  const effectiveDate = entry.effectiveDate || getTodayDateString();

  if (isNaN(rate) || rate <= 0) {
    return { data: null, error: '匯率必須為大於 0 的有效數值' };
  }

  const newEntry: ExchangeRateEntry = {
    id: `rate-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fromCurrency: from,
    toCurrency: to,
    rate,
    effectiveDate,
    note: entry.note?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  // 1. 同步更新記憶體歷史與目前參考匯率
  const existingIdx = mockExchangeRateHistory.findIndex(
    r => r.fromCurrency === from && r.toCurrency === to && r.effectiveDate === effectiveDate
  );

  if (existingIdx !== -1) {
    mockExchangeRateHistory[existingIdx] = {
      ...mockExchangeRateHistory[existingIdx],
      rate,
      note: entry.note?.trim() || mockExchangeRateHistory[existingIdx].note,
      updatedAt: new Date().toISOString(),
    };
  } else {
    mockExchangeRateHistory.push(newEntry);
  }

  // 更新當前預設表
  DEFAULT_RATES_TO_TWD[from] = rate;

  // 2. 若有 Supabase 連線，寫入資料庫
  if (isSupabaseConfigured() && userId) {
    try {
      const record = {
        user_id: userId,
        from_currency: from,
        to_currency: to,
        rate,
        effective_date: effectiveDate,
        note: entry.note?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('exchange_rates')
        .upsert([record] as any, { onConflict: 'user_id,from_currency,to_currency,effective_date' })
        .select()
        .single();

      if (error) {
        console.warn('Supabase exchange_rates upsert warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase exchange_rates offline fallback');
    }
  }

  return { data: newEntry, error: null };
}

/**
 * 取得最新的一覽匯率表
 */
export function getLatestRates(): Record<string, { rate: number; effectiveDate: string; updatedAt: string }> {
  const result: Record<string, { rate: number; effectiveDate: string; updatedAt: string }> = {};

  Object.keys(DEFAULT_RATES_TO_TWD).forEach(code => {
    const list = mockExchangeRateHistory
      .filter(r => r.fromCurrency === code && r.toCurrency === 'TWD')
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

    if (list.length > 0) {
      result[code] = {
        rate: list[0].rate,
        effectiveDate: list[0].effectiveDate,
        updatedAt: list[0].updatedAt,
      };
    } else {
      result[code] = {
        rate: DEFAULT_RATES_TO_TWD[code],
        effectiveDate: '2024-01-01',
        updatedAt: '2024-01-01T00:00:00Z',
      };
    }
  });

  return result;
}

/**
 * 計算換算後之新台幣基準金額 (精確四捨五入至小數第 4 位)
 */
export function calculateBaseAmountFromRate(amount: number, rate: number): number {
  return Math.round(amount * rate * 10000) / 10000;
}

/**
 * 檢查並找出缺少匯率或缺少 base_amount 的非 TWD 交易
 */
export function findTransactionsWithMissingRates(transactions: EnrichedTransaction[]): EnrichedTransaction[] {
  return transactions.filter(tx => {
    if (tx.currency === 'TWD') return false;
    const hasRate = tx.exchange_rate !== undefined && tx.exchange_rate !== null && Number(tx.exchange_rate) > 0;
    const hasBase = tx.base_amount !== undefined && tx.base_amount !== null && !isNaN(Number(tx.base_amount));
    return !hasRate || !hasBase;
  });
}

export function getMockExchangeRateHistory(): ExchangeRateEntry[] {
  return [...mockExchangeRateHistory];
}

export function setMockExchangeRateHistory(history: ExchangeRateEntry[]) {
  mockExchangeRateHistory = [...history];
}

