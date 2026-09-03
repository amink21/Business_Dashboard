import { useEffect, useState } from 'react';

// The window frame the whole dashboard sits in - traffic lights and an address
// bar. The URL is the page's real origin, read at runtime, so the chrome is
// styling rather than a claim about being somewhere it isn't.
export default function BrowserChrome({ path, children }) {
  const [host, setHost] = useState('');

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  return (
    <div className="window">
      <div className="bar">
        <div className="lights" aria-hidden="true">
          <span className="l red" />
          <span className="l amber" />
          <span className="l green" />
        </div>
        <div className="omni">
          <svg viewBox="0 0 12 12" className="lock" aria-hidden="true">
            <path
              d="M3.2 5.2V4a2.8 2.8 0 0 1 5.6 0v1.2h.4a.8.8 0 0 1 .8.8v3.2a.8.8 0 0 1-.8.8H2.8a.8.8 0 0 1-.8-.8V6a.8.8 0 0 1 .8-.8zm1.4 0h2.8V4a1.4 1.4 0 0 0-2.8 0z"
              fill="currentColor"
            />
          </svg>
          <span className="url">
            <span className="host">{host || 'localhost:3000'}</span>
            <span className="path">{path}</span>
          </span>
        </div>
        <div className="spacer" aria-hidden="true" />
      </div>
      <div className="body">{children}</div>

      <style jsx>{`
        .window {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
        }
        .bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--surface-2);
          border-bottom: 1px solid var(--line);
        }
        .lights {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .l {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          display: block;
        }
        .red {
          background: var(--light-red);
        }
        .amber {
          background: var(--light-amber);
        }
        .green {
          background: var(--light-green);
        }
        .omni {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--plane);
          border: 1px solid var(--line);
          border-radius: 7px;
          padding: 4px 10px;
          color: var(--muted);
        }
        .lock {
          width: 11px;
          height: 11px;
          flex-shrink: 0;
        }
        .url {
          font-size: 11.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .host {
          color: var(--ink-2);
        }
        .path {
          color: var(--muted);
        }
        .spacer {
          width: 41px;
          flex-shrink: 0;
        }
        .body {
          background: var(--plane);
        }
        @media (max-width: 560px) {
          .window {
            border-radius: 12px;
          }
          .spacer {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
