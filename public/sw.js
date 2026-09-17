// Offline shell for Hustle Desk.
//
// Three caching rules, by what the request is for:
//   build assets  - immutable, so cache-first and never revalidate
//   sheet data    - network-first, falling back to the last good copy offline
//   pages         - network-first, falling back to cache so the app still opens
//
// Bump CACHE_VERSION to retire every old cache on the next activate.
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `hustle-static-${CACHE_VERSION}`;
const DATA_CACHE = `hustle-data-${CACHE_VERSION}`;
const PAGE_CACHE = `hustle-pages-${CACHE_VERSION}`;
const KEEP = [STATIC_CACHE, DATA_CACHE, PAGE_CACHE];

const OFFLINE_URLS = ['/', '/tesla'];

const OFFLINE_HTML = `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>
<body style="margin:0;display:grid;place-items:center;height:100vh;background:#0a0a0b;
color:#6b6b70;font:14px system-ui,-apple-system,'Segoe UI',sans-serif">
Offline — open this once while connected and it will work from here.
</body>`;

// Cache writes are best-effort: a failed write must never take the response with
// it. Keys are URL strings because a navigation's Request cannot be cache.put().
async function putSafe(cacheName, key, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, response);
  } catch (err) {
    /* storage full, opaque response, unsupported key - not worth failing over */
  }
}

async function matchIn(cacheName, key) {
  try {
    const cache = await caches.open(cacheName);
    return await cache.match(key);
  } catch (err) {
    return undefined;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // One at a time, so a single miss doesn't abandon the whole precache.
      for (const url of OFFLINE_URLS) {
        try {
          const res = await fetch(url, { credentials: 'same-origin' });
          if (cacheable(res)) await putSafe(PAGE_CACHE, new URL(url, self.location.origin).href, res);
        } catch (err) {
          /* precache is an optimisation, not a requirement */
        }
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Tag a cached response so the page can say it is showing stale numbers rather
// than pretending it just synced.
function markStale(response) {
  const headers = new Headers(response.headers);
  headers.set('x-from-cache', '1');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// A response that arrived via a redirect is not the thing that was asked for -
// signed out, every page fetch lands on /login, and caching that under "/" would
// serve the login screen offline forever.
function cacheable(response) {
  return response && response.ok && !response.redirected;
}

async function cacheFirst(request, cacheName) {
  const key = request.url;
  const hit = await matchIn(cacheName, key);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) putSafe(cacheName, key, response.clone());
  return response;
}

async function networkFirst(request, cacheName, stale) {
  const key = request.url;
  try {
    const response = await fetch(request);
    if (cacheable(response)) putSafe(cacheName, key, response.clone());
    return response;
  } catch (err) {
    const hit = await matchIn(cacheName, key);
    if (hit) return stale ? markStale(hit) : hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE).catch(() => fetch(request)));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DATA_CACHE, true));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, PAGE_CACHE, false).catch(async () => {
        const hit =
          (await matchIn(PAGE_CACHE, request.url)) || (await matchIn(PAGE_CACHE, url.origin + '/'));
        return (
          hit ||
          new Response(OFFLINE_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } })
        );
      })
    );
  }
});
