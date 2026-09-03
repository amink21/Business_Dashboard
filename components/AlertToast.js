import { useEffect, useRef, useState } from 'react';

const SHOW_MS = 4600;

// One lock-screen alert per visit, picked at random from the pool of real
// moments in the sheet - so a reload brings a different (still true) headline.
export default function AlertToast({ alerts, nonce, app, mark }) {
  const [current, setCurrent] = useState(null);
  const timer = useRef(null);
  const lastId = useRef(null);

  // The pool is read through a ref so the alert fires only when `nonce` changes -
  // on load and on the button - not on every keystroke in the search box.
  const poolRef = useRef(alerts);
  poolRef.current = alerts;

  useEffect(() => {
    clearTimeout(timer.current);
    setCurrent(null);
    if (!nonce) return undefined;

    const pool = poolRef.current;
    if (!pool.length) return undefined;

    // Random pick happens here rather than during render: the server has no way
    // to agree on a dice roll, and re-rolling avoids repeating the last one.
    let pick = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && pick.id === lastId.current) {
      pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    }
    lastId.current = pick.id;

    setCurrent(pick);
    timer.current = setTimeout(() => setCurrent(null), SHOW_MS);
    return () => clearTimeout(timer.current);
  }, [nonce]);

  return (
    <div className="dock" role="status" aria-live="polite">
      {current && (
        <button
          type="button"
          className="toast"
          key={current.id + String(nonce)}
          onClick={() => setCurrent(null)}
        >
          <span className="icon" aria-hidden="true">
            {mark}
          </span>
          <span className="body">
            <span className="head">
              <span className="app">{app}</span>
              <span className="ago">now</span>
            </span>
            <span className="title">{current.title}</span>
            <span className="sub">{current.sub}</span>
          </span>
        </button>
      )}

      <style jsx>{`
        .dock {
          position: fixed;
          top: 12px;
          left: 12px;
          right: 12px;
          z-index: 60;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .toast {
          pointer-events: auto;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          width: 100%;
          max-width: 400px;
          text-align: left;
          padding: 11px 13px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(38, 38, 42, 0.92);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.6);
          animation: drop 280ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
        }
        @keyframes drop {
          from {
            opacity: 0;
            transform: translateY(-14px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: linear-gradient(160deg, #2b2b30, #17171a);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .body {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }
        .app {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.62);
        }
        .ago {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.45);
        }
        .title {
          font-size: 13.5px;
          font-weight: 650;
          color: #fff;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sub {
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.72);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (min-width: 720px) {
          .dock {
            justify-content: flex-end;
            left: auto;
            right: 18px;
            top: 18px;
            width: 400px;
          }
        }
      `}</style>
    </div>
  );
}
