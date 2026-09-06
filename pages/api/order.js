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

  const { orderId, status } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'Missing orderId.' });
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }

  try {
    // Apps Script answers a POST with a 302 to script.googleusercontent.com and
    // serves the result there. fetch follows that redirect as a GET, which is
    // what we want: the write already happened on the first hop.
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateStatus', token, orderId, status }),
      redirect: 'follow',
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      // An HTML body here means the deployment isn't reachable as we expect -
      // usually "Who has access" is not set to Anyone, or the URL is stale.
      return res.status(502).json({
        error:
          'The Apps Script returned a page instead of JSON. Check the deployment is a Web app with access set to "Anyone", and that APPS_SCRIPT_URL is the current /exec URL.',
      });
    }

    if (data.error) {
      // The script only says "Unauthorized" - which of the three usual causes it
      // is saves a debugging session.
      if (/unauthori/i.test(data.error)) {
        return res.status(400).json({
          error:
            'The script rejected the token. Check APPS_SCRIPT_TOKEN matches TOKEN in Code.gs exactly, that the token has no $ or # in it (a $ is expanded away by .env parsing), and that you redeployed the script after changing it.',
        });
      }
      return res.status(400).json(data);
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: `Could not reach the script: ${err.message}` });
  }
}
