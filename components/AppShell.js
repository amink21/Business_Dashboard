import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import IconButton from './IconButton';

const TABS = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/queue', icon: 'queue', label: 'Queue' },
  { href: '/stats', icon: 'stats', label: 'Stats' },
  { href: '/quote', icon: 'quote', label: 'Quote' },
];

// The Queue badge count is passed in rather than fetched here: every page that
// renders AppShell already loads the print sheet for its own purposes, so a
// second independent fetch here would just duplicate that request on every
// single page view.
export default function AppShell({ kicker, title, actions, onAlert, queueBadge, children }) {
  const { pathname } = useRouter();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/login')
      .then((r) => r.json())
      .then((b) => {
        if (alive) setLocked(Boolean(b.enabled));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function signOut() {
    try {
      await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (err) {
      /* clearing the cookie locally still matters */
    }
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (err) {
      /* no service worker, or storage unavailable */
    }
    window.location.assign('/login');
  }

  return (
    <div className="app">
      <header className="top">
        <div className="titles">
          <span className="kicker">{kicker}</span>
          <h1>{title}</h1>
        </div>
        <div className="actions">
          {actions}
          {onAlert && <IconButton name="bell" size={18} label="Show an alert" onClick={onAlert} />}
          {locked && <IconButton name="lock" size={17} label="Sign out" onClick={signOut} />}
        </div>
      </header>

      <main className="content">{children}</main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => {
          const on = t.href === pathname;
          return (
            <Link key={t.href} href={t.href} className={`tab ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}>
              <span className="tabIcon">
                <Icon name={t.icon} size={22} strokeWidth={on ? 2.1 : 1.8} />
                {t.href === '/queue' && queueBadge > 0 && (
                  <span className="badge">{queueBadge > 99 ? '99+' : queueBadge}</span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        .app {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--plane);
        }
        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: calc(18px + env(safe-area-inset-top, 0px)) 20px 14px;
        }
        .titles {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .kicker {
          font-size: 11px;
          font-weight: 650;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted);
        }
        h1 {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 3px 0 0;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .content {
          flex: 1;
          padding: 4px 16px calc(96px + env(safe-area-inset-bottom, 0px));
          max-width: 520px;
          width: 100%;
          margin: 0 auto;
        }
        .tabbar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          display: flex;
          justify-content: center;
          gap: clamp(8px, 6vw, 40px);
          padding: 9px 16px calc(9px + env(safe-area-inset-bottom, 0px));
          background: rgba(22, 22, 24, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--line);
        }
      `}</style>

      <style jsx global>{`
        .tabbar .tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--muted);
          text-decoration: none;
          padding: 2px 6px;
          min-width: 52px;
          transition: transform 120ms ease;
        }
        .tabbar .tab:active {
          transform: scale(0.9);
        }
        .tabbar .tab.on {
          color: var(--ink);
        }
        .tabbar .tabIcon {
          position: relative;
          display: inline-flex;
        }
        .tabbar .badge {
          position: absolute;
          top: -4px;
          right: -8px;
          min-width: 15px;
          height: 15px;
          padding: 0 3px;
          border-radius: 8px;
          background: var(--warning);
          color: #241a00;
          font-size: 9.5px;
          font-weight: 700;
          line-height: 15px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
