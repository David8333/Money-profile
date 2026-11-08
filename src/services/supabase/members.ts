import { supabase, isSupabaseConfigured } from './client';
import { DbMember } from '../../types/database';
import { loadMockData, saveMockData } from '../mock/mockPersistence';

export const DEFAULT_MOCK_MEMBERS: DbMember[] = [
  { id: 'mem-self', user_id: 'mock-user', name: '自己', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'mem-family', user_id: 'mock-user', name: '家人', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'mem-partner', user_id: 'mock-user', name: '伴侶', is_active: true, created_at: '2024-01-01T00:00:00Z' },
];

let mockMembersStore: DbMember[] = loadMockData('fin_mock_members', DEFAULT_MOCK_MEMBERS);

export function getMockMembersStore(): DbMember[] {
  return [...mockMembersStore];
}

export function setMockMembersStore(store: DbMember[]) {
  mockMembersStore = [...store];
  saveMockData('fin_mock_members', mockMembersStore);
}

export async function fetchMembers(userId?: string): Promise<{ data: DbMember[]; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    return { data: [...mockMembersStore], error: null };
  }
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  return { data: (data as DbMember[]) || [], error };
}

export async function createMember(
  member: Omit<DbMember, 'id' | 'created_at'>
): Promise<{ data: DbMember | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !member.user_id || member.user_id === 'mock-user') {
    const newMem: DbMember = {
      ...member,
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
    };
    mockMembersStore.push(newMem);
    saveMockData('fin_mock_members', mockMembersStore);
    return { data: newMem, error: null };
  }
  const { data, error } = await supabase
    .from('members')
    .insert([member] as any)
    .select()
    .single();

  return { data: (data as unknown as DbMember) || null, error: error as Error | null };
}

export async function updateMember(
  id: string,
  updates: Partial<DbMember>,
  userId?: string
): Promise<{ data: DbMember | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    const idx = mockMembersStore.findIndex(m => m.id === id);
    if (idx === -1) return { data: null, error: new Error('找不到該成員') };
    mockMembersStore[idx] = { ...mockMembersStore[idx], ...updates };
    saveMockData('fin_mock_members', mockMembersStore);
    return { data: mockMembersStore[idx], error: null };
  }
  const { data, error } = await (supabase.from('members') as any)
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  return { data: (data as unknown as DbMember) || null, error: error as Error | null };
}

export async function deleteMember(
  id: string,
  userId?: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    mockMembersStore = mockMembersStore.filter(m => m.id !== id);
    saveMockData('fin_mock_members', mockMembersStore);
    return { success: true, error: null };
  }
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return { success: !error, error };
}

