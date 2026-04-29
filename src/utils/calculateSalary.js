/**
 * Единая функция расчёта зарплаты сотрудника за партию.
 * Поддерживает произвольное количество ступеней (tiers).
 *
 * @param {Object} employee
 * @param {string} employee.start_date       — дата начала работы
 * @param {string|null} employee.end_date    — дата увольнения
 * @param {number} employee.absent_days      — дней отсутствия
 * @param {number} employee.rate             — основная дневная ставка (после всех ступеней)
 * @param {Array}  employee.salary_tiers     — ступени: [{days: 15, rate: 100}, {days: 6, rate: 80}]
 *
 * Обратная совместимость: если salary_tiers пуст, используются first_days_n + fixed_sum.
 *
 * @param {Object} batch
 * @param {string|null} batch.batch_end      — дата окончания партии (если null — сегодня)
 *
 * @returns {{ salary: number, totalDays: number, effectiveDays: number, breakdown: Array }}
 */
export function calculateSalary(employee, batch) {
    // 1. Определяем конечную дату
    const batchEnd = batch?.batch_end ? new Date(batch.batch_end) : new Date();
    const dismissal = employee.end_date ? new Date(employee.end_date) : null;
    const actualEnd = dismissal
        ? new Date(Math.min(dismissal.getTime(), batchEnd.getTime()))
        : batchEnd;

    // 2. Считаем календарные дни
    const startDate = new Date(employee.start_date);
    const totalDays = Math.max(
        Math.floor((actualEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        0
    );

    // 3. Вычитаем отсутствия
    const absentDays = Math.max(Number(employee.absent_days) || 0, 0);
    const effectiveDays = Math.max(totalDays - absentDays, 0);

    // 4. Edge case: нет рабочих дней
    if (effectiveDays === 0) {
        return { salary: 0, totalDays, effectiveDays, breakdown: [] };
    }

    const mainRate = Number(employee.rate) || 0;

    // 5. Собираем ступени (tiers)
    let tiers = [];

    // Поддержка нового формата salary_tiers
    const rawTiers = employee.salary_tiers;
    if (Array.isArray(rawTiers) && rawTiers.length > 0) {
        tiers = rawTiers
            .filter(t => Number(t.days) > 0)
            .map(t => ({ days: Number(t.days), rate: Number(t.rate) || 0 }));
    }
    // Обратная совместимость: если тиеров нет, но есть first_days_n + fixed_sum
    else {
        const firstDaysN = Math.max(Number(employee.first_days_n) || 0, 0);
        const fixedSum = Number(employee.fixed_sum) || 0;
        if (firstDaysN > 0) {
            tiers = [{ days: firstDaysN, rate: fixedSum }];
        }
    }

    // 6. Расчёт по ступеням
    let remaining = effectiveDays;
    let salary = 0;
    const breakdown = [];

    for (let i = 0; i < tiers.length && remaining > 0; i++) {
        const tier = tiers[i];
        const daysInTier = Math.min(remaining, tier.days);
        const tierSum = daysInTier * tier.rate;
        salary += tierSum;
        breakdown.push({
            label: `Период ${i + 1}: ${tier.days} дн. по ${tier.rate}`,
            days: daysInTier,
            rate: tier.rate,
            sum: tierSum
        });
        remaining -= daysInTier;
    }

    // 7. Остаток по основной ставке
    if (remaining > 0) {
        const restSum = remaining * mainRate;
        salary += restSum;
        breakdown.push({
            label: `Основная ставка`,
            days: remaining,
            rate: mainRate,
            sum: restSum
        });
    }

    return {
        salary: Math.round(salary * 100) / 100,
        totalDays,
        effectiveDays,
        breakdown
    };
}
