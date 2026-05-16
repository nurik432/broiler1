-- =============================================
-- Обновление таблицы coal_transactions
-- Добавляем: тип "debt" (в долг), поле is_hidden
-- Выполнить в Supabase SQL Editor
-- =============================================

-- 1. Добавить поле is_hidden
ALTER TABLE public.coal_transactions
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- 2. Обновить ограничение на transaction_type (добавить 'debt')
-- Сначала удаляем старое ограничение, потом создаём новое
ALTER TABLE public.coal_transactions
DROP CONSTRAINT IF EXISTS coal_transactions_transaction_type_check;

ALTER TABLE public.coal_transactions
ADD CONSTRAINT coal_transactions_transaction_type_check
CHECK (transaction_type IN ('purchase', 'debt', 'payment'));

-- 3. Обновить функцию сводки — добавить учёт долга
DROP FUNCTION IF EXISTS get_coal_summary();
CREATE OR REPLACE FUNCTION get_coal_summary()
RETURNS TABLE (
    total_kg numeric,
    total_purchased numeric,
    total_debt numeric,
    total_paid numeric,
    current_balance numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN ct.transaction_type IN ('purchase', 'debt') THEN ct.quantity_kg ELSE 0 END), 0) AS total_kg,
        COALESCE(SUM(CASE WHEN ct.transaction_type = 'purchase' THEN ct.amount ELSE 0 END), 0) AS total_purchased,
        COALESCE(SUM(CASE WHEN ct.transaction_type = 'debt' THEN ct.amount ELSE 0 END), 0) AS total_debt,
        COALESCE(SUM(CASE WHEN ct.transaction_type = 'payment' THEN ct.amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN ct.transaction_type IN ('purchase', 'debt') THEN ct.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN ct.transaction_type = 'payment' THEN ct.amount ELSE 0 END), 0) AS current_balance
    FROM public.coal_transactions ct
    WHERE ct.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
