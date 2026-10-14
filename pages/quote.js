import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import SegmentedTabs from '../components/SegmentedTabs';
import Stepper from '../components/Stepper';
import { fmtMoney } from '../lib/data';
import { openCount } from '../lib/home';
import { normalize, summarize } from '../lib/print';
import { normalize as normalizeTesla } from '../lib/tesla';

const HUSTLES = [
  { id: 'prints', label: 'Prints' },
  { id: 'chargers', label: 'Chargers' },
];
const DELIVERY_OPTIONS = [
  { id: 'Montreal', label: 'Montreal' },
  { id: 'Ottawa', label: 'Ottawa' },
  { id: 'Delivery (Extra $)', label: 'Delivery' },
];

function computeQuote({ hours, materialCost, otherCost, salePrice }) {
  const keep = salePrice - materialCost - otherCost;
  const perHour = hours ? keep / hours : 0;
  return { keep, perHour };
}

export default function Quote() {
  const router = useRouter();
  const [hustle, setHustle] = useState('prints');

  useEffect(() => {
    if (router.query.tab === 'prints' || router.query.tab === 'chargers') {
      setHustle(router.query.tab);
    }
  }, [router.query.tab]);

  // Shared between both sides - both need the full print+charger picture for
  // the queue badge, and the print side also needs it for its rate history.
  const [rawPrint, setRawPrint] = useState([]);
  const [rawTesla, setRawTesla] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        fetch('/api/sheet?tab=print'),
        fetch('/api/sheet?tab=tesla'),
      ]);
      const [pData, tData] = await Promise.all([p.json(), t.json()]);
      if (p.ok) setRawPrint(pData);
      if (t.ok) setRawTesla(tData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const orders = useMemo(() => normalize(rawPrint), [rawPrint]);
  const items = useMemo(() => normalizeTesla(rawTesla), [rawTesla]);
  const stats = useMemo(() => summarize(orders), [orders]);
  const queueBadge = useMemo(() => openCount(orders, items), [orders, items]);

  // ---------------------------------------------------------------- Prints
  const [customer, setCustomer] = useState('');
  const [item, setItem] = useState('');
  const [hours, setHours] = useState(7);
  const [materialCost, setMaterialCost] = useState(3);
  const [otherCost, setOtherCost] = useState(0);
  const [salePrice, setSalePrice] = useState(40);
  const [delivery, setDelivery] = useState('Montreal');
  const [notes, setNotes] = useState('');

  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addedId, setAddedId] = useState(null);

  const q = useMemo(
    () => computeQuote({ hours, materialCost, otherCost, salePrice }),
    [hours, materialCost, otherCost, salePrice]
  );

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
    const greeting = customer.trim() ? `Hey ${customer.trim()}! ` : '';
    const name = item.trim() || 'this print';
    const text = `${greeting}${name} comes out to ${fmtMoney(salePrice, true)} — about ${hours}h of print time. Let me know if you want it queued up!`;
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
          customer: customer.trim(),
          item: item.trim(),
          hours,
          materialCost,
          otherCost,
          price: salePrice,
          delivery,
          notes: notes.trim(),
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

  // --------------------------------------------------------------- Chargers
  const [product, setProduct] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(100);

  const [stocking, setStocking] = useState(false);
  const [stockError, setStockError] = useState(null);
  const [stockedCount, setStockedCount] = useState(null);

  const products = useMemo(
    () => Array.from(new Set(items.map((i) => i.product).filter(Boolean))).sort(),
    [items]
  );
  const suppliers = useMemo(
    () => Array.from(new Set(items.map((i) => i.supplier).filter(Boolean))).sort(),
    [items]
  );
  const totalCost = purchasePrice * quantity;

  async function addStock() {
    if (!product.trim() || stocking) return;
    setStocking(true);
    setStockError(null);
    setStockedCount(null);
    try {
      const res = await fetch('/api/tesla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          product: product.trim(),
          supplier: supplier.trim(),
          purchasePrice,
          quantity,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not add stock.');
      setStockedCount(body.count || quantity);
      setProduct('');
      setQuantity(1);
    } catch (e) {
      setStockError(e.message);
    } finally {
      setStocking(false);
    }
  }

  return (
    <>
      <Head>
        <title>{`${hustle === 'prints' ? 'Quote' : 'Log Stock'} — Hustle Desk`}</title>
      </Head>

      <AppShell
        kicker={hustle === 'prints' ? '3D PRINT' : 'TESLA CHARGERS'}
        title={hustle === 'prints' ? 'Quote' : 'Log Stock'}
        queueBadge={queueBadge}
      >
        <div className="hustleWrap">
          <SegmentedTabs options={HUSTLES} value={hustle} onChange={setHustle} ariaLabel="Hustle" />
        </div>

        {hustle === 'prints' ? (
          <>
            <section className="form">
              <label className="row">
                <span className="rLabel">Customer</span>
                <input
                  type="text"
                  className="textInput"
                  placeholder="optional"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
              </label>

              <label className="row">
                <span className="rLabel">Item</span>
                <input
                  type="text"
                  className="textInput"
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
                <span className="rLabel">Material cost</span>
                <Stepper
                  value={materialCost}
                  onChange={setMaterialCost}
                  step={0.5}
                  unit="$"
                  decimals={materialCost % 1 ? 2 : 0}
                />
              </div>

              <div className="row">
                <span className="rLabel">Other cost</span>
                <Stepper
                  value={otherCost}
                  onChange={setOtherCost}
                  step={0.5}
                  unit="$"
                  decimals={otherCost % 1 ? 2 : 0}
                />
              </div>

              <div className="row">
                <span className="rLabel">Sale price</span>
                <Stepper
                  value={salePrice}
                  onChange={setSalePrice}
                  step={5}
                  unit="$"
                  decimals={salePrice % 1 ? 2 : 0}
                />
              </div>

              <label className="row last">
                <span className="rLabel">Notes</span>
                <input
                  type="text"
                  className="textInput"
                  placeholder="optional"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </section>

            <div className="sectionLabel">Delivery</div>
            <div className="deliveryWrap">
              <SegmentedTabs options={DELIVERY_OPTIONS} value={delivery} onChange={setDelivery} ariaLabel="Delivery" />
            </div>

            <section className="result">
              <div className="rTop">
                <div>
                  <div className="rLabel2">You keep</div>
                  <div className={`rBig ${q.keep >= 0 ? 'good' : 'bad'}`}>{fmtMoney(q.keep, true)}</div>
                </div>
                <span className={`pill ${tone}`}>{fmtMoney(q.perHour, true)}/hr</span>
              </div>

              <div className="rRows">
                <div className="rRow">
                  <span>Sale price</span>
                  <span>{fmtMoney(salePrice, true)}</span>
                </div>
                <div className="rRow">
                  <span>Material cost</span>
                  <span>−{fmtMoney(materialCost, true)}</span>
                </div>
                <div className="rRow">
                  <span>Other cost</span>
                  <span>−{fmtMoney(otherCost, true)}</span>
                </div>
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
              <button
                type="button"
                className="btn solid"
                onClick={addToQueue}
                disabled={!item.trim() || !(salePrice > 0) || adding || loading}
              >
                {adding ? 'Adding…' : 'Add to queue'}
              </button>
            </div>
          </>
        ) : (
          <>
            <section className="form">
              <label className="row">
                <span className="rLabel">Product</span>
                <input
                  type="text"
                  className="textInput"
                  list="productOptions"
                  placeholder="e.g. 120V Mobile Connector"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                />
                <datalist id="productOptions">
                  {products.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </label>

              <label className="row">
                <span className="rLabel">Supplier</span>
                <input
                  type="text"
                  className="textInput"
                  list="supplierOptions"
                  placeholder="optional"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
                <datalist id="supplierOptions">
                  {suppliers.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>

              <div className="row">
                <span className="rLabel">Quantity</span>
                <Stepper
                  value={quantity}
                  onChange={(v) => setQuantity(Math.max(1, Math.round(v)))}
                  step={1}
                  unit="×"
                />
              </div>

              <div className="row last">
                <span className="rLabel">Price each</span>
                <Stepper
                  value={purchasePrice}
                  onChange={setPurchasePrice}
                  step={5}
                  unit="$"
                  decimals={purchasePrice % 1 ? 2 : 0}
                />
              </div>
            </section>

            <section className="result">
              <div className="rTop">
                <div>
                  <div className="rLabel2">Total cost</div>
                  <div className="rBig charger">{fmtMoney(totalCost, true)}</div>
                </div>
                <span className="pill charger">
                  {quantity} × {fmtMoney(purchasePrice, true)}
                </span>
              </div>
            </section>

            {stockError && <div className="error">{stockError}</div>}
            {stockedCount && (
              <div className="success">
                Added {stockedCount} to inventory. <Link href="/queue?tab=chargers">View in Queue →</Link>
              </div>
            )}

            <button
              type="button"
              className="btn solid full"
              onClick={addStock}
              disabled={!product.trim() || !(purchasePrice > 0) || stocking || loading}
            >
              {stocking ? 'Adding…' : `Add ${quantity} to inventory`}
            </button>
          </>
        )}
      </AppShell>

      <style jsx>{`
        .hustleWrap {
          margin-top: 4px;
          margin-bottom: 14px;
        }
        .form {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 4px 16px;
          margin-bottom: 18px;
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
        .textInput {
          flex: 1;
          min-width: 0;
          background: none;
          border: none;
          color: var(--ink);
          font-size: 14px;
          text-align: right;
        }
        .textInput::placeholder {
          color: var(--muted);
        }
        .sectionLabel {
          font-size: 12.5px;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .deliveryWrap {
          margin-bottom: 18px;
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
          margin-top: 4px;
          font-variant-numeric: tabular-nums;
        }
        .rBig.good {
          color: var(--accent);
        }
        .rBig.bad {
          color: var(--critical);
        }
        .rBig.charger {
          color: var(--chargers);
        }
        .pill {
          font-size: 12px;
          font-weight: 650;
          padding: 5px 10px;
          border-radius: 999px;
          margin-top: 2px;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .pill.good {
          color: var(--accent);
          background: var(--accent-wash);
        }
        .pill.warn {
          color: var(--warning);
          background: rgba(250, 178, 25, 0.14);
        }
        .pill.bad {
          color: var(--critical);
          background: rgba(208, 59, 59, 0.14);
        }
        .pill.charger {
          color: var(--chargers);
          background: var(--chargers-wash);
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
        .btn.full {
          width: 100%;
          margin-bottom: 8px;
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
