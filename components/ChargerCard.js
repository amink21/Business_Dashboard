import PriceEditor from './PriceEditor';
import { fmtDate, fmtMoney } from '../lib/data';

function daysSince(date) {
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

// Selling needs a price on the row before it means anything, so - unlike
// print orders, which can advance with one tap - "Mark sold" only lights up
// once the price editor has something in it.
const NEXT = {
  Available: { label: 'Mark pending', status: 'Pending Pickup', needsPrice: false },
  'Pending Pickup': { label: 'Mark sold', status: 'Sold', needsPrice: true },
};

export default function ChargerCard({ item, expanded, onToggle, onAdvance, onEditPrice, saving }) {
  const next = item.id ? NEXT[item.status] : null;
  const blocked = next && next.needsPrice && !(item.sale > 0);
  const age = daysSince(item.purchased);

  return (
    <li className="card">
      <div className="row">
        <span className="avatar" aria-hidden="true">
          C
        </span>
        <span className="who">
          <span className="title">{item.product}</span>
          <span className="meta">
            {[item.supplier, `bought ${fmtMoney(item.buy, true)}`].filter(Boolean).join(' · ')}
          </span>
        </span>
        {item.id ? (
          <PriceEditor value={item.sale} onSave={onEditPrice} saving={saving} placeholder="Set price" />
        ) : (
          <span className="staticPrice">{fmtMoney(item.sale || item.buy, true)}</span>
        )}
      </div>

      <div className="tags">
        {item.status === 'Available' && <span className="tag">{age}d in stock</span>}
        {item.status === 'Pending Pickup' && <span className="tag warn">Pending {item.daysListed || age}d</span>}
        {item.status === 'Sold' && item.sold && <span className="tag good">Sold {fmtDate(item.sold)}</span>}
        {item.status === 'Sold' && item.profit > 0 && (
          <span className="tag good">{fmtMoney(item.profit, true)} profit</span>
        )}
        {blocked && <span className="tag warn">Needs a price first</span>}
      </div>

      {expanded && (
        <div className="details">
          {item.id && (
            <div className="dRow">
              <span>Item ID</span>
              <span>{item.id}</span>
            </div>
          )}
          <div className="dRow">
            <span>Purchase price</span>
            <span>{fmtMoney(item.buy, true)}</span>
          </div>
          <div className="dRow">
            <span>Days listed</span>
            <span>{item.daysListed || age}</span>
          </div>
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
            disabled={saving || blocked}
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
          background: var(--chargers-wash);
          color: var(--chargers);
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
        .staticPrice {
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
