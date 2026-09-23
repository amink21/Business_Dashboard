import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Dev serves uncached chunks that a service worker would fight with, so the
    // worker only runs in a real build. If one is still registered from an
    // earlier production run on this same origin, it will keep answering dev
    // requests with a stale cached bundle - Fast Refresh then loops forever
    // trying to reconcile a webpack hash the current dev server never made.
    // Clearing it here means a leftover worker heals itself on the next load
    // instead of needing a manual DevTools trip.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => undefined);
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  return (
    <>
      <Head>
        <title>Hustle Desk</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0a0a0b" />
        <meta name="description" content="Live revenue, profit and inventory across both hustles." />

        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* iOS builds its own splash from the manifest name and background_color
            once these are set, so no per-device startup images are needed. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hustle" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
