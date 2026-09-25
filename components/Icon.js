// Centralized so the same glyph (a printer, a chevron, a bell) never drifts to
// a slightly different path on the next screen that needs it.
const STROKE = {
  home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" />,
  queue: (
    <>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </>
  ),
  stats: (
    <>
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </>
  ),
  quote: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 11a9 9 0 0 1 15.3-5.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 13a9 9 0 0 1-15.3 5.3L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  bell: <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 19a2 2 0 0 0 4 0" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  printer: (
    <>
      <rect x="6" y="3" width="12" height="7" rx="1" />
      <rect x="4" y="10" width="16" height="8" rx="1.5" />
      <rect x="8" y="14" width="8" height="6" />
    </>
  ),
  box: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5L12 12 3.5 7.5Z" />
      <path d="M3.5 7.5V16L12 20.5 20.5 16V7.5" />
      <path d="M12 12v8.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.5h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  bolt: <path d="M12.5 3 5 13.5h5.5L11 21l7.5-10.5H13L12.5 3Z" />,
  layers: (
    <>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </>
  ),
};

// Filled marks don't read well as outlines at small sizes.
const FILL = {
  check: <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" />,
};

export default function Icon({ name, size = 20, strokeWidth = 1.8, className }) {
  if (FILL[name]) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        <g strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {FILL[name]}
        </g>
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {STROKE[name]}
    </svg>
  );
}
