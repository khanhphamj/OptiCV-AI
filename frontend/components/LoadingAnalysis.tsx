import React, { useEffect, useMemo, useRef } from 'react';
import { useTypingEffect } from '../hooks/useTypingEffect';
import LottieAnimation from './LottieAnimation';
import { HiSparkles, HiCheckCircle } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';
import type { TranslationKey } from '../i18n/translations';

export type LoadingStage = 'validation' | 'analysis' | 'complete' | 'job_search' | 'job_matching';

interface LoadingAnalysisProps {
  stage: LoadingStage;
  onCancel: () => void;
  onComplete: () => void;
}

const VALIDATION_KEYS: TranslationKey[] = [
  'loading.validation.1',
  'loading.validation.2',
  'loading.validation.3',
  'loading.validation.4',
  'loading.validation.5',
];

const ANALYSIS_KEYS: TranslationKey[] = [
  'loading.analysis.1',
  'loading.analysis.2',
  'loading.analysis.3',
  'loading.analysis.4',
  'loading.analysis.5',
  'loading.analysis.6',
  'loading.analysis.7',
  'loading.analysis.8',
];

const JOB_SEARCH_KEYS: TranslationKey[] = [
  'loading.job_search.1',
  'loading.job_search.2',
  'loading.job_search.3',
  'loading.job_search.4',
];

const JOB_MATCHING_KEYS: TranslationKey[] = [
  'loading.job_matching.1',
  'loading.job_matching.2',
  'loading.job_matching.3',
  'loading.job_matching.4',
];

const LoadingAnalysis: React.FC<LoadingAnalysisProps> = ({ stage, onCancel, onComplete }) => {
  const { t } = useLang();

  const steps = useMemo(() => {
    const keys =
      stage === 'validation' ? VALIDATION_KEYS :
      stage === 'job_search' ? JOB_SEARCH_KEYS :
      stage === 'job_matching' ? JOB_MATCHING_KEYS :
      ANALYSIS_KEYS;
    return keys.map((k) => t(k));
  }, [stage, t]);

  const { text, stepIndex, totalSteps } = useTypingEffect(steps, { typingSpeed: 25, pauseDuration: 800 });
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const isComplete = stage === 'complete';
  const animationClass = isComplete
    ? 'animate__animated animate__zoomOut animate__fast'
    : 'animate__animated animate__zoomIn animate__fast';

  const title = isComplete
    ? t('loading.title.complete')
    : stage === 'validation'
    ? t('loading.title.validation')
    : stage === 'job_search'
    ? t('loading.title.job_search')
    : stage === 'job_matching'
    ? t('loading.title.job_matching')
    : t('loading.title.analysis');

  const subtitle = isComplete
    ? t('loading.subtitle.complete')
    : stage === 'validation'
    ? t('loading.subtitle.validation')
    : stage === 'job_search'
    ? t('loading.subtitle.job_search')
    : stage === 'job_matching'
    ? t('loading.subtitle.job_matching')
    : t('loading.subtitle.analysis');

  // Progress: step i out of N → (i+0.5)/N (avoid 0% and 100%)
  const progress = isComplete ? 100 : Math.min(95, Math.round(((stepIndex + 0.5) / totalSteps) * 100));

  useEffect(() => {
    const node = mainContainerRef.current;
    if (isComplete && node) {
      const handleAnimationEnd = (event: AnimationEvent) => {
        if (event.animationName === 'zoomOut') onComplete();
      };
      node.addEventListener('animationend', handleAnimationEnd);
      return () => node.removeEventListener('animationend', handleAnimationEnd);
    }
  }, [isComplete, onComplete]);

  return (
    <div
      ref={mainContainerRef}
      className={`liquid-glass relative flex flex-col items-center justify-center p-5 sm:p-8 rounded-3xl w-full max-w-md mx-auto overflow-hidden ${animationClass}`}
    >
      {/* Ambient glow halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 w-56 h-56 rounded-full bg-emerald-300/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-teal-300/25 blur-3xl"
      />

      <div className="relative z-10 text-center w-full flex flex-col items-center">
        {/* AI Agent chip */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold shadow-md">
          <HiSparkles className="h-3.5 w-3.5 icon-float" />
          {t('loading.chip')}
        </div>

        <h3 className="mt-3 text-xl sm:text-2xl font-bold text-gradient-emerald font-headline">
          {title}
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-xs">{subtitle}</p>

        <LottieAnimation
          animationPath="/animations/analyzing.json"
          className="w-44 h-44 sm:w-52 sm:h-52 mx-auto -my-4 sm:-my-6"
          loop={true}
          autoplay={true}
        />

        {/* Step text */}
        <div className="min-h-[3rem] flex items-center justify-center px-2 w-full">
          {isComplete ? (
            <span className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-base animate-reveal">
              <HiCheckCircle className="h-5 w-5" />
              {t('loading.subtitle.complete')}
            </span>
          ) : (
            <p className="text-sm text-slate-700 font-mono text-center leading-snug">
              {text}
              <span className="animate-pulse text-emerald-600">_</span>
            </p>
          )}
        </div>

        {/* Stepped progress bar */}
        {!isComplete && (
          <div className="w-full mt-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1.5">
              <span>{t('loading.step')} {stepIndex + 1}/{totalSteps}</span>
              <span>{progress}%</span>
            </div>
            <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 bg-[length:200%_100%]"
                style={{
                  width: `${progress}%`,
                  animation: 'gradient-shift 2.5s ease-in-out infinite',
                  transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
                  animation: 'button-sheen 1.8s linear infinite',
                  transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onCancel}
          disabled={isComplete}
          className="mt-5 px-5 py-2 bg-white text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {t('loading.cancel')}
        </button>
      </div>
    </div>
  );
};

export default LoadingAnalysis;
