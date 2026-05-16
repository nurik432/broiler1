-- =============================================
-- Скрипт для создания таблицы учёта лекарств
-- Выполнить в Supabase SQL Editor
-- =============================================

-- 1. Таблица транзакций по лекарствам
CREATE TABLE IF NOT EXISTS public.medicine_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    medicine_id uuid REFERENCES public.medicines(id) ON DELETE SET NULL,
    transaction_date date NOT NULL DEFAULT CURRENT_DATE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'debt', 'payment')),
    quantity numeric,
    unit text DEFAULT 'шт',
    price_per_unit numeric,
    amount numeric NOT NULL,
    description text,
    is_hidden boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 2. RLS (Row Level Security)
ALTER TABLE public.medicine_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own medicine_transactions"
    ON public.medicine_transactions FOR ALL
    USING (auth.uid() = user_id);

-- 3. Функция сводки по лекарствам
CREATE OR REPLACE FUNCTION get_medicine_summary()
RETURNS TABLE (
    total_purchased numeric,
    total_debt numeric,
    total_paid numeric,
    current_balance numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN mt.transaction_type = 'purchase' THEN mt.amount ELSE 0 END), 0) AS total_purchased,
        COALESCE(SUM(CASE WHEN mt.transaction_type = 'debt' THEN mt.amount ELSE 0 END), 0) AS total_debt,
        COALESCE(SUM(CASE WHEN mt.transaction_type = 'payment' THEN mt.amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN mt.transaction_type IN ('purchase', 'debt') THEN mt.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN mt.transaction_type = 'payment' THEN mt.amount ELSE 0 END), 0) AS current_balance
    FROM public.medicine_transactions mt
    WHERE mt.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
