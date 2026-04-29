/**
 * Единая функция расчёта зарплаты сотрудника за партию.
 *
 * @param {Object} employee
 * @param {string} employee.start_date       — дата начала работы
 * @param {string|null} employee.end_date    — дата увольнения (dismissal)
 * @param {number} employee.absent_days      — дней отсутствия
 * @param {number} employee.first_days_n     — кол-во первых дней по начальной ставке
 * @param {number} employee.fixed_sum        — дневная ставка за первые N дней
 * @param {number} employee.rate             — дневная ставка после первых N дней
 *
 * @param {Object} batch
 * @param {string|null} batch.batch_end      — дата окончания партии (если null — сегодня)
 *
 * @returns {{ salary: number, totalDays: number, effectiveDays: number }}
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
        return { salary: 0, totalDays, effectiveDays };
    }

    const rate = Number(employee.rate) || 0;
    const fixedSum = Number(employee.fixed_sum) || 0;
    const firstDaysN = Math.max(Number(employee.first_days_n) || 0, 0);

    // 5. Если first_days_n <= 0 — только ставка за день
    if (firstDaysN <= 0) {
        return { salary: effectiveDays * rate, totalDays, effectiveDays };
    }

    // 6. Основной расчёт
    //    fixed_sum — дневная ставка за первые N дней
    //    rate      — дневная ставка за остальные дни
    //    Пример: 40 дн, первые 15 по 100, остальные по 120 → 15×100 + 25×120 = 4500
    let salary;
    if (effectiveDays <= firstDaysN) {
        // Ещё в пределах первых N дней
        salary = fixedSum * effectiveDays;
    } else {
        // Первые N дней по fixedSum + остаток по rate
        salary = fixedSum * firstDaysN + (effectiveDays - firstDaysN) * rate;
    }

    return { salary: Math.round(salary * 100) / 100, totalDays, effectiveDays };
}
