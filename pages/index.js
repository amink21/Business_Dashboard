import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import BarChart from '../components/BarChart';
import Card from '../components/Card';
import ProfitCalendar from '../components/ProfitCalendar';
import FilterRow from '../components/FilterRow';
import RecordFeed from '../components/RecordFeed';
import AlertToast from '../components/AlertToast';
import Shell from '../components/Shell';
import StackedColumnChart from '../components/StackedColumnChart';
import StatTile from '../components/StatTile';
import VolumePanel from '../components/VolumePanel';
import {
  cumulativeSeries,
  dailySeries,
  fmtDate,
  fmtMoney,
  inBounds,
  pctChange,
  rangeBounds,
  shiftBounds,
  sparkSeries,
  topBy,
} from '../lib/data';
import { printAlerts } from '../lib/alerts';
import { lookupMetric, monthlyStack, normalize, pipelineBars, summarize } from '../lib/print';

export default function PrintOverview() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [equipment, setEquipment] = useState(undefined);

  const [rangeId, setRangeId] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [nonce, setNonce] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sheet?tab=print');
      // The service worker tags a response it served from cache while offline.
      setStale(res.headers.get('x-from-cache') === '1');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRaw(data);
      setSyncedAt(new Date());

      // Equipment spend lives on the summary tab as a labelled cell. It is a
      // second-class fetch: if it fails the rest of the page is still correct.
      try {
        const sum = await fetch('/api/sheet?tab=printSummary&raw=1');
        const body = await sum.json();
        setEquipment(sum.ok ? lookupMetric(body.rows, 'Total Equipment & Filament Spent') : null);
      } catch {
        setEquipment(null);
      }
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
  const bounds = useMemo(() => rangeBounds(orders, rangeId), [orders, rangeId]);

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (!inBounds(o, bounds)) return false;
      if (status !== 'All' && o.status !== status) return false;
      if (!q) return true;
      return `${o.id} ${o.customer} ${o.item} ${o.platform}`.toLowerCase().includes(q);
    });
  }, [orders, bounds, status, search]);

  const stats = useMemo(() => summarize(scoped), [scoped]);
  const points = useMemo(
    () =>
      cumulativeSeries(
        scoped,
        bounds,
        (o) => o.date,
        (o) => (o.kind === 'completed' ? o.sale : 0)
      ),
    [scoped, bounds]
  );

  // The window immediately before this one. "All time" has nothing before it, so
  // it shows no delta rather than a made-up one.
  const prev = useMemo(() => {
    const pb = shiftBounds(bounds);
    if (!pb) return null;
    return summarize(orders.filter((o) => inBounds(o, pb)));
  }, [orders, bounds]);

  const calendar = useMemo(
    () => dailySeries(scoped, bounds, (o) => o.date, (o) => (o.kind === 'completed' ? o.profit : 0)),
    [scoped, bounds]
  );
  const months = useMemo(() => monthlyStack(scoped, bounds), [scoped, bounds]);
  const pipeline = useMemo(() => pipelineBars(scoped), [scoped]);
  const topItems = useMemo(
    () =>
      topBy(
        scoped.filter((o) => o.kind === 'completed'),
        (o) => o.item,
        (o) => o.profit,
        8
      ),
    [scoped]
  );
  const topCustomers = useMemo(
    () =>
      topBy(
        scoped.filter((o) => o.kind === 'completed'),
        (o) => o.customer,
        (o) => o.profit,
        6
      ),
    [scoped]
  );

  const profitSpark = useMemo(
    () => sparkSeries(scoped, bounds, (o) => (o.kind === 'completed' ? o.profit : 0)),
    [scoped, bounds]
  );
  const orderSpark = useMemo(() => sparkSeries(scoped, bounds, () => 1), [scoped, bounds]);
  const hoursSpark = useMemo(() => sparkSeries(scoped, bounds, (o) => o.hrs), [scoped, bounds]);

  const statuses = useMemo(
    () => ['All', ...Array.from(new Set(orders.map((o) => o.status).filter(Boolean)))],
    [orders]
  );

  const alerts = useMemo(() => printAlerts(scoped, stats), [scoped, stats]);

  useEffect(() => {
    if (!loading && raw.length && nonce === 0) setNonce(1);
  }, [loading, raw.length, nonce]);

  const feed = useMemo(
    () =>
      scoped
        .slice()
        .reverse()
        .map((o) => ({
          key: o.id || `${o.customer}-${o.item}`,
          badge: (o.customer || '?').trim().charAt(0).toUpperCase() || '?',
          title: o.item,
          meta: [o.customer || 'No customer', o.platform, o.delivery].filter(Boolean).join(' · '),
          kind: o.kind,
          status: o.status,
          amount: o.sale,
          sub: o.profit ? `${fmtMoney(o.profit, true)} net` : `${o.hrs || 0}h print`,
          date: o.date,
        })),
    [scoped]
  );

  const rangeLabel = bounds
    ? `${fmtDate(bounds.from, true)} – ${fmtDate(bounds.to, true)}`
    : 'No dated orders';

  return (
    <>
      <Head>
        <title>Print Lab</title>
      </Head>
      <AlertToast alerts={alerts} nonce={nonce} app="PRINT LAB" mark="🖨️" />

      <Shell
        path="/printing"
        loading={loading}
        onRefresh={load}
        onAlert={() => setNonce((n) => n + 1)}
        dim={loading && raw.length > 0}
      >
        {error && <div className="error">{error}</div>}

        <FilterRow
          rangeId={rangeId}
          onRange={setRangeId}
          search={search}
          onSearch={setSearch}
          status={status}
          onStatus={setStatus}
          statuses={statuses}
          placeholder="Search customer, item, order ID…"
        />

        <VolumePanel
          label="Gross volume"
          value={stats.gross}
          delta={prev ? pctChange(stats.gross, prev.gross) : null}
          deltaLabel={bounds && bounds.days ? `vs prior ${bounds.days}d` : ''}
          sub={`${stats.completed} succeeded · ${rangeLabel}`}
          points={points}
        />

        <div className="kpis">
          <StatTile
            label="Net profit"
            value={fmtMoney(stats.net, true)}
            tone="accent"
            sub="after material + other costs"
            delta={prev ? pctChange(stats.net, prev.net) : null}
            points={profitSpark}
          />
          <StatTile
            label="Margin"
            value={`${stats.margin.toFixed(1)}%`}
            sub={`${fmtMoney(stats.cogs, true)} spent on materials`}
          />
          <StatTile
            label="Avg order"
            value={fmtMoney(stats.avgOrder, true)}
            sub={`across ${stats.completed} completed`}
          />
          <StatTile
            label="Profit / print hour"
            value={fmtMoney(stats.profitPerHour, true)}
            sub="what an hour of printer time earns"
          />
          <StatTile
            label="Pipeline value"
            value={fmtMoney(stats.pipelineValue, true)}
            sub={`${stats.pipeline} orders not yet closed`}
            points={orderSpark}
          />
          <StatTile
            label="Cancel rate"
            value={`${stats.cancelRate.toFixed(0)}%`}
            sub={`${stats.cancelled} of ${stats.count} orders`}
          />
          <StatTile
            label="Repeat customers"
            value={String(stats.repeat)}
            sub={`of ${stats.customers} people`}
          />
          <StatTile
            label="Print hours"
            value={stats.hours.toFixed(1)}
            sub={stats.count ? `${(stats.hours / stats.count).toFixed(1)} h per order` : 'no orders'}
            points={hoursSpark}
          />
          <StatTile
            label="After equipment"
            value={equipment ? fmtMoney(stats.net - equipment, true) : '—'}
            tone={equipment ? (stats.net - equipment >= 0 ? 'accent' : 'critical') : undefined}
            sub={
              equipment
                ? `${fmtMoney(equipment, true)} on printer + filament`
                : equipment === undefined
                  ? 'reading the summary tab…'
                  : 'summary tab unavailable'
            }
          />
          <StatTile
            label="Typical rate"
            value={`${fmtMoney(stats.medianRate, true)}/hr`}
            sub="median job — half earn less per printer hour"
          />
          <StatTile
            label="Queued print time"
            value={`${stats.queuedHours.toFixed(1)} h`}
            sub={`${stats.pipeline} orders waiting on the plate`}
          />
          <StatTile
            label="Under rate"
            value={String(stats.underCount)}
            tone={stats.underCount ? 'critical' : undefined}
            sub={
              stats.underCount
                ? `${stats.underHours.toFixed(0)} h queued below the typical rate`
                : 'every queued job beats the median'
            }
          />
        </div>

        <div className="two">
          <Card title="Revenue by month" note="profit vs cost">
            <StackedColumnChart data={months} />
          </Card>
          <Card title="Order pipeline" note="orders by status">
            <BarChart
              data={pipeline}
              format={(v) => v}
              subFormat={(d) => fmtMoney(d.sub)}
              emptyText="No orders in this range."
            />
          </Card>
        </div>

        <div className="two">
          <Card title="Top items" note="by net profit">
            <BarChart
              data={topItems}
              format={(v) => fmtMoney(v)}
              subFormat={(d) => `${d.count}×`}
              emptyText="No completed orders in this range."
            />
          </Card>
          <Card title="Top customers" note="by net profit">
            <BarChart
              data={topCustomers}
              format={(v) => fmtMoney(v)}
              subFormat={(d) => `${d.count}×`}
              emptyText="No completed orders in this range."
            />
          </Card>
        </div>

        <Card title="Daily net profit" note="every day in range">
          <ProfitCalendar days={calendar} />
        </Card>

        <div className="spacer" />

        <Card title="Payments" note={`${feed.length} shown`} flush>
          {loading && !raw.length ? (
            <div className="loading">Connecting to sheet…</div>
          ) : (
            <RecordFeed rows={feed} />
          )}
        </Card>

        <footer className="foot">
          <span>
            Google Sheets · 3D Print Orders ·{' '}
            <Link href="/wrapped" className="wrapped">
              Wrapped →
            </Link>
          </span>
          <span>
            {stale
              ? 'Offline · showing last synced numbers'
              : syncedAt
                ? `Synced ${syncedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : '—'}
          </span>
        </footer>
      </Shell>

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
        .kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }
        .two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }
        .spacer {
          height: 12px;
        }
        .loading {
          text-align: center;
          color: var(--muted);
          font-size: 13px;
          padding: 40px 0;
        }
        .foot :global(.wrapped) {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }
        .foot :global(.wrapped:hover) {
          text-decoration: underline;
        }
        .foot {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted);
          padding: 8px 2px 0;
        }
        @media (max-width: 860px) {
          .kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .two {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}
