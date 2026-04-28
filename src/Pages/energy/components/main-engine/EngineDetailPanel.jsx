import arrowYellow from './elements/Engine-Arrow-Yellow.svg';
import arrowRed from './elements/Engine-Arrow-Red.svg';
import arrowGreen from './elements/Engine-Arrow-Green.svg';
import engineIconSvg from './elements/Engine-Icon.svg';
import './EngineDetailPanel.css';

function EngineDetailPanel({ engine }) {
  if (!engine) return null;

  const capacityPercent = Math.min(100, Math.max(0, engine.load || 0));

  // Pick exactly one arrow based on energy flow priority
  const arrowSrc = engine.energyFlow?.input
    ? arrowGreen
    : engine.energyFlow?.rapid
    ? arrowRed
    : engine.energyFlow?.normal
    ? arrowYellow
    : null;

  return (
    <div className="engine-detail-panel">
      {/* ── Top row: number badge / status badge / model ── */}
      <div className="detail-top-row">
        <span className="engine-num-badge">{engine.id}</span>
        <span className={`engine-status-badge status-${engine.status}`}>
          {engine.status.toUpperCase()}
        </span>
        <span className="engine-model-text">{engine.model}</span>
      </div>

      {/* ── Main body: arrow | engine icon | capacity bar ── */}
      <div className="detail-body">
        {/* Left: energy flow arrow */}
        <div className="detail-arrow-col">
          {arrowSrc && (
            <img src={arrowSrc} alt="energy flow" className="energy-arrow-img" />
          )}
        </div>

        {/* Center: engine icon + load metric */}
        <div className="detail-icon-col">
          <img src={engineIconSvg} alt="engine" className="engine-icon-img" />
          {engine.status === 'run' && (
             <div className="load-metric">
                <div className="load-label">LOAD</div>
                <div className="load-value">{Math.round(engine.load)}%</div>
             </div>
          )}
        </div>

        {/* Right: capacity bar (reflects 90% as requested) */}
        <div className="detail-capacity-col">
          <div className="cap-bar-wrap">
            <div className="cap-bar-bg">
              <div
                className="cap-bar-fill"
                style={{ height: `${engine.capacity}%` }}
              />
              <div
                className="cap-marker"
                style={{ bottom: `calc(${engine.capacity}% - 3.5px)` }}
              />
              <span className="cap-value-overlay">{Math.round(engine.capacity)}%</span>
              <span className="cap-label-overlay">Capacity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EngineDetailPanel;
