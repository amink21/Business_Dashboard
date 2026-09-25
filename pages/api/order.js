// Server-side proxy to the Apps Script write endpoint.
//
// The script URL and its token stay on the server and never reach the browser.
// If they were in client code, anyone who opened the site could read them out of
// the bundle and write to the sheet directly.

import { callScript } from '../../lib/appsScript';

const ALLOWED_STATUSES = [
  'Need to Print',
  'Printed',
  'Waiting for Pickup',
  'Completed',
  'Cancelled',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const url = process.env.APPS_SCRIPT_URL;
  const token = process.env.APPS_SCRIPT_TOKEN;
  if (!url || !token) {
    return res.status(500).json({
      error:
        'Writing is not configured. Set APPS_SCRIPT_URL and APPS_SCRIPT_TOKEN, then redeploy.',
    });
  }

  // Optional shared PIN. Unset means the endpoint is open to anyone who finds
  // it - fine on a private URL, not fine on a public one.
  const pin = process.env.DASHBOARD_PIN;
  if (pin && req.headers['x-dashboard-pin'] !== pin) {
    return res.status(401).json({ error: 'Wrong PIN.' });
  }

  const body = req.body || {};

  if (body.action === 'create') {
    const item = typeof body.item === 'string' ? body.item.trim() : '';
    const hours = Number(body.hours);
    const price = Number(body.price);
    if (!item) return res.status(400).json({ error: 'Missing item name.' });
    if (!Number.isFinite(hours) || hours <= 0) {
      return res.status(400).json({ error: 'Print hours must be a positive number.' });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }
    const materialCost = Number.isFinite(Number(body.materialCost)) ? Number(body.materialCost) : 0;
    const deliveryCost = Number.isFinite(Number(body.deliveryCost)) ? Number(body.deliveryCost) : 0;

    const created = await callScript(url, {
      action: 'createOrder',
      token,
      item,
      hours,
      materialCost,
      totalCost: materialCost + deliveryCost,
      salePrice: price,
    });
    return res.status(created.status).json(created.body);
  }

  // Status and/or sale price - at least one, either, or both. Editing just the
  // price (no status) is exactly what the Queue screen's price editor sends.
  const { orderId, status, salePrice } = body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId.' });
  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }
  let price;
  if (salePrice !== undefined) {
    price = Number(salePrice);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }
  }
  if (status === undefined && price === undefined) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  const result = await callScript(url, { action: 'updateOrder', token, orderId, status, salePrice: price });
  return res.status(result.status).json(result.body);
}
