import React, { useEffect, useRef, useState } from 'react';
import { HiBolt, HiCheckCircle, HiSparkles } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';

/**
 * 6-second demo loop that condenses the product story into the hero:
 *   1. show a weak CV bullet + low score
 *   2. emerald scanner sweeps over the bullet
 *   3. old text fades out
 *   4. AI types in the rewritten bullet
 *   5. score counts up to a high number with a brief glow
 *   6. hold, then loop
 *
 * The card itself supports 3D tilt + light-glare follow on pointer move
 * (Apple Vision / iOS 18 vibe). Both the loop and the tilt respect
 * prefers-reduced-motion.
 */

type Phase = 'idle' | 'scanning' | 'rewriting' | 'celebrating' | 'hold';

const PHASE_DURATIONS: Record<Phase, number> = {
  idle: 600,
  scanning: 1400,
  rewriting: 2400,
  celebrating: 1200,
  hold: 1800,
};

const PHASE_ORDER: Phase[] = ['idle', 'scanning', 'rewriting', 'celebrating', 'hold'];

const ORIGINAL_BULLET = 'Worked on backend systems and helped the team ship features.';
const REWRITTEN_BULLET = 'Architected 5 microservices serving 2M req/day, cut p95 latency from 800ms → 120ms.';
const START_SCORE = 62;
const FINAL_SCORE = 87;

const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
};

const LandingHeroDemo: React.FC = () => {
  const { t } = useLang();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reducedMotion ? 'hold' : 'idle');
  const [typedChars, setTypedChars] = useState(0);
  const [scoreValue, setScoreValue] = useState(START_SCORE);
  const cardRef = useRef<HTMLDivElement>(null);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Phase loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (reducedMotion) {
      // Show the "after" state and skip the animation entirely.
      setTypedChars(REWRITTEN_BULLET.length);
      setScoreValue(FINAL_SCORE);
      return;
    }

    const advance = () => {
      setPhase(prev => {
        const i = PHASE_ORDER.indexOf(prev);
        return PHASE_ORDER[(i + 1) % PHASE_ORDER.length];
      });
    };
    phaseTimer.current = setTimeout(advance, PHASE_DURATIONS[phase]);
    return () => {
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
    };
  }, [phase, reducedMotion]);

  // ── Reset typed text + score when entering a new loop ─────────────────────
  useEffect(() => {
    if (reducedMotion) return;
    if (phase === 'idle') {
      setTypedChars(0);
      setScoreValue(START_SCORE);
    }
  }, [phase, reducedMotion]);

  // ── Typewriter for the rewritten bullet ───────────────────────────────────
  useEffect(() => {
    if (reducedMotion) return;
    if (phase !== 'rewriting') return;
    let raf = 0;
    const start = performance.now();
    const total = REWRITTEN_BULLET.length;
    const duration = PHASE_DURATIONS.rewriting - 200; // leave a buffer
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setTypedChars(Math.floor(progress * total));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion]);

  // ── Score count-up during celebrating phase ───────────────────────────────
  useEffect(() => {
    if (reducedMotion) return;
    if (phase !== 'celebrating') return;
    let raf = 0;
    const start = performance.now();
    const duration = PHASE_DURATIONS.celebrating - 200;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-out cubic so the number "settles" at the end
      const eased = 1 - Math.pow(1 - progress, 3);
      setScoreValue(Math.round(START_SCORE + (FINAL_SCORE - START_SCORE) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion]);

  // ── 3D tilt + glare on pointer move ───────────────────────────────────────
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;   // 0..1
    const y = (e.clientY - rect.top) / rect.height;   // 0..1
    const rotY = (x - 0.5) * 8;   // ±4°
    const rotX = (0.5 - y) * 8;
    card.style.setProperty('--rotY', `${rotY}deg`);
    card.style.setProperty('--rotX', `${rotX}deg`);
    card.style.setProperty('--gx', `${x * 100}%`);
    card.style.setProperty('--gy', `${y * 100}%`);
    card.style.setProperty('--glare', '1');
  };

  const handlePointerLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--rotY', '0deg');
    card.style.setProperty('--rotX', '0deg');
    card.style.setProperty('--glare', '0');
  };

  const showOldBullet = phase === 'idle' || phase === 'scanning';
  const isScanning = phase === 'scanning';
  const isCelebrating = phase === 'celebrating' || phase === 'hold';
  const typedText = REWRITTEN_BULLET.slice(0, typedChars);
  const showCaret = phase === 'rewriting' && typedChars < REWRITTEN_BULLET.length;

  return (
    <div
      className="relative perspective-[1200px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-hidden
    >
      {/* Ambient glow blobs behind the card */}
      <div className="pointer-events-none absolute -top-10 -right-8 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-300/40 to-teal-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 w-52 h-52 rounded-full bg-gradient-to-br from-amber-300/30 to-orange-400/25 blur-3xl" />

      <div
        ref={cardRef}
        className="hero-demo-card liquid-glass relative z-10 rounded-3xl p-6 lg:p-7 shadow-2xl shadow-emerald-500/10 overflow-hidden"
      >
        {/* Top eyebrow */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            <HiBolt className="h-3.5 w-3.5" />
            {t('landing.hero.badge_title')}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            CV · JD
          </span>
        </div>

        {/* Bullet area — old text fades out, scanner sweeps, new text types */}
        <div className="relative mt-5 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-4 min-h-[7rem] sm:min-h-[8rem] overflow-hidden">
          {/* Bullet number / label */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Experience · bullet 3
          </p>

          {/* Old bullet (visible during idle + scanning) */}
          <p
            className={`absolute left-4 right-4 top-9 text-sm leading-relaxed text-slate-500 transition-opacity duration-500 ${
              showOldBullet ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {ORIGINAL_BULLET}
          </p>

          {/* New bullet (typewriter) */}
          <p
            className={`absolute left-4 right-4 top-9 text-sm leading-relaxed text-slate-900 font-medium transition-opacity duration-300 ${
              showOldBullet ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <span>{typedText}</span>
            {showCaret && (
              <span
                aria-hidden
                className="inline-block w-[2px] h-[0.95em] -mb-[2px] ml-[1px] bg-emerald-500 align-middle animate-pulse"
              />
            )}
          </p>

          {/* Scanner beam */}
          {isScanning && (
            <span aria-hidden className="hero-demo-beam" />
          )}
        </div>

        {/* Score row */}
        <div className="mt-5 flex items-end gap-4">
          <div className="relative">
            <span
              className={`text-6xl lg:text-7xl font-extrabold tabular-nums leading-none transition-all ${
                isCelebrating ? 'text-gradient-emerald drop-shadow-[0_0_24px_rgba(16,185,129,0.4)]' : 'text-slate-700'
              }`}
            >
              {scoreValue}
            </span>
            {isCelebrating && !reducedMotion && (
              <span aria-hidden className="hero-demo-pulse" />
            )}
          </div>
          <span className="mb-2 text-sm text-slate-500">/ 100</span>

          <div className="ml-auto text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Δ</p>
            <p className={`text-sm font-bold tabular-nums ${isCelebrating ? 'text-emerald-600' : 'text-slate-400'}`}>
              {isCelebrating ? `+${FINAL_SCORE - START_SCORE}` : '—'}
            </p>
          </div>
        </div>

        {/* Footer status */}
        <div className="mt-5 pt-4 border-t border-slate-200/70 flex items-center gap-2 text-xs">
          {isScanning ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <HiSparkles className="h-3.5 w-3.5 animate-pulse" />
                Analyzing bullet against JD…
              </span>
            </>
          ) : phase === 'rewriting' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <HiSparkles className="h-3.5 w-3.5 animate-pulse" />
              AI rewriting in real time
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <HiCheckCircle className="h-3.5 w-3.5" />
              Rewrite applied · ready for next bullet
            </span>
          )}
        </div>

        {/* Light glare overlay (3D tilt) */}
        <span aria-hidden className="hero-demo-glare" />
      </div>
    </div>
  );
};

export default LandingHeroDemo;
