import { useState } from 'react';
import VolumeChart from './VolumeChart';
import VolumeTable from './VolumeTable';
import { fmtMoney } from '../lib/data';
import { useCountUp } from '../lib/useCountUp';

// The hero figure plus its chart. Exactly one of these per page - the hero is
// the single number the dashboard leads with.
export default function VolumePanel({ label, value, sub, delta, deltaLabel, points, emptyText }) {
  const [view, setView] = useState('chart');
  const up = delta != null && delta >= 0;
  const displayValue = useCountUp(value || 0);

  return (
    <section className="hero">
      <div className="top">
        <div>
          <div className="label">{label}</div>
          <div className="row">
            <span className="value">{fmtMoney(displayValue, true)}</span>
            {delta != null && (
              <span className={`delta ${up ? 'up' : 'down'}`}>
                <span aria-hidden="true">{up ? '▲' : '▼'}</span>
                {Math.abs(delta).toFixed(0)}% {deltaLabel}
              </span>
            )}
          </div>
          <div className="sub">{sub}</div>
        </div>

        <div
          className="toggle"
          role="group"
          aria-label="Chart view"
          style={{ '--count': 2, '--index': view === 'chart' ? 0 : 1 }}
        >
          <span className="thumb" aria-hidden="true" />
          <button
            type="button"
            className={`seg ${view === 'chart' ? 'on' : ''}`}
            aria-pressed={view === 'chart'}
            onClick={() => setView('chart')}
          >
            Chart
          </button>
          <button
            type="button"
            className={`seg ${view === 'table' ? 'on' : ''}`}
            aria-pressed={view === 'table'}
            onClick={() => setView('table')}
          >
            Table
          </button>
        </div>
      </div>

      {view === 'chart' ? (
        <VolumeChart points={points} label={label} emptyText={emptyText} />
      ) : (
        <VolumeTable points={points} />
      )}

      <style jsx>{`
        .hero {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 16px 15px 8px;
          margin-bottom: 12px;
        }
        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 6px;
        }
        .label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .row {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 6px;
        }
        .value {
          font-size: 48px;
          font-weight: 680;
          letter-spacing: -0.03em;
          line-height: 1;
          color: var(--ink);
        }
        .delta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 650;
          padding: 3px 7px;
          border-radius: 6px;
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
          font-size: 12px;
          color: var(--muted);
          margin-top: 7px;
        }
        .toggle {
          position: relative;
          display: inline-flex;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
          flex-shrink: 0;
        }
        .thumb {
          position: absolute;
          top: 2px;
          bottom: 2px;
          left: 2px;
          width: calc((100% - 4px) / var(--count));
          background: var(--surface-3);
          border-radius: 6px;
          transform: translateX(calc(var(--index) * 100%));
          transition: transform 220ms var(--ease-out);
        }
        @media (prefers-reduced-motion: reduce) {
          .thumb {
            transition: none;
          }
        }
        .seg {
          position: relative;
          z-index: 1;
          flex: 1;
          min-width: 54px;
          text-align: center;
          background: none;
          border: none;
          color: var(--muted);
          font-size: 12px;
          font-weight: 550;
          padding: 5px 11px;
          border-radius: 6px;
        }
        .seg.on {
          color: var(--ink);
        }
        @media (max-width: 720px) {
          .value {
            font-size: 40px;
          }
        }
      `}</style>
    </section>
  );
}
