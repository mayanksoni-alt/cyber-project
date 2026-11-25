export default function HistoryList({
  history,
  onSelectScan,
  onDeleteScan,
  title = 'Recent scans',
  emptyText = 'No scans recorded yet. Run your first scan above!',
  showEmpty = false,
}) {
  if ((!history || history.length === 0) && !showEmpty) return null;

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const diffMs = Date.now() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <section className="history">
      <div className="section-head">
        <h3>{title}</h3>
        {history?.length > 0 && (
          <span className="muted" style={{ fontSize: 13 }}>
            Click any target to open its scan report
          </span>
        )}
      </div>

      {!history || history.length === 0 ? (
        <div className="card empty">{emptyText}</div>
      ) : (
        <div className="history-list">
          {history.map((s) => (
            <div
              key={s.id}
              className={`history-item card ${onSelectScan ? 'clickable' : ''}`}
              onClick={() => onSelectScan?.(s.id)}
              role={onSelectScan ? 'button' : undefined}
              tabIndex={onSelectScan ? 0 : undefined}
              onKeyDown={(e) => {
                if (onSelectScan && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectScan(s.id);
                }
              }}
            >
              <div className="history-main">
                <div className="history-url">{s.target_url}</div>
                <div className="history-sub">
                  <span>{formatDate(s.created_at)}</span>
                  {s.scan_mode && <span className="pt-mode-chip">{s.scan_mode}</span>}
                  {s.score != null && <span>· Score {s.score}/100</span>}
                  {s.pages_crawled ? <span>· {s.pages_crawled} pages</span> : null}
                  {s.summary?.critical > 0 && (
                    <span className="sev-tag sev-critical">{s.summary.critical} critical</span>
                  )}
                  {s.summary?.high > 0 && (
                    <span className="sev-tag sev-high">{s.summary.high} high</span>
                  )}
                </div>
              </div>

              <div className="history-meta">
                {s.grade && <span className={`grade-badge grade-${s.grade}`}>{s.grade}</span>}
                {s.summary?.total != null && (
                  <span className="muted">{s.summary.total} issues</span>
                )}
                {onDeleteScan && (
                  <button
                    type="button"
                    className="btn btn-danger-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScan(s.id);
                    }}
                    title="Delete scan"
                    aria-label={`Delete scan for ${s.target_url}`}
                  >
                    ✕
                  </button>
                )}
                {onSelectScan && (
                  <span className="history-arrow" aria-hidden="true">→</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
