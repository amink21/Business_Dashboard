import { useState } from 'react';
import { fmtMonth, fmtMoney } from '../lib/data';

// Revenue split into the part that stayed (profit) and the part that didn't
// (cost). Part-to-whole per month, so it stacks rather than sits side by side -
// grouping them would invite reading profit and revenue as independent series.
//
// This is the emphasis form: the measure that matters wears the accent, its
// context wears the de-emphasis neutral. No second hue is needed.
const SERIES = [
  { key: 'profit', label: 'Net profit', color: 'var(--accent)' },
  { key: 'cost', label: 'Cost', color: 'var(--series-mute)' },
];

function niceMax(v) {
  if (!v || v <= 0) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((s) => s >= n) || 10;
  return step * mag;
}

export default function StackedColumnChart({ data }) {
  const [hover, setHover] = useState(null);
  const totals = data.map((d) => d.segments.reduce((s, v) => s + v, 0));
  const max = niceMax(Math.max(...totals, 0));
  const ticks = [0, 0.5, 1].map((f) => max * f);
  const empty = !totals.some((t) => t > 0);

  return (
    <div className="chart">
      <div className="legend">
        {SERIES.map((s) => (
          <span key={s.key} className="legendItem">
            <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>

      <div className="plot">
        <div className="ticks" aria-hidden="true">
          {ticks
            .slice()
            .reverse()
            .map((t) => (
              <div key={t} className="tickRow">
                <span className="tickLabel">{fmtMoney(t)}</span>
                <span className="tickLine" />
              </div>
            ))}
        </div>

        <ul className="cols">
          {data.map((d, i) => {
            const total = totals[i];
            // The visual top of a column-reverse stack is the last segment with
            // anything in it; that is the one that gets the rounded data-end.
            const topIdx = d.segments.reduce((acc, v, si) => (v > 0 ? si : acc), -1);
            return (
              <li
                key={d.date.toISOString()}
                className={`col ${hover === i ? 'on' : ''}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${fmtMonth(d.date)}: ${fmtMoney(total, true)} revenue, ${fmtMoney(
                  d.segments[0],
                  true
                )} profit`}
              >
                <span className="stack">
                  {total > 0 && (
                    <span
                      className="cap"
                      style={{ bottom: `calc(${(total / max) * 100}% + 4px)` }}
                    >
                      {fmtMoney(total)}
                    </span>
                  )}
                  <span className="bars">
                    {total > 0 &&
                      SERIES.map((s, si) => (
                        <span
                          key={s.key}
                          className="seg"
                          style={{
                            height: `${(d.segments[si] / max) * 100}%`,
                            background: s.color,
                            borderRadius: si === topIdx ? '3px 3px 0 0' : 0,
                          }}
                        />
                      ))}
                  </span>
                </span>
                <span className="month">{fmtMonth(d.date)}</span>
              </li>
            );
          })}
        </ul>

        {empty && <div className="none">No revenue in this range</div>}

        {hover != null && totals[hover] > 0 && (
          <div className="tip" role="status">
            <div className="tipValue">{fmtMoney(totals[hover], true)}</div>
            <div className="tipMeta">{fmtMonth(data[hover].date)} revenue</div>
            {SERIES.map((s, si) => (
              <div key={s.key} className="tipRow">
                <span className="key" style={{ background: s.color }} aria-hidden="true" />
                <span className="tipNum">{fmtMoney(data[hover].segments[si], true)}</span>
                <span className="tipName">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .chart {
          position: relative;
        }
        .legend {
          display: flex;
          gap: 14px;
          margin-bottom: 12px;
        }
        .legendItem {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--ink-2);
        }
        .swatch {
          width: 9px;
          height: 9px;
          border-radius: 2px;
        }
        .plot {
          position: relative;
          height: 196px;
        }
        .ticks {
          position: absolute;
          inset: 26px 0 24px 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .tickRow {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tickLabel {
          font-size: 10.5px;
          color: var(--muted);
          font-variant-numeric: tabular-nums;
          width: 46px;
          text-align: right;
          flex-shrink: 0;
        }
        .tickLine {
          flex: 1;
          height: 1px;
          background: var(--grid);
        }
        .cols {
          position: absolute;
          inset: 0 0 0 54px;
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: flex-end;
        }
        .col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 0;
          outline-offset: 2px;
          border-radius: 6px;
        }
        .stack {
          position: relative;
          /* Capped width - the column never fills its slot; the leftover is air. */
          width: 24px;
          height: 146px;
        }
        .cap {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10.5px;
          color: var(--muted);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .col.on .cap {
          color: var(--ink);
        }
        .bars {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column-reverse;
          /* The 2px surface gap that separates stacked segments. */
          gap: 2px;
        }
        .seg {
          display: block;
          width: 100%;
          flex-shrink: 0;
        }
        .col.on .seg {
          filter: brightness(1.15);
        }
        .month {
          font-size: 10.5px;
          color: var(--muted);
          height: 14px;
        }
        .none {
          position: absolute;
          inset: 0 0 24px 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
          font-size: 12px;
          pointer-events: none;
        }
        .tip {
          position: absolute;
          top: 0;
          right: 0;
          background: var(--surface-2);
          border: 1px solid var(--surface-3);
          border-radius: 9px;
          padding: 8px 10px;
          pointer-events: none;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
        }
        .tipValue {
          font-size: 14px;
          font-weight: 650;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
        }
        .tipMeta {
          font-size: 10.5px;
          color: var(--muted);
          margin-bottom: 5px;
        }
        .tipRow {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
        }
        .key {
          width: 10px;
          height: 2px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .tipNum {
          color: var(--ink);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .tipName {
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}
