// Session signing, shared by the middleware (Edge runtime) and the API routes
// (Node). Everything here is Web Crypto, which both runtimes have - Node's
// `crypto` module would not load in middleware.

export const COOKIE = 'hd_session';
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

function hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Compares without leaking where two strings diverge. Inputs here are always
// fixed-length hex digests, so the length check gives nothing away.
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function digest(value) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

// The signing key is derived from the password itself, so there is no second
// secret to manage - and changing the password invalidates every session.
async function signingKey(password) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(`hustle-desk.session.v1:${password}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function sign(payload, password) {
  const key = await signingKey(password);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

export async function createToken(password) {
  const issued = Date.now().toString(36);
  return `${issued}.${await sign(issued, password)}`;
}

export async function verifyToken(token, password) {
  if (!token || !password) return false;

  const parts = String(token).split('.');
  if (parts.length !== 2) return false;
  const [issued, signature] = parts;

  const expected = await sign(issued, password);
  if (!safeEqual(signature, expected)) return false;

  const age = Date.now() - parseInt(issued, 36);
  return Number.isFinite(age) && age >= 0 && age < MAX_AGE_SECONDS * 1000;
}

// Hash both sides before comparing so the comparison is over equal-length
// digests rather than over the raw passwords.
export async function passwordMatches(submitted, actual) {
  if (typeof submitted !== 'string' || !actual) return false;
  const [a, b] = await Promise.all([digest(submitted), digest(actual)]);
  return safeEqual(a, b);
}

export function cookieHeader(token, { secure, persist = true }) {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (!token) {
    // Logging out: expire immediately regardless of how the session started.
    parts.push('Max-Age=0');
  } else if (persist) {
    parts.push(`Max-Age=${MAX_AGE_SECONDS}`);
  }
  // else: no Max-Age, so the browser drops it when the tab/app fully closes -
  // "keep me signed in" left unchecked. The signed token itself still expires
  // after MAX_AGE_SECONDS regardless, so this only affects how long the
  // browser is willing to hold onto the cookie.
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
