import { useState } from 'react';

// Horizontal bars for "compare magnitude, low -> high". Single measure, so one
// color for every bar - a darker-where-bigger ramp would just re-encode length.
// Every bar carries its value at the tip, so no number is hover-only and the
// chart needs no separate table twin.
//
// `tone` on a datum switches the bar to a status color; use it only where the
// category IS a state (order status, stock status), never for plain identity.
const TONE_VAR = {
  completed: 'var(--accent)',
  cancelled: 'var(--critical)',
  queued: 'var(--warning)',
  inflight: 'var(--ink-2)',
};

export default function BarChart({ data, format, subFormat, emptyText }) {
  const [hover, setHover] = useState(null);
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
    <ul className="bars">
      {data.map((d, i) => (
        <li
          key={d.label}
          className={`bar ${hover === i ? 'on' : ''}`}
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          tabIndex={0}
        >
          <span className="name" title={d.label}>
            {d.label}
          </span>
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
        </li>
      ))}

      <style jsx>{`
        .bars {
          list-style: none;
          margin: 0;
          padding: 4px 0 2px;
          display: flex;
          flex-direction: column;
          /* The 2px surface gap between neighbouring bars, doing the separating
             that a border would otherwise do badly. */
          gap: 10px;
        }
        .bar {
          display: grid;
          grid-template-columns: minmax(88px, 34%) 1fr auto;
          align-items: center;
          gap: 10px;
          border-radius: 6px;
          outline-offset: 2px;
        }
        .bar.on .name,
        .bar.on .value {
          color: var(--ink);
        }
        .name {
          font-size: 12px;
          color: var(--ink-2);
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
          /* Rounded data-end, square at the baseline. */
          border-radius: 0 4px 4px 0;
          transition: width 260ms ease;
        }
        .bar.on .fill {
          filter: brightness(1.15);
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
        @media (max-width: 520px) {
          .bar {
            grid-template-columns: minmax(72px, 40%) 1fr auto;
          }
        }
      `}</style>
    </ul>
  );
}
