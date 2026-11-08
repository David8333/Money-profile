-- ============================================================================
-- Migration: 20261106020000_exchange_rates.sql
-- Description: Phase 5 匯率管理資料表 (Exchange Rates) 與歷史匯率追蹤
-- Rationale:
-- 1. 支援手動維護外幣對新台幣 (TWD) 匯率，記錄更新時間、生效日期與備註。
-- 2. 提供歷史匯率查詢能力，供記帳時依交易日期選取歷史對應匯率。
-- 3. 嚴格遵守安全性規範：每筆交易於 transactions 資料表建立時，已鎖定當時之 exchange_rate
--    與 base_amount。此資料表之任何更新絕不可觸發歷史交易 base_amount 之自動重算。
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_currency VARCHAR(3) NOT NULL REFERENCES public.currencies(code) ON UPDATE CASCADE,
    to_currency VARCHAR(3) NOT NULL DEFAULT 'TWD' REFERENCES public.currencies(code) ON UPDATE CASCADE,
    rate NUMERIC(15, 6) NOT NULL CHECK (rate > 0),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 索引優化：依使用者、幣別對與生效日期快速檢索最新或歷史匯率
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
ON public.exchange_rates(user_id, from_currency, to_currency, effective_date DESC);

-- 複合唯一鍵：同一使用者在同一生效日期同一幣別對僅保留一筆基準紀錄
CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_rates_date 
ON public.exchange_rates(user_id, from_currency, to_currency, effective_date);

-- 開啟 Row Level Security (RLS)
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS 政策：使用者僅能查看與管理自己的匯率設定
CREATE POLICY "Users can manage own exchange rates" 
ON public.exchange_rates
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.exchange_rates IS '使用者自訂與歷史匯率紀錄表 (Phase 5 多幣別管理)';
