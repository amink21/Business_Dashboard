import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import IconButton from '../components/IconButton';
import QueueCard from '../components/QueueCard';
import Skeleton from '../components/Skeleton';
import { fmtMoney } from '../lib/data';
import { normalize, queueBucket } from '../lib/print';

const TABS = [
  { id: 'toPrint', label: 'To print' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'done', label: 'Done' },
];

const SUMMARY = {
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

export default function Queue() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [writeError, setWriteError] = useState(null);
  const [tab, setTab] = useState('toPrint');
  const [expanded, setExpanded] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sheet?tab=print');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRaw(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const orders = useMemo(() => normalize(raw), [raw]);
  const buckets = useMemo(() => {
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

  const open = buckets.toPrint.length + buckets.pickup.length;
  const openValue = [...buckets.toPrint, ...buckets.pickup].reduce((s, o) => s + o.sale, 0);
  const list = buckets[tab];
  const summary = SUMMARY[tab](list);

  async function advance(row, status) {
    const previous = raw;
    setSavingKey(row.id);
    setWriteError(null);
    setRaw((rows) =>
      rows.map((r) => (r['Order ID'] === row.id ? { ...r, Status: status } : r))
    );

    const post = (pin) =>
      fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pin ? { 'x-dashboard-pin': pin } : {}),
        },
        body: JSON.stringify({ orderId: row.id, status }),
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

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not save.');
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
          <IconButton
            name="plus"
            label="Add a job from a quote"
            onClick={() => window.location.assign('/quote')}
          />
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

        <div
          className="tabs"
          role="group"
          aria-label="Queue stage"
          style={{ '--count': TABS.length, '--index': TABS.findIndex((t) => t.id === tab) }}
        >
          <span className="thumb" aria-hidden="true" />
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${tab === t.id ? 'on' : ''}`}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label} <span className="count">{buckets[t.id].length}</span>
            </button>
          ))}
        </div>

        <div className="summary">
          <span>{summary.left}</span>
          <span className="sVal">{summary.right}</span>
        </div>

        {loading && !raw.length ? (
          <Skeleton rows={3} />
        ) : list.length ? (
          <ul className="list">
            {list.map((o) => (
              <QueueCard
                key={o.id || `${o.item}-${o.date?.getTime()}`}
                order={o}
                expanded={expanded === o.id}
                onToggle={() => setExpanded((cur) => (cur === o.id ? null : o.id))}
                onAdvance={(status) => advance(o, status)}
                saving={savingKey === o.id}
              />
            ))}
          </ul>
        ) : (
          <div className="empty">Nothing here.</div>
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
        .tabs {
          position: relative;
          display: flex;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
          margin-top: 6px;
        }
        .thumb {
          position: absolute;
          top: 3px;
          bottom: 3px;
          left: 3px;
          width: calc((100% - 6px) / var(--count));
          background: var(--surface-3);
          border-radius: 7px;
          transform: translateX(calc(var(--index) * 100%));
          transition: transform 220ms var(--ease-out);
        }
        @media (prefers-reduced-motion: reduce) {
          .thumb {
            transition: none;
          }
        }
        .tab {
          position: relative;
          z-index: 1;
          flex: 1;
          background: none;
          border: none;
          color: var(--muted);
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 0;
          border-radius: 7px;
          transition: transform 120ms ease;
        }
        .tab:active {
          transform: scale(0.95);
        }
        .tab.on {
          color: var(--ink);
        }
        .count {
          font-variant-numeric: tabular-nums;
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
