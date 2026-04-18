import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { getNormForDay } from '../constants/broilerStandards';
import { FEED_BAG_WEIGHT_G } from '../constants/broilerStandards';

export default function WorkshopDailyTable({ workshopId, workshopName }) {
  const [logs,    setLogs]    = useState([]);
  const [batch,   setBatch]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [workshopId]);

  async function load() {
    setLoading(true);

    // Активная партия этого цеха
    const { data: batchData } = await supabase
      .from('broiler_batches')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    setBatch(batchData);

    if (!batchData) { setLoading(false); return; }

    // Все записи журнала этой партии
    const { data: logsData } = await supabase
      .from('daily_logs')
      .select('log_date, age, mortality, weight, daily_feed, water_consumption')
      .eq('batch_id', batchData.id)
      .order('age', { ascending: false });

    setLogs(logsData || []);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 20, color: '#888' }}>Загрузка...</div>;
  if (!batch)  return <div style={{ padding: 20, color: '#999' }}>В {workshopName} нет активной партии</div>;

  const totalDead = logs.reduce((sum, r) => sum + (r.mortality || 0), 0);
  const currentHead = batch.initial_quantity - totalDead;

  // Утилита: расчёт корма на голову
  const calcFeedPerHead = (row) => {
    const dayIndex = logs.length - logs.indexOf(row);
    let cumMort = 0;
    const sortedAsc = [...logs].sort((a, b) => a.age - b.age);
    for (const l of sortedAsc) {
      if (l.age < row.age) cumMort += (l.mortality || 0);
    }
    const flock = batch.initial_quantity - cumMort;
    if (!flock || !row.daily_feed) return null;
    return Math.round((row.daily_feed * FEED_BAG_WEIGHT_G) / flock);
  };

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 'bold', margin: '0 0 12px', color: '#1f2937' }}>
        📋 {workshopName} — {batch.batch_name}
      </h3>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontSize: 14, color: '#555', flexWrap: 'wrap' }}>
        <span>Посадка: <strong>{batch.initial_quantity?.toLocaleString()} гол.</strong></span>
        <span>Сейчас: <strong>{currentHead?.toLocaleString()} гол.</strong></span>
        <span>Всего пало: <strong style={{ color: '#dc3545' }}>{totalDead} гол.</strong></span>
        <span>Начало: <strong>{batch.start_date}</strong></span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={th}>Дата</th>
              <th style={th}>День</th>
              <th style={th}>Падёж (гол.)</th>
              <th style={th}>Норма падёж*</th>
              <th style={th}>Масса факт (г)</th>
              <th style={th}>Масса норма (г)</th>
              <th style={th}>Корм факт (г/гол)</th>
              <th style={th}>Корм норма (г/гол)</th>
              <th style={th}>Вода (л)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row, i) => {
              const norm = getNormForDay(row.age);
              const feedPerHead = calcFeedPerHead(row);
              const weightOk  = norm && row.weight    && Math.abs((row.weight    - norm.weight)    / norm.weight)    <= 0.15;
              const feedOk    = norm && feedPerHead    && Math.abs((feedPerHead   - norm.dailyFeed) / norm.dailyFeed) <= 0.15;
              return (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{row.log_date}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{row.age}</td>
                  <td style={{
                    ...td, textAlign: 'center',
                    color: row.mortality > 200 ? '#dc3545' : row.mortality > 100 ? '#ffc107' : 'inherit',
                    fontWeight: row.mortality > 150 ? 'bold' : 'normal',
                  }}>
                    {row.mortality}
                  </td>
                  <td style={{ ...td, textAlign: 'center', color: '#999' }}>
                    {norm ? `~${Math.round(batch.initial_quantity * 0.002)}` : '—'}
                  </td>
                  <td style={{
                    ...td, textAlign: 'center',
                    color: !norm || !row.weight ? 'inherit' : weightOk ? '#28a745' : '#dc3545',
                  }}>
                    {row.weight ?? '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center', color: '#999' }}>
                    {norm?.weight ?? '—'}
                  </td>
                  <td style={{
                    ...td, textAlign: 'center',
                    color: !norm || !feedPerHead ? 'inherit' : feedOk ? '#28a745' : '#dc3545',
                  }}>
                    {feedPerHead ?? '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center', color: '#999' }}>
                    {norm?.dailyFeed ?? '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {row.water_consumption ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
        * Ориентировочная норма суточного падежа ≈ 0.2% от начального поголовья
      </p>
    </div>
  );
}

const th = { padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' };
const td = { padding: '6px 10px' };
