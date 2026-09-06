import { fmtMoney, num } from './data';

// Renders sheet rows as API traffic. Nothing here invents an event: one row in
// the sheet is exactly one line in the log, and the JSON body only restates what
// that row already says.

// One well-mixed hash for everything derived per row. Sequential ids like
// OP-001/OP-002 differ by a single character, so the avalanche step matters:
// without it consecutive rows produce consecutive latencies and the log reads
// like a counter instead of traffic.
function mix(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// Stable per row, so a reload doesn't reshuffle every identifier.
function hashId(prefix, seed) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let n = mix(seed + prefix);
  let tail = '';
  for (let i = 0; i < 14; i += 1) {
    n = mix(String(n) + i);
    tail += alphabet[n % alphabet.length];
  }
  return `${prefix}_1${tail}`;
}

function latency(seed) {
  return 38 + (mix(seed + 'lat') % 260);
}

function stamp(date, seed) {
  if (!date) return '--:--:--';
  const h = mix(seed + 'clock');
  const hh = String(8 + ((h >>> 2) % 12)).padStart(2, '0');
  const mm = String((h >>> 8) % 60).padStart(2, '0');
  const ss = String((h >>> 16) % 60).padStart(2, '0');
  return `${date.toISOString().slice(0, 10)} ${hh}:${mm}:${ss}`;
}

const cents = (v) => Math.round(num(v) * 100);

export function printLog(orders) {
  return orders
    .slice()
    .reverse()
    .map((o) => {
      const seed = o.id || o.item;
      const base = {
        id: hashId(o.kind === 'cancelled' ? 're' : 'ch', seed),
        object: o.kind === 'cancelled' ? 'refund' : 'charge',
        amount: cents(o.sale),
        currency: 'cad',
        description: o.item,
        customer: o.customer || null,
        metadata: {
          order_id: o.id,
          print_hours: o.hrs,
          material_cost: cents(o.cost),
          platform: o.platform || null,
          delivery: o.delivery || null,
        },
      };

      if (o.kind === 'completed') {
        return {
          key: seed,
          time: stamp(o.date, seed),
          method: 'POST',
          path: '/v1/charges',
          status: 200,
          ms: latency(seed),
          summary: `${fmtMoney(o.sale, true)} · ${o.item}`,
          body: { ...base, paid: true, captured: true, net: cents(o.profit) },
        };
      }
      if (o.kind === 'cancelled') {
        return {
          key: seed,
          time: stamp(o.date, seed),
          method: 'POST',
          path: '/v1/refunds',
          status: 402,
          ms: latency(seed),
          summary: `cancelled · ${o.item}`,
          body: { ...base, paid: false, reason: 'order_cancelled' },
        };
      }
      return {
        key: seed,
        time: stamp(o.date, seed),
        method: 'POST',
        path: '/v1/payment_intents',
        status: 202,
        ms: latency(seed),
        summary: `queued · ${o.item}`,
        body: { ...base, object: 'payment_intent', status: o.status, captured: false },
      };
    });
}

export function teslaLog(items) {
  return items
    .slice()
    .reverse()
    .map((i) => {
      const seed = i.id;
      const base = {
        id: hashId(i.kind === 'completed' ? 'or' : 'inv', seed),
        object: i.kind === 'completed' ? 'order' : 'inventory_item',
        sku: i.id,
        product: i.product,
        supplier: i.supplier,
        cost: cents(i.buy),
        currency: 'cad',
        metadata: { days_listed: i.daysListed, status: i.status },
      };

      if (i.kind === 'completed') {
        return {
          key: seed,
          time: stamp(i.sold || i.purchased, seed),
          method: 'POST',
          path: '/v1/orders',
          status: 200,
          ms: latency(seed),
          summary: `${fmtMoney(i.sale, true)} · ${i.product}`,
          body: { ...base, amount: cents(i.sale), net: cents(i.profit), fulfilled: true },
        };
      }
      return {
        key: seed,
        time: stamp(i.purchased, seed),
        method: 'PUT',
        path: '/v1/inventory',
        status: i.kind === 'queued' ? 202 : 201,
        ms: latency(seed),
        summary: `${i.status.toLowerCase()} · ${i.product}`,
        body: { ...base, fulfilled: false },
      };
    });
}
