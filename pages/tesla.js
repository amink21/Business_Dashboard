import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import BarChart from '../components/BarChart';
import Card from '../components/Card';
import FilterRow from '../components/FilterRow';
import RecordFeed from '../components/RecordFeed';
import AlertToast from '../components/AlertToast';
import Shell from '../components/Shell';
import StackedColumnChart from '../components/StackedColumnChart';
import StatTile from '../components/StatTile';
import VolumePanel from '../components/VolumePanel';
import {
  cumulativeSeries,
  fmtDate,
  fmtMoney,
  inBounds,
  pctChange,
  rangeBounds,
  shiftBounds,
  sparkSeries,
  topBy,
} from '../lib/data';
import { teslaAlerts } from '../lib/alerts';
import { monthlyStack, normalize, stockBars, summarize } from '../lib/tesla';

export default function TeslaOverview() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);
  const [stale, setStale] = useState(false);

  const [rangeId, setRangeId] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [nonce, setNonce] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sheet?tab=tesla');
      // The service worker tags a response it served from cache while offline.
      setStale(res.headers.get('x-from-cache') === '1');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRaw(data);
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

  const items = useMemo(() => normalize(raw), [raw]);
  const bounds = useMemo(() => rangeBounds(items, rangeId), [items, rangeId]);

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (!inBounds(i, bounds)) return false;
      if (status !== 'All' && i.status !== status) return false;
      if (!q) return true;
      return `${i.id} ${i.product} ${i.supplier}`.toLowerCase().includes(q);
    });
  }, [items, bounds, status, search]);

  const stats = useMemo(() => summarize(scoped), [scoped]);
  const points = useMemo(
    () =>
      cumulativeSeries(
        scoped,
        bounds,
        (i) => i.sold,
        (i) => (i.kind === 'completed' ? i.sale : 0)
      ),
    [scoped, bounds]
  );

  const prev = useMemo(() => {
    const pb = shiftBounds(bounds);
    if (!pb) return null;
    return summarize(items.filter((i) => inBounds(i, pb)));
  }, [items, bounds]);

  const months = useMemo(() => monthlyStack(scoped, bounds), [scoped, bounds]);
  const stock = useMemo(() => stockBars(scoped), [scoped]);
  const byProduct = useMemo(
    () =>
      topBy(
        scoped.filter((i) => i.kind === 'completed'),
        (i) => i.product,
        (i) => i.profit,
        6
      ),
    [scoped]
  );
  const bySupplier = useMemo(
    () =>
      topBy(
        scoped.filter((i) => i.kind === 'completed'),
        (i) => i.supplier,
        (i) => i.profit,
        6
      ),
    [scoped]
  );

  const profitSpark = useMemo(
    () => sparkSeries(scoped, bounds, (i) => (i.kind === 'completed' ? i.profit : 0)),
    [scoped, bounds]
  );
  const unitSpark = useMemo(
    () => sparkSeries(scoped, bounds, (i) => (i.kind === 'completed' ? 1 : 0)),
    [scoped, bounds]
  );

  const statuses = useMemo(
    () => ['All', ...Array.from(new Set(items.map((i) => i.status).filter(Boolean)))],
    [items]
  );

  const alerts = useMemo(() => teslaAlerts(scoped, stats), [scoped, stats]);

  useEffect(() => {
    if (!loading && raw.length && nonce === 0) setNonce(1);
  }, [loading, raw.length, nonce]);

  const feed = useMemo(
    () =>
      scoped
        .slice()
        .reverse()
        .map((i) => ({
          key: i.id,
          badge: i.id.replace(/^[A-Za-z]+-?/, ''),
          title: i.product,
          meta: [i.id, i.supplier].filter(Boolean).join(' · '),
          kind: i.kind,
          status: i.status,
          amount: i.sale || i.buy,
          sub:
            i.kind === 'completed'
              ? `${fmtMoney(i.profit, true)} net · ${i.daysListed}d listed`
              : `${fmtMoney(i.buy, true)} cost · ${i.daysListed}d held`,
          date: i.date,
        })),
    [scoped]
  );

  const rangeLabel = bounds
    ? `${fmtDate(bounds.from, true)} – ${fmtDate(bounds.to, true)}`
    : 'No dated items';

  return (
    <>
      <Head>
        <title>Charger Desk</title>
      </Head>
      <AlertToast alerts={alerts} nonce={nonce} app="CHARGER DESK" mark="⚡" />

      <Shell
        path="/tesla"
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
          placeholder="Search item ID, product, supplier…"
        />

        <VolumePanel
          label="Gross volume"
          value={stats.gross}
          delta={prev ? pctChange(stats.gross, prev.gross) : null}
          deltaLabel={bounds && bounds.days ? `vs prior ${bounds.days}d` : ''}
          sub={`${stats.completed} units sold · ${rangeLabel}`}
          points={points}
          emptyText="No units sold in this range"
        />

        <div className="kpis">
          <StatTile
            label="Net profit"
            value={fmtMoney(stats.net, true)}
            tone="accent"
            sub={`${fmtMoney(stats.cogs, true)} cost of goods`}
            delta={prev ? pctChange(stats.net, prev.net) : null}
            points={profitSpark}
          />
          <StatTile
            label="Margin"
            value={`${stats.margin.toFixed(1)}%`}
            sub="profit / gross volume"
          />
          <StatTile
            label="Profit / unit"
            value={fmtMoney(stats.avgProfit, true)}
            sub={`${fmtMoney(stats.avgOrder, true)} avg sale price`}
            points={unitSpark}
          />
          <StatTile
            label="Sell-through"
            value={`${stats.sellThrough.toFixed(1)}%`}
            sub={`${stats.completed} of ${stats.count} bought`}
          />
          <StatTile
            label="Days to sell"
            value={stats.avgDays.toFixed(1)}
            sub="average days listed before sale"
          />
          <StatTile
            label="Stock on hand"
            value={String(stats.available)}
            sub={`${fmtMoney(stats.stockValue, true)} tied up`}
          />
          <StatTile
            label="Pending pickup"
            value={String(stats.pending)}
            sub={`${fmtMoney(stats.pendingValue, true)} agreed, not collected`}
          />
          <StatTile
            label="Units bought"
            value={String(stats.count)}
            sub="every charger in the sheet"
          />
          <StatTile
            label="Days of cover"
            value={stats.daysCover ? stats.daysCover.toFixed(1) : '—'}
            tone={stats.daysCover && stats.daysCover < 14 ? 'critical' : undefined}
            sub={
              stats.perDay
                ? `${stats.available} left at ${stats.perDay.toFixed(2)} sold per day`
                : 'not enough sales to judge'
            }
          />
          <StatTile
            label="Return on cost"
            value={`${stats.returnOnCost.toFixed(1)}%`}
            sub="profit per dollar of stock bought"
          />
          <StatTile
            label="Profit / day held"
            value={fmtMoney(stats.profitPerDayHeld, true)}
            sub="what a day of inventory earns"
          />
          <StatTile
            label="Oldest unit"
            value={stats.oldestDays ? `${stats.oldestDays}d` : '—'}
            sub={stats.oldestLabel ? `${stats.oldestLabel}, still unsold` : 'nothing unsold'}
          />
        </div>

        <div className="two">
          <Card title="Revenue by month" note="profit vs cost of goods">
            <StackedColumnChart data={months} />
          </Card>
          <Card title="Inventory" note="units by status">
            <BarChart
              data={stock}
              format={(v) => v}
              subFormat={(d) => fmtMoney(d.sub)}
              emptyText="No inventory in this range."
            />
          </Card>
        </div>

        <div className="two">
          <Card title="Product lines" note="by net profit">
            <BarChart
              data={byProduct}
              format={(v) => fmtMoney(v)}
              subFormat={(d) => `${d.count}×`}
              emptyText="No units sold in this range."
            />
          </Card>
          <Card title="Suppliers" note="by net profit">
            <BarChart
              data={bySupplier}
              format={(v) => fmtMoney(v)}
              subFormat={(d) => `${d.count}×`}
              emptyText="No units sold in this range."
            />
          </Card>
        </div>

        <Card title="Inventory ledger" note={`${feed.length} shown`} flush>
          {loading && !raw.length ? (
            <div className="loading">Connecting to sheet…</div>
          ) : (
            <RecordFeed rows={feed} />
          )}
        </Card>

        <footer className="foot">
          <span>Google Sheets · Tesla Inventory</span>
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
        .loading {
          text-align: center;
          color: var(--muted);
          font-size: 13px;
          padding: 40px 0;
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
