import { useState } from 'react';
import { useTasks, useEmployees } from '../hooks/useTasks';
import { useWorkshops } from '../hooks/useBatchData';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';

const PRIORITY_LABEL = { low:'Низкий', medium:'Средний', high:'Высокий', urgent:'🚨 Срочный' };
const PRIORITY_COLOR = { low:'#6c757d', medium:'#4f46e5', high:'#fd7e14', urgent:'#dc3545' };
const STATUS_LABEL   = { open:'Открыта', in_progress:'В работе', done:'Выполнена', cancelled:'Отменена' };

export default function TasksPage() {
  const [showForm,        setShowForm]        = useState(false);
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterAssignee,  setFilterAssignee]  = useState('');
  const [filterWorkshop,  setFilterWorkshop]  = useState('');
  const [filterPriority,  setFilterPriority]  = useState('');

  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks({
    status:      filterStatus    || undefined,
    assigneeId:  filterAssignee  || undefined,
    workshopId:  filterWorkshop  || undefined,
    priority:    filterPriority  || undefined,
  });
  const { employees } = useEmployees();
  const { workshops }  = useWorkshops();

  // Счётчики по статусам (из нефильтрованного списка — но здесь tasks уже отфильтрованы)
  const counts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  const overdueCount = tasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <h2 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', margin: 0 }}>✅ Задачи</h2>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding:'8px 16px', background:'#4f46e5', color:'#fff',
            border:'none', borderRadius:6, cursor:'pointer', fontWeight:'bold', fontSize: 14 }}
        >
          + Создать задачу
        </button>
      </div>

      {/* Счётчики статусов */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { label:'Открытые',   value: counts.open        || 0, color:'#4f46e5' },
          { label:'В работе',   value: counts.in_progress || 0, color:'#fd7e14' },
          { label:'Выполнены',  value: counts.done         || 0, color:'#28a745' },
          { label:'Просрочены', value: overdueCount,             color:'#dc3545' },
        ].map(s => (
          <div key={s.label} style={{
            padding:'8px 16px', borderRadius:8, background:s.color + '15',
            border:`1px solid ${s.color}30`, textAlign:'center', minWidth: 90,
          }}>
            <div style={{ fontSize:24, fontWeight:'bold', color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#555' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Фильтры */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}>
          <option value=''>Все статусы</option>
          {Object.entries(STATUS_LABEL).map(([v,l]) =>
            <option key={v} value={v}>{l}</option>)}
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          style={selectStyle}>
          <option value=''>Все приоритеты</option>
          {Object.entries(PRIORITY_LABEL).map(([v,l]) =>
            <option key={v} value={v}>{l}</option>)}
        </select>

        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          style={selectStyle}>
          <option value=''>Все исполнители</option>
          {employees.map(e =>
            <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>

        <select value={filterWorkshop} onChange={e => setFilterWorkshop(e.target.value)}
          style={selectStyle}>
          <option value=''>Все цеха</option>
          {workshops.map(w =>
            <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>

        {(filterStatus || filterAssignee || filterWorkshop || filterPriority) && (
          <button onClick={() => {
            setFilterStatus(''); setFilterAssignee('');
            setFilterWorkshop(''); setFilterPriority('');
          }} style={{ padding:'6px 12px', cursor:'pointer', background: '#f0f0f0',
            border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}>
            Сбросить
          </button>
        )}
      </div>

      {/* Форма создания задачи */}
      {showForm && (
        <TaskForm
          employees={employees}
          workshops={workshops}
          onSubmit={async (data) => {
            const { error } = await createTask(data);
            if (!error) setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Список задач */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Загрузка...</div>
      ) : (
        <TaskList
          tasks={tasks}
          onStatusChange={(id, status) => updateTask(id, { status })}
          onDelete={deleteTask}
          PRIORITY_LABEL={PRIORITY_LABEL}
          PRIORITY_COLOR={PRIORITY_COLOR}
          STATUS_LABEL={STATUS_LABEL}
        />
      )}
    </div>
  );
}

const selectStyle = {
  padding:'6px 10px', borderRadius:6, border:'1px solid #dee2e6',
  background:'#fff', fontSize:13, cursor:'pointer',
};
