/**
 * Supabase Database TypeScript Definitions
 * Corresponding directly to PostgreSQL tables in /supabase/schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'bank' | 'cash' | 'credit_card' | 'investment' | 'other';
export type ImportBatchStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Database {
  public: {
    Tables: {
      currencies: {
        Row: {
          code: string;
          name: string;
          symbol: string;
          decimal_places: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          symbol: string;
          decimal_places?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          symbol?: string;
          decimal_places?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          color: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          color?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'income' | 'expense';
          color?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          account_type: AccountType;
          currency: string;
          opening_balance: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          account_type?: AccountType;
          currency?: string;
          opening_balance?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          account_type?: AccountType;
          currency?: string;
          opening_balance?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_date: string;
          type: TransactionType;
          category_id: string | null;
          amount: number;
          currency: string;
          exchange_rate: number;
          base_amount: number;
          account_id: string;
          member_id: string | null;
          note: string | null;
          transfer_group_id: string | null;
          transfer_direction?: 'out' | 'in' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_date: string;
          type: TransactionType;
          category_id?: string | null;
          amount: number;
          currency?: string;
          exchange_rate?: number;
          base_amount: number;
          account_id: string;
          member_id?: string | null;
          note?: string | null;
          transfer_group_id?: string | null;
          transfer_direction?: 'out' | 'in' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_date?: string;
          type?: TransactionType;
          category_id?: string | null;
          amount?: number;
          currency?: string;
          exchange_rate?: number;
          base_amount?: number;
          account_id?: string;
          member_id?: string | null;
          note?: string | null;
          transfer_group_id?: string | null;
          transfer_direction?: 'out' | 'in' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      import_batches: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_hash: string;
          total_rows: number;
          imported_rows: number;
          duplicate_rows: number;
          error_rows: number;
          status: ImportBatchStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_hash: string;
          total_rows?: number;
          imported_rows?: number;
          duplicate_rows?: number;
          error_rows?: number;
          status?: ImportBatchStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_hash?: string;
          total_rows?: number;
          imported_rows?: number;
          duplicate_rows?: number;
          error_rows?: number;
          status?: ImportBatchStatus;
          created_at?: string;
        };
      };
      import_row_sources: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          import_batch_id: string;
          source_uuid: string | null;
          source_fingerprint: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          import_batch_id: string;
          source_uuid?: string | null;
          source_fingerprint: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          import_batch_id?: string;
          source_uuid?: string | null;
          source_fingerprint?: string;
          created_at?: string;
        };
      };
      exchange_rates: {
        Row: {
          id: string;
          user_id: string;
          from_currency: string;
          to_currency: string;
          rate: number;
          effective_date: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_currency: string;
          to_currency?: string;
          rate: number;
          effective_date?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_currency?: string;
          to_currency?: string;
          rate?: number;
          effective_date?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      initialize_user_default_data: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          message: string;
          initialized: boolean;
        };
      };
      import_csv_batch: {
        Args: {
          p_batch_id: string;
          p_rows: Json;
        };
        Returns: {
          success: boolean;
          imported_count: number;
          duplicate_count: number;
          error_count: number;
          error_message?: string;
        };
      };
      restore_finance_full: {
        Args: {
          p_backup: Json;
        };
        Returns: {
          success: boolean;
          mode: string;
          user_id: string;
          restored_counts: Record<string, number>;
          error_message?: string;
        };
      };
      restore_finance_merge: {
        Args: {
          p_backup: Json;
        };
        Returns: {
          success: boolean;
          mode: string;
          user_id: string;
          restored_counts: Record<string, number>;
          error_message?: string;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type DbCategory = Database['public']['Tables']['categories']['Row'];
export type DbAccount = Database['public']['Tables']['accounts']['Row'];
export type DbMember = Database['public']['Tables']['members']['Row'];
export type DbCurrency = Database['public']['Tables']['currencies']['Row'];
export type DbTransaction = Database['public']['Tables']['transactions']['Row'];
export type DbImportBatch = Database['public']['Tables']['import_batches']['Row'];
export type DbImportRowSource = Database['public']['Tables']['import_row_sources']['Row'];
export type DbExchangeRate = Database['public']['Tables']['exchange_rates']['Row'];
