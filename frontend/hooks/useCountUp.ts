import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from 0 to `target` using easeOutCubic.
 * Optional `delayMs` shifts when the animation begins — useful for staggering
 * multiple counters (e.g. a list of match cards).
 *
 * Respects `prefers-reduced-motion` — if the user opted out of motion we snap
 * to the target immediately.
 */
export function useCountUp(target: number, durationMs = 900, delayMs = 0): number {
  const [value, setValue] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setValue(target);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = setTimeout(() => {
      setValue(0);
      rafRef.current = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, delayMs]);

  return value;
}
