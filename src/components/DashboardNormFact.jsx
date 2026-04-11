import { getNormForDay } from '../constants/broilerStandards';
import { calcMortality, forecastWeight, calcHistoricalMortality } from '../utils/normComparison';
import { FEED_BAG_WEIGHT_G } from '../constants/broilerStandards';

const STATUS_COLOR = {
  ok:       '#28a745',
  warning:  '#ffc107',
  critical: '#dc3545',
};

function getStatus(fact, norm) {
  const ratio = Math.abs((fact - norm) / norm);
  if (ratio <= 0.05) return 'ok';
  if (ratio <= 0.15) return 'warning';
  return 'critical';
}

/**
 * Рассчитать текущее поголовье на момент последнего лога
 */
function calcFlockSize(logs, initialBirds) {
  return initialBirds - logs.reduce((sum, r) => sum + (r.mortality || 0), 0);
}

export default function DashboardNormFact({ logs, initialBirds, historicalBatches, historicalLogs }) {
  if (!logs?.length) return null;

  const sorted      = [...logs].sort((a, b) => b.age - a.age);
  const lastLog     = sorted[0];
  const lastAge     = lastLog.age;
  const norm        = getNormForDay(lastAge);
  const mortality   = calcMortality(logs, initialBirds);
  const forecast    = forecastWeight(logs, 42);
  const currentFlock = calcFlockSize(logs, initialBirds);

  // Потребление воды / корма на голову (последняя запись)
  const waterPerHead = lastLog.water_consumption && currentFlock > 0
    ? Math.round((lastLog.water_consumption * 1000) / currentFlock)
    : null;
  const feedPerHead = lastLog.daily_feed && currentFlock > 0
    ? Math.round((lastLog.daily_feed * FEED_BAG_WEIGHT_G) / currentFlock)
    : null;

  // Историческое сравнение падежа
  const histMortality = calcHistoricalMortality(historicalBatches || [], historicalLogs || [], lastAge);

  return (
    <div className="space-y-4 mb-6">
      {/* === Основные карточки === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Карточка 1 — Живая масса */}
        {norm && (
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h4 className="text-lg font-semibold mb-2">🐔 Живая масса</h4>
            <p className="text-sm text-gray-600">Факт (день {lastAge}): <strong className="text-gray-800">{lastLog.weight ?? '—'} г</strong></p>
            <p className="text-sm text-gray-600">Норма ROSS-308: <strong className="text-gray-800">{norm.weight} г</strong></p>
            {lastLog.weight != null && lastLog.weight > 0 && (
              <>
                <p className="text-sm font-semibold mt-1" style={{ color: STATUS_COLOR[getStatus(lastLog.weight, norm.weight)] }}>
                  Откл.: {lastLog.weight - norm.weight > 0 ? '+' : ''}
                  {Math.round(lastLog.weight - norm.weight)} г (
                  {Math.round(Math.abs((lastLog.weight - norm.weight) / norm.weight) * 100)}%)
                </p>
                <div className="bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((lastLog.weight / norm.weight) * 100, 100)}%`,
                      backgroundColor: STATUS_COLOR[getStatus(lastLog.weight, norm.weight)],
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Карточка 2 — Падёж */}
        {mortality && (
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h4 className="text-lg font-semibold mb-2">💀 Падёж (накопительный)</h4>
            <p className="text-sm text-gray-600">Пало: <strong className="text-gray-800">{mortality.totalDead} голов ({mortality.factPercent}%)</strong></p>
            <p className="text-sm text-gray-600">Норма ROSS-308: до <strong className="text-gray-800">{mortality.normPercent}%</strong></p>
            <p className="text-sm font-bold mt-1" style={{ color: STATUS_COLOR[mortality.status] }}>
              {mortality.status === 'ok'       && '✅ В норме'}
              {mortality.status === 'warning'  && '⚠️ Повышенный'}
              {mortality.status === 'critical' && '🔴 Критический'}
            </p>
          </div>
        )}

        {/* Карточка 3 — Вода */}
        {norm && waterPerHead != null && (
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h4 className="text-lg font-semibold mb-2">💧 Вода мл/гол/сутки</h4>
            <p className="text-sm text-gray-600">Всего: <strong className="text-gray-800">{lastLog.water_consumption} л</strong></p>
            <p className="text-sm text-gray-600">На голову: <strong className="text-gray-800">{waterPerHead} мл</strong></p>
            <p className="text-sm text-gray-600">Норма ROSS-308: <strong className="text-gray-800">{norm.waterNorm} мл</strong></p>
            <p className="text-sm font-semibold mt-1" style={{ color: STATUS_COLOR[getStatus(waterPerHead, norm.waterNorm)] }}>
              Откл.: {waterPerHead - norm.waterNorm > 0 ? '+' : ''}
              {Math.round(waterPerHead - norm.waterNorm)} мл
            </p>
          </div>
        )}

        {/* Карточка 4 — Корм */}
        {norm && feedPerHead != null && (
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h4 className="text-lg font-semibold mb-2">🌾 Корм г/гол/сутки</h4>
            <p className="text-sm text-gray-600">Всего: <strong className="text-gray-800">{lastLog.daily_feed} мешков ({(lastLog.daily_feed * 40).toFixed(0)} кг)</strong></p>
            <p className="text-sm text-gray-600">На голову: <strong className="text-gray-800">{feedPerHead} г</strong></p>
            <p className="text-sm text-gray-600">Норма ROSS-308: <strong className="text-gray-800">{norm.dailyFeed} г</strong></p>
            <p className="text-sm font-semibold mt-1" style={{ color: STATUS_COLOR[getStatus(feedPerHead, norm.dailyFeed)] }}>
              Откл.: {feedPerHead - norm.dailyFeed > 0 ? '+' : ''}
              {Math.round(feedPerHead - norm.dailyFeed)} г
            </p>
          </div>
        )}
      </div>

      {/* === Вторая строка карточек === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Карточка 5 — Прогноз массы к дню убоя */}
        {forecast && norm && (
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h4 className="text-lg font-semibold mb-2">📈 Прогноз к дню убоя (42)</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>Текущий день:</span><strong className="text-gray-800">{lastAge}</strong>
              <span>Текущая масса:</span><strong className="text-gray-800">{lastLog.weight ?? '—'} г</strong>
              <span>Суточный прирост:</span><strong className="text-gray-800">{forecast.dailyGain} г/сут</strong>
              <span>Прогноз к дню 42:</span><strong className="text-gray-800">{forecast.forecastWeight} г</strong>
              <span>Норма к дню 42:</span><strong className="text-gray-800">{getNormForDay(42)?.weight} г</strong>
            </div>
          </div>
        )}

        {/* Карточка 6 — Сравнение падежа с предыдущими партиями */}
        {histMortality.length > 0 && mortality && (
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h4 className="text-lg font-semibold mb-2">📊 Падёж vs предыдущие партии (день {lastAge})</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1">Партия</th>
                  <th className="py-1">Поголовье</th>
                  <th className="py-1">Падёж</th>
                  <th className="py-1">%</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b font-semibold bg-indigo-50">
                  <td className="py-1">Текущая</td>
                  <td className="py-1">{initialBirds}</td>
                  <td className="py-1">{mortality.totalDead}</td>
                  <td className="py-1" style={{ color: STATUS_COLOR[mortality.status] }}>{mortality.factPercent}%</td>
                </tr>
                {histMortality.map((h, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1">{h.batchName}</td>
                    <td className="py-1">{h.initialQuantity}</td>
                    <td className="py-1">{h.totalDead}</td>
                    <td className="py-1">{h.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
