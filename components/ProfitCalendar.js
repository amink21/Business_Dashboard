import { useMemo, useState } from 'react';
import { fmtDate, fmtMoney } from '../lib/data';

// Sequential encoding: one hue, low to high. A heatmap is continuous magnitude,
// so the quietest step is allowed to recede toward the surface - which is why it
// ships with a scale legend and a table twin rather than leaning on color alone.
const RAMP = ['#123a30', '#0a5f47', '#04895f', '#05af80', '#3fd6a4'];
const EMPTY = 'var(--surface-3)';

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// Break points come from the data's own quantiles, so a quiet month still shows
// shape instead of collapsing to one shade.
function bucketer(values) {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!sorted.length) return () => -1;
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const cuts = [at(0.2), at(0.4), at(0.6), at(0.8)];
  return (v) => {
    if (v <= 0) return -1;
    let i = 0;
    while (i < cuts.length && v > cuts[i]) i += 1;
    return i;
  };
}

export default function ProfitCalendar({ days, unit = 'profit' }) {
  const [view, setView] = useState('grid');
  const [hover, setHover] = useState(null);

  const weeks = useMemo(() => {
    if (!days.length) return [];
    const cells = [];
    // Pad to the start of the week so every column is a real Sun-Sat week.
    const first = days[0].date;
    for (let i = 0; i < first.getUTCDay(); i += 1) cells.push(null);
    cells.push(...days);
    while (cells.length % 7) cells.push(null);
    const out = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [days]);

  const bucketOf = useMemo(() => bucketer(days.map((d) => d.value)), [days]);

  const monthCols = useMemo(() => {
    const marks = [];
    let last = '';
    weeks.forEach((week, i) => {
      const day = week.find(Boolean);
      if (!day) return;
      const label = day.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      if (label !== last) {
        marks.push({ col: i, label });
        last = label;
      }
    });
    return marks;
  }, [weeks]);

  const active = days.filter((d) => d.value > 0);
  const best = active.reduce((b, d) => (!b || d.value > b.value ? d : b), null);
  const total = active.reduce((s, d) => s + d.value, 0);

  return (
    <div className="cal">
      <div className="head">
        <span className="note">
          {active.length
            ? `${active.length} earning day${active.length === 1 ? '' : 's'} · best ${fmtMoney(
                best.value,
                true
              )} on ${fmtDate(best.date, true)}`
            : 'No earning days in this range'}
        </span>
        <div className="toggle" role="group" aria-label="Calendar view">
          <button
            type="button"
            className={`seg ${view === 'grid' ? 'on' : ''}`}
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
          >
            Grid
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

      {view === 'grid' ? (
        <>
          <div className="scroll">
            <div className="months" style={{ gridTemplateColumns: `repeat(${weeks.length}, 16px)` }}>
              {monthCols.map((m) => (
                <span key={m.label + m.col} style={{ gridColumnStart: m.col + 1 }}>
                  {m.label}
                </span>
              ))}
            </div>

            <div className="body">
              <div className="dayLabels">
                {DAY_LABELS.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              <div className="grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, 16px)` }}>
                {weeks.map((week, wi) =>
                  week.map((day, di) => {
                    const key = `${wi}-${di}`;
                    if (!day) return <span key={key} className="cell blank" />;
                    const b = bucketOf(day.value);
                    return (
                      <span
                        key={key}
                        className="cell"
                        tabIndex={0}
                        style={{ background: b < 0 ? EMPTY : RAMP[b] }}
                        aria-label={`${fmtDate(day.date, true)}: ${fmtMoney(day.value, true)} ${unit}`}
                        onPointerEnter={() => setHover(day)}
                        onPointerLeave={() => setHover(null)}
                        onFocus={() => setHover(day)}
                        onBlur={() => setHover(null)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="foot">
            <span className="tip">
              {hover
                ? `${fmtMoney(hover.value, true)} · ${fmtDate(hover.date, true)}`
                : `${fmtMoney(total, true)} across the range`}
            </span>
            <span className="legend">
              Less
              <span className="swatch" style={{ background: EMPTY }} />
              {RAMP.map((c) => (
                <span key={c} className="swatch" style={{ background: c }} />
              ))}
              More
            </span>
          </div>
        </>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col" className="r">
                  {unit === 'profit' ? 'Net profit' : 'Value'}
                </th>
              </tr>
            </thead>
            <tbody>
              {active.length ? (
                active
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((d) => (
                    <tr key={d.date.toISOString()}>
                      <td>{fmtDate(d.date, true)}</td>
                      <td className="r num">{fmtMoney(d.value, true)}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={2} className="none">
                    Nothing earned in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .note {
          font-size: 11.5px;
          color: var(--muted);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .toggle {
          display: inline-flex;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
          flex-shrink: 0;
        }
        .seg {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 11.5px;
          font-weight: 550;
          padding: 4px 9px;
          border-radius: 6px;
        }
        .seg.on {
          background: var(--surface-3);
          color: var(--ink);
        }
        .scroll {
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .months {
          display: grid;
          gap: 3px;
          margin-left: 30px;
          margin-bottom: 5px;
          font-size: 10px;
          color: var(--muted);
        }
        .body {
          display: flex;
          gap: 6px;
        }
        .dayLabels {
          display: grid;
          grid-template-rows: repeat(7, 13px);
          gap: 3px;
          font-size: 9.5px;
          color: var(--muted);
          width: 24px;
          text-align: right;
          line-height: 13px;
        }
        .grid {
          display: grid;
          grid-auto-flow: column;
          grid-template-rows: repeat(7, 13px);
          gap: 3px;
        }
        .cell {
          width: 13px;
          height: 13px;
          border-radius: 3px;
          display: block;
        }
        .cell:not(.blank) {
          cursor: default;
        }
        .cell:focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 1px;
        }
        .blank {
          background: transparent;
        }
        .foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          font-size: 11px;
          color: var(--muted);
        }
        .tip {
          font-variant-numeric: tabular-nums;
          color: var(--ink-2);
        }
        .legend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .swatch {
          width: 11px;
          height: 11px;
          border-radius: 3px;
          display: inline-block;
        }
        .tableWrap {
          max-height: 220px;
          overflow-y: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        th {
          text-align: left;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--muted);
          font-weight: 600;
          padding: 6px 4px;
          position: sticky;
          top: 0;
          background: var(--surface);
          border-bottom: 1px solid var(--line);
        }
        td {
          padding: 7px 4px;
          color: var(--ink-2);
          border-bottom: 1px solid var(--line);
        }
        tr:last-child td {
          border-bottom: none;
        }
        .r {
          text-align: right;
        }
        .num {
          font-variant-numeric: tabular-nums;
          color: var(--ink);
          font-weight: 600;
        }
        .none {
          text-align: center;
          color: var(--muted);
          padding: 24px 0;
        }
      `}</style>
    </div>
  );
}
