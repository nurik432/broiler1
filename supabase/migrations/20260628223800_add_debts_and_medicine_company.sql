-- ============================================================
-- Migration: Add debts system + company field for medicines
-- ============================================================

-- 1. Create debts table
CREATE TABLE IF NOT EXISTS public.debts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    amount numeric NOT NULL CHECK (amount > 0),
    description text,
    debt_date date NOT NULL DEFAULT CURRENT_DATE,
    is_settled boolean DEFAULT false,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.debts OWNER TO postgres;

-- 2. Create debt_payments table (partial payments)
CREATE TABLE IF NOT EXISTS public.debt_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
    amount numeric NOT NULL CHECK (amount > 0),
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.debt_payments OWNER TO postgres;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_debts_person_id ON public.debts(person_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);

-- 4. Enable RLS
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for debts
CREATE POLICY "user_can_manage_own_debts" ON public.debts
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. RLS policies for debt_payments
CREATE POLICY "user_can_manage_own_debt_payments" ON public.debt_payments
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Grant permissions
GRANT ALL ON TABLE public.debts TO anon;
GRANT ALL ON TABLE public.debts TO authenticated;
GRANT ALL ON TABLE public.debts TO service_role;

GRANT ALL ON TABLE public.debt_payments TO anon;
GRANT ALL ON TABLE public.debt_payments TO authenticated;
GRANT ALL ON TABLE public.debt_payments TO service_role;

-- 8. Add company column to medicine_transactions
ALTER TABLE public.medicine_transactions ADD COLUMN IF NOT EXISTS company text;
