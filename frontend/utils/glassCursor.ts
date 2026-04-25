/**
 * Global cursor spotlight for Liquid-Glass surfaces.
 *
 * Tracks pointer moves, finds the nearest `.liquid-glass*` ancestor under the
 * cursor, and writes `--mx` / `--my` CSS custom properties on it. The glass
 * styles layer a radial-gradient using those vars, producing an Apple-style
 * "light follows the cursor across the glass" refraction effect.
 *
 * No-op on coarse pointers (touch) and when `prefers-reduced-motion` is set.
 */

const SELECTOR =
  '.liquid-glass, .liquid-glass-soft, .liquid-glass-tinted, .liquid-glass-clear, .liquid-glass-button';

let initialized = false;
let currentTarget: HTMLElement | null = null;
let rafQueued = false;
let lastEvent: PointerEvent | null = null;

function clearTarget() {
  if (!currentTarget) return;
  currentTarget.style.removeProperty('--mx');
  currentTarget.style.removeProperty('--my');
  currentTarget = null;
}

function apply(e: PointerEvent) {
  const root = e.target as Element | null;
  const el = (root && 'closest' in root ? root.closest(SELECTOR) : null) as HTMLElement | null;

  if (!el) {
    clearTarget();
    return;
  }

  if (el !== currentTarget) clearTarget();
  currentTarget = el;

  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  el.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

export function initGlassCursor(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (prefersReduced || isTouch) return;

  const onMove = (e: PointerEvent) => {
    lastEvent = e;
    if (rafQueued) return;
    rafQueued = true;
    requestAnimationFrame(() => {
      if (lastEvent) apply(lastEvent);
      rafQueued = false;
    });
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', clearTarget, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTarget();
  });
}
