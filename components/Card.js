export default function Card({ title, note, aside, flush, children }) {
  return (
    <section className="card">
      {(title || aside) && (
        <div className="head">
          <div className="titles">
            {title && <h2>{title}</h2>}
            {note && <span className="note">{note}</span>}
          </div>
          {aside}
        </div>
      )}
      <div className={flush ? '' : 'body'}>{children}</div>

      <style jsx>{`
        .card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          min-width: 0;
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 15px;
          border-bottom: 1px solid var(--line);
        }
        .titles {
          display: flex;
          align-items: baseline;
          gap: 8px;
          min-width: 0;
        }
        h2 {
          font-size: 13.5px;
          font-weight: 650;
          margin: 0;
          white-space: nowrap;
        }
        .note {
          font-size: 11.5px;
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .body {
          padding: 14px 15px 16px;
        }
      `}</style>
    </section>
  );
}
