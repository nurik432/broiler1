import { getNormForDay } from '../constants/broilerStandards';
import { calcMortality, forecastWeight } from '../utils/normComparison';

const STATUS_COLOR = {
  ok:       '#28a745',
  warning:  '#ffc107',
  critical: '#dc3545',
};

function getWeightStatus(fact, norm) {
  const ratio = Math.abs((fact - norm) / norm);
  if (ratio <= 0.05) return 'ok';
  if (ratio <= 0.15) return 'warning';
  return 'critical';
}

export default function DashboardNormFact({ logs, initialBirds }) {
  if (!logs?.length) return null;

  const sorted      = [...logs].sort((a, b) => b.age - a.age);
  const lastLog     = sorted[0];
  const lastAge     = lastLog.age;
  const norm        = getNormForDay(lastAge);
  const mortality   = calcMortality(logs, initialBirds);
  const forecast    = forecastWeight(logs, 42);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

      {/* Карточка 1 — Живая масса */}
      {norm && (
        <div className="bg-white p-4 rounded-lg shadow-md border">
          <h4 className="text-lg font-semibold mb-2">🐔 Живая масса</h4>
          <p className="text-sm text-gray-600">Факт (день {lastAge}): <strong className="text-gray-800">{lastLog.weight ?? '—'} г</strong></p>
          <p className="text-sm text-gray-600">Норма ROSS-308: <strong className="text-gray-800">{norm.weight} г</strong></p>
          {lastLog.weight != null && lastLog.weight > 0 && (
            <>
              <p className="text-sm font-semibold mt-1" style={{ color: STATUS_COLOR[getWeightStatus(lastLog.weight, norm.weight)] }}>
                Откл.: {lastLog.weight - norm.weight > 0 ? '+' : ''}
                {Math.round(lastLog.weight - norm.weight)} г (
                {Math.round(Math.abs((lastLog.weight - norm.weight) / norm.weight) * 100)}%)
              </p>
              <div className="bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((lastLog.weight / norm.weight) * 100, 100)}%`,
                    backgroundColor: STATUS_COLOR[getWeightStatus(lastLog.weight, norm.weight)],
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

      {/* Карточка 3 — Корм */}
      {norm && lastLog.daily_feed != null && (
        <div className="bg-white p-4 rounded-lg shadow-md border">
          <h4 className="text-lg font-semibold mb-2">🌾 Корм г/гол/сутки</h4>
          <p className="text-sm text-gray-600">Факт (день {lastAge}): <strong className="text-gray-800">{lastLog.daily_feed} г</strong></p>
          <p className="text-sm text-gray-600">Норма ROSS-308: <strong className="text-gray-800">{norm.dailyFeed} г</strong></p>
          <p className="text-sm font-semibold mt-1" style={{ color: STATUS_COLOR[getWeightStatus(lastLog.daily_feed, norm.dailyFeed)] }}>
            Откл.: {lastLog.daily_feed - norm.dailyFeed > 0 ? '+' : ''}
            {Math.round(lastLog.daily_feed - norm.dailyFeed)} г
          </p>
        </div>
      )}

      {/* Карточка 4 — Прогноз массы к дню убоя */}
      {forecast && norm && (
        <div className="bg-white p-4 rounded-lg shadow-md border">
          <h4 className="text-lg font-semibold mb-2">📈 Прогноз к дню убоя (42)</h4>
          <p className="text-sm text-gray-600">Текущий день: <strong className="text-gray-800">{lastAge}</strong></p>
          <p className="text-sm text-gray-600">Текущая масса: <strong className="text-gray-800">{lastLog.weight ?? '—'} г</strong></p>
          <p className="text-sm text-gray-600">Суточный прирост: <strong className="text-gray-800">{forecast.dailyGain} г/сут</strong></p>
          <p className="text-sm text-gray-600">Прогноз к дню 42: <strong className="text-gray-800">{forecast.forecastWeight} г</strong></p>
          <p className="text-sm text-gray-600">Норма к дню 42: <strong className="text-gray-800">{getNormForDay(42)?.weight} г</strong></p>
        </div>
      )}

    </div>
  );
}
