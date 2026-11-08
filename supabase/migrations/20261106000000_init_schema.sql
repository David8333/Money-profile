-- ==============================================================================
-- Personal Finance Manager - Initial PostgreSQL Schema Migration for Supabase
-- Version: 20261106000000
-- Description: Creates core financial tables with strict RLS, NUMERIC precision,
--              foreign keys, indexes, and initial data seeding procedure.
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLE: currencies (系統通用貨幣表，ISO 4217 代碼)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimal_places INTEGER NOT NULL DEFAULT 2,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- 貨幣表為系統參考資料，所有登入使用者皆可唯讀
CREATE POLICY "Currencies are readable by authenticated users"
    ON public.currencies FOR SELECT
    TO authenticated
    USING (true);

-- 預設貨幣資料庫種子資料
INSERT INTO public.currencies (code, name, symbol, decimal_places, is_active)
VALUES 
    ('TWD', '新台幣', 'NT$', 0, true),
    ('USD', '美元', '$', 2, true),
    ('JPY', '日圓', '¥', 0, true),
    ('EUR', '歐元', '€', 2, true),
    ('CNY', '人民幣', '¥', 2, true),
    ('HKD', '港幣', 'HK$', 2, true),
    ('KRW', '韓元', '₩', 0, true),
    ('GBP', '英鎊', '£', 2, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    decimal_places = EXCLUDED.decimal_places;

-- ==============================================================================
-- TABLE: categories (使用者收支分類)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    color TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_categories_user_name_type UNIQUE (user_id, name, type)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);

-- ==============================================================================
-- TABLE: accounts (使用者資產/負債帳戶)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'bank' CHECK (account_type IN ('bank', 'cash', 'credit_card', 'investment', 'other')),
    currency TEXT NOT NULL DEFAULT 'TWD' REFERENCES public.currencies(code) ON UPDATE CASCADE,
    opening_balance NUMERIC(15, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_accounts_user_name UNIQUE (user_id, name)
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts"
    ON public.accounts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
    ON public.accounts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
    ON public.accounts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
    ON public.accounts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- ==============================================================================
-- TABLE: members (使用者記帳成員)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_members_user_name UNIQUE (user_id, name)
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own members"
    ON public.members FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own members"
    ON public.members FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own members"
    ON public.members FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own members"
    ON public.members FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

-- ==============================================================================
-- TABLE: transactions (核心交易紀錄)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(15, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TWD' REFERENCES public.currencies(code) ON UPDATE CASCADE,
    exchange_rate NUMERIC(15, 6) NOT NULL DEFAULT 1.000000,
    base_amount NUMERIC(15, 4) NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    note TEXT,
    transfer_group_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON public.transactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON public.transactions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON public.transactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON public.transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group ON public.transactions(transfer_group_id) WHERE transfer_group_id IS NOT NULL;

-- 自動更新 updated_at 觸發器
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TABLE: import_batches (CSV 匯入批次紀錄)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import batches"
    ON public.import_batches FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import batches"
    ON public.import_batches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import batches"
    ON public.import_batches FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_user ON public.import_batches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_hash ON public.import_batches(user_id, file_hash);

-- ==============================================================================
-- TABLE: import_row_sources (匯入來源追蹤與重複檢查)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.import_row_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE,
    source_uuid TEXT,
    source_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_import_sources_user_uuid UNIQUE NULLS NOT DISTINCT (user_id, source_uuid)
);

ALTER TABLE public.import_row_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import row sources"
    ON public.import_row_sources FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import row sources"
    ON public.import_row_sources FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import row sources"
    ON public.import_row_sources FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_import_sources_fingerprint ON public.import_row_sources(user_id, source_fingerprint);
CREATE INDEX IF NOT EXISTS idx_import_sources_batch ON public.import_row_sources(import_batch_id);

-- ==============================================================================
-- STORED PROCEDURE: 初始化使用者預設資料 (首次登入時執行)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.initialize_user_default_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_categories_count INTEGER;
    v_accounts_count INTEGER;
    v_members_count INTEGER;
BEGIN
    -- 確保只由本人或管理者呼叫
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION '權限不足：只能初始化當前登入使用者的帳號資料';
    END IF;

    -- 1. 初始化預設分類（檢查是否已存在，避免重複建立）
    SELECT COUNT(*) INTO v_categories_count FROM public.categories WHERE user_id = p_user_id;
    IF v_categories_count = 0 THEN
        INSERT INTO public.categories (user_id, name, type, color, sort_order) VALUES
            -- 支出分類
            (p_user_id, '飲食', 'expense', '#f97316', 1),
            (p_user_id, '日常用品', 'expense', '#06b6d4', 2),
            (p_user_id, '機車', 'expense', '#3b82f6', 3),
            (p_user_id, '大眾運輸', 'expense', '#6366f1', 4),
            (p_user_id, '房貸', 'expense', '#e11d48', 5),
            (p_user_id, '居家', 'expense', '#14b8a6', 6),
            (p_user_id, '電話網路', 'expense', '#0ea5e9', 7),
            (p_user_id, '娛樂', 'expense', '#ec4899', 8),
            (p_user_id, '交際應酬', 'expense', '#a855f7', 9),
            (p_user_id, '醫療保健', 'expense', '#10b981', 10),
            (p_user_id, '服飾', 'expense', '#f59e0b', 11),
            (p_user_id, '學習深造', 'expense', '#8b5cf6', 12),
            (p_user_id, '美容美髮', 'expense', '#f43f5e', 13),
            (p_user_id, '稅金', 'expense', '#64748b', 14),
            (p_user_id, '旅遊', 'expense', '#0284c7', 15),
            (p_user_id, '其它', 'expense', '#94a3b8', 99),
            -- 收入分類
            (p_user_id, '工資', 'income', '#10b981', 1),
            (p_user_id, '獎金', 'income', '#059669', 2),
            (p_user_id, '旅遊補助', 'income', '#34d399', 3);
    END IF;

    -- 2. 初始化預設帳戶
    SELECT COUNT(*) INTO v_accounts_count FROM public.accounts WHERE user_id = p_user_id;
    IF v_accounts_count = 0 THEN
        INSERT INTO public.accounts (user_id, name, account_type, currency, opening_balance) VALUES
            (p_user_id, '華南銀行', 'bank', 'TWD', 0),
            (p_user_id, 'Line Bank', 'bank', 'TWD', 0),
            (p_user_id, '信用卡', 'credit_card', 'TWD', 0);
    END IF;

    -- 3. 初始化預設成員
    SELECT COUNT(*) INTO v_members_count FROM public.members WHERE user_id = p_user_id;
    IF v_members_count = 0 THEN
        INSERT INTO public.members (user_id, name) VALUES
            (p_user_id, '自己'),
            (p_user_id, '家人'),
            (p_user_id, '朋友');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', '使用者預設資料已完成初始化',
        'initialized', (v_categories_count = 0 AND v_accounts_count = 0 AND v_members_count = 0)
    );
END;
$$;
