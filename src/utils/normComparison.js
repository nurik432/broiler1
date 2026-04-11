import {
  getNormForDay,
  getWeekMortalityNorm,
  DEVIATION_THRESHOLDS,
} from '../constants/broilerStandards';

/**
 * Сравнить фактическое значение с нормой ROSS-308
 * @param {number} day   - день выращивания (age из Supabase)
 * @param {'weight'|'dailyFeed'|'temp'|'humidity'} field
 * @param {number|string} value - фактическое значение из поля формы
 * @returns {{ normLabel, deviation, percent, status: 'ok'|'warning'|'critical' } | null}
 */
export function compareWithNorm(day, field, value) {
  if (value === '' || value === null || value === undefined) return null;
  const norm = getNormForDay(day);
  if (!norm) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;

  // Диапазонные поля (температура, влажность)
  if (field === 'temp') {
    const ok   = num >= norm.tempMin && num <= norm.tempMax;
    const warn = num >= norm.tempMin - 2 && num <= norm.tempMax + 2;
    return {
      normLabel: `${norm.tempMin}–${norm.tempMax}°C`,
      deviation: null,
      percent: null,
      status: ok ? 'ok' : warn ? 'warning' : 'critical',
    };
  }
  if (field === 'humidity') {
    const ok   = num >= norm.humidMin && num <= norm.humidMax;
    const warn = num >= norm.humidMin - 5 && num <= norm.humidMax + 5;
    return {
      normLabel: `${norm.humidMin}–${norm.humidMax}%`,
      deviation: null,
      percent: null,
      status: ok ? 'ok' : warn ? 'warning' : 'critical',
    };
  }

  // Числовые поля (weight, dailyFeed)
  const normValue = norm[field];
  if (!normValue) return null;
  const deviation = Math.round(num - normValue);
  const percent   = Math.round(Math.abs(deviation / normValue) * 100);
  const status    = percent <= DEVIATION_THRESHOLDS.ok      ? 'ok'
                  : percent <= DEVIATION_THRESHOLDS.warning ? 'warning'
                  : 'critical';
  return { normLabel: String(normValue), deviation, percent, status };
}

/**
 * Рассчитать накопительный падёж и сверить с нормой ROSS-308
 * @param {Array<{age: number, mortality: number}>} logs - все записи журнала партии
 * @param {number} initialBirds - начальное поголовье
 * @returns {{ totalDead, factPercent, normPercent, status, currentWeek } | null}
 */
export function calcMortality(logs, initialBirds) {
  if (!logs?.length || !initialBirds) return null;
  const totalDead    = logs.reduce((sum, r) => sum + (r.mortality || 0), 0);
  const lastAge      = Math.max(...logs.map(r => r.age));
  const currentWeek  = Math.ceil(lastAge / 7);
  const factPercent  = (totalDead / initialBirds) * 100;
  const normPercent  = getWeekMortalityNorm(currentWeek);
  const status       = factPercent <= normPercent       ? 'ok'
                     : factPercent <= normPercent * 1.3 ? 'warning'
                     : 'critical';
  return {
    totalDead,
    factPercent: factPercent.toFixed(2),
    normPercent: normPercent.toFixed(1),
    status,
    currentWeek,
  };
}

/**
 * Прогноз живой массы к целевому дню убоя
 * @param {Array<{age: number, weight: number}>} logs
 * @param {number} targetDay - целевой день убоя (обычно 42)
 * @returns {{ forecastWeight, dailyGain } | null}
 */
export function forecastWeight(logs, targetDay = 42) {
  const withWeight = logs
    .filter(r => r.weight != null && r.weight > 0)
    .sort((a, b) => a.age - b.age);
  if (withWeight.length < 2) return null;

  const recent = withWeight.slice(-5); // последние 5 записей с массой
  const first  = recent[0];
  const last   = recent[recent.length - 1];
  const dailyGain = (last.weight - first.weight) / (last.age - first.age);
  const daysLeft  = targetDay - last.age;
  const forecastWeight = Math.round(last.weight + dailyGain * daysLeft);
  return { forecastWeight, dailyGain: Math.round(dailyGain) };
}
