import { cookieHeader, createToken, passwordMatches } from '../../lib/auth';

// Best-effort brute-force brake. Serverless instances come and go, so this is a
// speed bump rather than a guarantee - the real protection is a long password.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function tooManyAttempts(key) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.first > WINDOW_MS) return false;
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.first > WINDOW_MS) {
    attempts.set(key, { first: now, count: 1 });
  } else {
    record.count += 1;
  }
}

export default async function handler(req, res) {
  // Lets the UI decide whether to show a sign-out control. Deliberately says
  // only whether a password exists, never anything about it.
  if (req.method === 'GET') {
    return res.status(200).json({ enabled: Boolean(process.env.DASHBOARD_PASSWORD) });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  // Follow the actual protocol, not NODE_ENV: a Secure cookie is dropped over
  // plain http, which would make `npm start` on localhost impossible to log into.
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = proto === 'https' || Boolean(req.socket && req.socket.encrypted);
  const { action, password, keepSignedIn } = req.body || {};

  if (action === 'logout') {
    res.setHeader('Set-Cookie', cookieHeader('', { secure }));
    return res.status(200).json({ ok: true });
  }

  const configured = process.env.DASHBOARD_PASSWORD;
  if (!configured) {
    return res.status(200).json({ ok: true, open: true });
  }

  const key = clientKey(req);
  if (tooManyAttempts(key)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }

  if (!(await passwordMatches(password, configured))) {
    recordFailure(key);
    // A uniform small delay so a wrong password cannot be distinguished from a
    // right one by how fast the answer comes back.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return res.status(401).json({ error: 'Wrong password.' });
  }

  attempts.delete(key);
  const token = await createToken(configured);
  res.setHeader('Set-Cookie', cookieHeader(token, { secure, persist: Boolean(keepSignedIn) }));
  return res.status(200).json({ ok: true });
}
