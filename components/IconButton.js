import Icon from './Icon';

// The circular glyph button used in every header: refresh, alert bell, sign
// out, add. One definition so they all match to the pixel.
export default function IconButton({ name, size = 18, label, onClick, disabled, type = 'button' }) {
  return (
    <button type={type} className="btn" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon name={name} size={size} />

      <style jsx>{`
        .btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--surface-2);
          border: 1px solid var(--line);
          color: var(--ink-2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 120ms ease, background 120ms ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .btn:hover:not(:disabled) {
            color: var(--ink);
            border-color: var(--baseline);
          }
        }
        .btn:active:not(:disabled) {
          transform: scale(0.92);
          background: var(--surface-3);
        }
        .btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </button>
  );
}
