-- ==============================================================================
-- Migration: 20261107030000_fix_import_source_uuid_null_uniqueness.sql
-- Description: Phase 6B.2 - Database Constraint & RPC Permission Final Fix
-- 1. Safely removes UNIQUE NULLS NOT DISTINCT constraint on (user_id, source_uuid).
-- 2. Creates partial UNIQUE INDEX on (user_id, source_uuid) WHERE source_uuid IS NOT NULL.
--    Allows multiple source_uuid IS NULL per user, prevents duplicate non-NULL UUIDs.
-- 3. Updates public.restore_finance_merge with robust in-batch dedup, multi-NULL support,
--    FK existence check against transactions, and ON CONFLICT (id) DO NOTHING.
-- 4. Updates public.import_csv_batch permissions (REVOKE PUBLIC/anon, GRANT authenticated)
--    and sets secure search_path = public, pg_temp.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. 資料安全檢驗：檢查既有資料庫是否存在非 NULL 的重複 (user_id, source_uuid)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_dup_count
    FROM (
        SELECT user_id, source_uuid
        FROM public.import_row_sources
        WHERE source_uuid IS NOT NULL
        GROUP BY user_id, source_uuid
        HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_count > 0 THEN
        RAISE EXCEPTION '資料庫中已存在 % 組重複的非 NULL (user_id, source_uuid)，Migration 強制終止以保護歷史資料！請先人工排查後重試。', v_dup_count;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. 移除舊 UNIQUE CONSTRAINT 並建立條件式唯一索引 (Partial Unique Index)
-- ------------------------------------------------------------------------------
-- 安全移除歷史 Migration 建立的 uq_import_sources_user_uuid
ALTER TABLE public.import_row_sources 
DROP CONSTRAINT IF EXISTS uq_import_sources_user_uuid;

DROP INDEX IF EXISTS public.uq_import_sources_user_uuid;

-- 建立只針對非 NULL source_uuid 的條件式唯一索引
CREATE UNIQUE INDEX uq_import_sources_user_uuid
ON public.import_row_sources (user_id, source_uuid)
WHERE source_uuid IS NOT NULL;

COMMENT ON INDEX public.uq_import_sources_user_uuid IS 
'Phase 6B.2: 條件式唯一索引。確保同一 user_id 下非 NULL source_uuid 唯一；同時允許多筆 source_uuid IS NULL 正常共存。';

-- ------------------------------------------------------------------------------
-- 3. 升級 public.restore_finance_merge 預存程序
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

    -- 1. categories (ON CONFLICT (id) DO NOTHING)
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

    -- 2. accounts (ON CONFLICT (id) DO NOTHING)
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

    -- 3. members (ON CONFLICT (id) DO NOTHING)
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

    -- 4. exchange_rates (ON CONFLICT (id) DO NOTHING)
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

    -- 5. import_batches (ON CONFLICT (id) DO NOTHING)
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

    -- 6. transactions (ON CONFLICT (id) DO NOTHING: 既有交易絕不覆蓋，保留新交易)
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
    -- 安全處理主鍵 id 衝突與 (user_id, source_uuid) 條件唯一性：
    -- a. 同一批次 JSON 內若有重複的非 NULL source_uuid，以 ROW_NUMBER 去重保留首筆
    -- b. source_uuid IS NULL 的項目不得去重，全部保留
    -- c. 排除已存在於資料庫的非 NULL source_uuid (user_id = v_user_id)
    -- d. 排除已存在於資料庫的主鍵 id (ON CONFLICT (id) DO NOTHING)
    -- e. 確保關聯交易確實存在 (防範孤兒來源紀錄)
    IF v_data ? 'import_row_sources' AND jsonb_array_length(v_data->'import_row_sources') > 0 THEN
        WITH raw_elements AS (
            SELECT
                (elem->>'id')::UUID AS id,
                v_user_id AS user_id,
                (elem->>'transaction_id')::UUID AS transaction_id,
                (elem->>'import_batch_id')::UUID AS import_batch_id,
                NULLIF(trim(elem->>'source_uuid'), '') AS source_uuid,
                COALESCE(elem->>'source_fingerprint', '') AS source_fingerprint,
                COALESCE((elem->>'created_at')::TIMESTAMPTZ, timezone('utc'::text, now())) AS created_at,
                row_number() OVER () AS ordinality
            FROM jsonb_array_elements(v_data->'import_row_sources') AS elem
        ),
        deduped_batch AS (
            SELECT *,
                ROW_NUMBER() OVER (
                    PARTITION BY (CASE WHEN source_uuid IS NOT NULL THEN source_uuid ELSE id::TEXT END)
                    ORDER BY ordinality ASC
                ) AS rn
            FROM raw_elements
        )
        INSERT INTO public.import_row_sources (
            id, user_id, transaction_id, import_batch_id, source_uuid, source_fingerprint, created_at
        )
        SELECT
            d.id,
            d.user_id,
            d.transaction_id,
            d.import_batch_id,
            d.source_uuid,
            d.source_fingerprint,
            d.created_at
        FROM deduped_batch d
        WHERE d.rn = 1
          -- 確保對應的 transaction 存在於資料庫中，防範孤兒紀錄
          AND EXISTS (
              SELECT 1 FROM public.transactions t WHERE t.id = d.transaction_id AND t.user_id = v_user_id
          )
          -- 排除資料庫中既有之非 NULL source_uuid (NULL 則絕不排除，全數允許)
          AND (
              d.source_uuid IS NULL OR NOT EXISTS (
                  SELECT 1 FROM public.import_row_sources existing
                  WHERE existing.user_id = v_user_id
                    AND existing.source_uuid = d.source_uuid
              )
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
-- 4. 升級 public.import_csv_batch (安全權限宣告與 search_path 設定)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_csv_batch(
    p_batch_id UUID,
    p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_row JSONB;
    v_imported_count INTEGER := 0;
    v_duplicate_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_source_uuid TEXT;
    v_fingerprint TEXT;
    v_new_tx_id UUID;
    v_is_duplicate BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '未經身分認證的操作 (auth.uid() IS NULL)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.import_batches 
        WHERE id = p_batch_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION '匯入批次不存在或無權限操作: %', p_batch_id;
    END IF;

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_source_uuid := NULLIF(trim(v_row->>'source_uuid'), '');
        v_fingerprint := v_row->>'source_fingerprint';
        v_is_duplicate := FALSE;

        -- 步驟 A: UUID 優先去重檢查 (僅對非 NULL 執行比對)
        IF v_source_uuid IS NOT NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.import_row_sources 
                WHERE user_id = v_user_id AND source_uuid = v_source_uuid
            ) THEN
                v_is_duplicate := TRUE;
            END IF;
        ELSE
            -- 步驟 B: 無 UUID 時依指紋去重檢查
            IF v_fingerprint IS NOT NULL AND v_fingerprint != '' AND EXISTS (
                SELECT 1 FROM public.import_row_sources 
                WHERE user_id = v_user_id AND source_fingerprint = v_fingerprint
            ) THEN
                v_is_duplicate := TRUE;
            END IF;
        END IF;

        IF v_is_duplicate THEN
            v_duplicate_count := v_duplicate_count + 1;
            CONTINUE;
        END IF;

        -- 步驟 C: 寫入 transactions 核心資料表
        INSERT INTO public.transactions (
            user_id,
            transaction_date,
            type,
            category_id,
            amount,
            currency,
            exchange_rate,
            base_amount,
            account_id,
            member_id,
            note,
            transfer_group_id,
            transfer_direction
        ) VALUES (
            v_user_id,
            (v_row->>'transaction_date')::DATE,
            v_row->>'type',
            NULLIF(v_row->>'category_id', '')::UUID,
            (v_row->>'amount')::NUMERIC(15, 4),
            COALESCE(v_row->>'currency', 'TWD'),
            COALESCE((v_row->>'exchange_rate')::NUMERIC(15, 6), 1.000000),
            COALESCE((v_row->>'base_amount')::NUMERIC(15, 4), (v_row->>'amount')::NUMERIC(15, 4)),
            (v_row->>'account_id')::UUID,
            NULLIF(v_row->>'member_id', '')::UUID,
            v_row->>'note',
            NULLIF(v_row->>'transfer_group_id', '')::UUID,
            v_row->>'transfer_direction'
        )
        RETURNING id INTO v_new_tx_id;

        -- 步驟 D: 寫入 import_row_sources (條件式索引允許多筆 NULL source_uuid)
        INSERT INTO public.import_row_sources (
            user_id,
            transaction_id,
            import_batch_id,
            source_uuid,
            source_fingerprint
        ) VALUES (
            v_user_id,
            v_new_tx_id,
            p_batch_id,
            v_source_uuid,
            COALESCE(v_fingerprint, '')
        );

        v_imported_count := v_imported_count + 1;
    END LOOP;

    UPDATE public.import_batches
    SET imported_rows = imported_rows + v_imported_count,
        duplicate_rows = duplicate_rows + v_duplicate_count,
        status = 'completed'
    WHERE id = p_batch_id AND user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'imported_count', v_imported_count,
        'duplicate_count', v_duplicate_count,
        'error_count', v_error_count
    );

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'import_csv_batch 執行失敗，整批 Rollback: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'imported_count', 0,
        'duplicate_count', 0,
        'error_count', jsonb_array_length(p_rows),
        'error_message', SQLERRM
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. 顯式安全權限配置 (REVOKE PUBLIC / anon, GRANT authenticated)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.restore_finance_merge(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_finance_merge(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_finance_merge(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.import_csv_batch(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_csv_batch(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_csv_batch(UUID, JSONB) TO authenticated;
