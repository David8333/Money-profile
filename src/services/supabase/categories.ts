import { supabase, isSupabaseConfigured } from './client';
import { DbCategory } from '../../types/database';
import { loadMockData, saveMockData } from '../mock/mockPersistence';

export const DEFAULT_MOCK_CATEGORIES: DbCategory[] = [
  { id: 'cat-food', user_id: 'mock-user', name: '飲食', type: 'expense', color: '#f97316', sort_order: 1, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'cat-transit', user_id: 'mock-user', name: '大眾運輸', type: 'expense', color: '#6366f1', sort_order: 2, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'cat-salary', user_id: 'mock-user', name: '工資', type: 'income', color: '#10b981', sort_order: 3, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'cat-grocery', user_id: 'mock-user', name: '生活雜支', type: 'expense', color: '#eab308', sort_order: 4, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'cat-entertainment', user_id: 'mock-user', name: '休閒娛樂', type: 'expense', color: '#ec4899', sort_order: 5, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'cat-housing', user_id: 'mock-user', name: '居住水電', type: 'expense', color: '#06b6d4', sort_order: 6, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'cat-bonus', user_id: 'mock-user', name: '投資獎金', type: 'income', color: '#3b82f6', sort_order: 7, is_active: true, created_at: '2024-01-01T00:00:00Z' },
];

let mockCategoriesStore: DbCategory[] = loadMockData('fin_mock_categories', DEFAULT_MOCK_CATEGORIES);

export function getMockCategoriesStore(): DbCategory[] {
  return [...mockCategoriesStore];
}

export function setMockCategoriesStore(store: DbCategory[]) {
  mockCategoriesStore = [...store];
  saveMockData('fin_mock_categories', mockCategoriesStore);
}

export async function fetchCategories(userId?: string): Promise<{ data: DbCategory[]; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    return { data: [...mockCategoriesStore], error: null };
  }
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  return { data: (data as DbCategory[]) || [], error };
}

export async function createCategory(
  category: Omit<DbCategory, 'id' | 'created_at'>
): Promise<{ data: DbCategory | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !category.user_id || category.user_id === 'mock-user') {
    const newCat: DbCategory = {
      ...category,
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
    };
    mockCategoriesStore.push(newCat);
    saveMockData('fin_mock_categories', mockCategoriesStore);
    return { data: newCat, error: null };
  }
  const { data, error } = await supabase
    .from('categories')
    .insert([category] as any)
    .select()
    .single();

  return { data: (data as unknown as DbCategory) || null, error: error as Error | null };
}

export async function updateCategory(
  id: string,
  updates: Partial<DbCategory>,
  userId?: string
): Promise<{ data: DbCategory | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    const idx = mockCategoriesStore.findIndex(c => c.id === id);
    if (idx === -1) return { data: null, error: new Error('找不到該分類') };
    mockCategoriesStore[idx] = { ...mockCategoriesStore[idx], ...updates };
    saveMockData('fin_mock_categories', mockCategoriesStore);
    return { data: mockCategoriesStore[idx], error: null };
  }
  const { data, error } = await (supabase.from('categories') as any)
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  return { data: (data as unknown as DbCategory) || null, error: error as Error | null };
}

export async function deleteCategory(
  id: string,
  userId?: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    mockCategoriesStore = mockCategoriesStore.filter(c => c.id !== id);
    saveMockData('fin_mock_categories', mockCategoriesStore);
    return { success: true, error: null };
  }
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return { success: !error, error };
}

