-- Поля для автоматического расчёта зарплаты сотрудника
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rate numeric DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fixed_sum numeric DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_days_n integer DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS absent_days integer DEFAULT 0;
-- Гибкие ступени: [{days: 15, rate: 100}, {days: 6, rate: 80}] + основная ставка (rate) на остаток
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_tiers jsonb DEFAULT '[]';

-- Дата окончания партии (для расчёта рабочих дней)
ALTER TABLE broiler_batches ADD COLUMN IF NOT EXISTS batch_end date;
