// A loading state built from the real layout's own shapes, not a spinner or a
// sentence - a funded company's dashboard never tells you it's "connecting",
// it just shows you the room before the furniture arrives.
export default function Skeleton({ rows = 3 }) {
  return (
    <div className="skel">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row">
          <span className="avatar" />
          <span className="lines">
            <span className="line w70" />
            <span className="line w40" />
          </span>
          <span className="amount" />
        </div>
      ))}

      <style jsx>{`
        .skel {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar,
        .line,
        .amount {
          background: linear-gradient(
            100deg,
            var(--surface-2) 30%,
            var(--surface-3) 45%,
            var(--surface-2) 60%
          );
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 6px;
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lines {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .line {
          height: 10px;
        }
        .w70 {
          width: 70%;
        }
        .w40 {
          width: 40%;
        }
        .amount {
          width: 52px;
          height: 13px;
          flex-shrink: 0;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .avatar,
          .line,
          .amount {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
