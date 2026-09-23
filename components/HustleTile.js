import Link from 'next/link';
import Icon from './Icon';

const THEME = {
  chargers: { icon: 'bolt', fg: 'var(--chargers)', bg: 'var(--chargers-wash)' },
  prints: { icon: 'layers', fg: 'var(--prints)', bg: 'var(--prints-wash)' },
};

// Two-up on the home screen: each hustle's headline profit plus three figures
// that answer "is it healthy" without opening Stats.
//
// Styled globally, namespaced under .hustleTile: styled-jsx's scoped
// `<style jsx>` never reaches a className handed to a custom component like
// Link (it only rewrites plain host elements), so a scoped block here would
// silently match nothing and the tile would render with the browser's
// default <a> styling. AppShell's tab bar and Shell's nav use the same fix.
export default function HustleTile({ tone, title, profit, rows, href }) {
  const t = THEME[tone];
  return (
    <Link href={href} className="hustleTile">
      <span className="mark" style={{ color: t.fg, background: t.bg }}>
        <Icon name={t.icon} size={18} />
      </span>
      <span className="title">{title}</span>
      <span className="label">Net profit</span>
      <span className="profit">{profit}</span>
      <span className="rows">
        {rows.map((r) => (
          <span key={r.label} className="row">
            <span className="rLabel">{r.label}</span>
            <span className="rValue">{r.value}</span>
          </span>
        ))}
      </span>

      <style jsx global>{`
        .hustleTile {
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
          min-width: 0;
          text-decoration: none;
          color: inherit;
          transition: transform 120ms ease, border-color 120ms ease;
        }
        .hustleTile:active {
          transform: scale(0.98);
          border-color: var(--baseline);
        }
        .hustleTile .mark {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hustleTile .title {
          font-size: 13.5px;
          font-weight: 650;
          color: var(--ink);
          margin-top: 10px;
        }
        .hustleTile .label {
          font-size: 10.5px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-top: 8px;
        }
        .hustleTile .profit {
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--accent);
          margin-top: 3px;
        }
        .hustleTile .rows {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 10px;
        }
        .hustleTile .row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 11.5px;
        }
        .hustleTile .rLabel {
          color: var(--muted);
        }
        .hustleTile .rValue {
          color: var(--ink-2);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </Link>
  );
}
