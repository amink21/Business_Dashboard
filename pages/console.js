import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import Shell from '../components/Shell';
import { printLog, teslaLog } from '../lib/console';
import { normalize as normalizePrint } from '../lib/print';
import { normalize as normalizeTesla } from '../lib/tesla';

const STATUS_TONE = { 200: 'ok', 201: 'ok', 202: 'pending', 402: 'fail' };
const STREAM_MS = 90;

export default function ApiConsole() {
  const [print, setPrint] = useState([]);
  const [tesla, setTesla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [source, setSource] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [shown, setShown] = useState(0);
  const [streaming, setStreaming] = useState(true);
  const timer = useRef(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, t] = await Promise.all([
        fetch('/api/sheet?tab=print').then((r) => r.json()),
        fetch('/api/sheet?tab=tesla').then((r) => r.json()),
      ]);
      if (p.error) throw new Error(p.error);
      if (t.error) throw new Error(t.error);
      setPrint(printLog(normalizePrint(p)));
      setTesla(teslaLog(normalizeTesla(t)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const lines = useMemo(() => {
    const merged =
      source === 'print' ? print : source === 'tesla' ? tesla : [...print, ...tesla];
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((l) =>
      `${l.path} ${l.summary} ${l.status} ${JSON.stringify(l.body)}`.toLowerCase().includes(q)
    );
  }, [print, tesla, source, query]);

  // Reveal lines one at a time so the log reads like it is arriving, not like a
  // table that was always there.
  useEffect(() => {
    setShown(0);
    setOpen(null);
  }, [source, query]);

  useEffect(() => {
    clearInterval(timer.current);
    if (!streaming || !lines.length) return undefined;
    timer.current = setInterval(() => {
      setShown((n) => {
        if (n >= lines.length) {
          clearInterval(timer.current);
          return n;
        }
        return n + 1;
      });
    }, STREAM_MS);
    return () => clearInterval(timer.current);
  }, [streaming, lines]);

  const visible = streaming ? lines.slice(0, shown) : lines;
  const done = shown >= lines.length;

  return (
    <>
      <Head>
        <title>API console</title>
      </Head>

      <Shell path="/console" loading={loading} onRefresh={load}>
        {error && <div className="error">{error}</div>}

        <div className="bar">
          <div className="segment" role="group" aria-label="Source">
            {[
              ['all', 'All traffic'],
              ['print', 'print-lab'],
              ['tesla', 'charger-desk'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`seg ${source === id ? 'on' : ''}`}
                aria-pressed={source === id}
                onClick={() => setSource(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="search"
            className="search"
            placeholder="Filter by path, id, status…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter log"
          />

          <button
            type="button"
            className={`stream ${streaming && !done ? 'live' : ''}`}
            onClick={() => {
              if (done) setShown(0);
              setStreaming((v) => (done ? true : !v));
            }}
          >
            {done ? 'Replay' : streaming ? 'Pause' : 'Resume'}
          </button>
        </div>

        <div className="note">
          {lines.length} events. Every line is one row from the sheet, rendered as the request
          that would have created it — amounts, items, statuses and dates are real; the ids,
          clock times and latencies are set dressing.
        </div>

        <div className="log">
          {visible.map((l) => (
            <div key={l.key} className="entry">
              <button
                type="button"
                className="line"
                onClick={() => setOpen(open === l.key ? null : l.key)}
                aria-expanded={open === l.key}
              >
                <span className="time">{l.time}</span>
                <span className="method">{l.method}</span>
                <span className="path">{l.path}</span>
                <span className={`status ${STATUS_TONE[l.status] || 'pending'}`}>{l.status}</span>
                <span className="ms">{l.ms}ms</span>
                <span className="summary">{l.summary}</span>
                <span className="caret" aria-hidden="true">
                  {open === l.key ? '▾' : '▸'}
                </span>
              </button>
              {open === l.key && (
                <pre className="body">{JSON.stringify(l.body, null, 2)}</pre>
              )}
            </div>
          ))}

          {!visible.length && (
            <div className="empty">
              {loading ? 'Opening stream…' : 'No events match that filter.'}
            </div>
          )}

          {streaming && !done && visible.length > 0 && (
            <div className="cursor" aria-hidden="true">
              <span className="blink">▋</span>
            </div>
          )}
        </div>
      </Shell>

      <style jsx>{`
        .error {
          background: rgba(208, 59, 59, 0.12);
          border: 1px solid rgba(208, 59, 59, 0.35);
          color: var(--critical);
          font-size: 12.5px;
          border-radius: 9px;
          padding: 10px 12px;
          margin-bottom: 14px;
        }
        .bar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-bottom: 10px;
        }
        .segment {
          display: inline-flex;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
        }
        .seg {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 11.5px;
          font-weight: 550;
          padding: 5px 10px;
          border-radius: 6px;
          font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
        }
        .seg.on {
          background: var(--surface-3);
          color: var(--ink);
        }
        .search {
          flex: 1;
          min-width: 160px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 8px;
          color: var(--ink);
          font-size: 12.5px;
          padding: 7px 11px;
        }
        .search::placeholder {
          color: var(--muted);
        }
        .stream {
          background: var(--surface);
          border: 1px solid var(--line);
          color: var(--ink-2);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 550;
        }
        .stream.live {
          color: var(--accent);
          border-color: var(--accent-dim);
          background: var(--accent-wash);
        }
        .note {
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 12px;
        }
        .log {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          overflow: hidden;
          font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
        }
        .entry {
          border-bottom: 1px solid var(--line);
        }
        .entry:last-child {
          border-bottom: none;
        }
        .line {
          width: 100%;
          display: grid;
          grid-template-columns: 152px 44px 168px 42px 56px minmax(0, 1fr) 16px;
          gap: 10px;
          align-items: center;
          text-align: left;
          background: none;
          border: none;
          padding: 7px 14px;
          font-size: 11.5px;
          color: var(--ink-2);
          font-family: inherit;
        }
        @media (hover: hover) and (pointer: fine) {
          .line:hover {
            background: var(--surface-2);
          }
        }
        .time {
          color: var(--muted);
        }
        .method {
          color: var(--ink);
          font-weight: 650;
        }
        .path {
          color: var(--ink);
        }
        .status {
          font-weight: 650;
        }
        .status.ok {
          color: var(--accent);
        }
        .status.pending {
          color: var(--warning);
        }
        .status.fail {
          color: var(--critical);
        }
        .ms {
          color: var(--muted);
          text-align: right;
        }
        .summary {
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .caret {
          color: var(--muted);
        }
        .body {
          margin: 0;
          padding: 12px 14px 16px 14px;
          background: var(--plane);
          color: var(--accent);
          font-size: 11.5px;
          line-height: 1.55;
          overflow-x: auto;
          border-top: 1px solid var(--line);
        }
        .empty {
          padding: 40px 0;
          text-align: center;
          color: var(--muted);
          font-size: 12.5px;
        }
        .cursor {
          padding: 6px 14px 10px;
          color: var(--accent);
          font-size: 11.5px;
        }
        .blink {
          animation: blink 1s steps(2, start) infinite;
        }
        @keyframes blink {
          to {
            visibility: hidden;
          }
        }
        @media (max-width: 860px) {
          .line {
            grid-template-columns: 44px 1fr 42px 16px;
            row-gap: 2px;
          }
          .time,
          .ms {
            display: none;
          }
          .summary {
            grid-column: 2 / 4;
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}
