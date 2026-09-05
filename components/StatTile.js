import Sparkline from './Sparkline';

// label / value / optional delta / optional trend - the stat-tile contract.
// Value uses proportional figures: tabular-nums makes a big standalone number
// look loose, and is reserved for columns that align vertically.
export default function StatTile({ label, value, sub, delta, points, tone }) {
  const dir = delta == null ? null : delta >= 0 ? 'up' : 'down';

  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="row">
        <div className={`value ${tone || ''}`}>{value}</div>
        {points ? <Sparkline points={points} /> : null}
      </div>
      <div className="foot">
        {delta != null && (
          <span className={`delta ${dir}`}>
            <span aria-hidden="true">{dir === 'up' ? '▲' : '▼'}</span>
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        {sub && <span className="sub">{sub}</span>}
      </div>

      <style jsx>{`
        .tile {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 14px 15px 12px;
          min-width: 0;
        }
        .label {
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.03em;
          text-transform: uppercase;
          font-weight: 600;
        }
        .row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 10px;
          margin-top: 7px;
        }
        .value {
          font-size: 24px;
          font-weight: 650;
          letter-spacing: -0.02em;
          line-height: 1.05;
          color: var(--ink);
        }
        .value.accent {
          color: var(--accent);
        }
        .value.critical {
          color: var(--critical);
        }
        .foot {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          min-height: 15px;
        }
        .delta {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 650;
          padding: 2px 6px;
          border-radius: 5px;
        }
        .delta.up {
          color: var(--accent);
          background: var(--accent-wash);
        }
        .delta.down {
          color: var(--critical);
          background: rgba(208, 59, 59, 0.12);
        }
        .sub {
          font-size: 11px;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}
