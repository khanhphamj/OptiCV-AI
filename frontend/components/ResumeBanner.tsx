import React, { useEffect, useRef } from 'react';
import { HiArrowPath, HiSparkles } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';

interface ResumeBannerProps {
  score: number | null;
  onContinue: () => void;
  onDiscard: () => void;
}

const ResumeBanner: React.FC<ResumeBannerProps> = ({ score, onContinue, onDiscard }) => {
  const { t } = useLang();
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    continueBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onContinue();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onContinue]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const scoreColor =
    score === null
      ? 'text-slate-600'
      : score >= 80
      ? 'text-emerald-600'
      : score >= 60
      ? 'text-amber-600'
      : 'text-red-500';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate__animated animate__fadeIn animate__faster"
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onContinue}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm cursor-default"
      />

      <div
        className="liquid-glass relative w-full max-w-sm rounded-2xl p-5 animate-reveal"
        style={{ animationDuration: '0.35s' }}
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
            <HiSparkles className="h-5 w-5 text-white icon-float" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="resume-title"
              className="text-base font-bold text-slate-900 font-headline leading-tight"
            >
              {t('resume.title')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('resume.subtitle')}</p>
          </div>
          {score !== null && (
            <div className="shrink-0 text-right leading-none">
              <p
                className={`font-numeric tabular-nums text-2xl font-extrabold ${scoreColor}`}
              >
                {score}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">/ 100</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 min-h-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/70 px-3 text-sm font-semibold text-slate-700 hover:bg-white active:scale-95 transition"
          >
            {t('resume.discard')}
          </button>
          <button
            ref={continueBtnRef}
            type="button"
            onClick={onContinue}
            className="btn-sheen flex-[1.3] min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition"
          >
            <HiArrowPath className="h-4 w-4" />
            {t('resume.continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeBanner;
