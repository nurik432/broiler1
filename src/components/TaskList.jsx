import { useState } from 'react';

const STATUS_NEXT = {
  open:        'in_progress',
  in_progress: 'done',
  done:        'open',
};
const STATUS_BTN = {
  open:        '▶ В работу',
  in_progress: '✅ Выполнено',
  done:        '↩ Открыть снова',
};

export default function TaskList({ tasks, onStatusChange, onDelete,
  PRIORITY_LABEL, PRIORITY_COLOR, STATUS_LABEL }) {

  if (!tasks.length) return (
    <div style={{ textAlign:'center', padding:40, color:'#999' }}>
      Задач нет. Создайте первую!
    </div>
  );

  return (
    <div style={{ display:'grid', gap:10 }}>
      {tasks.map(task => {
        const isOverdue = task.due_date && new Date(task.due_date) < new Date()
          && task.status !== 'done';

        return (
          <div key={task.id} style={{
            padding:16, borderRadius:8, background:'#fff',
            border: isOverdue ? '1px solid #dc3545' : '1px solid #dee2e6',
            borderLeft: `4px solid ${PRIORITY_COLOR[task.priority] || '#dee2e6'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{
                    fontSize:11, padding:'2px 6px', borderRadius:4, fontWeight:'bold',
                    background: PRIORITY_COLOR[task.priority] + '20',
                    color: PRIORITY_COLOR[task.priority],
                  }}>
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                  <span style={{ fontSize:11, color:'#888' }}>
                    {STATUS_LABEL[task.status]}
                  </span>
                  {isOverdue && (
                    <span style={{ fontSize:11, color:'#dc3545', fontWeight:'bold' }}>
                      ⚠️ Просрочена
                    </span>
                  )}
                </div>

                <h4 style={{ margin:'0 0 4px', fontSize:15,
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                  color: task.status === 'done' ? '#999' : '#1f2937',
                }}>
                  {task.title}
                </h4>

                {task.description && (
                  <p style={{ margin:'0 0 6px', fontSize:13, color:'#666' }}>
                    {task.description}
                  </p>
                )}

                <div style={{ display:'flex', gap:16, fontSize:12, color:'#888', flexWrap:'wrap' }}>
                    {task.assignee && (
                    <span>👤 {task.assignee.full_name} {task.assignee.position ? `· ${task.assignee.position}` : ''}</span>
                  )}
                  {task.workshop && <span>🏠 {task.workshop.name}</span>}
                  {task.due_date && (
                    <span style={{ color: isOverdue ? '#dc3545' : 'inherit' }}>
                      📅 Срок: {task.due_date}
                    </span>
                  )}
                  {task.completed_at && (
                    <span style={{ color:'#28a745' }}>
                      ✅ Выполнено: {new Date(task.completed_at).toLocaleDateString('ru')}
                    </span>
                  )}
                  {task.created_by && <span>Создал: {task.created_by}</span>}
                </div>
              </div>

              <div style={{ display:'flex', gap:8, marginLeft:16, flexShrink:0 }}>
                <button
                  onClick={() => onStatusChange(task.id, STATUS_NEXT[task.status])}
                  style={{ padding:'5px 10px', fontSize:12, cursor:'pointer',
                    background: task.status === 'done' ? '#6c757d' : '#28a745',
                    color:'#fff', border:'none', borderRadius:5 }}
                >
                  {STATUS_BTN[task.status]}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Удалить задачу?')) onDelete(task.id);
                  }}
                  style={{ padding:'5px 10px', fontSize:12, cursor:'pointer',
                    background:'#fff', color:'#dc3545', border:'1px solid #dc3545', borderRadius:5 }}
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
