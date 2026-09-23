import { fmtDate, fmtMoney } from '../lib/data';

const STATUS_COLOR = {
  completed: 'var(--accent)',
  cancelled: 'var(--critical)',
  queued: 'var(--warning)',
  inflight: 'var(--ink-2)',
};

const TONE_VAR = {
  accent: 'var(--accent)',
  chargers: 'var(--chargers)',
  prints: 'var(--prints)',
  warning: 'var(--warning)',
};

function relative(date) {
  if (!date) return '';
  const ms = Date.now() - date.getTime();
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return fmtDate(date);
}

export default function PaymentsList({ rows }) {
  if (!rows.length) {
    return <div className="empty">Nothing recent.</div>;
  }

  return (
    <ul className="list">
      {rows.map((r) => (
        <li key={r.key} className="row">
          <span
            className="avatar"
            style={{ color: TONE_VAR[r.tone] || 'var(--ink-2)', background: 'var(--surface-3)' }}
            aria-hidden="true"
          >
            {r.badge}
          </span>
          <span className="who">
            <span className="title">{r.title}</span>
            <span className="meta">
              {r.meta} · {relative(r.date)}
            </span>
          </span>
          <span className="amount">
            <span className="value">+{fmtMoney(r.amount, true)}</span>
            <span className="status" style={{ color: STATUS_COLOR[r.kind] || 'var(--muted)' }}>
              {r.status || '—'}
            </span>
          </span>
        </li>
      ))}

      <style jsx>{`
        .list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 1px solid var(--line);
        }
        .row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .who {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .meta {
          font-size: 11.5px;
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 1px;
        }
        .amount {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .value {
          font-size: 13.5px;
          font-weight: 650;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
        }
        .status {
          font-size: 11px;
          font-weight: 600;
          margin-top: 2px;
        }
        .empty {
          text-align: center;
          color: var(--muted);
          font-size: 13px;
          padding: 30px 0;
        }
      `}</style>
    </ul>
  );
}
