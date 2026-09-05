import { monthKey, monthsIn, num, parseDate } from './data';

export function statusKind(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('sold')) return 'completed';
  if (s.includes('pending')) return 'queued';
  return 'inflight';
}

export function normalize(rows) {
  return rows
    .map((r) => {
      const status = r.Status || '';
      const kind = statusKind(status);
      const purchased = parseDate(r['Purchase Date']);
      const sold = parseDate(r['Sale Date']);
      return {
        id: r['Item ID'] || '',
        // Inventory is a timeline of sales, so a sold unit is dated by its sale
        // and everything still on the shelf by when it was bought.
        date: sold || purchased,
        purchased,
        sold,
        dateText: r['Sale Date'] || r['Purchase Date'] || '',
        product: r['Product Type'] || 'Unknown',
        supplier: r.Supplier || 'Unknown',
        buy: num(r['Purchase Price']),
        sale: num(r['Sale Price']),
        profit: num(r.Profit),
        daysListed: num(r['Days Listed']),
        status,
        kind,
      };
    })
    .filter((i) => i.id)
    .sort((a, b) => (a.date && b.date ? a.date - b.date : 0));
}

export function summarize(items) {
  const sold = items.filter((i) => i.kind === 'completed');
  const pending = items.filter((i) => i.kind === 'queued');
  const available = items.filter((i) => i.kind === 'inflight');
  const gross = sold.reduce((s, i) => s + i.sale, 0);
  const net = sold.reduce((s, i) => s + i.profit, 0);
  const soldDays = sold.filter((i) => i.daysListed > 0);
  const heldDays = soldDays.reduce((s, i) => s + i.daysListed, 0);

  // How fast stock actually moves, measured over the window the sales span
  // rather than the calendar - then how long the shelf lasts at that pace.
  const saleTimes = sold.map((i) => i.sold).filter(Boolean).map((d) => d.getTime());
  const span = saleTimes.length > 1
    ? Math.max(1, Math.round((Math.max(...saleTimes) - Math.min(...saleTimes)) / 86400000))
    : 0;
  const perDay = span ? sold.length / span : 0;

  // The unit that has sat longest without selling.
  const oldest = items
    .filter((i) => i.kind !== 'completed')
    .reduce((best, i) => (!best || i.daysListed > best.daysListed ? i : best), null);

  const cogs = sold.reduce((s, i) => s + i.buy, 0);

  return {
    gross,
    net,
    cogs,
    margin: gross ? (net / gross) * 100 : 0,
    count: items.length,
    completed: sold.length,
    pipeline: available.length + pending.length,
    available: available.length,
    pending: pending.length,
    // Cash sitting on the shelf, at what it cost to buy.
    stockValue: available.reduce((s, i) => s + i.buy, 0),
    pendingValue: pending.reduce((s, i) => s + i.sale, 0),
    sellThrough: items.length ? (sold.length / items.length) * 100 : 0,
    avgProfit: sold.length ? net / sold.length : 0,
    avgOrder: sold.length ? gross / sold.length : 0,
    avgDays: soldDays.length ? heldDays / soldDays.length : 0,
    perDay,
    // Days of stock left at the current pace - the reorder signal.
    daysCover: perDay ? available.length / perDay : 0,
    // Profit earned per dollar of stock bought, and per day that stock sat.
    returnOnCost: cogs ? (net / cogs) * 100 : 0,
    profitPerDayHeld: heldDays ? net / heldDays : 0,
    oldestDays: oldest ? oldest.daysListed : 0,
    oldestLabel: oldest ? oldest.product : '',
    cancelled: 0,
  };
}

export function monthlyStack(items, bounds) {
  const sold = items.filter((i) => i.kind === 'completed' && i.sold);
  const byMonth = new Map();
  for (const i of sold) {
    const k = monthKey(i.sold);
    const cur = byMonth.get(k) || { profit: 0, cost: 0 };
    cur.profit += i.profit;
    cur.cost += i.sale - i.profit;
    byMonth.set(k, cur);
  }
  return monthsIn(bounds).map((d) => {
    const v = byMonth.get(monthKey(d)) || { profit: 0, cost: 0 };
    return { date: d, segments: [v.profit, v.cost] };
  });
}

export function stockBars(items) {
  const order = ['Available', 'Pending Pickup', 'Sold'];
  const counts = new Map();
  for (const i of items) {
    if (!i.status) continue;
    const cur = counts.get(i.status) || { label: i.status, value: 0, kind: i.kind, sub: 0 };
    cur.value += 1;
    cur.sub += i.sale || i.buy;
    counts.set(i.status, cur);
  }
  return Array.from(counts.values()).sort(
    (a, b) => order.indexOf(a.label) - order.indexOf(b.label) || b.value - a.value
  );
}
