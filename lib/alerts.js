import { dayKey, fmtDate, fmtMoney, monthKey } from './data';

// Every alert in these pools is a fact out of the sheet - a real sale, a real
// best day, a real streak. Nothing here is invented, so a screenshot of one is
// still true.

function biggest(records, valueOf) {
  return records.reduce((best, r) => (!best || valueOf(r) > valueOf(best) ? r : best), null);
}

function bestDay(records, dateOf, valueOf) {
  const byDay = new Map();
  for (const r of records) {
    const d = dateOf(r);
    if (!d) continue;
    const k = dayKey(d);
    const cur = byDay.get(k) || { date: d, total: 0, count: 0 };
    cur.total += valueOf(r);
    cur.count += 1;
    byDay.set(k, cur);
  }
  return Array.from(byDay.values()).sort((a, b) => b.total - a.total)[0] || null;
}

function bestMonth(records, dateOf, valueOf) {
  const byMonth = new Map();
  for (const r of records) {
    const d = dateOf(r);
    if (!d) continue;
    const k = monthKey(d);
    const cur = byMonth.get(k) || { date: d, total: 0, count: 0 };
    cur.total += valueOf(r);
    cur.count += 1;
    byMonth.set(k, cur);
  }
  return Array.from(byMonth.values()).sort((a, b) => b.total - a.total)[0] || null;
}

function monthName(d) {
  return d ? d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }) : '';
}

// Recent sales carry most of the weight - a payments dashboard mostly pings you
// about payments - with the highlights mixed in for variety.
//
// Deduped by rendered text: a run of identical charger sales would otherwise fill
// the pool and every reload would show the same headline.
function withSales(sales, highlights, toAlert) {
  const pool = [...sales.slice(-10).reverse().map(toAlert), ...highlights.filter(Boolean)];
  const seen = new Set();
  return pool.filter((a) => {
    const k = `${a.title}|${a.sub}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function printAlerts(orders, stats) {
  const done = orders.filter((o) => o.kind === 'completed');
  if (!done.length) return [];

  const top = biggest(done, (o) => o.sale);
  const day = bestDay(done, (o) => o.date, (o) => o.sale);
  const month = bestMonth(done, (o) => o.date, (o) => o.sale);
  const fastest = done
    .filter((o) => o.hrs > 0)
    .reduce((best, o) => (!best || o.profit / o.hrs > best.profit / best.hrs ? o : best), null);

  const repeats = new Map();
  for (const o of orders) {
    const k = o.customer.trim();
    if (k) repeats.set(k, (repeats.get(k) || 0) + 1);
  }
  const loyal = Array.from(repeats.entries()).sort((a, b) => b[1] - a[1])[0];

  return withSales(
    done,
    [
      top && {
        id: 'big',
        title: `Biggest order · ${fmtMoney(top.sale, true)}`,
        sub: `${top.item}${top.customer ? ` — ${top.customer}` : ''}`,
      },
      day && {
        id: 'day',
        title: `Best day · ${fmtMoney(day.total, true)}`,
        sub: `${day.count} order${day.count === 1 ? '' : 's'} on ${fmtDate(day.date, true)}`,
      },
      month && {
        id: 'month',
        title: `${monthName(month.date)} closed at ${fmtMoney(month.total, true)}`,
        sub: `${month.count} orders shipped`,
      },
      fastest && {
        id: 'rate',
        title: `Best rate · ${fmtMoney(fastest.profit / fastest.hrs, true)}/hr`,
        sub: `${fastest.item} — ${fastest.hrs}h on the plate`,
      },
      loyal &&
        loyal[1] > 1 && {
          id: 'loyal',
          title: `${loyal[0]} is back`,
          sub: `${loyal[1]} orders and counting`,
        },
      {
        id: 'total',
        title: `${fmtMoney(stats.net, true)} banked`,
        sub: `${stats.completed} orders · ${stats.margin.toFixed(1)}% margin`,
      },
      {
        id: 'hours',
        title: `${stats.hours.toFixed(0)} print hours logged`,
        sub: `${fmtMoney(stats.profitPerHour, true)} earned per hour of printer time`,
      },
    ],
    (o) => ({
      id: `sale-${o.id}`,
      title: `New sale · ${fmtMoney(o.sale, true)}`,
      sub: o.customer ? `${o.item} — ${o.customer}` : o.item,
    })
  );
}

export function teslaAlerts(items, stats) {
  const sold = items.filter((i) => i.kind === 'completed');
  if (!sold.length) return [];

  const top = biggest(sold, (i) => i.profit);
  const month = bestMonth(sold, (i) => i.sold, (i) => i.sale);
  const flip = sold
    .filter((i) => i.daysListed > 0)
    .reduce((best, i) => (!best || i.daysListed < best.daysListed ? i : best), null);

  const byProduct = new Map();
  for (const i of sold) byProduct.set(i.product, (byProduct.get(i.product) || 0) + i.profit);
  const line = Array.from(byProduct.entries()).sort((a, b) => b[1] - a[1])[0];

  return withSales(
    sold,
    [
      top && {
        id: 'big',
        title: `Best flip · ${fmtMoney(top.profit, true)} profit`,
        sub: `${top.product} — bought ${fmtMoney(top.buy, true)}, sold ${fmtMoney(top.sale, true)}`,
      },
      flip && {
        id: 'fast',
        title: `Fastest flip · ${flip.daysListed} days`,
        sub: `${flip.product} — ${fmtMoney(flip.profit, true)} in and out`,
      },
      month && {
        id: 'month',
        title: `${monthName(month.date)} closed at ${fmtMoney(month.total, true)}`,
        sub: `${month.count} chargers moved`,
      },
      line && {
        id: 'line',
        title: `${line[0]} leads`,
        sub: `${fmtMoney(line[1], true)} profit from that line alone`,
      },
      {
        id: 'total',
        title: `${fmtMoney(stats.net, true)} banked`,
        sub: `${stats.completed} of ${stats.count} units sold · ${stats.sellThrough.toFixed(
          1
        )}% sell-through`,
      },
      stats.available > 0 && {
        id: 'stock',
        title: `${stats.available} still on the shelf`,
        sub: `${fmtMoney(stats.stockValue, true)} tied up · ${stats.avgDays.toFixed(
          1
        )} days to sell on average`,
      },
    ],
    (i) => ({
      id: `sale-${i.id}`,
      title: `New sale · ${fmtMoney(i.sale, true)}`,
      sub: `${i.product} — ${fmtMoney(i.profit, true)} net in ${i.daysListed}d`,
    })
  );
}
