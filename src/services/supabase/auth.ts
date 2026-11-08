import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
}

/**
 * 監聽 Supabase 驗證狀態變更
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  if (!isSupabaseConfigured()) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * 取得當前 Session
 */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase getSession error:', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('Supabase getSession exception:', err);
    return null;
  }
}

/**
 * 登出
 */
export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * 初始化使用者預設資料（分類、帳戶、成員）
 * 調用 Supabase PostgreSQL Stored Procedure
 */
export async function initializeUserDefaultData(userId: string): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase 尚未設定環境變數' };
  }

  try {
    // 呼叫 PostgreSQL stored procedure
    const { data, error } = await (supabase.rpc as unknown as (fn: string, args: { p_user_id: string }) => Promise<{ data: { success: boolean; message: string; initialized: boolean }; error: Error | null }>)(
      'initialize_user_default_data',
      { p_user_id: userId }
    );

    if (error) {
      console.warn('RPC initialize_user_default_data notice:', error.message);
      // Fallback: 如果 stored procedure 尚未建立，前端執行基礎檢查補齊
      return await fallbackClientSideInitialization(userId);
    }

    return {
      success: true,
      message: data?.message || '初始化完成',
    };
  } catch (err) {
    console.error('Initialize user data error:', err);
    return { success: false, message: String(err) };
  }
}

/**
 * 前端備援初始化邏輯（當資料庫尚未建立 Procedure 時）
 */
async function fallbackClientSideInitialization(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 檢查現有分類
    const { count: catCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (catCount === 0 || catCount === null) {
      const defaultCategories = [
        { user_id: userId, name: '飲食', type: 'expense' as const, color: '#f97316', sort_order: 1 },
        { user_id: userId, name: '日常用品', type: 'expense' as const, color: '#06b6d4', sort_order: 2 },
        { user_id: userId, name: '機車', type: 'expense' as const, color: '#3b82f6', sort_order: 3 },
        { user_id: userId, name: '大眾運輸', type: 'expense' as const, color: '#6366f1', sort_order: 4 },
        { user_id: userId, name: '房貸', type: 'expense' as const, color: '#e11d48', sort_order: 5 },
        { user_id: userId, name: '居家', type: 'expense' as const, color: '#14b8a6', sort_order: 6 },
        { user_id: userId, name: '電話網路', type: 'expense' as const, color: '#0ea5e9', sort_order: 7 },
        { user_id: userId, name: '娛樂', type: 'expense' as const, color: '#ec4899', sort_order: 8 },
        { user_id: userId, name: '交際應酬', type: 'expense' as const, color: '#a855f7', sort_order: 9 },
        { user_id: userId, name: '醫療保健', type: 'expense' as const, color: '#10b981', sort_order: 10 },
        { user_id: userId, name: '服飾', type: 'expense' as const, color: '#f59e0b', sort_order: 11 },
        { user_id: userId, name: '學習深造', type: 'expense' as const, color: '#8b5cf6', sort_order: 12 },
        { user_id: userId, name: '美容美髮', type: 'expense' as const, color: '#f43f5e', sort_order: 13 },
        { user_id: userId, name: '稅金', type: 'expense' as const, color: '#64748b', sort_order: 14 },
        { user_id: userId, name: '旅遊', type: 'expense' as const, color: '#0284c7', sort_order: 15 },
        { user_id: userId, name: '其它', type: 'expense' as const, color: '#94a3b8', sort_order: 99 },
        { user_id: userId, name: '工資', type: 'income' as const, color: '#10b981', sort_order: 1 },
        { user_id: userId, name: '獎金', type: 'income' as const, color: '#059669', sort_order: 2 },
        { user_id: userId, name: '旅遊補助', type: 'income' as const, color: '#34d399', sort_order: 3 },
      ];
      await supabase.from('categories').insert(defaultCategories as any);
    }

    // 檢查現有帳戶
    const { count: accCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (accCount === 0 || accCount === null) {
      const defaultAccounts = [
        { user_id: userId, name: '華南銀行', account_type: 'bank' as const, currency: 'TWD', opening_balance: 0 },
        { user_id: userId, name: 'Line Bank', account_type: 'bank' as const, currency: 'TWD', opening_balance: 0 },
        { user_id: userId, name: '信用卡', account_type: 'credit_card' as const, currency: 'TWD', opening_balance: 0 },
      ];
      await supabase.from('accounts').insert(defaultAccounts as any);
    }

    // 檢查現有成員
    const { count: memCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (memCount === 0 || memCount === null) {
      const defaultMembers = [
        { user_id: userId, name: '自己' },
        { user_id: userId, name: '家人' },
        { user_id: userId, name: '朋友' },
      ];
      await supabase.from('members').insert(defaultMembers as any);
    }

    return { success: true, message: '客戶端基礎初始化成功' };
  } catch (error) {
    console.error('Fallback init failed:', error);
    return { success: false, message: '初始化失敗' };
  }
}
