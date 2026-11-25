const LEVELS = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
  { key: 'info', label: 'Info' },
];

export default function SummaryBar({ summary, activeSeverity, onSelectSeverity }) {
  return (
    <div className="summary-bar" role="group" aria-label="Filter findings by severity">
      {LEVELS.map((l) => {
        const isActive = activeSeverity === l.key;
        const isDimmed = activeSeverity && !isActive;
        const count = summary?.[l.key] || 0;
        return (
          <button
            key={l.key}
            type="button"
            onClick={() => onSelectSeverity?.(isActive ? '' : l.key)}
            className={`sev-chip sev-${l.key} ${isActive ? 'is-active' : ''} ${
              isDimmed ? 'is-dimmed' : ''
            }`}
            title={`Filter ${l.label} findings`}
          >
            <span>{l.label}</span>
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
