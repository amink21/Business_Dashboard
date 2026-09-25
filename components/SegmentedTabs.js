// The sliding-thumb segmented control, generalized: RangeTabs and Queue's
// hustle/stage tabs are all the same control with a different option list, so
// the thumb-position math lives here once instead of three times.
export default function SegmentedTabs({ options, value, onChange, ariaLabel }) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));

  return (
    <div
      className="tabs"
      role="group"
      aria-label={ariaLabel}
      style={{ '--count': options.length, '--index': index }}
    >
      <span className="thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`seg ${o.id === value ? 'on' : ''}`}
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
        >
          {o.label}
          {o.count != null && <span className="count">{o.count}</span>}
        </button>
      ))}

      <style jsx>{`
        .tabs {
          position: relative;
          display: flex;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        .thumb {
          position: absolute;
          top: 3px;
          bottom: 3px;
          left: 3px;
          width: calc((100% - 6px) / var(--count));
          background: var(--surface-3);
          border-radius: 7px;
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
          background: none;
          border: none;
          color: var(--muted);
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 0;
          border-radius: 7px;
          transition: transform 120ms ease, color 140ms ease;
        }
        .seg:active {
          transform: scale(0.95);
        }
        .seg.on {
          color: var(--ink);
        }
        .count {
          margin-left: 4px;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}
