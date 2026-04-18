import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Загружает данные выбранной партии + её цеха + все предыдущие партии этого цеха
 */
export function useBatchData(batchId) {
  const [batch,           setBatch]           = useState(null);
  const [workshop,        setWorkshop]        = useState(null);
  const [logs,            setLogs]            = useState([]);
  const [previousBatches, setPreviousBatches] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  useEffect(() => {
    if (!batchId) return;
    loadAll();
  }, [batchId]);

  async function loadAll() {
    try {
      setLoading(true);

      // 1. Загрузить текущую партию с цехом
      const { data: batchData, error: bErr } = await supabase
        .from('broiler_batches')
        .select('*, workshop:workshops(*)')
        .eq('id', batchId)
        .single();
      if (bErr) throw bErr;
      setBatch(batchData);
      setWorkshop(batchData.workshop);

      // 2. Загрузить журнал текущей партии
      const { data: logsData, error: lErr } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('batch_id', batchId)
        .order('age', { ascending: true });
      if (lErr) throw lErr;
      setLogs(logsData || []);

      // 3. Загрузить предыдущие партии ЭТОГО ЖЕ ЦЕХА (не текущую)
      if (batchData.workshop_id) {
        const { data: prevBatches, error: pbErr } = await supabase
          .from('broiler_batches')
          .select('id, batch_name, initial_quantity, start_date, is_active')
          .eq('workshop_id', batchData.workshop_id)
          .neq('id', batchId)
          .order('start_date', { ascending: false })
          .limit(5);
        if (pbErr) throw pbErr;

        // 4. Для каждой предыдущей партии — загрузить журнал (только нужные поля)
        const prevWithLogs = await Promise.all(
          (prevBatches || []).map(async (pb) => {
            const { data: pbLogs } = await supabase
              .from('daily_logs')
              .select('age, mortality, weight, daily_feed')
              .eq('batch_id', pb.id)
              .order('age', { ascending: true });
            return { ...pb, logs: pbLogs || [] };
          })
        );
        setPreviousBatches(prevWithLogs);
      } else {
        setPreviousBatches([]);
      }

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return { batch, workshop, logs, previousBatches, loading, error, reload: loadAll };
}

/**
 * Загружает список всех цехов с текущей активной партией
 */
export function useWorkshops() {
  const [workshops, setWorkshops] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('workshops')
      .select(`
        *,
        batches:broiler_batches (
          id, batch_name, initial_quantity, start_date, is_active
        )
      `)
      .eq('is_active', true)
      .order('name');
    setWorkshops(data || []);
    setLoading(false);
  }

  return { workshops, loading, reload: load };
}
