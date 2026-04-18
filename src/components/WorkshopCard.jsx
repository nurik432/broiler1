import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { getNormForDay } from '../constants/broilerStandards';

export default function WorkshopCard({ workshop, isSelected, onClick }) {
  const [todayData, setTodayData] = useState(null);

  useEffect(() => {
    loadToday();
  }, [workshop.id]);

  async function loadToday() {
    // Найти активную партию этого цеха
    const activeBatch = workshop.batches?.find(b => b.is_active);
    if (!activeBatch) return;

    // Получить последнюю запись журнала этой партии
    const { data } = await supabase
      .from('daily_logs')
      .select('age, mortality, weight, daily_feed, water_consumption, log_date')
      .eq('batch_id', activeBatch.id)
      .order('age', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setTodayData({ ...data, batch: activeBatch });
    }
  }

  const activeBatch = workshop.batches?.find(b => b.is_active);
  const norm = todayData ? getNormForDay(todayData.age) : null;

  return (
    <div
      onClick={onClick}
      style={{
        padding: 16, borderRadius: 8, cursor: 'pointer',
        border: isSelected ? '2px solid #4f46e5' : '1px solid #dee2e6',
        background: isSelected ? '#eef2ff' : '#fff',
        transition: 'all 0.2s',
        boxShadow: isSelected ? '0 2px 8px rgba(79,70,229,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 'bold', color: '#1f2937' }}>🏠 {workshop.name}</h4>

      {!activeBatch ? (
        <p style={{ color: '#999', fontSize: 13 }}>Нет активной партии</p>
      ) : (
        <>
          <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>
            {activeBatch.batch_name} · {activeBatch.initial_quantity?.toLocaleString()} гол.
          </p>
          {todayData && (
            <>
              <p style={{ margin: '4px 0', fontSize: 13 }}>
                📅 День выращивания: <strong>{todayData.age}</strong>
              </p>
              <p style={{ margin: '2px 0', fontSize: 13 }}>
                💀 Падёж сегодня:{' '}
                <strong style={{ color: todayData.mortality > 150 ? '#dc3545' : 'inherit' }}>
                  {todayData.mortality} гол.
                </strong>
              </p>
              {todayData.weight && norm && (
                <p style={{ margin: '2px 0', fontSize: 13 }}>
                  🐔 Масса: <strong>{todayData.weight} г</strong>
                  <span style={{ color: '#888', marginLeft: 4 }}>(норма {norm.weight} г)</span>
                </p>
              )}
              {todayData.daily_feed && norm && (
                <p style={{ margin: '2px 0', fontSize: 13 }}>
                  🌾 Корм: <strong>{todayData.daily_feed} мешк.</strong>
                  <span style={{ color: '#888', marginLeft: 4 }}>(норма {norm.dailyFeed} г/гол)</span>
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
