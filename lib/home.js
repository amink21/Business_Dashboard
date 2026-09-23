import { fmtDate, fmtMoney } from './data';
import { queueBucket } from './print';

// Both hustles, added together. Net profit share (not gross) is what the split
// bar shows, because a dollar of charger profit and a dollar of print profit
// are the same dollar - gross share would flatter whichever line has thinner
// margins but more turnover.
export function combineStats(printStats, teslaStats) {
  const net = printStats.net + teslaStats.net;
  const gross = printStats.gross + teslaStats.gross;
  return {
    net,
    gross,
    margin: gross ? (net / gross) * 100 : 0,
    chargersShare: net ? (teslaStats.net / net) * 100 : 0,
    printsShare: net ? (printStats.net / net) * 100 : 0,
  };
}

// Net profit by month, split by hustle instead of by profit-vs-cost - the same
// stacked shape, a different pair of series.
export function combineMonthly(teslaMonths, printMonths) {
  return printMonths.map((m, i) => ({
    date: m.date,
    segments: [teslaMonths[i] ? teslaMonths[i].segments[0] : 0, m.segments[0]],
  }));
}

// What actually needs a decision right now - never scoped to a date range,
// because "2 prints to start" shouldn't disappear just because the owner is
// looking at last 30 days of revenue.
export function needsYou(orders, items, printStats) {
  const out = [];

  const toPrint = orders.filter((o) => queueBucket(o.status) === 'toPrint');
  if (toPrint.length) {
    out.push({
      id: 'toPrint',
      icon: 'printer',
      tone: 'warning',
      title: `${toPrint.length} print${toPrint.length === 1 ? '' : 's'} to start`,
      sub: `${fmtMoney(toPrint.reduce((s, o) => s + o.sale, 0))} · ${toPrint
        .reduce((s, o) => s + o.hrs, 0)
        .toFixed(0)} h of printer time`,
    });
  }

  const pickup = orders.filter((o) => queueBucket(o.status) === 'pickup');
  if (pickup.length) {
    const oldest = pickup.reduce((b, o) => (!b || (o.date && o.date < b.date) ? o : b), null);
    out.push({
      id: 'pickup',
      icon: 'box',
      tone: 'neutral',
      title: `${pickup.length} pickup${pickup.length === 1 ? '' : 's'} waiting`,
      sub: `${fmtMoney(pickup.reduce((s, o) => s + o.sale, 0))}${
        oldest && oldest.date ? ` · oldest since ${fmtDate(oldest.date)}` : ''
      }`,
    });
  }

  const unsold = items.filter((i) => i.kind !== 'completed' && i.daysListed > 0);
  const stalest = unsold.reduce((b, i) => (!b || i.daysListed > b.daysListed ? i : b), null);
  if (stalest && stalest.daysListed >= 30) {
    out.push({
      id: 'stale',
      icon: 'clock',
      tone: 'critical',
      title: `Charger unsold for ${stalest.daysListed} days`,
      sub: stalest.product,
    });
  }

  const under = orders.filter(
    (o) => queueBucket(o.status) === 'toPrint' && o.hrs > 0 && printStats.medianRate && o.sale - o.cost < printStats.medianRate * o.hrs
  );
  if (under.length) {
    out.push({
      id: 'under',
      icon: 'warning',
      tone: 'critical',
      title: `${under.length} job${under.length === 1 ? '' : 's'} under your rate`,
      sub: `${under.reduce((s, o) => s + o.hrs, 0).toFixed(0)} h queued below ${fmtMoney(
        printStats.medianRate,
        true
      )}/hr`,
    });
  }

  return out;
}

const PALETTE = ['accent', 'chargers', 'prints', 'warning'];

// Deterministic, so the same person's initial is always the same color rather
// than reshuffling on every reload.
export function avatarTone(text) {
  const s = String(text || '?');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initial(text) {
  const t = String(text || '').trim();
  return t ? t[0].toUpperCase() : '?';
}

// Print orders and charger sales, merged into one feed the way a "recent
// activity" list has to be - the two sheets are read independently but the
// owner experiences them as one business.
export function latestActivity(orders, items, n) {
  const fromOrders = orders
    .filter((o) => o.date)
    .map((o) => ({
      key: `p-${o.id || o.item}-${o.date.getTime()}`,
      badge: initial(o.customer || o.item),
      tone: avatarTone(o.customer || o.item),
      title: o.item,
      meta: [o.customer || 'No customer', o.platform].filter(Boolean).join(' · '),
      amount: o.sale,
      kind: o.kind,
      status: o.status,
      date: o.date,
    }));

  const fromItems = items
    .filter((i) => i.date)
    .map((i) => ({
      key: `t-${i.id}`,
      badge: 'C',
      tone: avatarTone(i.product),
      title: i.product,
      meta: [i.supplier, 'Charger'].filter(Boolean).join(' · '),
      amount: i.kind === 'completed' ? i.sale : i.buy,
      kind: i.kind,
      status: i.status,
      date: i.date,
    }));

  return [...fromOrders, ...fromItems]
    .sort((a, b) => b.date - a.date)
    .slice(0, n || 6);
}
