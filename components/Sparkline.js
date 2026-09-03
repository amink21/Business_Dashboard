// 12-point cumulative trace for a stat tile: de-emphasis stroke for history, the
// accent only on the current step. Decorative - the tile's value and delta carry
// the number, so this is hidden from assistive tech.
export default function Sparkline({ points, width = 76, height = 26 }) {
  const w = width;
  const h = height;
  const pad = 3;
  const vals = points && points.length ? points : [0, 0];
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const span = max - min || 1;

  const xy = vals.map((v, i) => [
    pad + (i / Math.max(vals.length - 1, 1)) * (w - pad * 2),
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);

  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const tail = xy.slice(-2);
  const dTail = tail.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [ex, ey] = xy[xy.length - 1];

  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="var(--baseline)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={dTail} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r="2.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      <style jsx>{`
        .spark {
          display: block;
        }
      `}</style>
    </svg>
  );
}
