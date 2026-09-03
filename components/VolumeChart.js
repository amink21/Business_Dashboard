import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fmtDate, fmtMoney } from '../lib/data';

// useLayoutEffect has no server equivalent and warns when it runs during SSR.
// The measurement it does only means anything in a browser anyway.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

// Round the axis top to a clean number so the ticks read 0 / 400 / 800, never
// 0 / 411 / 823.
function niceMax(v) {
  if (!v || v <= 0) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((s) => s >= n) || 10;
  return step * mag;
}

const PAD = { top: 18, right: 18, bottom: 30, left: 56 };
const PLOT_H = 208;

export default function VolumeChart({ points, label, emptyText }) {
  const [wrapRef, width] = useWidth();
  const [cursor, setCursor] = useState(null);
  const svgRef = useRef(null);

  const peak = Math.max(0, ...points.map((p) => p.value));
  const max = useMemo(() => niceMax(peak), [peak]);
  const empty = !points.length || peak === 0;

  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = PLOT_H;

  const xAt = useCallback(
    (i) => PAD.left + (points.length < 2 ? innerW : (i / (points.length - 1)) * innerW),
    [innerW, points.length]
  );
  const yAt = useCallback((v) => PAD.top + innerH - (v / max) * innerH, [innerH, max]);

  const paths = useMemo(() => {
    if (!points.length || !width) return { line: '', area: '' };
    const segs = points.map(
      (p, i) => (i ? 'L' : 'M') + xAt(i).toFixed(2) + ' ' + yAt(p.value).toFixed(2)
    );
    const base = PAD.top + innerH;
    const line = segs.join(' ');
    return {
      line,
      area:
        line +
        ' L' + xAt(points.length - 1).toFixed(2) + ' ' + base +
        ' L' + xAt(0).toFixed(2) + ' ' + base + ' Z',
    };
  }, [points, width, xAt, yAt, innerH]);

  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => max * f), [max]);

  const xTickIdx = useMemo(() => {
    if (points.length < 2) return points.length ? [0] : [];
    const wanted = width < 420 ? 2 : width < 620 ? 3 : 4;
    if (points.length <= wanted) return points.map((_, i) => i);
    return Array.from({ length: wanted }, (_, k) =>
      Math.round((k / (wanted - 1)) * (points.length - 1))
    );
  }, [points, width]);

  // The crosshair only has to find the nearest X - the reader aims at a date,
  // never at a 2px line.
  const nearestIndex = useCallback(
    (clientX) => {
      const svg = svgRef.current;
      if (!svg || points.length < 2) return points.length ? 0 : null;
      const box = svg.getBoundingClientRect();
      const rel = clientX - box.left - PAD.left;
      const i = Math.round((rel / innerW) * (points.length - 1));
      return Math.max(0, Math.min(points.length - 1, i));
    },
    [innerW, points.length]
  );

  const onKeyDown = (e) => {
    if (!points.length) return;
    const cur = cursor == null ? points.length - 1 : cursor;
    let next = null;
    if (e.key === 'ArrowRight') next = Math.min(points.length - 1, cur + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = points.length - 1;
    else if (e.key === 'Escape') {
      setCursor(null);
      return;
    }
    if (next != null) {
      e.preventDefault();
      setCursor(next);
    }
  };

  useEffect(() => setCursor(null), [points]);

  const lastIdx = points.length - 1;
  const activeIdx = cursor == null ? lastIdx : cursor;
  const active = points[activeIdx];
  const tipLeft = width ? Math.min(Math.max(xAt(activeIdx), 82), width - 82) : 0;

  const summary = points.length
    ? fmtMoney(points[lastIdx].value, true) + ' by ' + fmtDate(points[lastIdx].date, true)
    : 'No data';

  return (
    <div className="wrap" ref={wrapRef}>
      {width > 0 && (
        <svg
          ref={svgRef}
          className="svg"
          width={width}
          height={PLOT_H + PAD.top + PAD.bottom}
          role="img"
          tabIndex={0}
          aria-label={label + '. ' + summary + '. Arrow keys read individual days.'}
          onPointerMove={(e) => setCursor(nearestIndex(e.clientX))}
          onPointerLeave={() => setCursor(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setCursor(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={yAt(t)}
                y2={yAt(t)}
                stroke={t === 0 ? 'var(--baseline)' : 'var(--grid)'}
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text className="tick" x={PAD.left - 10} y={yAt(t) + 4} textAnchor="end">
                {fmtMoney(t)}
              </text>
            </g>
          ))}

          {xTickIdx.map((i) => (
            <text key={i} className="tick" x={xAt(i)} y={PAD.top + innerH + 20} textAnchor="middle">
              {fmtDate(points[i].date)}
            </text>
          ))}

          {!empty && (
            <>
              <path d={paths.area} fill="var(--accent-wash)" />
              <path
                d={paths.line}
                fill="none"
                stroke="var(--accent-line)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {!empty && cursor != null && (
            <line
              x1={xAt(cursor)}
              x2={xAt(cursor)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--baseline)"
              strokeWidth="1"
              shapeRendering="crispEdges"
            />
          )}

          {!empty && active && (
            <circle
              cx={xAt(activeIdx)}
              cy={yAt(active.value)}
              r="4.5"
              fill="var(--accent)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          )}

          {empty && (
            <text
              className="none"
              x={PAD.left + innerW / 2}
              y={PAD.top + innerH / 2}
              textAnchor="middle"
            >
              {emptyText || 'No completed sales in this range'}
            </text>
          )}
        </svg>
      )}

      {!empty && active && cursor != null && (
        <div className="tip" style={{ left: tipLeft }} role="status">
          <div className="tipValue">{fmtMoney(active.value, true)}</div>
          <div className="tipRow">
            <span className="key" aria-hidden="true" />
            <span>{fmtDate(active.date, true)}</span>
          </div>
          {active.added > 0 && (
            <div className="tipAdd">{'+' + fmtMoney(active.added, true) + ' that day'}</div>
          )}
        </div>
      )}

      <style jsx>{`
        .wrap {
          position: relative;
          width: 100%;
        }
        .svg {
          display: block;
          touch-action: pan-y;
        }
        .svg:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: 8px;
        }
        .tip {
          position: absolute;
          top: 2px;
          transform: translateX(-50%);
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
        .tipRow {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--ink-2);
          margin-top: 3px;
        }
        .key {
          width: 12px;
          height: 2px;
          border-radius: 2px;
          background: var(--accent);
          display: inline-block;
        }
        .tipAdd {
          font-size: 11px;
          color: var(--muted);
          margin-top: 2px;
        }
      `}</style>
      <style jsx global>{`
        .svg .tick {
          fill: var(--muted);
          font-size: 10.5px;
          font-variant-numeric: tabular-nums;
        }
        .svg .none {
          fill: var(--muted);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
