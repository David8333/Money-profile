import { supabase, isSupabaseConfigured } from './client';
import { DbTransaction, TransactionType } from '../../types/database';
import { EnrichedTransaction, TransactionFilter, TransactionFormData } from '../../types/finance';
import { loadMockData, saveMockData } from '../mock/mockPersistence';
import { getMockCategoriesStore } from './categories';
import { getMockAccountsStore } from './accounts';
import { getMockMembersStore } from './members';

/**
 * 預設測試用交易種子資料（供未設定 Supabase 金鑰時之流暢預覽與功能測試）
 */
export const DEFAULT_MOCK_TRANSACTIONS: EnrichedTransaction[] = [
  {
    id: 'mock-tx-001',
    user_id: 'mock-user',
    transaction_date: '2024-03-01',
    type: 'expense',
    category_id: 'cat-food',
    amount: 120,
    currency: 'TWD',
    exchange_rate: 1.0,
    base_amount: 120,
    account_id: 'acc-huanan',
    member_id: 'mem-self',
    note: '排骨便當午餐',
    transfer_group_id: null,
    created_at: '2024-03-01T12:30:00Z',
    updated_at: '2024-03-01T12:30:00Z',
    category: { id: 'cat-food', user_id: 'mock-user', name: '飲食', type: 'expense', color: '#f97316', sort_order: 1, is_active: true, created_at: '' },
    account: { id: 'acc-huanan', user_id: 'mock-user', name: '華南銀行', account_type: 'bank', currency: 'TWD', opening_balance: 0, is_active: true, created_at: '' },
    member: { id: 'mem-self', user_id: 'mock-user', name: '自己', is_active: true, created_at: '' },
  },
  {
    id: 'mock-tx-002',
    user_id: 'mock-user',
    transaction_date: '2024-03-01',
    type: 'expense',
    category_id: 'cat-transit',
    amount: 35,
    currency: 'TWD',
    exchange_rate: 1.0,
    base_amount: 35,
    account_id: 'acc-linebank',
    member_id: 'mem-self',
    note: '捷運通勤',
    transfer_group_id: null,
    created_at: '2024-03-01T18:00:00Z',
    updated_at: '2024-03-01T18:00:00Z',
    category: { id: 'cat-transit', user_id: 'mock-user', name: '大眾運輸', type: 'expense', color: '#6366f1', sort_order: 4, is_active: true, created_at: '' },
    account: { id: 'acc-linebank', user_id: 'mock-user', name: 'Line Bank', account_type: 'bank', currency: 'TWD', opening_balance: 0, is_active: true, created_at: '' },
    member: { id: 'mem-self', user_id: 'mock-user', name: '自己', is_active: true, created_at: '' },
  },
  {
    id: 'mock-tx-003',
    user_id: 'mock-user',
    transaction_date: '2024-03-05',
    type: 'income',
    category_id: 'cat-salary',
    amount: 55000,
    currency: 'TWD',
    exchange_rate: 1.0,
    base_amount: 55000,
    account_id: 'acc-huanan',
    member_id: 'mem-self',
    note: '三月份薪資發放',
    transfer_group_id: null,
    created_at: '2024-03-05T09:00:00Z',
    updated_at: '2024-03-05T09:00:00Z',
    category: { id: 'cat-salary', user_id: 'mock-user', name: '工資', type: 'income', color: '#10b981', sort_order: 1, is_active: true, created_at: '' },
    account: { id: 'acc-huanan', user_id: 'mock-user', name: '華南銀行', account_type: 'bank', currency: 'TWD', opening_balance: 0, is_active: true, created_at: '' },
    member: { id: 'mem-self', user_id: 'mock-user', name: '自己', is_active: true, created_at: '' },
  },
  {
    id: 'mock-tx-004',
    user_id: 'mock-user',
    transaction_date: '2024-03-06',
    type: 'expense',
    category_id: 'cat-grocery',
    amount: 480,
    currency: 'TWD',
    exchange_rate: 1.0,
    base_amount: 480,
    account_id: 'acc-card',
    member_id: 'mem-family',
    note: '全聯採買生活日用品',
    transfer_group_id: null,
    transfer_direction: null,
    created_at: '2024-03-06T15:45:00Z',
    updated_at: '2024-03-06T15:45:00Z',
    category: { id: 'cat-grocery', user_id: 'mock-user', name: '日常用品', type: 'expense', color: '#06b6d4', sort_order: 2, is_active: true, created_at: '' },
    account: { id: 'acc-card', user_id: 'mock-user', name: '信用卡', account_type: 'credit_card', currency: 'TWD', opening_balance: 0, is_active: true, created_at: '' },
    member: { id: 'mem-family', user_id: 'mock-user', name: '家人', is_active: true, created_at: '' },
  },
  // 轉帳配對示範紀錄 (華南銀行 轉出至 Line Bank 10,000 元)
  {
    id: 'mock-tx-transfer-out',
    user_id: 'mock-user',
    transaction_date: '2024-03-07',
    type: 'transfer',
    category_id: null,
    amount: 10000,
    currency: 'TWD',
    exchange_rate: 1.0,
    base_amount: 10000,
    account_id: 'acc-huanan',
    member_id: 'mem-self',
    note: '轉帳至 Line Bank (生活預算備用)',
    transfer_group_id: 'mock-transfer-group-001',
    transfer_direction: 'out',
    created_at: '2024-03-07T10:00:00Z',
    updated_at: '2024-03-07T10:00:00Z',
    account: { id: 'acc-huanan', user_id: 'mock-user', name: '華南銀行', account_type: 'bank', currency: 'TWD', opening_balance: 0, is_active: true, created_at: '' },
    member: { id: 'mem-self', user_id: 'mock-user', name: '自己', is_active: true, created_at: '' },
  },
  {
    id: 'mock-tx-transfer-in',
    user_id: 'mock-user',
    transaction_date: '2024-03-07',
    type: 'transfer',
    category_id: null,
    amount: 10000,
    currency: 'TWD',
    exchange_rate: 1.0,
    base_amount: 10000,
    account_id: 'acc-linebank',
    member_id: 'mem-self',
    note: '從 華南銀行 轉入 (生活預算備用)',
    transfer_group_id: 'mock-transfer-group-001',
    transfer_direction: 'in',
    created_at: '2024-03-07T10:00:00Z',
    updated_at: '2024-03-07T10:00:00Z',
    account: { id: 'acc-linebank', user_id: 'mock-user', name: 'Line Bank', account_type: 'bank', currency: 'TWD', opening_balance: 0, is_active: true, created_at: '' },
    member: { id: 'mem-self', user_id: 'mock-user', name: '自己', is_active: true, created_at: '' },
  },
];

let mockTransactionsStore: EnrichedTransaction[] = loadMockData('fin_mock_txs', DEFAULT_MOCK_TRANSACTIONS);

/**
 * 查詢交易列表（支援 Supabase PostgreSQL 與離線測試模式）
 */
export async function fetchTransactions(
  userId?: string,
  filter?: TransactionFilter
): Promise<{ data: EnrichedTransaction[]; totalCount: number; error: Error | null }> {
  // 1. 若 Supabase 未配置或尚未登入，使用記憶體預覽儲存區
  if (!isSupabaseConfigured() || !userId) {
    let filtered = [...mockTransactionsStore];

    if (filter?.startDate) {
      filtered = filtered.filter(t => t.transaction_date >= filter.startDate!);
    }
    if (filter?.endDate) {
      filtered = filtered.filter(t => t.transaction_date <= filter.endDate!);
    }
    if (filter?.type && filter.type !== 'all') {
      filtered = filtered.filter(t => t.type === filter.type);
    }
    if (filter?.categoryId) {
      filtered = filtered.filter(t => t.category_id === filter.categoryId);
    }
    if (filter?.accountId) {
      filtered = filtered.filter(t => t.account_id === filter.accountId);
    }
    if (filter?.memberId) {
      filtered = filtered.filter(t => t.member_id === filter.memberId);
    }
    if (filter?.currency) {
      filtered = filtered.filter(t => t.currency === filter.currency);
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.note && t.note.toLowerCase().includes(q)) ||
        (t.category?.name && t.category.name.toLowerCase().includes(q)) ||
        (t.account?.name && t.account.name.toLowerCase().includes(q)) ||
        (t.member?.name && t.member.name.toLowerCase().includes(q))
      );
    }

    // 排序
    const sortBy = filter?.sortBy || 'transaction_date';
    const isAsc = filter?.sortOrder === 'asc';
    filtered.sort((a, b) => {
      if (sortBy === 'amount') {
        return isAsc ? a.amount - b.amount : b.amount - a.amount;
      }
      return isAsc
        ? a.transaction_date.localeCompare(b.transaction_date)
        : b.transaction_date.localeCompare(a.transaction_date);
    });

    const totalCount = filtered.length;
    if (filter?.page && filter?.pageSize) {
      const from = (filter.page - 1) * filter.pageSize;
      filtered = filtered.slice(from, from + filter.pageSize);
    }

    return { data: filtered, totalCount, error: null };
  }

  // 2. 正式 Supabase 查詢
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        account:accounts(*),
        member:members(*)
      `, { count: 'exact' })
      .eq('user_id', userId);

    if (filter?.startDate) {
      query = query.gte('transaction_date', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('transaction_date', filter.endDate);
    }
    if (filter?.type && filter.type !== 'all') {
      query = query.eq('type', filter.type);
    }
    if (filter?.categoryId) {
      query = query.eq('category_id', filter.categoryId);
    }
    if (filter?.accountId) {
      query = query.eq('account_id', filter.accountId);
    }
    if (filter?.memberId) {
      query = query.eq('member_id', filter.memberId);
    }
    if (filter?.currency) {
      query = query.eq('currency', filter.currency);
    }
    if (filter?.searchQuery) {
      query = query.ilike('note', `%${filter.searchQuery}%`);
    }

    const sortBy = filter?.sortBy || 'transaction_date';
    const sortOrder = filter?.sortOrder === 'asc';
    query = query.order(sortBy, { ascending: sortOrder });

    if (filter?.page && filter?.pageSize) {
      const from = (filter.page - 1) * filter.pageSize;
      const to = from + filter.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    return {
      data: (data as unknown as EnrichedTransaction[]) || [],
      totalCount: count || 0,
      error,
    };
  } catch (err: any) {
    console.error('Fetch transactions failed:', err);
    return { data: [], totalCount: 0, error: err };
  }
}

/**
 * 新增一般交易（收入 / 支出）
 */
export async function createTransaction(
  transaction: Omit<DbTransaction, 'id' | 'created_at' | 'updated_at'>,
  enrichedMeta?: { category?: any; account?: any; member?: any }
): Promise<{ data: DbTransaction | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !transaction.user_id || transaction.user_id === 'mock-user') {
    const cats = getMockCategoriesStore();
    const accs = getMockAccountsStore();
    const mems = getMockMembersStore();

    const resolvedCategory = enrichedMeta?.category || (transaction.category_id ? cats.find(c => c.id === transaction.category_id) : null);
    const resolvedAccount = enrichedMeta?.account || (transaction.account_id ? accs.find(a => a.id === transaction.account_id) : null);
    const resolvedMember = enrichedMeta?.member || (transaction.member_id ? mems.find(m => m.id === transaction.member_id) : null);

    const newTx: EnrichedTransaction = {
      ...transaction,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: resolvedCategory,
      account: resolvedAccount,
      member: resolvedMember,
    };
    mockTransactionsStore = [newTx, ...mockTransactionsStore];
    saveMockData('fin_mock_txs', mockTransactionsStore);
    return { data: newTx, error: null };
  }

  const { data, error } = (await supabase
    .from('transactions')
    .insert([transaction] as any)
    .select()
    .single()) as unknown as { data: DbTransaction | null; error: Error | null };

  return { data, error };
}

/**
 * 新增轉帳交易（自動建立配對之轉出與轉入兩筆紀錄，並帶有相同的 transfer_group_id）
 * 支援跨幣別轉帳（如 JPY 帳戶轉出至 TWD 帳戶）
 */
export async function createTransfer(
  userId: string | undefined,
  data: {
    transaction_date: string;
    amount: number;             // 轉出原幣金額
    currency: string;           // 轉出幣別
    to_amount?: number;         // 轉入原幣金額（跨幣別時可不同）
    to_currency?: string;       // 轉入幣別（預設同 currency）
    exchange_rate?: number;     // 轉出幣別兌 TWD 匯率
    target_exchange_rate?: number; // 轉入幣別兌 TWD 匯率
    from_account_id: string;
    to_account_id: string;
    member_id?: string | null;
    note?: string;
    from_account_name?: string;
    to_account_name?: string;
    member_name?: string;
  }
): Promise<{ success: boolean; transferGroupId: string; error?: string }> {
  if (data.from_account_id === data.to_account_id) {
    return { success: false, transferGroupId: '', error: '轉出帳戶與轉入帳戶不可相同' };
  }

  const fromCurrency = (data.currency || 'TWD').toUpperCase();
  const toCurrency = (data.to_currency || data.currency || 'TWD').toUpperCase();
  const fromAmount = data.amount;
  const toAmount = data.to_amount !== undefined && data.to_amount > 0 ? data.to_amount : data.amount;

  // 匯率計算：確保換算成 TWD 的基準金額一致，避免虛增或重複計算資產
  const rateOut = data.exchange_rate || (fromCurrency === 'TWD' ? 1.0 : 1.0);
  const baseAmount = Math.round(fromAmount * rateOut * 10000) / 10000;
  
  // 轉入端的匯率：若轉入為 TWD 則為 1.0，否則依據 baseAmount / toAmount 計算或給定值
  const rateIn = data.target_exchange_rate || (toCurrency === 'TWD' ? 1.0 : (toAmount > 0 ? baseAmount / toAmount : 1.0));

  const transferGroupId = `trg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const fromNote = data.note 
    ? `${data.note} (轉出至 ${data.to_account_name || '目標帳戶'})` 
    : `轉出至 ${data.to_account_name || '目標帳戶'}`;

  const toNote = data.note 
    ? `${data.note} (從 ${data.from_account_name || '來源帳戶'} 轉入)` 
    : `從 ${data.from_account_name || '來源帳戶'} 轉入`;

  // 1. 記憶體測試模式
  if (!isSupabaseConfigured() || !userId) {
    const fromTx: EnrichedTransaction = {
      id: `tx-out-${Date.now()}`,
      user_id: 'mock-user',
      transaction_date: data.transaction_date,
      type: 'transfer',
      category_id: null,
      amount: fromAmount,
      currency: fromCurrency,
      exchange_rate: rateOut,
      base_amount: baseAmount,
      account_id: data.from_account_id,
      member_id: data.member_id || null,
      note: fromNote,
      transfer_group_id: transferGroupId,
      transfer_direction: 'out',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      account: { id: data.from_account_id, user_id: 'mock-user', name: data.from_account_name || '來源帳戶', account_type: 'bank', currency: fromCurrency, opening_balance: 0, is_active: true, created_at: '' },
      member: data.member_id ? { id: data.member_id, user_id: 'mock-user', name: data.member_name || '自己', is_active: true, created_at: '' } : null,
    };

    const toTx: EnrichedTransaction = {
      id: `tx-in-${Date.now()}`,
      user_id: 'mock-user',
      transaction_date: data.transaction_date,
      type: 'transfer',
      category_id: null,
      amount: toAmount,
      currency: toCurrency,
      exchange_rate: rateIn,
      base_amount: baseAmount, // 兩者 TWD 基準金額精確一致，淨差額為 0
      account_id: data.to_account_id,
      member_id: data.member_id || null,
      note: toNote,
      transfer_group_id: transferGroupId,
      transfer_direction: 'in',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      account: { id: data.to_account_id, user_id: 'mock-user', name: data.to_account_name || '目標帳戶', account_type: 'bank', currency: toCurrency, opening_balance: 0, is_active: true, created_at: '' },
      member: data.member_id ? { id: data.member_id, user_id: 'mock-user', name: data.member_name || '自己', is_active: true, created_at: '' } : null,
    };

    mockTransactionsStore = [fromTx, toTx, ...mockTransactionsStore];
    saveMockData('fin_mock_txs', mockTransactionsStore);
    return { success: true, transferGroupId };
  }

  // 2. 正式 Supabase 寫入（建立成對轉帳紀錄，明確標註 transfer_direction）
  const records = [
    {
      user_id: userId,
      transaction_date: data.transaction_date,
      type: 'transfer' as const,
      category_id: null,
      amount: fromAmount,
      currency: fromCurrency,
      exchange_rate: rateOut,
      base_amount: baseAmount,
      account_id: data.from_account_id,
      member_id: data.member_id || null,
      note: fromNote,
      transfer_group_id: transferGroupId,
      transfer_direction: 'out' as const,
    },
    {
      user_id: userId,
      transaction_date: data.transaction_date,
      type: 'transfer' as const,
      category_id: null,
      amount: toAmount,
      currency: toCurrency,
      exchange_rate: rateIn,
      base_amount: baseAmount,
      account_id: data.to_account_id,
      member_id: data.member_id || null,
      note: toNote,
      transfer_group_id: transferGroupId,
      transfer_direction: 'in' as const,
    },
  ];

  const { error } = await supabase.from('transactions').insert(records as any);
  if (error) {
    return { success: false, transferGroupId: '', error: error.message };
  }

  return { success: true, transferGroupId };
}

/**
 * 編輯交易
 * Phase 6A 安全約束：若交易為轉帳 (含有 transfer_group_id 或 type === 'transfer')，
 * 嚴格禁止單筆編輯，防止雙向資產與匯率脫鉤！
 */
export async function updateTransaction(
  id: string,
  userId: string | undefined,
  updates: Partial<DbTransaction>,
  enrichedMeta?: { category?: any; account?: any; member?: any }
): Promise<{ success: boolean; error?: string }> {
  // 1. 記憶體測試模式防護
  if (!isSupabaseConfigured() || !userId) {
    const target = mockTransactionsStore.find(t => t.id === id);
    if (!target) {
      return { success: false, error: '找不到該筆交易紀錄' };
    }

    if (target.type === 'transfer' || target.transfer_group_id) {
      return {
        success: false,
        error: '轉帳交易禁止直接單筆編輯，以確保雙向資產一致性。請刪除整組轉帳後重新建立。',
      };
    }

    const idx = mockTransactionsStore.findIndex(t => t.id === id);
    mockTransactionsStore[idx] = {
      ...mockTransactionsStore[idx],
      ...updates,
      updated_at: new Date().toISOString(),
      ...(enrichedMeta?.category ? { category: enrichedMeta.category } : {}),
      ...(enrichedMeta?.account ? { account: enrichedMeta.account } : {}),
      ...(enrichedMeta?.member ? { member: enrichedMeta.member } : {}),
    };
    saveMockData('fin_mock_txs', mockTransactionsStore);
    return { success: true };
  }

  // 2. 正式 Supabase 檢查與防護
  try {
    const { data: target, error: checkError } = await supabase
      .from('transactions')
      .select('type, transfer_group_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !target) {
      return { success: false, error: '找不到欲修改的交易紀錄或無權限操作' };
    }

    const targetType = (target as any).type;
    const targetGroupId = (target as any).transfer_group_id;

    if (targetType === 'transfer' || targetGroupId) {
      return {
        success: false,
        error: '轉帳交易禁止直接單筆編輯，以確保雙向資產一致性。請刪除整組轉帳後重新建立。',
      };
    }

    const { error } = await (supabase.from('transactions') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 刪除交易（若為轉帳交易，自動同步刪除成對之轉入/轉出群組紀錄，絕不留下孤兒記錄）
 */
export async function deleteTransaction(
  id: string,
  userId: string | undefined,
  transferGroupId?: string | null
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  // 1. 記憶體測試模式
  if (!isSupabaseConfigured() || !userId) {
    const target = mockTransactionsStore.find(t => t.id === id);
    const resolvedGroupId = transferGroupId || target?.transfer_group_id;

    if (resolvedGroupId) {
      const prevLen = mockTransactionsStore.length;
      mockTransactionsStore = mockTransactionsStore.filter(
        t => t.transfer_group_id !== resolvedGroupId
      );
      saveMockData('fin_mock_txs', mockTransactionsStore);
      return { success: true, deletedCount: prevLen - mockTransactionsStore.length };
    } else {
      mockTransactionsStore = mockTransactionsStore.filter(t => t.id !== id);
      saveMockData('fin_mock_txs', mockTransactionsStore);
      return { success: true, deletedCount: 1 };
    }
  }

  // 2. 正式 Supabase 刪除
  try {
    let resolvedGroupId = transferGroupId;
    if (!resolvedGroupId) {
      const { data: target } = await supabase
        .from('transactions')
        .select('transfer_group_id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      resolvedGroupId = (target as any)?.transfer_group_id;
    }

    if (resolvedGroupId) {
      // 整組轉帳雙向同步刪除
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('transfer_group_id', resolvedGroupId)
        .eq('user_id', userId);

      return { success: !error, deletedCount: 2, error: error?.message };
    } else {
      // 單筆一般交易刪除
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return { success: !error, deletedCount: 1, error: error?.message };
    }
  } catch (err: any) {
    return { success: false, deletedCount: 0, error: err.message };
  }
}

export function getMockTransactionsStore(): EnrichedTransaction[] {
  return [...mockTransactionsStore];
}

export function setMockTransactionsStore(store: EnrichedTransaction[]) {
  mockTransactionsStore = [...store];
  saveMockData('fin_mock_txs', mockTransactionsStore);
}

export function resetMockTransactionsStore() {
  mockTransactionsStore = [...DEFAULT_MOCK_TRANSACTIONS];
  saveMockData('fin_mock_txs', mockTransactionsStore);
}

