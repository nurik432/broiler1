import { useWorkshops } from '../hooks/useBatchData';
import WorkshopCard from '../components/WorkshopCard';
import WorkshopDailyTable from '../components/WorkshopDailyTable';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getNormForDay } from '../constants/broilerStandards';

export default function WorkshopsPage() {
  const { workshops, loading } = useWorkshops();
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Загрузка...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 }}>🏭 Учёт по цехам</h2>

      {workshops.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, background: '#fff',
          borderRadius: 8, border: '1px solid #dee2e6',
        }}>
          <p style={{ fontSize: 16, color: '#999', marginBottom: 12 }}>Цеха ещё не добавлены</p>
          <p style={{ fontSize: 13, color: '#bbb' }}>Добавьте цеха в Supabase → таблица <code>workshops</code></p>
        </div>
      ) : (
        <>
          {/* Строка карточек цехов — обзор всех */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16, marginBottom: 24 }}>
            {workshops.map(w => (
              <WorkshopCard
                key={w.id}
                workshop={w}
                isSelected={selectedWorkshop?.id === w.id}
                onClick={() => setSelectedWorkshop(w.id === selectedWorkshop?.id ? null : w)}
              />
            ))}
          </div>

          {/* Детальная таблица выбранного цеха */}
          {selectedWorkshop && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #dee2e6', marginBottom: 24 }}>
              <WorkshopDailyTable workshopId={selectedWorkshop.id} workshopName={selectedWorkshop.name} />
            </div>
          )}

          {/* Если цех не выбран — показать сводную таблицу всех цехов */}
          {!selectedWorkshop && workshops.length > 0 && (
            <AllWorkshopsSummary workshops={workshops} />
          )}
        </>
      )}
    </div>
  );
}

function AllWorkshopsSummary({ workshops }) {
  const [summaryData, setSummaryData] = useState({});

  useEffect(() => {
    loadSummary();
  }, [workshops]);

  async function loadSummary() {
    const data = {};
    for (const w of workshops) {
      const activeBatch = w.batches?.find(b => b.is_active);
      if (!activeBatch) continue;

      const { data: lastLog } = await supabase
        .from('daily_logs')
        .select('age, mortality, weight, daily_feed')
        .eq('batch_id', activeBatch.id)
        .order('age', { ascending: false })
        .limit(1)
        .single();

      if (lastLog) {
        const norm = getNormForDay(lastLog.age);
        data[w.id] = { ...lastLog, norm };
      }
    }
    setSummaryData(data);
  }

  return (
    <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #dee2e6' }}>
      <h3 style={{ fontSize: 18, fontWeight: 'bold', margin: '0 0 16px', color: '#1f2937' }}>📊 Сводка по всем цехам</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Цех','Партия','День','Поголовье','Пало сегодня','Масса факт','Масса норма','Корм факт (мешк.)','Корм норма (г/гол)'].map(h => (
                <th key={h} style={{ padding: '8px 12px', borderBottom: '2px solid #dee2e6', textAlign:'left', fontWeight: 'bold' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workshops.map(w => {
              const active = w.batches?.find(b => b.is_active);
              const sd = summaryData[w.id];
              if (!active) return (
                <tr key={w.id}>
                  <td style={{ padding: '8px 12px', color:'#555', fontWeight: 'bold' }}>{w.name}</td>
                  <td colSpan={8} style={{ padding:'8px 12px', color:'#999' }}>Нет активной партии</td>
                </tr>
              );
              return (
                <tr key={w.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 12px', fontWeight:'bold' }}>{w.name}</td>
                  <td style={{ padding: '8px 12px' }}>{active.batch_name}</td>
                  <td style={{ padding: '8px 12px', textAlign:'center' }}>{sd?.age ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{active.initial_quantity?.toLocaleString()}</td>
                  <td style={{ padding: '8px 12px', textAlign:'center', color: sd?.mortality > 150 ? '#dc3545' : 'inherit' }}>
                    {sd?.mortality ?? '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign:'center' }}>{sd?.weight ?? '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign:'center', color: '#999' }}>{sd?.norm?.weight ?? '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign:'center' }}>{sd?.daily_feed ?? '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign:'center', color: '#999' }}>{sd?.norm?.dailyFeed ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:12, color:'#999', marginTop:8 }}>
        Кликни на карточку цеха выше, чтобы увидеть полную детализацию.
      </p>
    </div>
  );
}
