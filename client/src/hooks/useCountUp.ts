import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Smoothly animates a number from its previous value to the target. */
export function useCountUp(target: number, duration = 700): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, reduce]);

  return value;
}
