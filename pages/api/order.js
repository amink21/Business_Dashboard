// Server-side proxy to the Apps Script write endpoint.
//
// The script URL and its token stay on the server and never reach the browser.
// If they were in client code, anyone who opened the site could read them out of
// the bundle and write to the sheet directly.

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

  const { orderId, status } = body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId.' });
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }

  const result = await callScript(url, { action: 'updateStatus', token, orderId, status });
  return res.status(result.status).json(result.body);
}

// Both actions share the same upstream shape: POST JSON, follow the redirect
// Apps Script answers with, and translate its handful of failure modes into
// something a debugging session doesn't need to happen to understand.
async function callScript(url, payload) {
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      // An HTML body here means the deployment isn't reachable as we expect -
      // usually "Who has access" is not set to Anyone, or the URL is stale.
      return {
        status: 502,
        body: {
          error:
            'The Apps Script returned a page instead of JSON. Check the deployment is a Web app with access set to "Anyone", and that APPS_SCRIPT_URL is the current /exec URL.',
        },
      };
    }

    if (data.error) {
      // The script only says "Unauthorized" - which of the three usual causes it
      // is saves a debugging session.
      if (/unauthori/i.test(data.error)) {
        return {
          status: 400,
          body: {
            error:
              'The script rejected the token. Check APPS_SCRIPT_TOKEN matches TOKEN in Code.gs exactly, that the token has no $ or # in it (a $ is expanded away by .env parsing), and that you redeployed the script after changing it.',
          },
        };
      }
      if (/unknown action/i.test(data.error)) {
        return {
          status: 400,
          body: {
            error:
              'The deployed Apps Script does not know this action yet. Paste the current google-apps-script/Code.gs into the script editor and deploy a new version.',
          },
        };
      }
      return { status: 400, body: data };
    }
    return { status: 200, body: data };
  } catch (err) {
    return { status: 502, body: { error: `Could not reach the script: ${err.message}` } };
  }
}
