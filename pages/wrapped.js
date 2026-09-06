import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildCards } from '../lib/wrapped';
import { normalize as normalizePrint } from '../lib/print';
import { normalize as normalizeTesla } from '../lib/tesla';

const CARD_MS = 5200;

export default function Wrapped() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const started = useRef(0);
  const frame = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, t] = await Promise.all([
          fetch('/api/sheet?tab=print').then((r) => r.json()),
          fetch('/api/sheet?tab=tesla').then((r) => r.json()),
        ]);
        if (p.error) throw new Error(p.error);
        if (t.error) throw new Error(t.error);
        setOrders(normalizePrint(p));
        setItems(normalizeTesla(t));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = useMemo(() => buildCards(orders, items), [orders, items]);
  const card = cards[index];

  const go = useCallback(
    (delta) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(cards.length - 1, 0)));
      setProgress(0);
      started.current = performance.now();
    },
    [cards.length]
  );

  // Drive the progress bar off rAF rather than an interval, so pausing is exact
  // and the bar never drifts from the advance.
  useEffect(() => {
    if (!cards.length) return undefined;
    started.current = performance.now();
    setProgress(0);

    const tick = (now) => {
      if (!paused) {
        const p = Math.min((now - started.current) / CARD_MS, 1);
        setProgress(p);
        if (p >= 1) {
          if (index < cards.length - 1) {
            setIndex((i) => i + 1);
            started.current = now;
            setProgress(0);
          } else {
            return;
          }
        }
      } else {
        started.current = now - progress * CARD_MS;
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // progress is deliberately not a dependency: it is the thing being written
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, cards.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') window.location.assign('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (error) {
    return (
      <Frame>
        <p className="msg">{error}</p>
      </Frame>
    );
  }

  if (loading || !cards.length) {
    return (
      <Frame>
        <p className="msg">{loading ? 'Counting it up…' : 'Nothing to wrap yet.'}</p>
      </Frame>
    );
  }

  return (
    <Frame>
      <Head>
        <title>Wrapped</title>
      </Head>

      <div className="bars" aria-hidden="true">
        {cards.map((c, i) => (
          <span key={c.id} className="bar">
            <span
              className="fill"
              style={{ width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%' }}
            />
          </span>
        ))}
      </div>

      <Link href="/" className="close" aria-label="Back to the dashboard">
        ✕
      </Link>

      <div
        className={`card ${card.size || 'lg'} ${card.final ? 'final' : ''}`}
        key={card.id}
        role="group"
        aria-label={`${card.kicker}. ${card.value}. ${card.label}`}
      >
        <span className="kicker">{card.kicker}</span>
        <span className="value">{card.value}</span>
        <span className="label">{card.label}</span>
        {card.sub && <span className="sub">{card.sub}</span>}
      </div>

      <button className="zone left" onClick={() => go(-1)} aria-label="Previous" />
      <button
        className="zone right"
        onClick={() => go(1)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        aria-label="Next"
      />

      <div className="foot">
        <span>{index + 1} / {cards.length}</span>
        <span className="hint">Hold to pause · screenshot to share</span>
      </div>
    </Frame>
  );
}

function Frame({ children }) {
  return (
    <main className="frame">
      {children}
      <style jsx>{`
        .frame {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(120% 80% at 50% 0%, rgba(5, 175, 128, 0.16), transparent 60%),
            var(--plane);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: calc(28px + env(safe-area-inset-top, 0px)) 26px
            calc(28px + env(safe-area-inset-bottom, 0px));
          overflow: hidden;
        }
      `}</style>
      <style jsx global>{`
        .msg {
          color: var(--muted);
          font-size: 14px;
        }
        .bars {
          position: absolute;
          top: calc(14px + env(safe-area-inset-top, 0px));
          left: 14px;
          right: 14px;
          display: flex;
          gap: 4px;
        }
        .bars .bar {
          flex: 1;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.16);
          overflow: hidden;
        }
        .bars .fill {
          display: block;
          height: 100%;
          background: var(--accent);
        }
        .close {
          position: absolute;
          top: calc(26px + env(safe-area-inset-top, 0px));
          right: 16px;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          color: var(--ink-2);
          text-decoration: none;
          font-size: 15px;
          line-height: 1;
        }
        .close:hover {
          color: var(--ink);
          background: rgba(255, 255, 255, 0.16);
        }
        .card {
          position: relative;
          z-index: 2;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: center;
          pointer-events: none;
          animation: rise 520ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .card .kicker {
          font-size: 12px;
          font-weight: 650;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
        }
        .card .value {
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.02;
          color: var(--ink);
        }
        .card.lg .value {
          font-size: clamp(56px, 17vw, 104px);
        }
        .card.md .value {
          font-size: clamp(34px, 9vw, 56px);
        }
        .card.sm .value {
          font-size: clamp(26px, 7vw, 42px);
        }
        .card.final .value {
          color: var(--accent);
        }
        .card .label {
          font-size: 15px;
          color: var(--ink-2);
        }
        .card .sub {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.5;
        }
        .zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 40%;
          background: none;
          border: none;
          z-index: 1;
        }
        .zone.left {
          left: 0;
        }
        .zone.right {
          right: 0;
          width: 60%;
        }
        .foot {
          position: absolute;
          bottom: calc(20px + env(safe-area-inset-bottom, 0px));
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 12px;
          font-size: 11px;
          color: var(--muted);
          pointer-events: none;
        }
        .foot .hint {
          opacity: 0.7;
        }
      `}</style>
    </main>
  );
}
