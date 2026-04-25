import React, { useEffect, useRef, useState } from 'react';
import { HiArrowsRightLeft, HiSparkles } from 'react-icons/hi2';

const SCORE_BEFORE = 62;
const SCORE_AFTER  = 89;

/* ── Mock CV content. Hand-picked to feel like a real candidate, with the
   "before" version showing the textbook weak phrasing every CV-coach
   blog complains about, and the "after" version showing the same
   experience reframed with quantified, action-led bullets.            */

const BeforeContent: React.FC = () => (
  <div className="h-full flex flex-col gap-2.5 sm:gap-3 select-none pointer-events-none">
    <header>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base sm:text-lg font-bold text-slate-700">John Tran</h3>
        <span className="shrink-0 text-[10px] sm:text-xs font-semibold text-rose-700 bg-rose-100 ring-1 ring-rose-200 px-2 py-0.5 rounded-full">
          Score: {SCORE_BEFORE}/100
        </span>
      </div>
      <p className="text-xs sm:text-sm text-slate-500">Software Engineer</p>
    </header>

    <div>
      <h4 className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Summary</h4>
      <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-0.5">
        Hardworking{' '}
        <span className="underline decoration-rose-400 decoration-dotted decoration-2 underline-offset-2">developer</span>
        {' '}with experience in{' '}
        <span className="underline decoration-rose-400 decoration-dotted decoration-2 underline-offset-2">various technologies</span>.
        Looking for a challenging role.
      </p>
    </div>

    <div>
      <h4 className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Experience</h4>
      <ul className="mt-1 space-y-1 text-[11px] sm:text-xs text-slate-600 leading-relaxed">
        <li>
          <span className="text-slate-400">•</span>{' '}
          <span className="underline decoration-rose-400 decoration-dotted decoration-2 underline-offset-2">Responsible for</span>
          {' '}developing applications and fixing bugs
        </li>
        <li>
          <span className="text-slate-400">•</span>{' '}
          <span className="underline decoration-rose-400 decoration-dotted decoration-2 underline-offset-2">Worked on</span>
          {' '}multiple team projects
        </li>
        <li>
          <span className="text-slate-400">•</span>{' '}
          Used various programming languages
        </li>
        <li>
          <span className="text-slate-400">•</span>{' '}
          Helped with bug fixing and testing
        </li>
      </ul>
    </div>
  </div>
);

const AfterContent: React.FC = () => (
  <div className="h-full flex flex-col gap-2.5 sm:gap-3 select-none pointer-events-none">
    <header>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">John Tran</h3>
        <span className="shrink-0 text-[10px] sm:text-xs font-semibold text-emerald-800 bg-emerald-100 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          {SCORE_AFTER}/100
          <span className="text-emerald-700 text-[9px]">▲ +{SCORE_AFTER - SCORE_BEFORE}</span>
        </span>
      </div>
      <p className="text-xs sm:text-sm text-emerald-800 font-semibold">Senior Software Engineer</p>
    </header>

    <div>
      <h4 className="text-[9px] sm:text-[10px] font-semibold uppercase text-emerald-700 tracking-wider">Summary</h4>
      <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed mt-0.5">
        <span className="font-bold text-emerald-900">5+ years</span> building scalable systems.
        Led <span className="font-bold text-emerald-900">3 teams</span> shipping products to{' '}
        <span className="font-bold text-emerald-900">100K+ users</span>. Specialised in
        microservices and platform engineering.
      </p>
    </div>

    <div>
      <h4 className="text-[9px] sm:text-[10px] font-semibold uppercase text-emerald-700 tracking-wider">Experience</h4>
      <ul className="mt-1 space-y-1 text-[11px] sm:text-xs text-slate-700 leading-relaxed">
        <li>
          <span className="text-emerald-500">✓</span>{' '}
          Led migration to microservices, cutting latency{' '}
          <span className="font-bold text-emerald-900">−40%</span>
        </li>
        <li>
          <span className="text-emerald-500">✓</span>{' '}
          Built CI/CD pipeline serving{' '}
          <span className="font-bold text-emerald-900">50+ deploys/day</span> across 4 teams
        </li>
        <li>
          <span className="text-emerald-500">✓</span>{' '}
          Mentored <span className="font-bold text-emerald-900">6 engineers</span>, 4 promoted in 18 months
        </li>
        <li>
          <span className="text-emerald-500">✓</span>{' '}
          Designed event-driven architecture, saving{' '}
          <span className="font-bold text-emerald-900">$200K/yr</span>
        </li>
      </ul>
    </div>
  </div>
);

const BeforeAfterSlider: React.FC = () => {
  const [pos, setPos]       = useState(100);    // start hiding "before" entirely
  const [hasIntro, setIntro] = useState(false); // viewport observer fires once
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef  = useRef(false);

  /* Intro animation — once the slider scrolls into view, ease the divider
     from 100 % (only AFTER visible) → 50 % over ~1.2 s. Reveals the
     transformation dramatically and signals "this is interactive". */
  useEffect(() => {
    if (hasIntro) return;
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e.isIntersecting) return;
      setIntro(true);
      io.disconnect();

      const start    = performance.now();
      const DURATION = 1200;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        const eased = 1 - Math.pow(1 - t, 3);
        setPos(100 - eased * 50);
        if (t < 1) requestAnimationFrame(tick);
      };
      // Tiny delay so the user notices the slider before the animation begins.
      setTimeout(() => requestAnimationFrame(tick), 250);
    }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, [hasIntro]);

  /* Drag handling — pointer events on the whole container, content inside
     is `pointer-events: none` so events bubble up cleanly. setPointerCapture
     keeps the drag alive even if the cursor leaves the container. */
  const updateFromX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    updateFromX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    draggingRef.current = false;
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
          <HiSparkles className="h-3.5 w-3.5" />
          Before & After
        </span>
        <p className="mt-4 text-sm sm:text-base text-slate-600">
          The same candidate, rewritten by AI. Quantified outcomes replace vague
          responsibilities — and the suitability score moves from{' '}
          <span className="font-semibold text-rose-600">{SCORE_BEFORE}</span> to{' '}
          <span className="font-semibold text-emerald-700">{SCORE_AFTER}</span>.
        </p>
      </div>

      <div
        ref={containerRef}
        className="group relative mt-8 sm:mt-10 rounded-2xl overflow-hidden bg-white shadow-xl shadow-emerald-900/5 ring-1 ring-slate-200/70 select-none touch-none"
        style={{ aspectRatio: '4 / 3' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="Drag to compare CV before and after AI optimisation"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
      >
        {/* Before — base layer, always full width */}
        <div className="absolute inset-0 p-5 sm:p-7 lg:p-9 bg-slate-50/60 pointer-events-none">
          <BeforeContent />
        </div>

        {/* After — clipped from the right based on `pos` */}
        <div
          className="absolute inset-0 p-5 sm:p-7 lg:p-9 bg-gradient-to-br from-emerald-50/70 to-white pointer-events-none"
          style={{ clipPath: `inset(0 ${(100 - pos).toFixed(2)}% 0 0)` }}
        >
          <AfterContent />
        </div>

        {/* Vertical divider line — has a soft emerald glow */}
        <div
          aria-hidden
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 pointer-events-none"
          style={{
            left: `${pos}%`,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.55)',
          }}
        />

        {/* Round handle — visual only; events captured on container */}
        <div
          aria-hidden
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ left: `${pos}%` }}
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg ring-2 ring-emerald-500 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-200">
            <HiArrowsRightLeft className="h-5 w-5" />
          </div>
        </div>

        {/* Corner labels */}
        <span className="absolute top-3 left-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-white/85 backdrop-blur-sm px-2 py-1 rounded-full ring-1 ring-rose-200/70">
          Before
        </span>
        <span className="absolute top-3 right-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-white/85 backdrop-blur-sm px-2 py-1 rounded-full ring-1 ring-emerald-200/70 inline-flex items-center gap-1">
          <HiSparkles className="h-3 w-3" />
          After AI
        </span>
      </div>

      <p className="mt-4 text-center text-xs sm:text-sm text-slate-500">
        ← Drag the divider to compare side by side →
      </p>
    </section>
  );
};

export default BeforeAfterSlider;
