import { useState } from 'react';
import Icon from './Icon';
import { topBy } from '../lib/data';

// Chargers-only: the same bars as BarChart, but each status is a disclosure -
// tap "Available" and it opens into which products make up that stock, which
// a single count never answers on its own.
const TONE_VAR = {
  completed: 'var(--accent)',
  cancelled: 'var(--critical)',
  queued: 'var(--warning)',
  inflight: 'var(--ink-2)',
};

export default function InventoryStatusList({ data, items, format, subFormat, emptyText }) {
  const [open, setOpen] = useState(null);
  const max = Math.max(...data.map((d) => d.value), 0) || 1;

  if (!data.length) {
    return (
      <div className="empty">
        {emptyText || 'Nothing in this range.'}
        <style jsx>{`
          .empty {
            color: var(--muted);
            font-size: 12.5px;
            text-align: center;
            padding: 36px 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <ul className="groups">
      {data.map((d) => {
        const isOpen = open === d.label;
        const breakdown = topBy(
          items.filter((i) => i.status === d.label),
          (i) => i.product,
          () => 1,
          30
        );

        return (
          <li key={d.label} className="group">
            <button
              type="button"
              className="bar"
              onClick={() => setOpen((cur) => (cur === d.label ? null : d.label))}
              aria-expanded={isOpen}
            >
              <span className="name">{d.label}</span>
              <span className="track">
                <span
                  className="fill"
                  style={{
                    width: `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%`,
                    background: TONE_VAR[d.kind] || 'var(--accent)',
                  }}
                />
              </span>
              <span className="value">
                {format ? format(d.value, d) : d.value}
                {subFormat && <span className="sub">{subFormat(d)}</span>}
              </span>
              <Icon name="chevron" size={14} className={`chev ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
              <ul className="breakdown">
                {breakdown.length ? (
                  breakdown.map((b) => (
                    <li key={b.label}>
                      <span className="bLabel">{b.label}</span>
                      <span className="bValue">{b.value}</span>
                    </li>
                  ))
                ) : (
                  <li className="bEmpty">Nothing here.</li>
                )}
              </ul>
            )}
          </li>
        );
      })}

      <style jsx>{`
        .groups {
          list-style: none;
          margin: 0;
          padding: 4px 0 2px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .bar {
          width: 100%;
          display: grid;
          grid-template-columns: minmax(88px, 34%) 1fr auto auto;
          align-items: center;
          gap: 10px;
          border-radius: 6px;
          background: none;
          border: none;
          padding: 2px 0;
        }
        .name {
          font-size: 12px;
          color: var(--ink-2);
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .track {
          height: 14px;
          background: var(--surface-3);
          border-radius: 4px;
          overflow: hidden;
          min-width: 0;
        }
        .fill {
          display: block;
          height: 100%;
          border-radius: 0 4px 4px 0;
          transition: width 260ms ease;
        }
        .value {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .sub {
          font-size: 10.5px;
          font-weight: 500;
          color: var(--muted);
        }
        .chev {
          color: var(--muted);
          transition: transform 160ms ease;
          flex-shrink: 0;
        }
        .chev.open {
          transform: rotate(90deg);
        }
        .breakdown {
          list-style: none;
          margin: 6px 0 0;
          padding: 8px 10px;
          background: var(--surface-2);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .breakdown li {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .bLabel {
          color: var(--ink-2);
        }
        .bValue {
          color: var(--ink);
          font-weight: 650;
          font-variant-numeric: tabular-nums;
        }
        .bEmpty {
          color: var(--muted);
          text-align: center;
          padding: 4px 0;
        }
      `}</style>
    </ul>
  );
}
