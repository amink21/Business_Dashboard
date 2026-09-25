import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import ChargerCard from '../components/ChargerCard';
import IconButton from '../components/IconButton';
import QueueCard from '../components/QueueCard';
import SegmentedTabs from '../components/SegmentedTabs';
import Skeleton from '../components/Skeleton';
import { fmtMoney } from '../lib/data';
import { openCount } from '../lib/home';
import { normalize as normalizePrint, queueBucket } from '../lib/print';
import { normalize as normalizeTesla, teslaBucket } from '../lib/tesla';

const HUSTLES = [
  { id: 'prints', label: 'Prints' },
  { id: 'chargers', label: 'Chargers' },
];

const PRINT_TABS = [
  { id: 'toPrint', label: 'To print' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'done', label: 'Done' },
];
const CHARGER_TABS = [
  { id: 'available', label: 'Available' },
  { id: 'pending', label: 'Pending' },
  { id: 'sold', label: 'Sold' },
];

const PRINT_SUMMARY = {
  toPrint: (list) => ({
    left: `${list.reduce((s, o) => s + o.hrs, 0).toFixed(0)} h of printing queued`,
    right: fmtMoney(list.reduce((s, o) => s + o.sale, 0), true),
  }),
  pickup: (list) => ({
    left: `${list.length} waiting for pickup`,
    right: fmtMoney(list.reduce((s, o) => s + o.sale, 0), true),
  }),
  done: (list) => ({
    left: `${list.length} completed`,
    right: fmtMoney(list.reduce((s, o) => s + o.sale, 0), true),
  }),
};
const CHARGER_SUMMARY = {
  available: (list) => ({
    left: `${list.length} in stock`,
    right: fmtMoney(list.reduce((s, i) => s + i.buy, 0), true),
  }),
  pending: (list) => ({
    left: `${list.length} pending pickup`,
    right: fmtMoney(list.reduce((s, i) => s + (i.sale || i.buy), 0), true),
  }),
  sold: (list) => ({
    left: `${list.length} sold`,
    right: fmtMoney(list.reduce((s, i) => s + i.sale, 0), true),
  }),
};

export default function Queue() {
  const [rawPrint, setRawPrint] = useState([]);
  const [rawTesla, setRawTesla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [writeError, setWriteError] = useState(null);

  const [hustle, setHustle] = useState('prints');
  const [printTab, setPrintTab] = useState('toPrint');
  const [chargerTab, setChargerTab] = useState('available');
  const [expanded, setExpanded] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, t] = await Promise.all([
        fetch('/api/sheet?tab=print'),
        fetch('/api/sheet?tab=tesla'),
      ]);
      const [pData, tData] = await Promise.all([p.json(), t.json()]);
      if (!p.ok) throw new Error(pData.error || 'Failed to load prints');
      if (!t.ok) throw new Error(tData.error || 'Failed to load chargers');
      setRawPrint(pData);
      setRawTesla(tData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const orders = useMemo(() => normalizePrint(rawPrint), [rawPrint]);
  const items = useMemo(() => normalizeTesla(rawTesla), [rawTesla]);

  const printBuckets = useMemo(() => {
    const out = { toPrint: [], pickup: [], done: [] };
    for (const o of orders) {
      const b = queueBucket(o.status);
      if (b) out[b].push(o);
    }
    out.toPrint.sort((a, b) => (a.date && b.date ? a.date - b.date : 0));
    out.pickup.sort((a, b) => (a.date && b.date ? a.date - b.date : 0));
    out.done.sort((a, b) => (a.date && b.date ? b.date - a.date : 0));
    return out;
  }, [orders]);

  const chargerBuckets = useMemo(() => {
    const out = { available: [], pending: [], sold: [] };
    for (const i of items) {
      const b = teslaBucket(i.status);
      if (b) out[b].push(i);
    }
    out.available.sort((a, b) => (a.date && b.date ? a.date - b.date : 0));
    out.pending.sort((a, b) => (a.date && b.date ? a.date - b.date : 0));
    out.sold.sort((a, b) => (a.date && b.date ? b.date - a.date : 0));
    return out;
  }, [items]);

  const open = useMemo(() => openCount(orders, items), [orders, items]);
  const openValue =
    printBuckets.toPrint.reduce((s, o) => s + o.sale, 0) +
    printBuckets.pickup.reduce((s, o) => s + o.sale, 0) +
    chargerBuckets.available.reduce((s, i) => s + i.buy, 0) +
    chargerBuckets.pending.reduce((s, i) => s + (i.sale || i.buy), 0);

  const printList = printBuckets[printTab];
  const chargerList = chargerBuckets[chargerTab];
  const printSummary = PRINT_SUMMARY[printTab](printList);
  const chargerSummary = CHARGER_SUMMARY[chargerTab](chargerList);

  function switchHustle(next) {
    setHustle(next);
    setExpanded(null);
  }

  // Both hustles write through the same shape - optimistic local update, POST,
  // PIN retry on 401, rollback on failure - just to a different endpoint and
  // id column. One function instead of four near-identical copies.
  async function saveWrite(kind, idValue, body) {
    const isPrint = kind === 'print';
    const url = isPrint ? '/api/order' : '/api/tesla';
    const idColumn = isPrint ? 'Order ID' : 'Item ID';
    const setRaw = isPrint ? setRawPrint : setRawTesla;

    let previous;
    setSavingKey(idValue);
    setWriteError(null);
    setRaw((rows) => {
      previous = rows;
      return rows.map((r) =>
        r[idColumn] === idValue
          ? {
              ...r,
              ...(body.status !== undefined ? { Status: body.status } : {}),
              ...(body.salePrice !== undefined ? { 'Sale Price': body.salePrice } : {}),
            }
          : r
      );
    });

    const post = (pin) =>
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pin ? { 'x-dashboard-pin': pin } : {}),
        },
        body: JSON.stringify(body),
      });

    try {
      let stored = null;
      try {
        stored = window.localStorage.getItem('dashboardPin');
      } catch (err) {
        stored = null;
      }

      let res = await post(stored);
      if (res.status === 401) {
        const entered = window.prompt('PIN required to change orders');
        if (!entered) throw new Error('Cancelled.');
        try {
          window.localStorage.setItem('dashboardPin', entered);
        } catch (err) {
          /* private mode - it just asks again next time */
        }
        res = await post(entered);
      }

      const resBody = await res.json();
      if (!res.ok) throw new Error(resBody.error || 'Could not save.');
    } catch (e) {
      setRaw(previous);
      setWriteError(e.message);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <>
      <Head>
        <title>Queue — Hustle Desk</title>
      </Head>

      <AppShell
        kicker={`${open} OPEN · ${fmtMoney(openValue)}`}
        title="Queue"
        queueBadge={open}
        actions={
          hustle === 'prints' ? (
            <IconButton
              name="plus"
              label="Add a job from a quote"
              onClick={() => window.location.assign('/quote')}
            />
          ) : undefined
        }
      >
        {error && <div className="error">{error}</div>}
        {writeError && (
          <div className="error">
            {writeError}{' '}
            <button type="button" className="dismiss" onClick={() => setWriteError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="hustleWrap">
          <SegmentedTabs options={HUSTLES} value={hustle} onChange={switchHustle} ariaLabel="Hustle" />
        </div>

        {hustle === 'prints' ? (
          <>
            <SegmentedTabs
              options={PRINT_TABS.map((t) => ({ ...t, count: printBuckets[t.id].length }))}
              value={printTab}
              onChange={setPrintTab}
              ariaLabel="Print queue stage"
            />

            <div className="summary">
              <span>{printSummary.left}</span>
              <span className="sVal">{printSummary.right}</span>
            </div>

            {loading && !rawPrint.length ? (
              <Skeleton rows={3} />
            ) : printList.length ? (
              <ul className="list">
                {printList.map((o) => (
                  <QueueCard
                    key={o.id || `${o.item}-${o.date?.getTime()}`}
                    order={o}
                    expanded={expanded === o.id}
                    onToggle={() => setExpanded((cur) => (cur === o.id ? null : o.id))}
                    onAdvance={(status) => saveWrite('print', o.id, { orderId: o.id, status })}
                    onEditPrice={(price) => saveWrite('print', o.id, { orderId: o.id, salePrice: price })}
                    saving={savingKey === o.id}
                  />
                ))}
              </ul>
            ) : (
              <div className="empty">Nothing here.</div>
            )}
          </>
        ) : (
          <>
            <SegmentedTabs
              options={CHARGER_TABS.map((t) => ({ ...t, count: chargerBuckets[t.id].length }))}
              value={chargerTab}
              onChange={setChargerTab}
              ariaLabel="Charger queue stage"
            />

            <div className="summary">
              <span>{chargerSummary.left}</span>
              <span className="sVal">{chargerSummary.right}</span>
            </div>

            {loading && !rawTesla.length ? (
              <Skeleton rows={3} />
            ) : chargerList.length ? (
              <ul className="list">
                {chargerList.map((i) => (
                  <ChargerCard
                    key={i.id}
                    item={i}
                    expanded={expanded === i.id}
                    onToggle={() => setExpanded((cur) => (cur === i.id ? null : i.id))}
                    onAdvance={(status) => saveWrite('charger', i.id, { itemId: i.id, status })}
                    onEditPrice={(price) => saveWrite('charger', i.id, { itemId: i.id, salePrice: price })}
                    saving={savingKey === i.id}
                  />
                ))}
              </ul>
            ) : (
              <div className="empty">Nothing here.</div>
            )}
          </>
        )}
      </AppShell>

      <style jsx>{`
        .error {
          background: rgba(208, 59, 59, 0.12);
          border: 1px solid rgba(208, 59, 59, 0.35);
          color: var(--critical);
          font-size: 12.5px;
          border-radius: 9px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .dismiss {
          background: none;
          border: none;
          color: inherit;
          text-decoration: underline;
          font-size: 12px;
          padding: 0 2px;
        }
        .hustleWrap {
          margin-top: 6px;
          margin-bottom: 10px;
        }
        .summary {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          color: var(--muted);
          padding: 14px 2px 10px;
        }
        .sVal {
          color: var(--ink-2);
          font-weight: 650;
          font-variant-numeric: tabular-nums;
        }
        .list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .empty {
          text-align: center;
          color: var(--muted);
          font-size: 13px;
          padding: 40px 0;
        }
      `}</style>
    </>
  );
}
