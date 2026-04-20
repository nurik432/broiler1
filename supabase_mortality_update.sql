-- Выполните этот скрипт в SQL Editor Supabase

ALTER TABLE IF EXISTS public.daily_logs
ADD COLUMN IF NOT EXISTS mortality_natural integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS mortality_halal integer DEFAULT 0;

-- Обновить существующие записи исторически 
-- (если вы хотите чтобы весь старый падеж считался как естественный):
UPDATE public.daily_logs
SET mortality_natural = mortality
WHERE mortality IS NOT NULL AND mortality > 0;
