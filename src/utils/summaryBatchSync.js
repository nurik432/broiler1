import { supabase } from '../supabaseClient';

/**
 * Синхронизирует "Общую партию" за указанную дату.
 * Собирает данные со всех активных (не сводных) партий и пишет в сводную запись daily_logs.
 */
export async function syncSummaryBatchLog(logDate, userId) {
    try {
        // 1. Получаем все активные нормальные партии
        const { data: activeBatches, error: errBatches } = await supabase
            .from('broiler_batches')
            .select('id, initial_quantity, start_date')
            .eq('is_active', true)
            .or('is_summary.eq.false,is_summary.is.null'); // Исключаем саму сводную партию

        if (errBatches) throw errBatches;
        if (!activeBatches || activeBatches.length === 0) return;

        // Считаем общую начальную емкость и самую раннюю дату
        const totalInitial = activeBatches.reduce((sum, b) => sum + (b.initial_quantity || 0), 0);
        const earliestStart = activeBatches.reduce((min, b) => {
            if (!min) return b.start_date;
            return new Date(b.start_date) < new Date(min) ? b.start_date : min;
        }, null);

        // 2. Ищем или создаём сводную партию (is_summary = true)
        let { data: summaryBatch, error: sbSearchErr } = await supabase
            .from('broiler_batches')
            .select('id')
            .eq('is_active', true)
            .eq('is_summary', true)
            .maybeSingle();

        if (sbSearchErr) throw sbSearchErr;

        if (!summaryBatch) {
            const { data: newSummary, error: errInsert } = await supabase
                .from('broiler_batches')
                .insert([{
                    batch_name: '⭐ Общая партия (Сводка)',
                    initial_quantity: totalInitial,
                    start_date: earliestStart,
                    is_summary: true,
                    is_active: true,
                    user_id: userId
                }])
                .select()
                .single();
            if (errInsert) throw errInsert;
            summaryBatch = newSummary;
        } else {
            // Обновляем общую начальную емкость и дату старта если они изменились
            await supabase
                .from('broiler_batches')
                .update({ initial_quantity: totalInitial, start_date: earliestStart })
                .eq('id', summaryBatch.id);
        }

        // 3. Собираем логи за эту дату по всем нормальным партиям
        const activeBatchIds = activeBatches.map(b => b.id);
        const { data: logs, error: logsErr } = await supabase
            .from('daily_logs')
            .select('mortality, mortality_natural, mortality_halal, daily_feed, water_consumption, weight, age')
            .in('batch_id', activeBatchIds)
            .eq('log_date', logDate);

        if (logsErr) throw logsErr;

        let totalMort = 0;
        let totalMortNatural = 0;
        let totalMortHalal = 0;
        let totalFeed = 0;
        let totalWater = 0;
        let maxAge = 0;
        let totalWeight = 0;
        let weightCount = 0;

        if (logs) {
            logs.forEach(l => {
                totalMort += (l.mortality || 0);
                totalMortNatural += (l.mortality_natural || 0);
                totalMortHalal += (l.mortality_halal || 0);
                totalFeed += (l.daily_feed || 0);
                totalWater += (l.water_consumption || 0);
                if (l.age && l.age > maxAge) maxAge = l.age;
                if (l.weight) {
                    totalWeight += l.weight;
                    weightCount++;
                }
            });
        }

        const avgWeight = weightCount > 0 ? Math.round(totalWeight / weightCount) : null;
        
        // Если логов нет, но нужно вычислить возраст
        if (!maxAge && earliestStart) {
            maxAge = Math.ceil(Math.abs(new Date(logDate) - new Date(earliestStart)) / (1000 * 60 * 60 * 24)) || 1;
        }

        // 4. Обновляем или вставляем лог для сводной партии
        const { data: existingSummaryLog } = await supabase
            .from('daily_logs')
            .select('id')
            .eq('batch_id', summaryBatch.id)
            .eq('log_date', logDate)
            .maybeSingle();

        if (existingSummaryLog) {
            await supabase
                .from('daily_logs')
                .update({
                    mortality: totalMort,
                    mortality_natural: totalMortNatural,
                    mortality_halal: totalMortHalal,
                    daily_feed: totalFeed,
                    water_consumption: totalWater,
                    weight: avgWeight,
                    age: maxAge || 1,
                })
                .eq('id', existingSummaryLog.id);
        } else {
            await supabase
                .from('daily_logs')
                .insert([{
                    batch_id: summaryBatch.id,
                    log_date: logDate,
                    age: maxAge || 1,
                    mortality: totalMort,
                    mortality_natural: totalMortNatural,
                    mortality_halal: totalMortHalal,
                    daily_feed: totalFeed,
                    water_consumption: totalWater,
                    weight: avgWeight,
                    user_id: userId
                }]);
        }
    } catch (err) {
        console.error('Ошибка при синхронизации Общей партии:', err);
    }
}
