// Shared derivations. Both dashboards read the same date, range and formatting
// helpers so a figure means the same thing on either page.

export function num(v) {
  const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

// Sheet dates are plain YYYY-MM-DD. Parse as UTC so a browser west of Greenwich
// doesn't shift every row back a day.
export function parseDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '').trim());
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

export function dayKey(d) {
  return d ? d.toISOString().slice(0, 10) : '';
}

export function monthKey(d) {
  return d ? d.toISOString().slice(0, 7) : '';
}

export const RANGES = [
  { id: 'all', label: 'All time', days: null },
  { id: '90d', label: '90 days', days: 90 },
  { id: '30d', label: '30 days', days: 30 },
];

export function rangeBounds(records, rangeId) {
  const times = records.map((r) => r.date).filter(Boolean).map((d) => d.getTime());
  if (!times.length) return null;
  const last = new Date(Math.max(...times));
  const first = new Date(Math.min(...times));
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0];
  if (!range.days) return { from: first, to: last, days: null };
  return { from: new Date(last.getTime() - (range.days - 1) * 86400000), to: last, days: range.days };
}

export function inBounds(record, bounds) {
  if (!bounds || !record.date) return !bounds;
  return record.date >= bounds.from && record.date <= bounds.to;
}

export function shiftBounds(bounds) {
  if (!bounds || !bounds.days) return null;
  const span = (bounds.days - 1) * 86400000;
  return {
    from: new Date(bounds.from.getTime() - span - 86400000),
    to: new Date(bounds.from.getTime() - 86400000),
    days: bounds.days,
  };
}

// Cumulative value per day across the bounds. Days with no activity still get a
// point, so the x-axis is linear in time rather than in records.
export function cumulativeSeries(records, bounds, dateOf, valueOf) {
  if (!bounds) return [];
  const perDay = new Map();
  for (const r of records) {
    const d = dateOf(r);
    if (!d) continue;
    const v = valueOf(r);
    if (!v) continue;
    const k = dayKey(d);
    perDay.set(k, (perDay.get(k) || 0) + v);
  }

  const points = [];
  let running = 0;
  const start = bounds.from.getTime();
  const end = bounds.to.getTime();
  const step = 86400000;
  const totalDays = Math.round((end - start) / step) + 1;
  // Cap the resolution so a long range stays a readable number of points.
  const stride = Math.max(1, Math.ceil(totalDays / 120));

  for (let t = start, i = 0; t <= end; t += step, i += 1) {
    const d = new Date(t);
    running += perDay.get(dayKey(d)) || 0;
    if (i % stride === 0 || t + step > end) {
      points.push({ date: d, value: running, added: perDay.get(dayKey(d)) || 0 });
    }
  }
  return points;
}

// A short cumulative trace for a stat tile. Always n points, evenly sampled.
export function sparkSeries(records, bounds, valueOf, n) {
  const count = n || 12;
  if (!bounds) return new Array(count).fill(0);
  const start = bounds.from.getTime();
  const span = Math.max(bounds.to.getTime() - start, 86400000);
  const buckets = new Array(count).fill(0);

  for (const r of records) {
    if (!r.date) continue;
    const idx = Math.min(count - 1, Math.floor(((r.date.getTime() - start) / span) * count));
    if (idx < 0) continue;
    buckets[idx] += valueOf(r);
  }

  let running = 0;
  return buckets.map((b) => (running += b));
}

// Every month touched by the bounds, so a gap month shows as an empty column
// instead of vanishing from the axis.
export function monthsIn(bounds) {
  if (!bounds) return [];
  const out = [];
  const d = new Date(Date.UTC(bounds.from.getUTCFullYear(), bounds.from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(bounds.to.getUTCFullYear(), bounds.to.getUTCMonth(), 1));
  while (d <= end) {
    out.push(new Date(d));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

// Group records by a key, sum a measure, return the biggest n.
export function topBy(records, keyOf, valueOf, n) {
  const totals = new Map();
  for (const r of records) {
    const k = keyOf(r);
    if (!k) continue;
    const cur = totals.get(k) || { label: k, value: 0, count: 0 };
    cur.value += valueOf(r);
    cur.count += 1;
    totals.set(k, cur);
  }
  return Array.from(totals.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, n || 8);
}

const money0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const money2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtMoney(v, exact) {
  return exact ? money2.format(v || 0) : money0.format(v || 0);
}

export function fmtDate(d, withYear) {
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  });
}

export function fmtMonth(d) {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

export function pctChange(now, before) {
  if (before === 0 || before == null) return null;
  return ((now - before) / before) * 100;
}
