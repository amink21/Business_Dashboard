import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import AlertToast from '../components/AlertToast';
import Card from '../components/Card';
import HustleTile from '../components/HustleTile';
import IconButton from '../components/IconButton';
import NeedsYouList from '../components/NeedsYouList';
import PaymentsList from '../components/PaymentsList';
import RangeTabs from '../components/RangeTabs';
import Skeleton from '../components/Skeleton';
import StackedColumnChart from '../components/StackedColumnChart';
import SplitBar from '../components/SplitBar';
import { fmtMoney, inBounds, rangeBounds } from '../lib/data';
import { printAlerts, teslaAlerts } from '../lib/alerts';
import { combineMonthly, combineStats, latestActivity, needsYou } from '../lib/home';
import { monthlyStack as printMonthlyStack, normalize as normalizePrint, queueBucket, summarize as summarizePrint } from '../lib/print';
import { monthlyStack as teslaMonthlyStack, normalize as normalizeTesla, summarize as summarizeTesla } from '../lib/tesla';
import { useCountUp } from '../lib/useCountUp';

const CHARGERS_PRINTS_SERIES = [
  { key: 'chargers', label: 'Chargers', color: 'var(--chargers)' },
  { key: 'prints', label: 'Prints', color: 'var(--prints)' },
];

export default function Home() {
  const [rawPrint, setRawPrint] = useState([]);
  const [rawTesla, setRawTesla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [rangeId, setRangeId] = useState('all');
  const [nonce, setNonce] = useState(0);
  const [kicker, setKicker] = useState('');

  useEffect(() => {
    setKicker(
      new Date()
        .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        .toUpperCase()
    );
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, t] = await Promise.all([
        fetch('/api/sheet?tab=print'),
        fetch('/api/sheet?tab=tesla'),
      ]);
      setStale(p.headers.get('x-from-cache') === '1' || t.headers.get('x-from-cache') === '1');
      const [pData, tData] = await Promise.all([p.json(), t.json()]);
      if (!p.ok) throw new Error(pData.error || 'Failed to load prints');
      if (!t.ok) throw new Error(tData.error || 'Failed to load chargers');
      setRawPrint(pData);
      setRawTesla(tData);
      setSyncedAt(new Date());
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

  const printStatsFull = useMemo(() => summarizePrint(orders), [orders]);
  const bounds = useMemo(() => rangeBounds([...orders, ...items], rangeId), [orders, items, rangeId]);

  const scopedOrders = useMemo(() => orders.filter((o) => inBounds(o, bounds)), [orders, bounds]);
  const scopedItems = useMemo(() => items.filter((i) => inBounds(i, bounds)), [items, bounds]);

  const printStats = useMemo(() => summarizePrint(scopedOrders), [scopedOrders]);
  const teslaStats = useMemo(() => summarizeTesla(scopedItems), [scopedItems]);
  const combined = useMemo(() => combineStats(printStats, teslaStats), [printStats, teslaStats]);
  const displayNet = useCountUp(combined.net);

  const monthly = useMemo(
    () =>
      combineMonthly(
        teslaMonthlyStack(scopedItems, bounds),
        printMonthlyStack(scopedOrders, bounds)
      ),
    [scopedItems, scopedOrders, bounds]
  );

  const needs = useMemo(() => needsYou(orders, items, printStatsFull), [orders, items, printStatsFull]);
  const queueBadge = useMemo(() => orders.filter((o) => queueBucket(o.status)).length, [orders]);
  const activity = useMemo(() => latestActivity(scopedOrders, scopedItems, 5), [scopedOrders, scopedItems]);

  const alerts = useMemo(
    () => [...printAlerts(scopedOrders, printStats), ...teslaAlerts(scopedItems, teslaStats)],
    [scopedOrders, printStats, scopedItems, teslaStats]
  );

  useEffect(() => {
    if (!loading && (rawPrint.length || rawTesla.length) && nonce === 0) setNonce(1);
  }, [loading, rawPrint.length, rawTesla.length, nonce]);

  return (
    <>
      <Head>
        <title>Hustle Desk</title>
      </Head>
      <AlertToast alerts={alerts} nonce={nonce} app="HUSTLE DESK" mark="🖨️" />

      <AppShell
        kicker={kicker}
        title="Hustle Desk"
        onAlert={() => setNonce((n) => n + 1)}
        queueBadge={queueBadge}
        actions={<IconButton name="refresh" label="Refresh" onClick={load} disabled={loading} />}
      >
        {error && <div className="error">{error}</div>}

        <RangeTabs value={rangeId} onChange={setRangeId} />

        <section className="hero">
          <div className="label">Net profit · both hustles</div>
          <div className="value">{fmtMoney(displayNet, true)}</div>
          <div className="sub">
            on {fmtMoney(combined.gross, true)} gross · {combined.margin.toFixed(1)}% margin
          </div>
          <div className="splitWrap">
            <SplitBar chargersPct={combined.chargersShare} printsPct={combined.printsShare} />
          </div>
        </section>

        <NeedsYouList items={needs} />

        <div className="two">
          <HustleTile
            tone="chargers"
            title="Chargers"
            profit={fmtMoney(teslaStats.net, true)}
            href="/stats?tab=chargers"
            rows={[
              { label: 'Margin', value: `${teslaStats.margin.toFixed(1)}%` },
              { label: 'In stock', value: String(teslaStats.available) },
              { label: 'Sell-through', value: `${teslaStats.sellThrough.toFixed(1)}%` },
            ]}
          />
          <HustleTile
            tone="prints"
            title="Prints"
            profit={fmtMoney(printStats.net, true)}
            href="/stats?tab=prints"
            rows={[
              { label: 'Margin', value: `${printStats.margin.toFixed(1)}%` },
              { label: 'Open orders', value: String(printStats.pipeline) },
              { label: 'Per print hr', value: fmtMoney(printStats.profitPerHour, true) },
            ]}
          />
        </div>

        <div className="block">
          <Card title="Revenue by month" note="net profit, chargers vs prints">
            <StackedColumnChart data={monthly} series={CHARGERS_PRINTS_SERIES} />
          </Card>
        </div>

        <div className="block">
          <Card
            title="Latest payments"
            aside={
              <Link href="/stats" className="seeAll">
                See all
              </Link>
            }
          >
            {loading && !rawPrint.length && !rawTesla.length ? (
              <Skeleton rows={4} />
            ) : (
              <PaymentsList rows={activity} />
            )}
          </Card>
        </div>

        <footer className="foot">
          <span>Google Sheets · 3D Print Orders + Tesla Inventory</span>
          <span>
            {stale
              ? 'Offline · showing last synced numbers'
              : syncedAt
                ? `Synced ${syncedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : '—'}
          </span>
        </footer>
      </AppShell>

      <style jsx>{`
        .error {
          background: rgba(208, 59, 59, 0.12);
          border: 1px solid rgba(208, 59, 59, 0.35);
          color: var(--critical);
          font-size: 12.5px;
          border-radius: 9px;
          padding: 10px 12px;
          margin-bottom: 14px;
        }
        .hero {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 18px 16px;
          margin: 14px 0;
        }
        .label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .value {
          font-size: 38px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin-top: 6px;
          font-variant-numeric: tabular-nums;
        }
        .sub {
          font-size: 12.5px;
          color: var(--muted);
          margin-top: 4px;
        }
        .splitWrap {
          margin-top: 16px;
        }
        .two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        :global(.seeAll) {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
        }
        .block {
          margin-bottom: 14px;
        }
        .foot {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 11px;
          color: var(--muted);
          padding: 18px 2px 6px;
        }
      `}</style>
    </>
  );
}
