import { RANGES } from '../lib/data';

// One filter row, sitting above everything it scopes. The chart, the tiles and
// the feed all re-render from the same slice, so the numbers on screen always
// agree with the list under them.
export default function FilterRow({
  rangeId,
  onRange,
  search,
  onSearch,
  status,
  onStatus,
  statuses,
  placeholder,
}) {
  return (
    <div className="filters">
      <div className="segment" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`seg ${r.id === rangeId ? 'on' : ''}`}
            aria-pressed={r.id === rangeId}
            onClick={() => onRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        className="search"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        aria-label="Search"
      />

      <div className="chips" role="group" aria-label="Status">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip ${s === status ? 'on' : ''}`}
            aria-pressed={s === status}
            onClick={() => onStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <style jsx>{`
        .filters {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .segment {
          display: inline-flex;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
        }
        .seg {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 12px;
          font-weight: 550;
          padding: 5px 11px;
          border-radius: 6px;
        }
        .seg.on {
          background: var(--surface-3);
          color: var(--ink);
        }
        .search {
          flex: 1;
          min-width: 180px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 8px;
          color: var(--ink);
          font-size: 12.5px;
          padding: 7px 11px;
        }
        .search::placeholder {
          color: var(--muted);
        }
        .chips {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
          /* A flex item defaults to min-width:auto, so without this the chip row
             refuses to shrink below its content and pushes the whole page wide. */
          flex: 1 1 100%;
          min-width: 0;
        }
        .chip {
          flex-shrink: 0;
          background: var(--surface);
          border: 1px solid var(--line);
          color: var(--muted);
          font-size: 11.5px;
          font-weight: 550;
          padding: 5px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .chip.on {
          background: var(--accent-wash);
          border-color: var(--accent-dim);
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}
