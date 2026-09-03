import { fmtDate, fmtMoney } from '../lib/data';

// The chart's table twin. Everything the crosshair can show is reachable here
// without hovering, so no value is gated behind an interaction.
export default function VolumeTable({ points }) {
  const rows = points.filter((p, i) => p.added > 0 || i === points.length - 1);

  return (
    <div className="scroll">
      <table>
        <caption className="sr">Cumulative gross volume by day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col" className="r">
              Sales that day
            </th>
            <th scope="col" className="r">
              Cumulative
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((p) => (
              <tr key={p.date.toISOString()}>
                <td>{fmtDate(p.date, true)}</td>
                <td className="r num">{p.added ? fmtMoney(p.added, true) : '—'}</td>
                <td className="r num strong">{fmtMoney(p.value, true)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="empty">
                No completed sales in this range.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style jsx>{`
        .scroll {
          overflow-x: auto;
          max-height: 256px;
          overflow-y: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }
        .sr {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }
        th {
          text-align: left;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--muted);
          font-weight: 600;
          padding: 6px 10px;
          position: sticky;
          top: 0;
          background: var(--surface);
          border-bottom: 1px solid var(--line);
        }
        td {
          padding: 7px 10px;
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
        }
        .strong {
          color: var(--ink);
          font-weight: 600;
        }
        .empty {
          text-align: center;
          color: var(--muted);
          padding: 24px 0;
        }
      `}</style>
    </div>
  );
}
