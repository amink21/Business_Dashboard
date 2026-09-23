import StatusPill from './StatusPill';
import { fmtDate, fmtMoney } from '../lib/data';

function initials(text) {
  // Meta lines are separator-joined ("Laurence · Facebook · Montreal"), so keep
  // only the words that actually start with a letter or digit.
  const parts = String(text || '')
    .split(/\s+/)
    .filter((w) => /^[a-z0-9]/i.test(w));
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

// Transaction rows, shared by both dashboards. Each page maps its own records
// into { key, title, meta, badge, kind, status, amount, sub, date }.
export default function RecordFeed({ rows, emptyText, statusOptions, onStatusChange, savingKey }) {
  if (!rows.length) {
    return (
      <div className="empty">
        {emptyText || 'Nothing matches this filter.'}
        <style jsx>{`
          .empty {
            text-align: center;
            color: var(--muted);
            font-size: 13px;
            padding: 40px 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <ul className="feed">
      {rows.map((r) => (
        <li key={r.key} className="row">
          <span className="avatar" aria-hidden="true">
            {r.badge || initials(r.meta)}
          </span>

          <span className="who">
            <span className="title">{r.title}</span>
            <span className="meta">{r.meta}</span>
          </span>

          <span className="state">
            {statusOptions && r.editable !== false ? (
              <span className={`editable ${savingKey === r.key ? 'saving' : ''}`}>
                <StatusPill kind={r.kind} label={r.status || 'Unknown'} />
                <span className="caret" aria-hidden="true">
                  ▾
                </span>
                {/* A native select rather than a custom popover: on a phone this
                    is the OS picker, which beats anything hand-rolled. */}
                <select
                  value={r.status || ''}
                  disabled={savingKey === r.key}
                  onChange={(e) => onStatusChange(r, e.target.value)}
                  aria-label={`Status for ${r.title}`}
                >
                  {(statusOptions.includes(r.status)
                    ? statusOptions
                    : [r.status || 'Unknown', ...statusOptions]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </span>
            ) : (
              <StatusPill kind={r.kind} label={r.status || 'Unknown'} />
            )}
          </span>

          <span className="amount">
            <span className="value">{fmtMoney(r.amount, true)}</span>
            <span className="sub">{r.sub}</span>
          </span>

          <span className="when">{fmtDate(r.date)}</span>
        </li>
      ))}

      <style jsx>{`
        .feed {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .row {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) auto 96px 62px;
          align-items: center;
          gap: 12px;
          padding: 11px 15px;
          border-bottom: 1px solid var(--line);
        }
        .row:last-child {
          border-bottom: none;
        }
        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: var(--surface-3);
          color: var(--ink-2);
          font-size: 10.5px;
          letter-spacing: -0.01em;
          font-weight: 650;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .who {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .title {
          font-size: 13.5px;
          font-weight: 550;
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
        .editable {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          border-radius: 7px;
          padding: 1px 3px 1px 1px;
        }
        @media (hover: hover) and (pointer: fine) {
          .editable:hover {
            background: var(--surface-2);
          }
        }
        .editable.saving {
          opacity: 0.5;
        }
        .caret {
          font-size: 9px;
          color: var(--muted);
        }
        .editable select {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          border: none;
          appearance: none;
          -webkit-appearance: none;
        }
        .editable:focus-within {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .amount {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-variant-numeric: tabular-nums;
        }
        .value {
          font-size: 13.5px;
          font-weight: 650;
          color: var(--ink);
        }
        .sub {
          font-size: 11px;
          color: var(--muted);
          margin-top: 1px;
        }
        .when {
          font-size: 11.5px;
          color: var(--muted);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        @media (max-width: 640px) {
          .row {
            grid-template-columns: 30px minmax(0, 1fr) auto;
            grid-template-areas:
              'avatar who amount'
              '. state when';
            row-gap: 7px;
          }
          .avatar {
            grid-area: avatar;
          }
          .who {
            grid-area: who;
          }
          .amount {
            grid-area: amount;
          }
          .state {
            grid-area: state;
          }
          .when {
            grid-area: when;
          }
        }
      `}</style>
    </ul>
  );
}
