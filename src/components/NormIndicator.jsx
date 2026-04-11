const STATUS_STYLE = {
  ok:       { background: '#d4edda', border: '#28a745', color: '#155724', icon: '✅' },
  warning:  { background: '#fff3cd', border: '#ffc107', color: '#856404', icon: '⚠️' },
  critical: { background: '#f8d7da', border: '#dc3545', color: '#721c24', icon: '🔴' },
};

/**
 * Показывает норму и отклонение рядом с полем ввода
 * result — возвращаемый объект из compareWithNorm()
 */
export default function NormIndicator({ result }) {
  if (!result) return null;
  const s = STATUS_STYLE[result.status];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      marginLeft: 8,
      background: s.background,
      border: `1px solid ${s.border}`,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.icon} Норма: {result.normLabel}
      {result.deviation !== null && (
        <> | {result.deviation > 0 ? '+' : ''}{result.deviation} ({result.percent}%)</>
      )}
    </span>
  );
}
