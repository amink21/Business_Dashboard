import { RANGES } from '../lib/data';

// All time / 90 days / 30 days - the one range control, shared by Home and
// Stats so switching pages doesn't reset what window you were looking at.
export default function RangeTabs({ value, onChange }) {
  const index = Math.max(0, RANGES.findIndex((r) => r.id === value));

  return (
    <div
      className="tabs"
      role="group"
      aria-label="Date range"
      style={{ '--count': RANGES.length, '--index': index }}
    >
      <span className="thumb" aria-hidden="true" />
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`seg ${r.id === value ? 'on' : ''}`}
          aria-pressed={r.id === value}
          onClick={() => onChange(r.id)}
        >
          {r.label}
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
      `}</style>
    </div>
  );
}
