/**
 * Canvas-driven favicon animator.
 *
 * States:
 *   idle     → static OptiCV icon, zero CPU.
 *   loading  → star pulses, emerald arc spins around the rim.
 *   success  → quick scale bounce + halo ring ripple, auto-returns to idle.
 *   error    → red tint + shake, auto-returns to idle.
 *
 * Why canvas (not SMIL/CSS-in-SVG): Chrome & Safari don't reliably animate SVG
 * favicons. Redrawing a PNG and swapping link.href is the only cross-browser path.
 * We throttle to ~15fps (plenty for a 16–32px favicon) and pause when the tab is
 * hidden or when `prefers-reduced-motion` is set, so the cost is negligible.
 */

export type FaviconState = 'idle' | 'loading' | 'success' | 'error';

const SIZE = 64;
const FPS = 15;
const FRAME_MS = 1000 / FPS;

const COLORS = {
  c1: '#34d399',
  c2: '#10b981',
  c1Err: '#f87171',
  c2Err: '#dc2626',
  white: '#ffffff',
};

const STAR_PATH = new Path2D(
  // Same 4-point star as the SVG favicon, centered at (12, 12) in a 24-unit viewBox.
  'M12 4.5l1.2 3.8c.3 1 1.2 1.9 2.2 2.2L19.2 12l-3.8 1.2c-1 .3-1.9 1.2-2.2 2.2L12 19.5l-1.2-3.8c-.3-1-1.2-1.9-2.2-2.2L4.8 12l3.8-1.2c1-.3 1.9-1.2 2.2-2.2L12 4.5z'
);

class FaviconAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private link: HTMLLinkElement | null = null;
  private rafId: number | null = null;
  private lastDraw = 0;
  private stateStartedAt = 0;
  private state: FaviconState = 'idle';
  private transitionTimer: number | null = null;
  private reducedMotion = false;
  private idleCache: string | null = null;

  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d unsupported');
    this.canvas = canvas;
    this.ctx = ctx;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mq.matches;
    mq.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      this.draw(0);
      this.commit(true);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else if (this.needsAnimation()) this.resume();
    });
  }

  setState(next: FaviconState) {
    if (next === this.state) return;
    this.state = next;
    this.stateStartedAt = performance.now();
    this.clearTransitionTimer();

    if (next === 'success') {
      this.transitionTimer = window.setTimeout(() => this.setState('idle'), 1400);
    } else if (next === 'error') {
      this.transitionTimer = window.setTimeout(() => this.setState('idle'), 1800);
    }

    if (this.needsAnimation()) {
      this.resume();
    } else {
      this.pause();
      this.draw(0);
      this.commit(true);
    }
  }

  private needsAnimation(): boolean {
    if (this.reducedMotion) return false;
    return this.state === 'loading' || this.state === 'success' || this.state === 'error';
  }

  private clearTransitionTimer() {
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }

  private pause() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private resume() {
    if (this.rafId !== null || document.hidden) return;
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      if (now - this.lastDraw < FRAME_MS) return;
      this.lastDraw = now;
      this.draw(now - this.stateStartedAt);
      this.commit(false);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private getLink(): HTMLLinkElement {
    if (this.link && this.link.isConnected) return this.link;
    let link = document.getElementById('favicon') as HTMLLinkElement | null;
    if (!link) link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    // Canvas output is PNG; override any svg type from index.html.
    link.type = 'image/png';
    this.link = link;
    return link;
  }

  private commit(cacheIdle: boolean) {
    const url = this.canvas.toDataURL('image/png');
    if (cacheIdle && this.state === 'idle') this.idleCache = url;
    const link = this.getLink();
    if (link.href !== url) link.href = url;
  }

  private draw(elapsed: number) {
    const { ctx } = this;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const radius = SIZE / 2 - 1;
    const t = elapsed / 1000;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Tint palette — red when error, emerald otherwise.
    const isError = this.state === 'error';
    const c1 = isError ? COLORS.c1Err : COLORS.c1;
    const c2 = isError ? COLORS.c2Err : COLORS.c2;

    // Error shake offset (tiny horizontal wobble).
    let shakeX = 0;
    if (isError && !this.reducedMotion) {
      shakeX = Math.sin(t * 22) * 1.2 * Math.max(0, 1 - t / 1.2);
    }

    ctx.save();
    ctx.translate(shakeX, 0);

    // Base circle with vertical gradient.
    const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner rim highlight.
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // Loading: rotating arc spinner along the rim.
    if (this.state === 'loading' && !this.reducedMotion) {
      const rot = t * Math.PI * 1.6;
      const arcLen = Math.PI * 1.3;
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 5, rot, rot + arcLen);
      ctx.stroke();
    }

    // Success: expanding halo ring ripple.
    if (this.state === 'success' && !this.reducedMotion) {
      const p = Math.min(1, elapsed / 900);
      const ringR = radius * (0.55 + p * 0.55);
      const alpha = (1 - p) * 0.8;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 4 * (1 - p * 0.5);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Star, with optional scale animation.
    let starScale = 1;
    let starAlpha = 1;
    if (this.state === 'loading' && !this.reducedMotion) {
      starScale = 0.88 + Math.sin(t * 3) * 0.05;
      starAlpha = 0.7;
    } else if (this.state === 'success' && !this.reducedMotion) {
      const p = Math.min(1, elapsed / 500);
      starScale = 1 + Math.sin(p * Math.PI) * 0.18;
    }

    ctx.globalAlpha = starAlpha;
    ctx.translate(cx, cy);
    ctx.scale(starScale, starScale);
    const s = SIZE / 24;
    ctx.scale(s, s);
    ctx.translate(-12, -12);
    ctx.fillStyle = COLORS.white;
    ctx.fill(STAR_PATH);

    ctx.restore();
  }

  /**
   * Prime the idle cache once, so the first call to setState('idle') is cheap.
   * Safe to call repeatedly.
   */
  init(): void {
    if (this.idleCache) return;
    this.draw(0);
    this.commit(true);
  }
}

let singleton: FaviconAnimator | null = null;

export function getFaviconAnimator(): FaviconAnimator {
  if (!singleton) {
    singleton = new FaviconAnimator();
    singleton.init();
  }
  return singleton;
}

export function setFaviconState(state: FaviconState): void {
  getFaviconAnimator().setState(state);
}
