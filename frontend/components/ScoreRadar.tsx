import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SubScores } from '../types';
import { useLang } from '../hooks/useLang';
import type { TranslationKey } from '../i18n/translations';

interface ScoreRadarProps {
  overallScore: number;
  subScores: SubScores;
  className?: string;
  compact?: boolean;
}

interface AxisConfig {
  id: keyof SubScores;
  labelKey: TranslationKey;
}

const AXES: AxisConfig[] = [
  { id: 'role_alignment', labelKey: 'metric.role_alignment' },
  { id: 'skill_coverage', labelKey: 'metric.skill_coverage' },
  { id: 'experience_fit', labelKey: 'metric.experience_fit' },
  { id: 'recency',        labelKey: 'metric.recency' },
  { id: 'quantification', labelKey: 'metric.quantification' },
  { id: 'keyword_match',  labelKey: 'metric.keyword_match' },
];

const VIEWBOX = 320;
const CENTER = VIEWBOX / 2;
const RADIUS = 120;
const RING_STEPS = [0.2, 0.4, 0.6, 0.8, 1.0];

function pointFor(axisIndex: number, normalised: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / AXES.length;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * normalised,
    y: CENTER + Math.sin(angle) * RADIUS * normalised,
  };
}

/** Score → color tokens for dots, glows, wedge fills, and labels. */
function axisColors(score: number) {
  if (score < 50) return {
    dot: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.28)',
    wedgeFill: 'rgba(244, 63, 94, 0.17)',
    strokeColor: '#f43f5e',
    labelClass: 'fill-rose-700',
    scoreClass: 'fill-rose-600',
    tier: 'weak' as const,
  };
  if (score < 75) return {
    dot: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)',
    wedgeFill: 'rgba(245, 158, 11, 0.14)',
    strokeColor: '#f59e0b',
    labelClass: 'fill-amber-700',
    scoreClass: 'fill-amber-600',
    tier: 'medium' as const,
  };
  return {
    dot: '#10b981',
    glow: 'rgba(16, 185, 129, 0.22)',
    wedgeFill: 'rgba(16, 185, 129, 0.17)',
    strokeColor: '#10b981',
    labelClass: 'fill-slate-600',
    scoreClass: 'fill-emerald-600',
    tier: 'strong' as const,
  };
}

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

const useCountUp = (target: number, duration = 1200): number => {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const startedAtRef = useRef<number | null>(null);
  const targetRef = useRef(target);

  useEffect(() => { targetRef.current = target; }, [target]);

  useEffect(() => {
    if (reduced) { setValue(target); return; }
    let raf = 0;
    setValue(0);
    startedAtRef.current = null;
    const tick = (now: number) => {
      if (startedAtRef.current === null) startedAtRef.current = now;
      const progress = Math.min(1, (now - startedAtRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(targetRef.current * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return value;
};

const SWEEP_REVEAL_MS = 1600;
const SWEEP_PER_AXIS_MS = SWEEP_REVEAL_MS / AXES.length;

const ScoreRadar: React.FC<ScoreRadarProps> = ({ overallScore, subScores, className = '', compact = false }) => {
  const { t } = useLang();
  const reducedMotion = useReducedMotion();
  const animatedScore = useCountUp(overallScore, 1400);
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null);
  const [axisRevealed, setAxisRevealed] = useState<boolean[]>(() =>
    reducedMotion ? AXES.map(() => true) : AXES.map(() => false),
  );
  const [polygonReady, setPolygonReady] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setAxisRevealed(AXES.map(() => true));
      setPolygonReady(true);
      return;
    }
    setAxisRevealed(AXES.map(() => false));
    setPolygonReady(false);
    const timers: ReturnType<typeof setTimeout>[] = AXES.map((_, i) =>
      setTimeout(() => {
        setAxisRevealed(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 250 + i * SWEEP_PER_AXIS_MS),
    );
    const polyTimer = setTimeout(() => setPolygonReady(true), 250 + SWEEP_REVEAL_MS + 200);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(polyTimer);
    };
  }, [reducedMotion]);

  const allRevealed = axisRevealed.every(Boolean);

  /** Resolved score-point positions — shared between wedge fills and the stroke polygon. */
  const polygonPts = useMemo<{ x: number; y: number }[]>(() =>
    AXES.map((axis, i) => {
      const data = subScores[axis.id];
      const normalised = data ? Math.min(1, Math.max(0, data.score / 100)) : 0;
      return pointFor(i, axisRevealed[i] ? normalised : 0);
    }),
    [subScores, axisRevealed],
  );

  const polygonPoints = useMemo(() =>
    polygonPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    [polygonPts],
  );

  /** Index of the single weakest axis (for the pulse animation). */
  const weakestAxisIdx = useMemo(() => {
    let minScore = Infinity;
    let minIdx = -1;
    AXES.forEach((axis, i) => {
      const data = subScores[axis.id];
      if (data && data.score < minScore) {
        minScore = data.score;
        minIdx = i;
      }
    });
    return minIdx;
  }, [subScores]);

  const tier =
    overallScore >= 85 ? 'A' :
    overallScore >= 70 ? 'B' :
    overallScore >= 50 ? 'C' : 'D';
  const tierLabel = tier === 'A' ? 'Excellent fit' :
                    tier === 'B' ? 'Strong fit' :
                    tier === 'C' ? 'Partial fit' : 'Weak fit';
  const tierColor = tier === 'A' ? 'text-emerald-600' :
                    tier === 'B' ? 'text-emerald-500' :
                    tier === 'C' ? 'text-amber-600' : 'text-rose-600';
  const polygonStroke =
    tier === 'A' || tier === 'B' ? '#10b981' :
    tier === 'C' ? '#f59e0b' : '#f43f5e';

  const hoveredAxisData = hoveredAxis !== null ? subScores[AXES[hoveredAxis].id] : null;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative aspect-square w-full mx-auto ${
          compact
            ? 'max-w-[200px] sm:max-w-[220px] lg:max-w-[240px]'
            : 'max-w-[280px] sm:max-w-[320px]'
        }`}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`Suitability score ${overallScore} of 100`}
        >
          <defs>
            {/* Branded emerald-to-teal gem.
                cx/cy offset to top-left places the catch-light naturally,
                creating a polished sphere look without literal photorealism.
                The rim transitions emerald → teal — mirroring the same
                emerald-to-teal gradient used on the brand wordmark and
                primary CTA buttons, so the score orb feels like part of
                the same colour family rather than a standalone widget. */}
            <radialGradient id="radar-orb" cx="35%" cy="32%" r="70%">
              <stop offset="0%"   stopColor="#d1fae5" stopOpacity="1" />  {/* emerald-100 catch-light */}
              <stop offset="22%"  stopColor="#34d399" stopOpacity="1" />  {/* emerald-400 */}
              <stop offset="55%"  stopColor="#10b981" stopOpacity="1" />  {/* emerald-500 body */}
              <stop offset="85%"  stopColor="#0d9488" stopOpacity="1" />  {/* teal-600 — brand transition */}
              <stop offset="100%" stopColor="#0f766e" stopOpacity="1" />  {/* teal-700 deep rim */}
            </radialGradient>
            <linearGradient id="radar-sweep" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%"  stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="40%" stopColor="#34d399" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
            {/* Soft outer glow — stdDeviation 3 keeps the bloom gentle. */}
            <filter id="radar-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Emerald-tinted vignette darkens the centre for white-text
                contrast. Using #022c22 (emerald-950) instead of pure black
                means the darkening stays on-brand — pure black would mute
                the emerald base into a neutral grey-green. */}
            <radialGradient id="radar-orb-overlay" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#022c22" stopOpacity="0.50" />
              <stop offset="55%"  stopColor="#022c22" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0"    />
            </radialGradient>
            {/* Text shadow for the score number — dark emerald halo. */}
            <filter id="radar-score-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#022c22" floodOpacity="0.95" />
            </filter>
          </defs>

          {/* Concentric hex rings */}
          {RING_STEPS.map((step, i) => {
            const points = AXES
              .map((_, axisIdx) => pointFor(axisIdx, step))
              .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <polygon
                key={i}
                points={points}
                fill={i === RING_STEPS.length - 1 ? 'rgba(241, 245, 249, 0.5)' : 'none'}
                stroke="rgba(148, 163, 184, 0.25)"
                strokeWidth={0.8}
                className="radar-ring"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            );
          })}

          {/* Axes (spokes) */}
          {AXES.map((_, i) => {
            const tip = pointFor(i, 1);
            return (
              <line
                key={i}
                x1={CENTER} y1={CENTER}
                x2={tip.x}  y2={tip.y}
                stroke="rgba(148, 163, 184, 0.3)"
                strokeWidth={0.8}
                className="radar-axis"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              />
            );
          })}

          {/* Sweep-reveal beam */}
          {!reducedMotion && !polygonReady && (
            <g className="radar-sweep-beam" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
              <path
                d={`M${CENTER},${CENTER} L${CENTER + RADIUS + 4},${CENTER - 22} A${RADIUS + 4},${RADIUS + 4} 0 0,1 ${CENTER + RADIUS + 4},${CENTER + 22} Z`}
                fill="url(#radar-sweep)"
                opacity={0.85}
              />
            </g>
          )}

          {/* Score polygon — 6 colored wedge fills (one per adjacent axis pair)
              so each sector shows its performance level at a glance. */}
          {AXES.map((axis, i) => {
            const nextI = (i + 1) % AXES.length;
            const data = subScores[axis.id];
            const nextData = subScores[AXES[nextI].id];
            const avgScore = ((data?.score ?? 0) + (nextData?.score ?? 0)) / 2;
            const colors = axisColors(avgScore);
            const p1 = polygonPts[i];
            const p2 = polygonPts[nextI];
            return (
              <path
                key={`wedge-${i}`}
                d={`M${CENTER},${CENTER} L${p1.x.toFixed(1)},${p1.y.toFixed(1)} L${p2.x.toFixed(1)},${p2.y.toFixed(1)} Z`}
                fill={polygonReady ? colors.wedgeFill : 'rgba(16, 185, 129, 0.03)'}
                style={{ transition: 'all 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            );
          })}

          {/* Polygon outline stroke — single path, overall tier color */}
          <polygon
            points={polygonPoints}
            fill="none"
            stroke={polygonStroke}
            strokeWidth={polygonReady ? 2 : 1}
            strokeOpacity={polygonReady ? 0.85 : 0.4}
            strokeLinejoin="round"
            className="radar-polygon"
            style={{ transition: 'all 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          />

          {/* Score dots + hover hit areas */}
          {AXES.map((axis, i) => {
            const data = subScores[axis.id];
            const normalised = data ? Math.min(1, Math.max(0, data.score / 100)) : 0;
            const point = pointFor(i, axisRevealed[i] ? normalised : 0);
            const labelPoint = pointFor(i, compact ? 1.28 : 1.24);
            const visible = axisRevealed[i];
            const colors = axisColors(data?.score ?? 0);
            const isWeakest = i === weakestAxisIdx && (data?.score ?? 100) < 75;

            return (
              <g key={axis.id}>
                {/* Glow halo behind weak/medium dots */}
                {visible && data && data.score < 75 && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={data.score < 50 ? 10 : 8}
                    fill={colors.glow}
                    style={{
                      transition:
                        'cx 720ms cubic-bezier(0.34, 1.56, 0.64, 1),' +
                        'cy 720ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                )}

                {/* Score dot */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={visible ? (hoveredAxis === i ? 6 : 4.5) : 0}
                  fill={data ? colors.dot : '#cbd5e1'}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className={isWeakest && polygonReady && !reducedMotion ? 'radar-weak-dot' : ''}
                  style={{
                    transition:
                      'cx 720ms cubic-bezier(0.34, 1.56, 0.64, 1),' +
                      'cy 720ms cubic-bezier(0.34, 1.56, 0.64, 1),' +
                      'r 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />

                {/* Invisible hover hit area */}
                <line
                  x1={CENTER} y1={CENTER}
                  x2={pointFor(i, 1).x} y2={pointFor(i, 1).y}
                  stroke="transparent"
                  strokeWidth={28}
                  onMouseEnter={() => setHoveredAxis(i)}
                  onMouseLeave={() => setHoveredAxis(null)}
                  style={{ cursor: 'help' }}
                />

                {/* Axis label — SVG user-unit fontSize scales with the viewBox.
                    Compact mode: 320-unit viewBox at 240px = 0.75× → need larger
                    values. Non-compact: 320px display → 1× scale.
                    labelFz=17 gives ~12.75px compact / 17px full.
                    scoreFz=14 gives ~10.5px compact / 14px full. */}
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={compact ? 17 : 13}
                  fontWeight={600}
                  className={`select-none pointer-events-none ${colors.labelClass}`}
                  style={{ opacity: visible ? 1 : 0, transition: 'opacity 500ms ease-out' }}
                >
                  {t(axis.labelKey)}
                </text>
                {data && (
                  <text
                    x={labelPoint.x}
                    y={labelPoint.y + (compact ? 18 : 15)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={compact ? 15 : 11}
                    fontWeight={700}
                    className={`tabular-nums select-none pointer-events-none ${colors.scoreClass}`}
                    style={{ opacity: visible ? 1 : 0, transition: 'opacity 500ms ease-out 120ms' }}
                  >
                    {data.score}
                  </text>
                )}
              </g>
            );
          })}

          {/* Orbital sparkles — excellent tier only */}
          {polygonReady && overallScore >= 85 && !reducedMotion && (
            <g>
              {[0, 1, 2, 3].map(i => (
                <circle
                  key={`orb-spark-${i}`}
                  cx={CENTER} cy={CENTER}
                  r={1.8}
                  fill="#a7f3d0"
                  className={`radar-orb-sparkle radar-orb-sparkle-${i}`}
                />
              ))}
            </g>
          )}

          {/* Center orb — glow layer */}
          <g filter="url(#radar-glow)">
            <circle cx={CENTER} cy={CENTER} r={40} fill="url(#radar-orb)" className={overallScore >= 85 ? 'radar-orb-pulse' : ''} />
            {/* Inner highlight ring — emerald-100 at low opacity keeps the
                edge brand-aligned (a pure-white ring read slightly cool). */}
            <circle cx={CENTER} cy={CENTER} r={40} fill="none" stroke="rgba(209, 250, 229, 0.45)" strokeWidth={1} />
          </g>
          {/* Dark vignette over the orb centre — improves score text contrast
              while keeping the emerald glow visible at the rim. */}
          <circle cx={CENTER} cy={CENTER} r={40} fill="url(#radar-orb-overlay)" />

          {/* Score text — wrapped in shadow filter for extra pop */}
          <g filter="url(#radar-score-shadow)">
            <text
              x={CENTER}
              y={CENTER - 3}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={32}
              fontWeight={900}
              className="tabular-nums select-none"
            >
              {animatedScore}
            </text>
            <text
              x={CENTER}
              y={CENTER + 19}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.9)"
              fontSize={10}
              fontWeight={600}
              className="uppercase select-none"
              letterSpacing={1.5}
            >
              of 100
            </text>
          </g>
        </svg>
      </div>

      {/* Tier label + hover tooltip */}
      <div className={`mt-2 text-center ${compact ? 'min-h-[2rem]' : 'min-h-[3.5rem]'}`}>
        {hoveredAxis !== null && hoveredAxisData ? (
          <div className="animate__animated animate__fadeIn animate__faster">
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: axisColors(hoveredAxisData.score).dot }}
            >
              {t(AXES[hoveredAxis].labelKey)} · {hoveredAxisData.score}/100
            </p>
            <p className="mt-0.5 text-xs text-slate-600 max-w-md mx-auto leading-snug">
              {hoveredAxisData.description}
            </p>
          </div>
        ) : (
          <>
            <p className={`text-sm font-bold ${tierColor}`}>{tierLabel}</p>
            {!compact && (
              <p className="mt-0.5 text-[11px] text-slate-500">Hover an axis for the breakdown</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScoreRadar;
