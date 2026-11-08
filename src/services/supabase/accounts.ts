import { supabase, isSupabaseConfigured } from './client';
import { DbAccount } from '../../types/database';
import { loadMockData, saveMockData } from '../mock/mockPersistence';

export const DEFAULT_MOCK_ACCOUNTS: DbAccount[] = [
  { id: 'acc-huanan', user_id: 'mock-user', name: '華南銀行', account_type: 'bank', currency: 'TWD', opening_balance: 50000, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'acc-linebank', user_id: 'mock-user', name: 'Line Bank', account_type: 'bank', currency: 'TWD', opening_balance: 10000, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'acc-card', user_id: 'mock-user', name: '玉山信用卡', account_type: 'credit_card', currency: 'TWD', opening_balance: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'acc-cash', user_id: 'mock-user', name: '日常錢包現金', account_type: 'cash', currency: 'TWD', opening_balance: 3500, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'acc-invest', user_id: 'mock-user', name: '證券投資戶', account_type: 'investment', currency: 'TWD', opening_balance: 120000, is_active: true, created_at: '2024-01-01T00:00:00Z' },
];

let mockAccountsStore: DbAccount[] = loadMockData('fin_mock_accounts', DEFAULT_MOCK_ACCOUNTS);

export function getMockAccountsStore(): DbAccount[] {
  return [...mockAccountsStore];
}

export function setMockAccountsStore(store: DbAccount[]) {
  mockAccountsStore = [...store];
  saveMockData('fin_mock_accounts', mockAccountsStore);
}

export async function fetchAccounts(userId?: string): Promise<{ data: DbAccount[]; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    return { data: [...mockAccountsStore], error: null };
  }
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  return { data: (data as DbAccount[]) || [], error };
}

export async function createAccount(
  account: Omit<DbAccount, 'id' | 'created_at'>
): Promise<{ data: DbAccount | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !account.user_id || account.user_id === 'mock-user') {
    const newAcc: DbAccount = {
      ...account,
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
    };
    mockAccountsStore.push(newAcc);
    saveMockData('fin_mock_accounts', mockAccountsStore);
    return { data: newAcc, error: null };
  }
  const { data, error } = await supabase
    .from('accounts')
    .insert([account] as any)
    .select()
    .single();

  return { data: (data as unknown as DbAccount) || null, error: error as Error | null };
}

export async function updateAccount(
  id: string,
  updates: Partial<DbAccount>,
  userId?: string
): Promise<{ data: DbAccount | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    const idx = mockAccountsStore.findIndex(a => a.id === id);
    if (idx === -1) return { data: null, error: new Error('找不到該帳戶') };
    mockAccountsStore[idx] = { ...mockAccountsStore[idx], ...updates };
    saveMockData('fin_mock_accounts', mockAccountsStore);
    return { data: mockAccountsStore[idx], error: null };
  }
  const { data, error } = await (supabase.from('accounts') as any)
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  return { data: (data as unknown as DbAccount) || null, error: error as Error | null };
}

export async function deleteAccount(
  id: string,
  userId?: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    mockAccountsStore = mockAccountsStore.filter(a => a.id !== id);
    saveMockData('fin_mock_accounts', mockAccountsStore);
    return { success: true, error: null };
  }
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return { success: !error, error };
}

