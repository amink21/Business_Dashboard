import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import BarChart from '../components/BarChart';
import Card from '../components/Card';
import IconButton from '../components/IconButton';
import ProfitCalendar from '../components/ProfitCalendar';
import RangeTabs from '../components/RangeTabs';
import RecordFeed from '../components/RecordFeed';
import Skeleton from '../components/Skeleton';
import StackedColumnChart from '../components/StackedColumnChart';
import StatTile from '../components/StatTile';
import VolumePanel from '../components/VolumePanel';
import {
  cumulativeSeries,
  dailySeries,
  fmtMoney,
  inBounds,
  pctChange,
  rangeBounds,
  shiftBounds,
  sparkSeries,
  topBy,
} from '../lib/data';
import { openCount } from '../lib/home';
import { lookupMetric, monthlyStack as printMonthly, normalize as normalizePrint, pipelineBars, summarize as summarizePrint } from '../lib/print';
import { monthlyStack as teslaMonthly, normalize as normalizeTesla, stockBars, summarize as summarizeTesla } from '../lib/tesla';

function chargerTiles(stats, prev, spark) {
  return [
    { label: 'Net profit', value: fmtMoney(stats.net, true), tone: 'accent', sub: `${fmtMoney(stats.cogs, true)} cost of goods`, delta: prev ? pctChange(stats.net, prev.net) : null, points: spark.profit },
    { label: 'Margin', value: `${stats.margin.toFixed(1)}%`, sub: 'profit / gross volume' },
    { label: 'Profit / unit', value: fmtMoney(stats.avgProfit, true), sub: `${fmtMoney(stats.avgOrder, true)} avg sale price`, points: spark.unit },
    { label: 'Sell-through', value: `${stats.sellThrough.toFixed(1)}%`, sub: `${stats.completed} of ${stats.count} bought` },
    { label: 'Days to sell', value: stats.avgDays.toFixed(1), sub: 'average days listed before sale' },
    { label: 'Stock on hand', value: String(stats.available), sub: `${fmtMoney(stats.stockValue, true)} tied up` },
    { label: 'Pending pickup', value: String(stats.pending), sub: `${fmtMoney(stats.pendingValue, true)} agreed, not collected` },
    { label: 'Units bought', value: String(stats.count), sub: 'every charger in the sheet' },
    { label: 'Days of cover', value: stats.daysCover ? stats.daysCover.toFixed(1) : '—', tone: stats.daysCover && stats.daysCover < 14 ? 'critical' : undefined, sub: stats.perDay ? `${stats.available} left at ${stats.perDay.toFixed(2)} sold per day` : 'not enough sales to judge' },
    { label: 'Return on cost', value: `${stats.returnOnCost.toFixed(1)}%`, sub: 'profit per dollar of stock bought' },
    { label: 'Profit / day held', value: fmtMoney(stats.profitPerDayHeld, true), sub: 'what a day of inventory earns' },
    { label: 'Oldest unit', value: stats.oldestDays ? `${stats.oldestDays}d` : '—', sub: stats.oldestLabel ? `${stats.oldestLabel}, still unsold` : 'nothing unsold' },
  ];
}

function printTiles(stats, prev, spark, equipment) {
  return [
    { label: 'Net profit', value: fmtMoney(stats.net, true), tone: 'accent', sub: 'after material + other costs', delta: prev ? pctChange(stats.net, prev.net) : null, points: spark.profit },
    { label: 'Margin', value: `${stats.margin.toFixed(1)}%`, sub: `${fmtMoney(stats.cogs, true)} spent on materials` },
    { label: 'Avg order', value: fmtMoney(stats.avgOrder, true), sub: `across ${stats.completed} completed` },
    { label: 'Profit / print hour', value: fmtMoney(stats.profitPerHour, true), sub: 'what an hour of printer time earns' },
    { label: 'Pipeline value', value: fmtMoney(stats.pipelineValue, true), sub: `${stats.pipeline} orders not yet closed`, points: spark.order },
    { label: 'Cancel rate', value: `${stats.cancelRate.toFixed(0)}%`, sub: `${stats.cancelled} of ${stats.count} orders` },
    { label: 'Repeat customers', value: String(stats.repeat), sub: `of ${stats.customers} people` },
    { label: 'Print hours', value: stats.hours.toFixed(1), sub: stats.count ? `${(stats.hours / stats.count).toFixed(1)} h per order` : 'no orders', points: spark.hours },
    { label: 'After equipment', value: equipment ? fmtMoney(stats.net - equipment, true) : '—', tone: equipment ? (stats.net - equipment >= 0 ? 'accent' : 'critical') : undefined, sub: equipment ? `${fmtMoney(equipment, true)} on printer + filament` : equipment === undefined ? 'reading the summary tab…' : 'summary tab unavailable' },
    { label: 'Typical rate', value: `${fmtMoney(stats.medianRate, true)}/hr`, sub: 'median job — half earn less per printer hour' },
    { label: 'Queued print time', value: `${stats.queuedHours.toFixed(1)} h`, sub: `${stats.pipeline} orders waiting on the plate` },
    { label: 'Under rate', value: String(stats.underCount), tone: stats.underCount ? 'critical' : undefined, sub: stats.underCount ? `${stats.underHours.toFixed(0)} h queued below the typical rate` : 'every queued job beats the median' },
  ];
}

export default function Stats() {
  const router = useRouter();
  const [rawPrint, setRawPrint] = useState([]);
  const [rawTesla, setRawTesla] = useState([]);
  const [equipment, setEquipment] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [hustle, setHustle] = useState('chargers');
  const [rangeId, setRangeId] = useState('all');
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (router.query.tab === 'prints' || router.query.tab === 'chargers') {
      setHustle(router.query.tab);
    }
  }, [router.query.tab]);

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

  const orders = useMemo(() => normalizePrint(rawPrint), [rawPrint]);
  const items = useMemo(() => normalizeTesla(rawTesla), [rawTesla]);
  const records = hustle === 'chargers' ? items : orders;

  const bounds = useMemo(() => rangeBounds(records, rangeId), [records, rangeId]);
  const scoped = useMemo(() => records.filter((r) => inBounds(r, bounds)), [records, bounds]);

  const prevBounds = useMemo(() => shiftBounds(bounds), [bounds]);
  const prevScoped = useMemo(
    () => (prevBounds ? records.filter((r) => inBounds(r, prevBounds)) : null),
    [records, prevBounds]
  );

  const stats = useMemo(
    () => (hustle === 'chargers' ? summarizeTesla(scoped) : summarizePrint(scoped)),
    [hustle, scoped]
  );
  const prevStats = useMemo(
    () => (prevScoped ? (hustle === 'chargers' ? summarizeTesla(prevScoped) : summarizePrint(prevScoped)) : null),
    [hustle, prevScoped]
  );

  const points = useMemo(
    () =>
      hustle === 'chargers'
        ? cumulativeSeries(scoped, bounds, (i) => i.sold, (i) => (i.kind === 'completed' ? i.sale : 0))
        : cumulativeSeries(scoped, bounds, (o) => o.date, (o) => (o.kind === 'completed' ? o.sale : 0)),
    [hustle, scoped, bounds]
  );

  const spark = useMemo(() => {
    if (hustle === 'chargers') {
      return {
        profit: sparkSeries(scoped, bounds, (i) => (i.kind === 'completed' ? i.profit : 0)),
        unit: sparkSeries(scoped, bounds, (i) => (i.kind === 'completed' ? 1 : 0)),
      };
    }
    return {
      profit: sparkSeries(scoped, bounds, (o) => (o.kind === 'completed' ? o.profit : 0)),
      order: sparkSeries(scoped, bounds, () => 1),
      hours: sparkSeries(scoped, bounds, (o) => o.hrs),
    };
  }, [hustle, scoped, bounds]);

  const months = useMemo(
    () => (hustle === 'chargers' ? teslaMonthly(scoped, bounds) : printMonthly(scoped, bounds)),
    [hustle, scoped, bounds]
  );

  const statusBars = useMemo(
    () => (hustle === 'chargers' ? stockBars(scoped) : pipelineBars(scoped)),
    [hustle, scoped]
  );

  const topA = useMemo(
    () =>
      hustle === 'chargers'
        ? topBy(scoped.filter((i) => i.kind === 'completed'), (i) => i.product, (i) => i.profit, 6)
        : topBy(scoped.filter((o) => o.kind === 'completed'), (o) => o.item, (o) => o.profit, 8),
    [hustle, scoped]
  );
  const topB = useMemo(
    () =>
      hustle === 'chargers'
        ? topBy(scoped.filter((i) => i.kind === 'completed'), (i) => i.supplier, (i) => i.profit, 6)
        : topBy(scoped.filter((o) => o.kind === 'completed'), (o) => o.customer, (o) => o.profit, 6),
    [hustle, scoped]
  );

  const calendar = useMemo(
    () =>
      hustle === 'chargers'
        ? dailySeries(scoped, bounds, (i) => i.sold, (i) => (i.kind === 'completed' ? i.profit : 0))
        : dailySeries(scoped, bounds, (o) => o.date, (o) => (o.kind === 'completed' ? o.profit : 0)),
    [hustle, scoped, bounds]
  );

  const feed = useMemo(
    () =>
      scoped
        .slice()
        .reverse()
        .map((r) =>
          hustle === 'chargers'
            ? {
                key: r.id,
                badge: r.id.replace(/^[A-Za-z]+-?/, ''),
                title: r.product,
                meta: [r.id, r.supplier].filter(Boolean).join(' · '),
                kind: r.kind,
                status: r.status,
                amount: r.sale || r.buy,
                sub: r.kind === 'completed' ? `${fmtMoney(r.profit, true)} net · ${r.daysListed}d listed` : `${fmtMoney(r.buy, true)} cost · ${r.daysListed}d held`,
                date: r.date,
              }
            : {
                key: r.id || `${r.customer}-${r.item}`,
                editable: Boolean(r.id),
                badge: (r.customer || '?').trim().charAt(0).toUpperCase() || '?',
                title: r.item,
                meta: [r.customer || 'No customer', r.platform, r.delivery].filter(Boolean).join(' · '),
                kind: r.kind,
                status: r.status,
                amount: r.sale,
                sub: r.profit ? `${fmtMoney(r.profit, true)} net` : `${r.hrs || 0}h print`,
                date: r.date,
              }
        ),
    [hustle, scoped]
  );

  const queueBadge = useMemo(() => openCount(orders, items), [orders, items]);

  const tiles = hustle === 'chargers' ? chargerTiles(stats, prevStats, spark) : printTiles(stats, prevStats, spark, equipment);
  const primary = tiles.slice(0, 4);
  const rest = tiles.slice(4);

  return (
    <>
      <Head>
        <title>{`${hustle === 'chargers' ? 'Charger Desk' : 'Print Lab'} — Stats`}</title>
      </Head>

      <AppShell
        kicker={hustle === 'chargers' ? 'CHARGER DESK' : 'PRINT LAB'}
        title="Stats"
        queueBadge={queueBadge}
        actions={<IconButton name="refresh" label="Refresh" onClick={load} disabled={loading} />}
      >
        {error && <div className="error">{error}</div>}

        <div className="hustleTabs" role="group" aria-label="Hustle">
          <button
            type="button"
            className={`hTab ${hustle === 'chargers' ? 'on' : ''}`}
            onClick={() => setHustle('chargers')}
          >
            <span className="dot" style={{ background: 'var(--chargers)' }} />
            Chargers
          </button>
          <button
            type="button"
            className={`hTab ${hustle === 'prints' ? 'on' : ''}`}
            onClick={() => setHustle('prints')}
          >
            <span className="dot" style={{ background: 'var(--prints)' }} />
            Prints
          </button>
        </div>

        <div className="rangeWrap">
          <RangeTabs value={rangeId} onChange={setRangeId} />
        </div>

        <VolumePanel
          label="Gross volume"
          value={stats.gross}
          delta={prevStats ? pctChange(stats.gross, prevStats.gross) : null}
          deltaLabel={bounds && bounds.days ? `vs prior ${bounds.days}d` : ''}
          sub={`${stats.completed} ${hustle === 'chargers' ? 'units sold' : 'succeeded'}`}
          points={points}
        />

        <div className="kpis">
          {primary.map((t) => (
            <StatTile key={t.label} {...t} />
          ))}
        </div>

        <button type="button" className="more" onClick={() => setShowMore((v) => !v)}>
          All stats
          <span>{showMore ? 'Show less' : `Show ${rest.length} more`}</span>
        </button>

        {showMore && (
          <div className="kpis">
            {rest.map((t) => (
              <StatTile key={t.label} {...t} />
            ))}
          </div>
        )}

        <div className="block">
          <Card title="Revenue by month" note={hustle === 'chargers' ? 'profit vs cost of goods' : 'profit vs cost'}>
            <StackedColumnChart data={months} />
          </Card>
        </div>

        <div className="block">
          <Card title={hustle === 'chargers' ? 'Inventory' : 'Order pipeline'} note="by status">
            <BarChart data={statusBars} format={(v) => v} subFormat={(d) => fmtMoney(d.sub)} emptyText="No records in this range." />
          </Card>
        </div>

        <div className="block">
          <Card title={hustle === 'chargers' ? 'Product lines' : 'Top items'} note="by net profit">
            <BarChart data={topA} format={(v) => fmtMoney(v)} subFormat={(d) => `${d.count}×`} emptyText="No completed sales in this range." />
          </Card>
        </div>

        <div className="block">
          <Card title={hustle === 'chargers' ? 'Suppliers' : 'Top customers'} note="by net profit">
            <BarChart data={topB} format={(v) => fmtMoney(v)} subFormat={(d) => `${d.count}×`} emptyText="No completed sales in this range." />
          </Card>
        </div>

        <div className="block">
          <Card title="Daily net profit" note="every day in range">
            <ProfitCalendar days={calendar} />
          </Card>
        </div>

        <div className="block">
          <Card title="Ledger" note={`${feed.length} shown`} flush>
            {loading && !records.length ? (
              <div className="skeletonPad">
                <Skeleton rows={5} />
              </div>
            ) : (
              <RecordFeed rows={feed} />
            )}
          </Card>
        </div>
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
        .hustleTabs {
          display: flex;
          gap: 8px;
          margin-top: 4px;
          margin-bottom: 10px;
        }
        .hTab {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--surface);
          border: 1px solid var(--line);
          color: var(--ink-2);
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 13px;
          border-radius: 999px;
          transition: transform 120ms ease;
        }
        .hTab:active {
          transform: scale(0.95);
        }
        .hTab.on {
          background: var(--surface-2);
          border-color: var(--baseline);
          color: var(--ink);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .rangeWrap {
          margin-bottom: 12px;
        }
        .kpis {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .more {
          width: 100%;
          display: flex;
          justify-content: space-between;
          background: none;
          border: none;
          color: var(--muted);
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 2px 16px;
        }
        .more span {
          color: var(--accent);
        }
        .block {
          margin-bottom: 14px;
        }
        .skeletonPad {
          padding: 14px 15px 16px;
        }
      `}</style>
    </>
  );
}
