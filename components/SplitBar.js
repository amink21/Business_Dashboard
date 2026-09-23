// A single bar split between the two hustles - part-to-whole where the whole
// is always exactly 100%, so unlike BarChart there is no shared axis to read
// bars against, just the one split.
export default function SplitBar({ chargersPct, printsPct }) {
  const c = Math.max(0, chargersPct || 0);
  const p = Math.max(0, printsPct || 0);
  const total = c + p;
  const cw = total ? (c / total) * 100 : 50;
  const pw = total ? (p / total) * 100 : 50;

  return (
    <div className="split">
      <div className="track">
        {total > 0 && (
          <>
            <span className="seg" style={{ width: `${cw}%`, background: 'var(--chargers)' }} />
            <span className="seg" style={{ width: `${pw}%`, background: 'var(--prints)' }} />
          </>
        )}
      </div>
      <div className="legend">
        <span className="item">
          <span className="dot" style={{ background: 'var(--chargers)' }} />
          Chargers {c.toFixed(0)}%
        </span>
        <span className="item">
          <span className="dot" style={{ background: 'var(--prints)' }} />
          Prints {p.toFixed(0)}%
        </span>
      </div>

      <style jsx>{`
        .track {
          display: flex;
          height: 8px;
          border-radius: 5px;
          overflow: hidden;
          background: var(--surface-3);
        }
        .seg {
          height: 100%;
          transition: width 260ms ease;
        }
        .legend {
          display: flex;
          justify-content: space-between;
          margin-top: 9px;
          font-size: 12px;
          color: var(--ink-2);
        }
        .item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
