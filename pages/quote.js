import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import Stepper from '../components/Stepper';
import { fmtMoney } from '../lib/data';
import { openCount } from '../lib/home';
import { normalize, summarize } from '../lib/print';
import { normalize as normalizeTesla } from '../lib/tesla';

const RATES = [4, 5, 6, 8];

// Nothing in the sheet prices a gram of filament or a delivery run, so these
// two are honest placeholders rather than derived facts - adjust them here if
// they're off for your spool and your driving.
const FILAMENT_PER_GRAM = 0.025; // ~$25/kg spool
const DELIVERY_FEE = 12;

function computeQuote({ hours, grams, delivery, rate }) {
  const printerTime = rate * hours;
  const filament = grams * FILAMENT_PER_GRAM;
  const deliveryCost = delivery ? DELIVERY_FEE : 0;
  const raw = printerTime + filament + deliveryCost;
  // Rounded up to a clean $5 so the number is easy to say out loud in a reply.
  const quote = Math.ceil(raw / 5) * 5;
  const keep = quote - filament - deliveryCost;
  const perHour = hours ? keep / hours : 0;
  return { printerTime, filament, deliveryCost, quote, keep, perHour };
}

export default function Quote() {
  const [raw, setRaw] = useState([]);
  const [rawTesla, setRawTesla] = useState([]);
  const [loading, setLoading] = useState(true);

  const [item, setItem] = useState('');
  const [hours, setHours] = useState(7);
  const [grams, setGrams] = useState(120);
  const [delivery, setDelivery] = useState(false);
  const [rate, setRate] = useState(5);

  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addedId, setAddedId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        fetch('/api/sheet?tab=print'),
        fetch('/api/sheet?tab=tesla'),
      ]);
      const [pData, tData] = await Promise.all([p.json(), t.json()]);
      if (p.ok) setRaw(pData);
      if (t.ok) setRawTesla(tData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const orders = useMemo(() => normalize(raw), [raw]);
  const items = useMemo(() => normalizeTesla(rawTesla), [rawTesla]);
  const stats = useMemo(() => summarize(orders), [orders]);
  const queueBadge = useMemo(() => openCount(orders, items), [orders, items]);

  const q = useMemo(() => computeQuote({ hours, grams, delivery, rate }), [hours, grams, delivery, rate]);

  const tone = !stats.medianRate
    ? 'good'
    : q.perHour >= stats.medianRate
      ? 'good'
      : q.perHour >= stats.medianRate * 0.6
        ? 'warn'
        : 'bad';

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  async function copyReply() {
    const name = item.trim() || 'this print';
    const text = `${name} comes out to ${fmtMoney(q.quote, true)} — about ${hours}h of print time. Let me know if you want it queued up!`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (err) {
      /* clipboard blocked - nothing to fall back to on a phone */
    }
  }

  async function addToQueue() {
    if (!item.trim() || adding) return;
    setAdding(true);
    setAddError(null);
    setAddedId(null);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          item: item.trim(),
          hours,
          materialCost: q.filament,
          deliveryCost: q.deliveryCost,
          price: q.quote,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not add to queue.');
      setAddedId(body.orderId || 'the queue');
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <Head>
        <title>Quote — Hustle Desk</title>
      </Head>

      <AppShell kicker="3D PRINT" title="Quote" queueBadge={queueBadge}>
        <section className="form">
          <label className="row">
            <span className="rLabel">Item</span>
            <input
              type="text"
              className="itemInput"
              placeholder="e.g. Porsche Spoiler Shelf"
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </label>

          <div className="row">
            <span className="rLabel">Print time</span>
            <Stepper value={hours} onChange={setHours} step={0.5} unit="h" decimals={hours % 1 ? 1 : 0} />
          </div>

          <div className="row">
            <span className="rLabel">Filament</span>
            <Stepper value={grams} onChange={setGrams} step={10} unit="g" />
          </div>

          <div className="row last">
            <span className="rLabel">Delivery</span>
            <button
              type="button"
              className={`toggle ${delivery ? 'on' : ''}`}
              role="switch"
              aria-checked={delivery}
              aria-label="Include delivery"
              onClick={() => setDelivery((v) => !v)}
            >
              <span className="knob" />
            </button>
          </div>
        </section>

        <div className="rateLabel">Rate per printer hour</div>
        <div className="rates">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              className={`rate ${rate === r ? 'on' : ''}`}
              aria-pressed={rate === r}
              onClick={() => setRate(r)}
            >
              {fmtMoney(r)}
            </button>
          ))}
        </div>

        <section className="result">
          <div className="rTop">
            <div>
              <div className="rLabel2">Quote</div>
              <div className="rBig">{fmtMoney(q.quote)}</div>
            </div>
            <span className={`perHr ${tone}`}>{fmtMoney(q.perHour, true)}/hr</span>
          </div>

          <div className="rRows">
            <div className="rRow">
              <span>Printer time</span>
              <span>{fmtMoney(q.printerTime, true)}</span>
            </div>
            <div className="rRow">
              <span>Filament</span>
              <span>{fmtMoney(q.filament, true)}</span>
            </div>
            <div className="rRow">
              <span>Delivery</span>
              <span>{fmtMoney(q.deliveryCost, true)}</span>
            </div>
          </div>

          <div className="rKeep">
            <span>You keep</span>
            <span className="keepVal">{fmtMoney(q.keep, true)}</span>
          </div>
        </section>

        {addError && <div className="error">{addError}</div>}
        {addedId && (
          <div className="success">
            Added as {addedId}. <Link href="/queue">View in Queue →</Link>
          </div>
        )}

        <div className="actions">
          <button type="button" className="btn ghost" onClick={copyReply}>
            <Icon name="copy" size={16} />
            {copied ? 'Copied' : 'Copy reply'}
          </button>
          <button type="button" className="btn solid" onClick={addToQueue} disabled={!item.trim() || adding || loading}>
            {adding ? 'Adding…' : 'Add to queue'}
          </button>
        </div>
      </AppShell>

      <style jsx>{`
        .form {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 4px 16px;
          margin: 6px 0 18px;
        }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
        }
        .row.last {
          border-bottom: none;
        }
        .rLabel {
          font-size: 14px;
          color: var(--ink-2);
          flex-shrink: 0;
        }
        .itemInput {
          flex: 1;
          min-width: 0;
          background: none;
          border: none;
          color: var(--ink);
          font-size: 14px;
          text-align: right;
        }
        .itemInput::placeholder {
          color: var(--muted);
        }
        .toggle {
          width: 46px;
          height: 27px;
          border-radius: 14px;
          background: var(--surface-3);
          border: 1px solid var(--line);
          padding: 2px;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: background 140ms ease;
        }
        .toggle:active .knob {
          width: 24px;
        }
        .toggle.on {
          background: var(--accent);
          border-color: var(--accent);
          justify-content: flex-end;
        }
        .knob {
          width: 21px;
          height: 21px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
          transition: width 140ms ease;
        }
        .rateLabel {
          font-size: 12.5px;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .rates {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 18px;
        }
        .rate {
          background: var(--surface);
          border: 1px solid var(--line);
          color: var(--ink-2);
          font-size: 13.5px;
          font-weight: 650;
          padding: 10px 0;
          border-radius: 10px;
          transition: transform 120ms ease;
        }
        .rate:active {
          transform: scale(0.94);
        }
        .rate.on {
          background: var(--accent-wash);
          border-color: var(--accent-dim);
          color: var(--accent);
        }
        .result {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 14px;
        }
        .rTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .rLabel2 {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .rBig {
          font-size: 34px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin-top: 4px;
          font-variant-numeric: tabular-nums;
        }
        .perHr {
          font-size: 12px;
          font-weight: 650;
          padding: 5px 10px;
          border-radius: 999px;
          margin-top: 2px;
          white-space: nowrap;
        }
        .perHr.good {
          color: var(--accent);
          background: var(--accent-wash);
        }
        .perHr.warn {
          color: var(--warning);
          background: rgba(250, 178, 25, 0.14);
        }
        .perHr.bad {
          color: var(--critical);
          background: rgba(208, 59, 59, 0.14);
        }
        .rRows {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 16px;
          font-size: 13px;
          color: var(--muted);
        }
        .rRow {
          display: flex;
          justify-content: space-between;
        }
        .rKeep {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--line);
          font-size: 14px;
          color: var(--ink-2);
        }
        .keepVal {
          color: var(--accent);
          font-weight: 700;
        }
        .error {
          background: rgba(208, 59, 59, 0.12);
          border: 1px solid rgba(208, 59, 59, 0.35);
          color: var(--critical);
          font-size: 12.5px;
          border-radius: 9px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .success {
          background: var(--accent-wash);
          border: 1px solid var(--accent-dim);
          color: var(--accent);
          font-size: 12.5px;
          border-radius: 9px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .success :global(a) {
          color: inherit;
          font-weight: 650;
        }
        .actions {
          display: flex;
          gap: 10px;
          padding-bottom: 8px;
        }
        .btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 12px;
          padding: 13px 0;
          font-size: 14px;
          font-weight: 650;
          transition: transform 120ms ease;
        }
        .btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        .btn.ghost {
          background: var(--surface-2);
          border: 1px solid var(--line);
          color: var(--ink);
        }
        .btn.solid {
          background: var(--ink);
          color: #0a0a0b;
          border: none;
        }
        .btn.solid:disabled {
          opacity: 0.4;
        }
      `}</style>
    </>
  );
}
