import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import Shell from '../components/Shell';
import { fmtMoney } from '../lib/data';
import { normalize, summarize } from '../lib/print';

// Prices a job against what past jobs actually earned per hour of printer time,
// rather than against a gut feel. Every benchmark here is your own history.
export default function Quote() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [hours, setHours] = useState('4');
  const [material, setMaterial] = useState('5');
  const [price, setPrice] = useState('40');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sheet?tab=print');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRaw(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const orders = useMemo(() => normalize(raw), [raw]);
  const stats = useMemo(() => summarize(orders), [orders]);

  const done = useMemo(
    () => orders.filter((o) => o.kind === 'completed' && o.hrs > 0),
    [orders]
  );
  const rates = useMemo(
    () => done.map((o) => o.profit / o.hrs).sort((a, b) => a - b),
    [done]
  );

  const h = Math.max(parseFloat(hours) || 0, 0);
  const m = Math.max(parseFloat(material) || 0, 0);
  const p = Math.max(parseFloat(price) || 0, 0);

  const profit = p - m;
  const rate = h ? profit / h : 0;
  const margin = p ? (profit / p) * 100 : 0;

  // Where this job would land among the jobs you have already finished.
  const beats = rates.filter((r) => r < rate).length;
  const percentile = rates.length ? (beats / rates.length) * 100 : 0;

  const target = (wanted) => m + wanted * h;
  const suggestions = [
    { label: 'Matches your typical job', rate: stats.medianRate },
    { label: 'Matches your all-in average', rate: stats.profitPerHour },
    { label: 'Top quarter of your jobs', rate: rates.length ? rates[Math.floor(rates.length * 0.75)] : 0 },
  ];

  // Past jobs of a similar length, as a sanity check on the number.
  const similar = useMemo(() => {
    if (!h) return [];
    return done
      .map((o) => ({ o, gap: Math.abs(o.hrs - h) }))
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 5)
      .map(({ o }) => o);
  }, [done, h]);

  const verdict =
    !h || !p
      ? null
      : rate >= (rates.length ? rates[Math.floor(rates.length * 0.75)] : 0)
        ? { tone: 'good', text: 'Strong job. Better than three quarters of what you have printed.' }
        : rate >= stats.medianRate
          ? { tone: 'good', text: 'Above your typical rate. Worth taking.' }
          : rate >= stats.medianRate * 0.6
            ? { tone: 'warn', text: 'Below your typical rate. Fine as a favour, thin as a business.' }
            : { tone: 'bad', text: 'This is a Ford Bronco. Long print, small money — raise it or pass.' };

  return (
    <>
      <Head>
        <title>Quote — Print Lab</title>
      </Head>

      <Shell path="/quote" loading={loading} onRefresh={load}>
        {error && <div className="error">{error}</div>}

        <div className="intro">
          Price a job against your own history: {done.length} finished prints, a typical{' '}
          {fmtMoney(stats.medianRate, true)} per printer hour.
        </div>

        <div className="two">
          <Card title="The job">
            <div className="fields">
              <label className="field">
                <span>Print hours</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Material + other cost</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Your price</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>

            <div className="result">
              <div className="big">
                <span className={`rate ${verdict ? verdict.tone : ''}`}>
                  {fmtMoney(rate, true)}
                </span>
                <span className="per">per printer hour</span>
              </div>
              <div className="line">
                {fmtMoney(profit, true)} profit · {margin.toFixed(0)}% margin ·{' '}
                {percentile.toFixed(0)}
                <span className="ord">th</span> percentile of your jobs
              </div>
              {verdict && <div className={`verdict ${verdict.tone}`}>{verdict.text}</div>}
            </div>
          </Card>

          <Card title="What to charge" note="to hit each benchmark">
            <ul className="targets">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <span className="tLabel">
                    {s.label}
                    <span className="tRate">{fmtMoney(s.rate, true)}/hr</span>
                  </span>
                  <button
                    type="button"
                    className="tPrice"
                    onClick={() => setPrice(String(Math.ceil(target(s.rate))))}
                    title="Use this price"
                  >
                    {fmtMoney(target(s.rate), true)}
                  </button>
                </li>
              ))}
            </ul>
            <p className="hint">
              Prices cover {h || 0} h of printing plus {fmtMoney(m, true)} of material. Tap one to
              load it above.
            </p>
          </Card>
        </div>

        <Card title="Jobs of a similar length" note={h ? `nearest to ${h} h` : 'enter hours'} flush>
          {similar.length ? (
            <ul className="similar">
              {similar.map((o) => {
                const r = o.profit / o.hrs;
                return (
                  <li key={o.id}>
                    <span className="sItem">{o.item}</span>
                    <span className="sMeta">
                      {o.hrs} h · {fmtMoney(o.sale, true)}
                    </span>
                    <span className={`sRate ${r >= stats.medianRate ? 'good' : 'warn'}`}>
                      {fmtMoney(r, true)}/hr
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty">{loading ? 'Loading your history…' : 'No comparable jobs.'}</div>
          )}
        </Card>
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
        .intro {
          font-size: 12.5px;
          color: var(--muted);
          margin-bottom: 14px;
        }
        .two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
          gap: 12px;
          margin-bottom: 12px;
        }
        .fields {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 12.5px;
          color: var(--ink-2);
        }
        .field input {
          width: 110px;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 8px;
          color: var(--ink);
          font-size: 13px;
          padding: 7px 10px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .result {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--line);
        }
        .big {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .rate {
          font-size: 34px;
          font-weight: 680;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        .rate.good {
          color: var(--accent);
        }
        .rate.warn {
          color: var(--warning);
        }
        .rate.bad {
          color: var(--critical);
        }
        .per {
          font-size: 12px;
          color: var(--muted);
        }
        .line {
          font-size: 12px;
          color: var(--muted);
          margin-top: 6px;
          font-variant-numeric: tabular-nums;
        }
        .ord {
          font-variant-numeric: normal;
        }
        .verdict {
          font-size: 12.5px;
          margin-top: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          line-height: 1.4;
        }
        .verdict.good {
          color: var(--accent);
          background: var(--accent-wash);
        }
        .verdict.warn {
          color: var(--warning);
          background: rgba(250, 178, 25, 0.12);
        }
        .verdict.bad {
          color: var(--critical);
          background: rgba(208, 59, 59, 0.12);
        }
        .targets {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .targets li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .tLabel {
          display: flex;
          flex-direction: column;
          font-size: 12.5px;
          color: var(--ink-2);
          min-width: 0;
        }
        .tRate {
          font-size: 11px;
          color: var(--muted);
          font-variant-numeric: tabular-nums;
        }
        .tPrice {
          background: var(--surface-2);
          border: 1px solid var(--line);
          color: var(--ink);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: 650;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .tPrice:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .hint {
          font-size: 11px;
          color: var(--muted);
          margin: 14px 0 0;
          line-height: 1.5;
        }
        .similar {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .similar li {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto 90px;
          gap: 12px;
          align-items: center;
          padding: 11px 15px;
          border-bottom: 1px solid var(--line);
        }
        .similar li:last-child {
          border-bottom: none;
        }
        .sItem {
          font-size: 13px;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sMeta {
          font-size: 11.5px;
          color: var(--muted);
          font-variant-numeric: tabular-nums;
        }
        .sRate {
          font-size: 12.5px;
          font-weight: 650;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .sRate.good {
          color: var(--accent);
        }
        .sRate.warn {
          color: var(--warning);
        }
        .empty {
          text-align: center;
          color: var(--muted);
          font-size: 13px;
          padding: 36px 0;
        }
        @media (max-width: 860px) {
          .two {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}
