import { monthKey, monthsIn, num, parseDate } from './data';

export function statusKind(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('cancel') || s.includes('refund') || s.includes('fail')) return 'cancelled';
  if (s.includes('complete') || s.includes('done') || s.includes('shipped')) return 'completed';
  if (s.includes('need') || s.includes('queue') || s.includes('progress')) return 'queued';
  return 'inflight';
}

export function normalize(rows) {
  return rows
    .map((r) => ({
      id: r['Order ID'] || '',
      date: parseDate(r['Order Date']),
      dateText: r['Order Date'] || '',
      customer: r.Customer || '',
      item: r['Item / Model'] || 'Untitled',
      qty: num(r.Qty),
      hrs: num(r['Print Hrs']),
      materialCost: num(r['Material Cost']),
      cost: num(r['Total Cost']),
      sale: num(r['Sale Price']),
      profit: num(r.Profit),
      status: r.Status || '',
      kind: statusKind(r.Status),
      platform: r.Platform || '',
      delivery: r.Delivery || '',
      notes: r.Notes || '',
    }))
    .filter((o) => o.id || o.item !== 'Untitled')
    .sort((a, b) => (a.date && b.date ? a.date - b.date : 0));
}

export function summarize(orders) {
  const done = orders.filter((o) => o.kind === 'completed');
  const open = orders.filter((o) => o.kind === 'queued' || o.kind === 'inflight');
  const gross = done.reduce((s, o) => s + o.sale, 0);
  const net = done.reduce((s, o) => s + o.profit, 0);
  const hours = orders.reduce((s, o) => s + o.hrs, 0);
  const doneHours = done.reduce((s, o) => s + o.hrs, 0);

  // Customers who came back at least once - the cheapest revenue in the sheet.
  const perCustomer = new Map();
  for (const o of orders) {
    const k = o.customer.trim().toLowerCase();
    if (k) perCustomer.set(k, (perCustomer.get(k) || 0) + 1);
  }
  const repeat = Array.from(perCustomer.values()).filter((n) => n > 1).length;

  return {
    gross,
    net,
    cogs: gross - net,
    margin: gross ? (net / gross) * 100 : 0,
    count: orders.length,
    completed: done.length,
    pipeline: open.length,
    // What the open orders are worth if they all land.
    pipelineValue: open.reduce((s, o) => s + o.sale, 0),
    cancelled: orders.filter((o) => o.kind === 'cancelled').length,
    cancelRate: orders.length ? (orders.filter((o) => o.kind === 'cancelled').length / orders.length) * 100 : 0,
    hours,
    avgOrder: done.length ? gross / done.length : 0,
    profitPerHour: doneHours ? net / doneHours : 0,
    customers: perCustomer.size,
    repeat,
  };
}

// Revenue split into the profit that stayed and the cost that didn't, by month.
export function monthlyStack(orders, bounds) {
  const done = orders.filter((o) => o.kind === 'completed' && o.date);
  const byMonth = new Map();
  for (const o of done) {
    const k = monthKey(o.date);
    const cur = byMonth.get(k) || { profit: 0, cost: 0 };
    cur.profit += o.profit;
    cur.cost += o.sale - o.profit;
    byMonth.set(k, cur);
  }
  return monthsIn(bounds).map((d) => {
    const v = byMonth.get(monthKey(d)) || { profit: 0, cost: 0 };
    return { date: d, segments: [v.profit, v.cost] };
  });
}

export function pipelineBars(orders) {
  const order = ['Need to Print', 'Printed', 'Waiting for Pickup', 'Completed', 'Cancelled'];
  const counts = new Map();
  for (const o of orders) {
    if (!o.status) continue;
    const cur = counts.get(o.status) || { label: o.status, value: 0, kind: o.kind, sub: 0 };
    cur.value += 1;
    cur.sub += o.sale;
    counts.set(o.status, cur);
  }
  return Array.from(counts.values()).sort(
    (a, b) => order.indexOf(a.label) - order.indexOf(b.label) || b.value - a.value
  );
}
