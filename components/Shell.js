import Link from 'next/link';
import { useRouter } from 'next/router';
import BrowserChrome from './BrowserChrome';

const TABS = [
  { href: '/', label: '3D Printing', mark: '🖨️', name: 'Print Lab' },
  { href: '/tesla', label: 'Tesla Chargers', mark: '⚡', name: 'Charger Desk' },
];

export default function Shell({ path, loading, onRefresh, onAlert, dim, children }) {
  const { pathname } = useRouter();
  const active = TABS.find((t) => t.href === pathname) || TABS[0];

  return (
    <main className="page">
      <BrowserChrome path={path}>
        <header className="top">
          <div className="brand">
            <span className="mark" aria-hidden="true">
              {active.mark}
            </span>
            <span className="names">
              <span className="name">{active.name}</span>
              <span className="crumb">Overview</span>
            </span>
          </div>
          <div className="actions">
            <span className="live">
              <span className="pulse" aria-hidden="true" />
              Live
            </span>
            {onAlert && (
              <button type="button" className="btn" onClick={onAlert}>
                New alert
              </button>
            )}
            <button type="button" className="btn" onClick={onRefresh} disabled={loading}>
              {loading ? 'Syncing…' : 'Refresh'}
            </button>
          </div>
        </header>

        <nav className="tabs" aria-label="Hustles">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`tab ${t.href === pathname ? 'on' : ''}`}
              aria-current={t.href === pathname ? 'page' : undefined}
            >
              <span aria-hidden="true">{t.mark}</span>
              {t.label}
            </Link>
          ))}
        </nav>

        <div className={`content ${dim ? 'dim' : ''}`}>{children}</div>
      </BrowserChrome>

      <style jsx>{`
        .page {
          max-width: 940px;
          margin: 0 auto;
          padding: 18px 14px 48px;
        }
        .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 15px;
          background: var(--surface);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .mark {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: var(--surface-3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
        }
        .names {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
          min-width: 0;
        }
        .name {
          font-size: 13.5px;
          font-weight: 650;
        }
        .crumb {
          font-size: 11px;
          color: var(--muted);
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
          background: var(--accent-wash);
          padding: 4px 9px;
          border-radius: 6px;
        }
        .pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: blink 2.4s ease-in-out infinite;
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }
        .btn {
          background: var(--surface-2);
          border: 1px solid var(--line);
          color: var(--ink-2);
          border-radius: 7px;
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 550;
        }
        .btn:hover:not(:disabled) {
          color: var(--ink);
          border-color: var(--baseline);
        }
        .btn:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .tabs {
          display: flex;
          gap: 2px;
          padding: 0 15px;
          background: var(--surface);
          border-bottom: 1px solid var(--line);
          overflow-x: auto;
        }
        .content {
          padding: 16px 15px 18px;
          transition: opacity 160ms ease;
        }
        .content.dim {
          opacity: 0.55;
        }
        @media (max-width: 720px) {
          .page {
            padding: 10px 8px 40px;
          }
        }
        @media (max-width: 480px) {
          .actions .btn:first-of-type {
            display: none;
          }
        }
      `}</style>

      <style jsx global>{`
        .tabs .tab {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 13px 10px;
          font-size: 12.5px;
          font-weight: 550;
          color: var(--muted);
          text-decoration: none;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
        }
        .tabs .tab:hover {
          color: var(--ink-2);
        }
        .tabs .tab.on {
          color: var(--ink);
          border-bottom-color: var(--accent);
        }
      `}</style>
    </main>
  );
}
