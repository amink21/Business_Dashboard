// Server-side proxy to the Apps Script write endpoint, for the Tesla Inventory
// tab - the charger-side counterpart to /api/order. See that file for why the
// script URL and token stay server-side.

import { callScript } from '../../lib/appsScript';

const ALLOWED_STATUSES = ['Available', 'Pending Pickup', 'Sold'];

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

  const pin = process.env.DASHBOARD_PIN;
  if (pin && req.headers['x-dashboard-pin'] !== pin) {
    return res.status(401).json({ error: 'Wrong PIN.' });
  }

  const body = req.body || {};

  if (body.action === 'create') {
    const product = typeof body.product === 'string' ? body.product.trim() : '';
    const supplier = typeof body.supplier === 'string' ? body.supplier.trim() : '';
    const purchasePrice = Number(body.purchasePrice);
    const quantity = Number(body.quantity);
    if (!product) return res.status(400).json({ error: 'Missing product type.' });
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      return res.status(400).json({ error: 'Purchase price must be a positive number.' });
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100) {
      return res.status(400).json({ error: 'Quantity must be between 1 and 100.' });
    }

    const created = await callScript(url, {
      action: 'createTeslaItems',
      token,
      product,
      supplier,
      purchasePrice,
      quantity: Math.round(quantity),
    });
    return res.status(created.status).json(created.body);
  }

  const { itemId, status, salePrice } = body;
  if (!itemId) return res.status(400).json({ error: 'Missing itemId.' });
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

  const result = await callScript(url, { action: 'updateTeslaItem', token, itemId, status, salePrice: price });
  return res.status(result.status).json(result.body);
}
