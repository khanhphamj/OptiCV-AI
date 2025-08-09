import React from 'react';
import { HiSparkles, HiArrowLongRight, HiArrowTrendingUp, HiArrowTrendingDown } from 'react-icons/hi2';

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

const getScoreStatus = (score: number) => {
    if (score >= 90) return { text: "Excellent match!", color: "text-emerald-600" };
    if (score >= 75) return { text: "Strong candidate.", color: "text-emerald-600" };
    if (score >= 60) return { text: "Good potential.", color: "text-amber-600" };
    if (score >= 40) return { text: "Needs improvement.", color: "text-amber-600" };
    return { text: "Significant gaps found.", color: "text-red-600" };
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
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 mx-auto">
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
                <span className={`font-numeric tabular-nums text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold ${text}`}>
                    {displayValue}
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-gray-500 -mt-0.5">/ 100</span>
            </div>
        </div>
    );
};

const ScoreStatus: React.FC<{ score: number }> = ({ score }) => {
    const status = getScoreStatus(score);
    return (
        <p className={`font-semibold ${status.color}`}>
            {status.text}
        </p>
    );
};

/* -------------------------------------------
   Badge for Score Improvement
--------------------------------------------*/
const ModernImprovementBadge: React.FC<{ current: number; previous: number | null; className?: string }> = ({ current, previous, className = '' }) => {
  if (previous === null)
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-slate-200 transition-all duration-300 ${className}`}>
        <HiSparkles className="w-3 h-3" /> Initial Analysis
      </span>
    );

  if (current === previous)
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-slate-200 transition-all duration-300 ${className}`}>
        <HiArrowLongRight className="w-3 h-3" /> No Change
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
      {positive ? '+' : ''}{diffPct} pts {positive ? 'Improvement' : 'Decline'}
    </span>
  );
};

/* -------------------------------------------
   Main Analysis Panel
--------------------------------------------*/
const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ score, previousScore, summary }) => {
  return (
    <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2 lg:space-y-2.5">
      <ScoreCircle score={score} previousScore={previousScore} />

      <div className="space-y-1.5 sm:space-y-2 lg:space-y-2.5 w-full">
        <h3 tabIndex={0} className="font-headline text-base sm:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent tracking-tight">
          Overall Match Score
        </h3>

        <div className="space-y-1.5 sm:space-y-2">
          <ScoreStatus score={score} />
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl border border-slate-200/60 shadow-inner text-left">
            <div className="flex items-start gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
              <div className="p-1 sm:p-1.5 bg-gradient-to-br from-slate-600 to-slate-700 rounded sm:rounded-md shadow-md flex-shrink-0">
                <HiSparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
              <h4 className="font-semibold text-slate-800 text-xs sm:text-sm lg:text-base m-0">AI Analysis Summary</h4>
            </div>

            <div className="relative pl-6 sm:pl-8 lg:pl-9">
              <p className="text-gray-700 leading-relaxed text-xs sm:text-sm m-0" title={summary}>
                {summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <ModernImprovementBadge current={score} previous={previousScore} />
        
        <div className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-xs font-medium text-emerald-700 rounded-full border border-emerald-200/50 shadow-sm">
          <HiSparkles className="h-3 w-3" />
          Powered by GPT-4.1-mini
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;