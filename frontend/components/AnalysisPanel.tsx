import React from 'react';
import { HiSparkles, HiArrowLongRight, HiArrowTrendingUp, HiArrowTrendingDown } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';
import type { TranslationKey } from '../i18n/translations';

interface AnalysisPanelProps {
  score: number;          // 0 – 100
  previousScore: number | null;
  summary: string;
}

/* -------------------------------------------
   Helpers
--------------------------------------------*/
const getScoreColorClasses = (score: number) => {
  if (score < 50)  return { text: 'text-red-500',    stroke: 'stroke-red-500' };
  if (score < 80)  return { text: 'text-amber-500',  stroke: 'stroke-amber-500' };
  return            { text: 'text-emerald-600', stroke: 'stroke-emerald-500' };
};

const getScoreStatus = (score: number): { key: TranslationKey; color: string } => {
    if (score >= 90) return { key: 'analysis.status.excellent', color: 'text-emerald-600' };
    if (score >= 75) return { key: 'analysis.status.strong', color: 'text-emerald-600' };
    if (score >= 60) return { key: 'analysis.status.good', color: 'text-amber-600' };
    if (score >= 40) return { key: 'analysis.status.improve', color: 'text-amber-600' };
    return { key: 'analysis.status.gaps', color: 'text-red-600' };
}

const CIRCUMFERENCE = 2 * Math.PI * 20; // r=20 for viewBox 44x44

/* -------------------------------------------
   Classic Score Circle Display
--------------------------------------------*/
const ScoreCircle: React.FC<{ score: number; previousScore?: number | null }> = ({ score, previousScore = null }) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    const { text } = getScoreColorClasses(clampedScore);
    const offset = CIRCUMFERENCE - (clampedScore / 100) * CIRCUMFERENCE;

    const uniqueId = React.useId().replace(/:/g, '');
    const gradientId = `scoreGradient-${uniqueId}`;
    const glowId = `scoreGlow-${uniqueId}`;
    const ringFillId = `ringFill-${uniqueId}`;

    const [displayValue, setDisplayValue] = React.useState<number>(
      typeof previousScore === 'number' ? Math.max(0, Math.min(100, previousScore)) : clampedScore
    );

    React.useEffect(() => {
      const start = typeof previousScore === 'number' ? Math.max(0, Math.min(100, previousScore)) : displayValue;
      const end = clampedScore;
      if (start === end) return;

      const durationMs = 900;
      const startTime = performance.now();
      let raf = 0;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const val = Math.round(start + (end - start) * eased);
        setDisplayValue(val);
        if (t < 1) raf = requestAnimationFrame(step);
      };

      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
      // Intentionally not including displayValue in deps to avoid restart mid-animation
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clampedScore, previousScore]);

    return (
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-24 lg:h-24 xl:w-28 xl:h-28 mx-auto">
            {/* Subtle background aura layer */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-emerald-300/25 via-teal-300/15 to-transparent blur-md scale-110"
            />
            <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90" aria-hidden="true">
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                  <linearGradient id={`outer-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#99f6e4" stopOpacity="0.5" />
                  </linearGradient>
                  <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#10b981" floodOpacity="0.45" />
                  </filter>
                  <radialGradient id={ringFillId} cx="50%" cy="50%" r="50%">
                    <stop offset="30%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.35" />
                  </radialGradient>
                </defs>

                {/* Soft inner fill for subtle depth */}
                <circle cx="22" cy="22" r="18.5" fill={`url(#${ringFillId})`} />

                {/* Outer surrounding ring */}
                <circle
                  cx="22"
                  cy="22"
                  r="21"
                  fill="none"
                  strokeWidth="1"
                  stroke={`url(#outer-${gradientId})`}
                />

                {/* Background track */}
                <circle cx="22" cy="22" r="20" fill="none" strokeWidth="2.5" className="stroke-slate-200/80" />

                {/* Progress stroke with gradient + glow */}
                <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    strokeWidth="3.25"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    stroke={`url(#${gradientId})`}
                    style={{ filter: `url(#${glowId})` }}
                    className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-numeric tabular-nums text-lg sm:text-2xl md:text-3xl lg:text-2xl xl:text-3xl font-extrabold ${text}`}>
                    {displayValue}
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium text-gray-500 -mt-0.5">/ 100</span>
            </div>
        </div>
    );
};

const ScoreStatus: React.FC<{ score: number }> = ({ score }) => {
    const { t } = useLang();
    const status = getScoreStatus(score);
    return (
        <p className={`font-semibold ${status.color}`}>
            {t(status.key)}
        </p>
    );
};

/* -------------------------------------------
   Badge for Score Improvement
--------------------------------------------*/
const ModernImprovementBadge: React.FC<{ current: number; previous: number | null; className?: string }> = ({ current, previous, className = '' }) => {
  const { t } = useLang();
  if (previous === null)
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-slate-200 transition-all duration-300 ${className}`}>
        <HiSparkles className="w-3 h-3" /> {t('analysis.initial')}
      </span>
    );

  if (current === previous)
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-slate-200 transition-all duration-300 ${className}`}>
        <HiArrowLongRight className="w-3 h-3" /> {t('analysis.no_change')}
      </span>
    );

  const diffPct = Math.abs(current - previous);
  const positive = current > previous;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm transition-all duration-300 animate__animated animate__bounceIn
        ${positive
          ? 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-200'
          : 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200'
        } ${className}`}
    >
      {positive ? <HiArrowTrendingUp className="w-3 h-3" /> : <HiArrowTrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{diffPct} pts {positive ? t('analysis.improvement') : t('analysis.decline')}
    </span>
  );
};

/* -------------------------------------------
   Main Analysis Panel
--------------------------------------------*/
const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ score, previousScore, summary }) => {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2 lg:space-y-1.5">
      <ScoreCircle score={score} previousScore={previousScore} />

      <div className="space-y-1 sm:space-y-1.5 w-full">
        <h3 tabIndex={0} className="font-headline text-sm sm:text-base lg:text-base xl:text-lg font-bold bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent tracking-tight">
          {t('analysis.overall')}
        </h3>

        <div className="space-y-1 sm:space-y-1.5">
          <ScoreStatus score={score} />
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200/60 shadow-inner text-left">
            <div className="flex items-start gap-1.5 mb-1">
              <div className="p-1 bg-gradient-to-br from-slate-600 to-slate-700 rounded shadow-md flex-shrink-0">
                <HiSparkles className="w-3 h-3 text-white" />
              </div>
              <h4 className="font-semibold text-slate-800 text-xs sm:text-sm m-0">{t('analysis.summary_title')}</h4>
            </div>

            <div className="relative pl-5 sm:pl-6">
              <p
                className="text-gray-700 leading-snug text-xs m-0 line-clamp-3 lg:line-clamp-2 xl:line-clamp-3"
                title={summary}
              >
                {summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <ModernImprovementBadge current={score} previous={previousScore} />
      </div>
    </div>
  );
};

export default AnalysisPanel;