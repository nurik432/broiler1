-- ============================================================
-- Migration: Create persons table and link employees to persons
-- ============================================================

-- 1. Create the persons table
CREATE TABLE IF NOT EXISTS public.persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    full_name text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.persons OWNER TO postgres;

-- 2. Add person_id column to employees (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'employees' 
        AND column_name = 'person_id'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN person_id uuid;
    END IF;
END $$;

-- 3. Populate persons from existing employees (deduplicate by full_name + user_id)
INSERT INTO public.persons (full_name, user_id)
SELECT DISTINCT ON (LOWER(TRIM(full_name)), user_id) 
    TRIM(full_name), 
    user_id
FROM public.employees
WHERE TRIM(full_name) != ''
ON CONFLICT DO NOTHING;

-- 4. Link employees to their corresponding person
UPDATE public.employees e
SET person_id = p.id
FROM public.persons p
WHERE LOWER(TRIM(e.full_name)) = LOWER(TRIM(p.full_name))
  AND e.user_id = p.user_id
  AND e.person_id IS NULL;

-- 5. Add foreign key constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'employees_person_id_fkey' 
        AND table_name = 'employees'
    ) THEN
        ALTER TABLE public.employees 
            ADD CONSTRAINT employees_person_id_fkey 
            FOREIGN KEY (person_id) REFERENCES public.persons(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Create index on person_id
CREATE INDEX IF NOT EXISTS idx_employees_person_id ON public.employees(person_id);

-- 7. Enable RLS on persons
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for persons table
CREATE POLICY "user_can_manage_own_persons" ON public.persons
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 9. Grant permissions
GRANT ALL ON TABLE public.persons TO anon;
GRANT ALL ON TABLE public.persons TO authenticated;
GRANT ALL ON TABLE public.persons TO service_role;
