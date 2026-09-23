import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 700;

// Strong ease-out - matches --ease-out in globals.css, kept as a JS function
// here since this drives a number rather than a CSS transition.
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Animates the hero figure toward its latest value on load and on every range
// change - feedback that the number just synced, not decoration. There is
// exactly one hero number per page, so this never runs more than once at a
// time. Skips straight to the target on first render (nothing to animate
// from yet) and when the OS asks for reduced motion.
export function useCountUp(target) {
  const [display, setDisplay] = useState(target);
  const from = useRef(target);
  const first = useRef(true);
  const frame = useRef(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      from.current = target;
      setDisplay(target);
      return undefined;
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      from.current = target;
      setDisplay(target);
      return undefined;
    }

    const startValue = from.current;
    const delta = target - startValue;
    const start = performance.now();
    cancelAnimationFrame(frame.current);

    const tick = (now) => {
      const p = Math.min((now - start) / DURATION_MS, 1);
      setDisplay(startValue + delta * easeOut(p));
      if (p < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = target;
      }
    };
    frame.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}
