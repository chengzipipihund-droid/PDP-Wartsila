import './EngineCompactPanel.css';

function EngineCompactPanel({ engine, onClick }) {
  return (
    <div
      className="engine-compact-panel"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      {/* Engine number badge (outline style, matches Engine Number.svg) */}
      <span className="compact-num-badge">{engine.id}</span>

      {/* Status badge (filled pill, matches Engine-Status-Run/Standby SVGs) */}
      <span className={`compact-status-badge status-${engine.status}`}>
        {engine.status.toUpperCase()}
      </span>

      {/* Expand indicator: right-pointing chevron (matches ME2.svg arrow) */}
      <span className="compact-expand-arrow" aria-hidden="true">›</span>
    </div>
  );
}

export default EngineCompactPanel;
