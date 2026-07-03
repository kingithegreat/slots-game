import { useEffect, useRef, useState } from 'react';
import { coinTick } from '../sound.js';

/** Animated counter that rolls from its previous value up to `value`. */
export default function RollUp({ value, duration = 900 }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (value === from) return undefined;
    // Roll up only; drops (new bet placed) snap immediately.
    if (value < from) {
      fromRef.current = value;
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    let lastTick = 0;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setShown(Math.round(from + (value - from) * eased));
      if (now - lastTick > 90 && t < 1) {
        coinTick();
        lastTick = now;
      }
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{shown.toLocaleString()}</>;
}
