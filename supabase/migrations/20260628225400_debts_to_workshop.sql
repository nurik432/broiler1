-- ============================================================
-- Migration: Change debts from employee-based to workshop/farm debts
-- ============================================================

-- 1. Drop the old foreign key and person_id dependency
ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_person_id_fkey;

-- 2. Add creditor_name column
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS creditor_name text;

-- 3. Copy person names to creditor_name (if any existing data)
UPDATE public.debts d
SET creditor_name = p.full_name
FROM public.persons p
WHERE d.person_id = p.id
  AND d.creditor_name IS NULL;

-- 4. Drop person_id column
ALTER TABLE public.debts DROP COLUMN IF EXISTS person_id;

-- 5. Drop the old index
DROP INDEX IF EXISTS idx_debts_person_id;
