-- ==============================================================================
-- Migration: 20261107020000_full_restore_rpc.sql
-- Description: Phase 6B.1 - Atomic Full Restore & Merge Restore Stored Procedures
-- Guarantees single-transaction atomicity, zero partial restores, strict user_id
-- enforcement from auth.uid(), and safe handling of composite unique constraints.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: public.restore_finance_full(p_backup JSONB)
-- Atomic full replacement of user financial data inside a single PostgreSQL transaction.
-- If any table fails, the entire transaction is rolled back automatically.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_finance_full(p_backup JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_data JSONB;
    v_curr_count INTEGER := 0;
    v_rate_count INTEGER := 0;
    v_cat_count INTEGER := 0;
    v_acc_count INTEGER := 0;
    v_mem_count INTEGER := 0;
    v_tx_count INTEGER := 0;
    v_batch_count INTEGER := 0;
    v_src_count INTEGER := 0;
BEGIN
    -- 1. 安全權限驗證：必須為 authenticated 使用者
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '未登入或無權限執行完整還原 (auth.uid() is null)';
    END IF;

    -- 2. 備份結構驗證
    IF p_backup IS NULL OR NOT (p_backup ? 'data') THEN
        RAISE EXCEPTION '備份檔案缺少 [data] 主體物件，還原終止';
    END IF;

    v_data := p_backup->'data';

    -- 3. 依照外鍵依賴順序，清空目前使用者專屬之歷史資料
    -- 注意：currencies 為全域共用字典表，絕對禁止刪除！
    DELETE FROM public.import_row_sources WHERE user_id = v_user_id;
    DELETE FROM public.transactions WHERE user_id = v_user_id;
    DELETE FROM public.import_batches WHERE user_id = v_user_id;
    DELETE FROM public.exchange_rates WHERE user_id = v_user_id;
    DELETE FROM public.categories WHERE user_id = v_user_id;
    DELETE FROM public.accounts WHERE user_id = v_user_id;
    DELETE FROM public.members WHERE user_id = v_user_id;

    -- 4. 依照外鍵依賴順序，批次寫入新資料，並強制覆蓋 user_id = v_user_id

    -- 4.1 categories
    IF v_data ? 'categories' AND jsonb_array_length(v_data->'categories') > 0 THEN
        INSERT INTO public.categories (
            id, user_id, name, type, color, sort_order, is_active, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'name',
            elem->>'type',
            COALESCE(elem->>'color', '#64748b'),
            COALESCE((elem->>'sort_order')::INTEGER, 0),
            COALESCE((elem->>'is_active')::BOOLEAN, true),
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'categories') AS elem;
        GET DIAGNOSTICS v_cat_count = ROW_COUNT;
    END IF;

    -- 4.2 accounts
    IF v_data ? 'accounts' AND jsonb_array_length(v_data->'accounts') > 0 THEN
        INSERT INTO public.accounts (
            id, user_id, name, account_type, currency, opening_balance, is_active, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'name',
            COALESCE(elem->>'account_type', 'bank'),
            COALESCE(elem->>'currency', 'TWD'),
            COALESCE((elem->>'opening_balance')::NUMERIC, 0),
            COALESCE((elem->>'is_active')::BOOLEAN, true),
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'accounts') AS elem;
        GET DIAGNOSTICS v_acc_count = ROW_COUNT;
    END IF;

    -- 4.3 members
    IF v_data ? 'members' AND jsonb_array_length(v_data->'members') > 0 THEN
        INSERT INTO public.members (
            id, user_id, name, is_active, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'name',
            COALESCE((elem->>'is_active')::BOOLEAN, true),
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'members') AS elem;
        GET DIAGNOSTICS v_mem_count = ROW_COUNT;
    END IF;

    -- 4.4 exchange_rates
    IF v_data ? 'exchange_rates' AND jsonb_array_length(v_data->'exchange_rates') > 0 THEN
        INSERT INTO public.exchange_rates (
            id, user_id, from_currency, to_currency, rate, effective_date, note, created_at, updated_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'from_currency',
            COALESCE(elem->>'to_currency', 'TWD'),
            (elem->>'rate')::NUMERIC,
            (elem->>'effective_date')::DATE,
            elem->>'note',
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now())),
            COALESCE((elem->>'updated_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'exchange_rates') AS elem;
        GET DIAGNOSTICS v_rate_count = ROW_COUNT;
    END IF;

    -- 4.5 import_batches
    IF v_data ? 'import_batches' AND jsonb_array_length(v_data->'import_batches') > 0 THEN
        INSERT INTO public.import_batches (
            id, user_id, file_name, file_hash, total_rows, imported_rows, duplicate_rows, error_rows, status, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'file_name',
            elem->>'file_hash',
            COALESCE((elem->>'total_rows')::INTEGER, 0),
            COALESCE((elem->>'imported_rows')::INTEGER, 0),
            COALESCE((elem->>'duplicate_rows')::INTEGER, 0),
            COALESCE((elem->>'error_rows')::INTEGER, 0),
            COALESCE(elem->>'status', 'completed'),
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'import_batches') AS elem;
        GET DIAGNOSTICS v_batch_count = ROW_COUNT;
    END IF;

    -- 4.6 transactions (包含 transfer_direction 與 NULL 舊轉帳保留)
    IF v_data ? 'transactions' AND jsonb_array_length(v_data->'transactions') > 0 THEN
        INSERT INTO public.transactions (
            id, user_id, transaction_date, type, category_id, amount, currency,
            exchange_rate, base_amount, account_id, member_id, note,
            transfer_group_id, transfer_direction, created_at, updated_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            (elem->>'transaction_date')::DATE,
            elem->>'type',
            CASE WHEN elem->>'category_id' IS NOT NULL AND elem->>'category_id' != '' THEN (elem->>'category_id')::UUID ELSE NULL END,
            (elem->>'amount')::NUMERIC,
            COALESCE(elem->>'currency', 'TWD'),
            COALESCE((elem->>'exchange_rate')::NUMERIC, 1.0),
            (elem->>'base_amount')::NUMERIC,
            (elem->>'account_id')::UUID,
            CASE WHEN elem->>'member_id' IS NOT NULL AND elem->>'member_id' != '' THEN (elem->>'member_id')::UUID ELSE NULL END,
            elem->>'note',
            CASE WHEN elem->>'transfer_group_id' IS NOT NULL AND elem->>'transfer_group_id' != '' THEN (elem->>'transfer_group_id')::UUID ELSE NULL END,
            CASE WHEN elem->>'transfer_direction' IN ('out', 'in') THEN elem->>'transfer_direction' ELSE NULL END,
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now())),
            COALESCE((elem->>'updated_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'transactions') AS elem;
        GET DIAGNOSTICS v_tx_count = ROW_COUNT;
    END IF;

    -- 4.7 import_row_sources
    IF v_data ? 'import_row_sources' AND jsonb_array_length(v_data->'import_row_sources') > 0 THEN
        INSERT INTO public.import_row_sources (
            id, user_id, transaction_id, import_batch_id, source_uuid, source_fingerprint, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            (elem->>'transaction_id')::UUID,
            (elem->>'import_batch_id')::UUID,
            elem->>'source_uuid',
            elem->>'source_fingerprint',
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'import_row_sources') AS elem;
        GET DIAGNOSTICS v_src_count = ROW_COUNT;
    END IF;

    -- 5. 回傳還原成果統計
    RETURN jsonb_build_object(
        'success', true,
        'mode', 'full',
        'user_id', v_user_id,
        'restored_counts', jsonb_build_object(
            'categories', v_cat_count,
            'accounts', v_acc_count,
            'members', v_mem_count,
            'exchange_rates', v_rate_count,
            'import_batches', v_batch_count,
            'transactions', v_tx_count,
            'import_row_sources', v_src_count
        )
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. FUNCTION: public.restore_finance_merge(p_backup JSONB)
-- Atomic merge restore using ON CONFLICT DO NOTHING for all PKs and composite keys.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_finance_merge(p_backup JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_data JSONB;
    v_cat_count INTEGER := 0;
    v_acc_count INTEGER := 0;
    v_mem_count INTEGER := 0;
    v_rate_count INTEGER := 0;
    v_batch_count INTEGER := 0;
    v_tx_count INTEGER := 0;
    v_src_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '未登入或無權限執行合併還原 (auth.uid() is null)';
    END IF;

    IF p_backup IS NULL OR NOT (p_backup ? 'data') THEN
        RAISE EXCEPTION '備份檔案缺少 [data] 主體物件，還原終止';
    END IF;

    v_data := p_backup->'data';

    -- 1. categories (ON CONFLICT id DO NOTHING)
    IF v_data ? 'categories' AND jsonb_array_length(v_data->'categories') > 0 THEN
        INSERT INTO public.categories (
            id, user_id, name, type, color, sort_order, is_active, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'name',
            elem->>'type',
            COALESCE(elem->>'color', '#64748b'),
            COALESCE((elem->>'sort_order')::INTEGER, 0),
            COALESCE((elem->>'is_active')::BOOLEAN, true),
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'categories') AS elem
        ON CONFLICT (id) DO NOTHING;
        GET DIAGNOSTICS v_cat_count = ROW_COUNT;
    END IF;

    -- 2. accounts (ON CONFLICT id DO NOTHING)
    IF v_data ? 'accounts' AND jsonb_array_length(v_data->'accounts') > 0 THEN
        INSERT INTO public.accounts (
            id, user_id, name, account_type, currency, opening_balance, is_active, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'name',
            COALESCE(elem->>'account_type', 'bank'),
            COALESCE(elem->>'currency', 'TWD'),
            COALESCE((elem->>'opening_balance')::NUMERIC, 0),
            COALESCE((elem->>'is_active')::BOOLEAN, true),
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'accounts') AS elem
        ON CONFLICT (id) DO NOTHING;
        GET DIAGNOSTICS v_acc_count = ROW_COUNT;
    END IF;

    -- 3. members (ON CONFLICT id DO NOTHING)
    IF v_data ? 'members' AND jsonb_array_length(v_data->'members') > 0 THEN
        INSERT INTO public.members (
            id, user_id, name, is_active, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'name',
            COALESCE((elem->>'is_active')::BOOLEAN, true),
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'members') AS elem
        ON CONFLICT (id) DO NOTHING;
        GET DIAGNOSTICS v_mem_count = ROW_COUNT;
    END IF;

    -- 4. exchange_rates (ON CONFLICT id DO NOTHING)
    IF v_data ? 'exchange_rates' AND jsonb_array_length(v_data->'exchange_rates') > 0 THEN
        INSERT INTO public.exchange_rates (
            id, user_id, from_currency, to_currency, rate, effective_date, note, created_at, updated_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'from_currency',
            COALESCE(elem->>'to_currency', 'TWD'),
            (elem->>'rate')::NUMERIC,
            (elem->>'effective_date')::DATE,
            elem->>'note',
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now())),
            COALESCE((elem->>'updated_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'exchange_rates') AS elem
        ON CONFLICT (id) DO NOTHING;
        GET DIAGNOSTICS v_rate_count = ROW_COUNT;
    END IF;

    -- 5. import_batches (ON CONFLICT id DO NOTHING)
    IF v_data ? 'import_batches' AND jsonb_array_length(v_data->'import_batches') > 0 THEN
        INSERT INTO public.import_batches (
            id, user_id, file_name, file_hash, total_rows, imported_rows, duplicate_rows, error_rows, status, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            elem->>'file_name',
            elem->>'file_hash',
            COALESCE((elem->>'total_rows')::INTEGER, 0),
            COALESCE((elem->>'imported_rows')::INTEGER, 0),
            COALESCE((elem->>'duplicate_rows')::INTEGER, 0),
            COALESCE((elem->>'error_rows')::INTEGER, 0),
            COALESCE(elem->>'status', 'completed'),
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'import_batches') AS elem
        ON CONFLICT (id) DO NOTHING;
        GET DIAGNOSTICS v_batch_count = ROW_COUNT;
    END IF;

    -- 6. transactions (ON CONFLICT id DO NOTHING: 既有交易絕不覆蓋，新 UUID 交易保留)
    IF v_data ? 'transactions' AND jsonb_array_length(v_data->'transactions') > 0 THEN
        INSERT INTO public.transactions (
            id, user_id, transaction_date, type, category_id, amount, currency,
            exchange_rate, base_amount, account_id, member_id, note,
            transfer_group_id, transfer_direction, created_at, updated_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            (elem->>'transaction_date')::DATE,
            elem->>'type',
            CASE WHEN elem->>'category_id' IS NOT NULL AND elem->>'category_id' != '' THEN (elem->>'category_id')::UUID ELSE NULL END,
            (elem->>'amount')::NUMERIC,
            COALESCE(elem->>'currency', 'TWD'),
            COALESCE((elem->>'exchange_rate')::NUMERIC, 1.0),
            (elem->>'base_amount')::NUMERIC,
            (elem->>'account_id')::UUID,
            CASE WHEN elem->>'member_id' IS NOT NULL AND elem->>'member_id' != '' THEN (elem->>'member_id')::UUID ELSE NULL END,
            elem->>'note',
            CASE WHEN elem->>'transfer_group_id' IS NOT NULL AND elem->>'transfer_group_id' != '' THEN (elem->>'transfer_group_id')::UUID ELSE NULL END,
            CASE WHEN elem->>'transfer_direction' IN ('out', 'in') THEN elem->>'transfer_direction' ELSE NULL END,
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now())),
            COALESCE((elem->>'updated_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'transactions') AS elem
        ON CONFLICT (id) DO NOTHING;
        GET DIAGNOSTICS v_tx_count = ROW_COUNT;
    END IF;

    -- 7. import_row_sources:
    -- 同時解決主鍵 id 衝突與 (user_id, source_uuid) 複合唯一鍵衝突：
    -- 僅當該 source_uuid 尚未存在於該使用者的資料庫時，且 id 也不衝突時才插入
    IF v_data ? 'import_row_sources' AND jsonb_array_length(v_data->'import_row_sources') > 0 THEN
        INSERT INTO public.import_row_sources (
            id, user_id, transaction_id, import_batch_id, source_uuid, source_fingerprint, created_at
        )
        SELECT
            (elem->>'id')::UUID,
            v_user_id,
            (elem->>'transaction_id')::UUID,
            (elem->>'import_batch_id')::UUID,
            elem->>'source_uuid',
            elem->>'source_fingerprint',
            COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now()))
        FROM jsonb_array_elements(v_data->'import_row_sources') AS elem
        WHERE NOT EXISTS (
            -- 排除已存在的 source_uuid（若 source_uuid 非空）
            SELECT 1 FROM public.import_row_sources existing
            WHERE existing.user_id = v_user_id
              AND elem->>'source_uuid' IS NOT NULL
              AND existing.source_uuid = elem->>'source_uuid'
        )
        ON CONFLICT (id) DO NOTHING;
        GET DIAGNOSTICS v_src_count = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mode', 'merge',
        'user_id', v_user_id,
        'restored_counts', jsonb_build_object(
            'categories', v_cat_count,
            'accounts', v_acc_count,
            'members', v_mem_count,
            'exchange_rates', v_rate_count,
            'import_batches', v_batch_count,
            'transactions', v_tx_count,
            'import_row_sources', v_src_count
        )
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. 安全權限設定 (Explicit Security Grant)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.restore_finance_full(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_finance_merge(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.restore_finance_full(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_finance_merge(JSONB) TO authenticated;
