import { useState } from 'react';
import Icon from './Icon';
import { fmtMoney } from '../lib/data';

// A price that's a tap away from being corrected, shared by print orders and
// chargers - both write through the same "edit one number, save one call"
// shape, just to different endpoints (the caller supplies onSave).
export default function PriceEditor({ value, onSave, saving, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function start() {
    if (saving) return;
    setDraft(value > 0 ? String(value) : '');
    setEditing(true);
  }

  function save() {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) onSave(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="editor">
        <span className="dollar">$</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="ok" onClick={save} aria-label="Save price">
          <Icon name="check" size={12} />
        </button>
        <button type="button" className="no" onClick={() => setEditing(false)} aria-label="Cancel">
          <Icon name="close" size={12} />
        </button>

        <style jsx>{`
          .editor {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: var(--surface-2);
            border: 1px solid var(--accent-dim);
            border-radius: 8px;
            padding: 3px 4px 3px 8px;
          }
          .dollar {
            font-size: 13px;
            color: var(--muted);
          }
          input {
            width: 56px;
            background: none;
            border: none;
            outline: none;
            color: var(--ink);
            font-size: 13.5px;
            font-weight: 650;
            font-variant-numeric: tabular-nums;
            /* Browsers default a number input to a bordered, OS-chrome look
               with up/down spinners - every other control in this app draws
               its own chrome instead, so this one has to opt out explicitly. */
            -moz-appearance: textfield;
          }
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .ok,
          .no {
            width: 22px;
            height: 22px;
            border: none;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .ok {
            color: var(--accent);
            background: var(--accent-wash);
          }
          .no {
            color: var(--muted);
            background: var(--surface-3);
          }
        `}</style>
      </span>
    );
  }

  return (
    <button type="button" className={`price ${value > 0 ? '' : 'empty'}`} onClick={start} disabled={saving}>
      {value > 0 ? fmtMoney(value, true) : placeholder || 'Set price'}

      <style jsx>{`
        .price {
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 650;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          border-radius: 6px;
          padding: 2px 5px;
          margin: -2px -5px;
        }
        .price.empty {
          color: var(--muted);
          font-size: 12.5px;
          font-weight: 600;
        }
        .price:hover:not(:disabled) {
          background: var(--surface-2);
        }
        .price:disabled {
          opacity: 0.5;
        }
      `}</style>
    </button>
  );
}
