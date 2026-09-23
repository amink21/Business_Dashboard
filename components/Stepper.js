import Icon from './Icon';

// Shared by print time (hours) and filament (grams) on the Quote screen - a
// number a thumb can nudge without opening the keyboard.
export default function Stepper({ value, onChange, step, min = 0, unit, decimals = 0 }) {
  const set = (next) => onChange(Math.max(min, Number(next.toFixed(2))));

  return (
    <div className="stepper">
      <button type="button" className="btn" onClick={() => set(value - step)} aria-label={`Decrease ${unit}`}>
        <Icon name="minus" size={15} />
      </button>
      <span className="value">
        {decimals ? value.toFixed(decimals) : value}
        {unit && <span className="unit">{unit}</span>}
      </span>
      <button type="button" className="btn" onClick={() => set(value + step)} aria-label={`Increase ${unit}`}>
        <Icon name="plus" size={15} />
      </button>

      <style jsx>{`
        .stepper {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 4px;
        }
        .btn {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: var(--surface-3);
          color: var(--ink-2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        @media (hover: hover) and (pointer: fine) {
          .btn:hover {
            color: var(--ink);
          }
        }
        .value {
          min-width: 46px;
          text-align: center;
          font-size: 14.5px;
          font-weight: 650;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
        }
        .unit {
          font-size: 11.5px;
          font-weight: 550;
          color: var(--muted);
          margin-left: 3px;
        }
      `}</style>
    </div>
  );
}
