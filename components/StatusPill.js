// Status colors are reserved tokens and never travel alone - every pill carries
// a dot AND the sheet's own status text, so the state is never color-only.
const TONE = {
  completed: 'accent',
  cancelled: 'critical',
  queued: 'warning',
  inflight: 'neutral',
};

export default function StatusPill({ kind, label }) {
  const tone = TONE[kind] || 'neutral';
  return (
    <span className={`pill ${tone}`}>
      <span className="dot" aria-hidden="true" />
      {label}
      <style jsx>{`
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px 3px 6px;
          border-radius: 6px;
          white-space: nowrap;
          line-height: 1.4;
        }
        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }
        .accent {
          color: var(--accent);
          background: var(--accent-wash);
        }
        .critical {
          color: var(--critical);
          background: rgba(208, 59, 59, 0.13);
        }
        .warning {
          color: var(--warning);
          background: rgba(250, 178, 25, 0.13);
        }
        .neutral {
          color: var(--ink-2);
          background: var(--surface-3);
        }
      `}</style>
    </span>
  );
}
