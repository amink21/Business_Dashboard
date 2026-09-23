import { fmtDate, fmtMoney } from '../lib/data';

function daysSince(date) {
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

const NEXT = {
  'Need to Print': { label: 'Mark printed', status: 'Printed' },
  Printed: { label: 'Mark waiting', status: 'Waiting for Pickup' },
  'Waiting for Pickup': { label: 'Mark picked up', status: 'Completed' },
};

export default function QueueCard({ order, expanded, onToggle, onAdvance, saving }) {
  const next = order.id ? NEXT[order.status] : null;
  const age = daysSince(order.date);

  return (
    <li className="card">
      <div className="row">
        <span className="avatar" aria-hidden="true">
          P
        </span>
        <span className="who">
          <span className="title">{order.item}</span>
          <span className="meta">
            {[order.customer || 'No customer', order.platform, order.delivery].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="price">{fmtMoney(order.sale, true)}</span>
      </div>

      <div className="tags">
        {order.hrs > 0 && <span className="tag">{order.hrs}h print</span>}
        {order.status === 'Need to Print' && order.date && (
          <span className="tag">In since {fmtDate(order.date)}</span>
        )}
        {(order.status === 'Printed' || order.status === 'Waiting for Pickup') && (
          <span className="tag warn">Waiting {age} day{age === 1 ? '' : 's'}</span>
        )}
        {order.status === 'Completed' && order.date && <span className="tag good">Done {fmtDate(order.date)}</span>}
      </div>

      {expanded && (
        <div className="details">
          {order.id && <div className="dRow"><span>Order ID</span><span>{order.id}</span></div>}
          <div className="dRow">
            <span>Material cost</span>
            <span>{fmtMoney(order.materialCost, true)}</span>
          </div>
          <div className="dRow">
            <span>Total cost</span>
            <span>{fmtMoney(order.cost, true)}</span>
          </div>
          {order.notes && <div className="notes">{order.notes}</div>}
        </div>
      )}

      <div className="actions">
        <button type="button" className="btn ghost" onClick={onToggle}>
          {expanded ? 'Hide' : 'Details'}
        </button>
        {next && (
          <button
            type="button"
            className="btn solid"
            disabled={saving}
            onClick={() => onAdvance(next.status)}
          >
            {saving ? 'Saving…' : next.label}
          </button>
        )}
      </div>

      <style jsx>{`
        .card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 13px 14px;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 11px;
        }
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--prints-wash);
          color: var(--prints);
          font-size: 12.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .who {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .title {
          font-size: 14px;
          font-weight: 650;
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
        .price {
          font-size: 14px;
          font-weight: 650;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .tags {
          display: flex;
          gap: 6px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .tag {
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-2);
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 3px 9px;
        }
        .tag.warn {
          color: var(--warning);
          background: rgba(250, 178, 25, 0.12);
          border-color: transparent;
        }
        .tag.good {
          color: var(--accent);
          background: var(--accent-wash);
          border-color: transparent;
        }
        .details {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .dRow {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--ink-2);
        }
        .dRow span:first-child {
          color: var(--muted);
        }
        .notes {
          font-size: 12px;
          color: var(--ink-2);
          margin-top: 3px;
          line-height: 1.4;
        }
        .actions {
          display: flex;
          gap: 8px;
          margin-top: 11px;
        }
        .btn {
          flex: 1;
          border-radius: 9px;
          padding: 9px 0;
          font-size: 12.5px;
          font-weight: 650;
          transition: transform 120ms ease;
        }
        .btn:active:not(:disabled) {
          transform: scale(0.96);
        }
        .btn.ghost {
          background: var(--surface-2);
          border: 1px solid var(--line);
          color: var(--ink-2);
        }
        .btn.solid {
          background: var(--ink);
          color: #0a0a0b;
          border: none;
        }
        .btn.solid:disabled {
          opacity: 0.5;
        }
      `}</style>
    </li>
  );
}
