import React from 'react';
import { StepConfig, Step } from '../types';
import { HiCheck } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';
import type { TranslationKey } from '../i18n/translations';

interface StepIndicatorProps {
  steps: StepConfig[];
  currentStep: Step;
}

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  const { t } = useLang();
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-center">
        {steps.map((step, index) => {
          const stepNameKey = `step.${step.id}.name` as TranslationKey;
          const stepNumber = index + 1;
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          const baseTile =
            'relative flex flex-col items-center justify-center w-28 h-20 p-2 sm:w-44 sm:h-24 sm:p-3 lg:w-48 lg:h-[88px] lg:p-3 rounded-2xl';
          const tileTransition = 'transition-all duration-500';

          let tileState = '';
          let circleState = '';
          let textState = '';
          let showSheen = false;
          let ringBoost = '';

          if (isActive) {
            tileState =
              'liquid-glass border border-emerald-300/70 shadow-xl shadow-emerald-500/30 scale-[1.06] z-10';
            circleState =
              'bg-gradient-to-br from-emerald-400 to-teal-500 text-white ring-4 ring-emerald-100/80 shadow-md shadow-emerald-500/40 scale-110';
            textState = 'text-slate-900';
            showSheen = true;
            ringBoost = 'after:opacity-100';
          } else if (isCompleted) {
            tileState = 'liquid-glass-soft border border-emerald-200/70';
            circleState =
              'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/25';
            textState = 'text-slate-700';
          } else {
            tileState = 'liquid-glass-clear';
            circleState = 'bg-slate-200/90 text-slate-500 shadow-sm';
            textState = 'text-slate-500';
          }

          const circleBase =
            'flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 lg:w-9 lg:h-9 rounded-full font-bold text-sm lg:text-base mb-1.5 sm:mb-2 transition-all duration-500';
          const textBase =
            'font-bold text-center text-xs sm:text-sm lg:text-[13px] transition-colors duration-500';

          return (
            <React.Fragment key={step.id}>
              <li className="relative flex-shrink-0 flex justify-center">
                <div
                  className={`${baseTile} ${tileTransition} ${tileState} ${ringBoost} overflow-hidden`}
                  style={{ transitionTimingFunction: SPRING }}
                >
                  {/* Active tile: animated shimmer sweep */}
                  {showSheen && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        background:
                          'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)',
                        animation: 'step-sheen 2.5s ease-in-out infinite',
                      }}
                    />
                  )}
                  {/* Active tile: soft emerald glow behind */}
                  {isActive && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -inset-2 rounded-2xl opacity-60"
                      style={{
                        background:
                          'radial-gradient(circle at center, rgba(16,185,129,0.35) 0%, transparent 70%)',
                        filter: 'blur(8px)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  <span
                    className={`relative z-10 ${circleBase} ${circleState}`}
                    style={{ transitionTimingFunction: SPRING }}
                  >
                    {isCompleted ? (
                      <HiCheck
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-[step-check_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
                      />
                    ) : (
                      <span
                        key={isActive ? 'active' : 'pending'}
                        className={isActive ? 'animate-[step-bounce_0.45s_cubic-bezier(0.34,1.56,0.64,1)_both]' : ''}
                      >
                        {stepNumber}
                      </span>
                    )}
                  </span>
                  <span className={`relative z-10 ${textBase} ${textState}`}>{t(stepNameKey)}</span>
                </div>
              </li>

              {index < steps.length - 1 && (
                <li className="flex-shrink-0 px-1 sm:px-2" aria-hidden="true">
                  <div className="w-5 sm:w-16 lg:w-20 h-[6px] bg-slate-200/70 rounded-full overflow-hidden relative shadow-inner">
                    {/* Liquid fill — scale-x from 0 → 1 when step before completes */}
                    <div
                      className={`absolute inset-0 rounded-full origin-left transition-transform duration-[700ms] ease-out ${
                        isCompleted ? 'scale-x-100' : 'scale-x-0'
                      }`}
                      style={{
                        background:
                          'linear-gradient(90deg, #34d399 0%, #14b8a6 25%, #06b6d4 50%, #14b8a6 75%, #34d399 100%)',
                        backgroundSize: '200% 100%',
                        animation: isCompleted
                          ? 'step-flow 2.8s ease-in-out 700ms infinite'
                          : 'none',
                        boxShadow: isCompleted
                          ? '0 0 8px rgba(16, 185, 129, 0.45), inset 0 0 4px rgba(255,255,255,0.35)'
                          : 'none',
                      }}
                    />
                    {/* Bright shimmer highlight sliding over the fill */}
                    {isCompleted && (
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.65) 50%, transparent 80%)',
                          mixBlendMode: 'overlay',
                          animation: 'step-flow-shine 2.8s linear 700ms infinite',
                        }}
                      />
                    )}
                  </div>
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default StepIndicator;
