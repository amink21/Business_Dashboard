import Icon from './Icon';

const TONE = {
  warning: { fg: 'var(--warning)', bg: 'rgba(250, 178, 25, 0.14)' },
  critical: { fg: 'var(--critical)', bg: 'rgba(208, 59, 59, 0.14)' },
  neutral: { fg: 'var(--ink-2)', bg: 'var(--surface-3)' },
};

export default function NeedsYouList({ items, onOpen }) {
  if (!items.length) return null;

  return (
    <section className="needs">
      <h2>Needs you</h2>
      <ul>
        {items.map((it, i) => {
          const tone = TONE[it.tone] || TONE.neutral;
          const Tag = onOpen ? 'button' : 'div';
          return (
            <li key={it.id} style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}>
              <Tag
                type={onOpen ? 'button' : undefined}
                className="row"
                onClick={onOpen ? () => onOpen(it) : undefined}
              >
                <span className="mark" style={{ color: tone.fg, background: tone.bg }}>
                  <Icon name={it.icon} size={18} />
                </span>
                <span className="text">
                  <span className="title">{it.title}</span>
                  <span className="sub">{it.sub}</span>
                </span>
                {onOpen && (
                  <span className="chev" aria-hidden="true">
                    <Icon name="chevron" size={16} />
                  </span>
                )}
              </Tag>
            </li>
          );
        })}
      </ul>

      <style jsx>{`
        h2 {
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 0 0 10px;
        }
        ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        li {
          animation: riseIn 260ms var(--ease-out) backwards;
        }
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px 14px;
          text-align: left;
        }
        .mark {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .title {
          font-size: 14px;
          font-weight: 650;
          color: var(--ink);
        }
        .sub {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chev {
          color: var(--muted);
          flex-shrink: 0;
        }
      `}</style>
    </section>
  );
}
