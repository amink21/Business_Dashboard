import { dayKey, fmtDate, fmtMoney, monthKey } from './data';

// A year-in-review built only from what the sheet says. Cards that have no data
// behind them are dropped rather than padded with something invented.

function bestBy(records, dateOf, valueOf, keyer) {
  const groups = new Map();
  for (const r of records) {
    const d = dateOf(r);
    if (!d) continue;
    const k = keyer(d);
    const cur = groups.get(k) || { date: d, total: 0, count: 0 };
    cur.total += valueOf(r);
    cur.count += 1;
    groups.set(k, cur);
  }
  return Array.from(groups.values()).sort((a, b) => b.total - a.total)[0] || null;
}

function monthName(d) {
  return d ? d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }) : '';
}

export function buildCards(orders, items) {
  const done = orders.filter((o) => o.kind === 'completed');
  const sold = items.filter((i) => i.kind === 'completed');
  if (!done.length && !sold.length) return [];

  const printGross = done.reduce((s, o) => s + o.sale, 0);
  const printNet = done.reduce((s, o) => s + o.profit, 0);
  const teslaGross = sold.reduce((s, i) => s + i.sale, 0);
  const teslaNet = sold.reduce((s, i) => s + i.profit, 0);
  const gross = printGross + teslaGross;
  const net = printNet + teslaNet;

  const dates = [...done.map((o) => o.date), ...sold.map((i) => i.sold)].filter(Boolean);
  const first = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  const last = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

  const allSales = [
    ...done.map((o) => ({ date: o.date, value: o.sale })),
    ...sold.map((i) => ({ date: i.sold, value: i.sale })),
  ];
  const topDay = bestBy(allSales, (r) => r.date, (r) => r.value, dayKey);
  const topMonth = bestBy(allSales, (r) => r.date, (r) => r.value, monthKey);

  const hours = orders.reduce((s, o) => s + o.hrs, 0);

  const repeats = new Map();
  for (const o of orders) {
    const k = o.customer.trim();
    if (k) repeats.set(k, (repeats.get(k) || 0) + 1);
  }
  const loyal = Array.from(repeats.entries()).sort((a, b) => b[1] - a[1])[0];

  const topItem = Array.from(
    done.reduce((m, o) => m.set(o.item, (m.get(o.item) || 0) + o.profit), new Map()).entries()
  ).sort((a, b) => b[1] - a[1])[0];

  const flip = sold
    .filter((i) => i.daysListed > 0)
    .reduce((b, i) => (!b || i.daysListed < b.daysListed ? i : b), null);

  const teslaShare = net ? (teslaNet / net) * 100 : 0;
  const winner = teslaNet >= printNet ? 'Tesla chargers' : '3D printing';

  const cards = [
    {
      id: 'intro',
      kicker: 'The story so far',
      value: first && last ? `${fmtDate(first)} — ${fmtDate(last)}` : 'Your run',
      label: 'Two hustles, one spreadsheet',
      sub: 'Everything that follows is straight out of it.',
      size: 'md',
    },
    {
      id: 'gross',
      kicker: 'Money in',
      value: fmtMoney(gross, true),
      label: `${done.length + sold.length} sales closed`,
      sub: `${fmtMoney(net, true)} of it was profit.`,
    },
    sold.length && {
      id: 'tesla',
      kicker: 'Tesla chargers',
      value: String(sold.length),
      label: 'chargers bought and flipped',
      sub: `${fmtMoney(teslaNet, true)} net at ${fmtMoney(
        sold.length ? teslaNet / sold.length : 0,
        true
      )} a unit.`,
    },
    done.length && {
      id: 'print',
      kicker: '3D printing',
      value: String(done.length),
      label: 'orders off the plate',
      sub: `${fmtMoney(printNet, true)} net across ${hours.toFixed(0)} hours of printing.`,
    },
    topDay && {
      id: 'day',
      kicker: 'Your best day',
      value: fmtMoney(topDay.total, true),
      label: fmtDate(topDay.date, true),
      sub: `${topDay.count} sale${topDay.count === 1 ? '' : 's'} in a single day.`,
    },
    topMonth && {
      id: 'month',
      kicker: 'Your best month',
      value: monthName(topMonth.date),
      label: fmtMoney(topMonth.total, true),
      sub: `${topMonth.count} sales.`,
      size: 'md',
    },
    hours > 0 && {
      id: 'hours',
      kicker: 'Printer time',
      value: `${hours.toFixed(0)} h`,
      label: `that is ${(hours / 24).toFixed(1)} days straight`,
      sub: 'of the machine just running.',
    },
    topItem && {
      id: 'item',
      kicker: 'Your best seller',
      value: topItem[0],
      label: `${fmtMoney(topItem[1], true)} of profit`,
      sub: 'from that one design.',
      size: 'sm',
    },
    loyal &&
      loyal[1] > 1 && {
        id: 'loyal',
        kicker: 'Your regular',
        value: loyal[0],
        label: `came back ${loyal[1]} times`,
        sub: 'Repeat customers are the cheapest revenue there is.',
        size: 'md',
      },
    flip && {
      id: 'flip',
      kicker: 'Fastest flip',
      value: `${flip.daysListed} days`,
      label: `${flip.product}`,
      sub: `Bought, listed, sold — ${fmtMoney(flip.profit, true)} on it.`,
    },
    net > 0 && {
      id: 'winner',
      kicker: 'The winner',
      value: winner,
      label: `${teslaShare.toFixed(0)}% of profit came from chargers`,
      sub: `${fmtMoney(teslaNet, true)} against ${fmtMoney(printNet, true)}.`,
      size: 'sm',
    },
    {
      id: 'outro',
      kicker: 'All in',
      value: fmtMoney(net, true),
      label: 'net profit, both hustles',
      sub: 'Still live. Go sell something.',
      final: true,
    },
  ];

  return cards.filter(Boolean);
}
