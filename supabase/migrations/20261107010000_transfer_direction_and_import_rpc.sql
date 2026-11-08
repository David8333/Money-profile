-- ============================================================================
-- Migration: 20261107010000_transfer_direction_and_import_rpc.sql
-- Description: Phase 6A 財務資料一致性修復
-- Rationale:
-- 1. 新增 transfer_direction 欄位 ('out', 'in')，廢除透過 note 備註字串猜測轉出轉入方向之脆弱設計。
--    向下相容性：允許 NULL（一般收入支出交易為 NULL，歷史轉帳若未標記則維持 NULL，不破壞舊有資料）。
-- 2. 建立原子性批次匯入函式 import_csv_batch，確保 transactions 與 import_row_sources 
--    在單一資料庫交易內完成；任一非預期錯誤自動觸發 ROLLBACK，杜絕孤兒交易與重複資料。
-- ============================================================================

-- 1. 新增 transfer_direction 欄位
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS transfer_direction VARCHAR(10) CHECK (transfer_direction IN ('out', 'in'));

COMMENT ON COLUMN public.transactions.transfer_direction IS '轉帳方向：out (轉出扣款), in (轉入入帳)，一般收支此欄位為 NULL';

-- 建立轉帳方向索引
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_dir 
ON public.transactions(transfer_group_id, transfer_direction) 
WHERE transfer_group_id IS NOT NULL;

-- 2. 建立原子性 CSV 批次匯入 RPC 函式
CREATE OR REPLACE FUNCTION public.import_csv_batch(
    p_batch_id UUID,
    p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
    -- 取得目前認證使用者 ID，嚴格隔離資料權限
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '未經身分認證的操作 (auth.uid() IS NULL)';
    END IF;

    -- 確認該 batch_id 屬於該使用者
    IF NOT EXISTS (
        SELECT 1 FROM public.import_batches 
        WHERE id = p_batch_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION '匯入批次不存在或無權限操作: %', p_batch_id;
    END IF;

    -- 迭代批次陣列中的每一筆資料
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_source_uuid := NULLIF(trim(v_row->>'source_uuid'), '');
        v_fingerprint := v_row->>'source_fingerprint';
        v_is_duplicate := FALSE;

        -- 步驟 A: UUID 優先去重檢查
        IF v_source_uuid IS NOT NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.import_row_sources 
                WHERE user_id = v_user_id AND source_uuid = v_source_uuid
            ) THEN
                v_is_duplicate := TRUE;
            END IF;
        ELSE
            -- 步驟 B: 無 UUID 時依指紋去重檢查
            IF v_fingerprint IS NOT NULL AND EXISTS (
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

        -- 步驟 D: 立即寫入 import_row_sources 追蹤表 (同交易內保證原子性)
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

    -- 步驟 E: 同步更新 import_batches 匯入進度與計數
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
    -- 任一錯誤觸發時，PostgreSQL 函式自動整體 Rollback，不留下半套寫入
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

COMMENT ON FUNCTION public.import_csv_batch IS 'Phase 6A 原子性 CSV 批次寫入 RPC，杜絕孤兒交易與重複資料';
