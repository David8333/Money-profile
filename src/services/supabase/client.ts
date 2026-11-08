import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

// Read configuration from environment variables (safe for both browser Vite and Node.js runtime)
const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);

const envAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);

// Check if valid URL and Key are provided (not placeholder values)
export function isSupabaseConfigured(): boolean {
  if (!envUrl || !envAnonKey) return false;
  if (envUrl.includes('your-project') || envAnonKey.includes('your-anon-publishable-key')) {
    return false;
  }
  try {
    const parsed = new URL(envUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Fallback dummy credentials when not configured yet to avoid instant crash
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  isSupabaseConfigured() ? envUrl! : fallbackUrl,
  isSupabaseConfigured() ? envAnonKey! : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const supabaseConfig = {
  url: envUrl || '',
  anonKey: envAnonKey || '',
  isConfigured: isSupabaseConfigured(),
};
