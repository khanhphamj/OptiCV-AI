import React from 'react';
import { StepConfig, Step } from '../types';
import { HiCheck } from 'react-icons/hi2';

interface StepIndicatorProps {
  steps: StepConfig[];
  currentStep: Step;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          let tileClasses = 'relative flex flex-col items-center justify-center w-28 h-28 p-2 sm:w-48 sm:h-32 sm:p-4 rounded-2xl transition-all duration-300 ease-in-out';
          let circleClasses = 'flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full font-bold text-lg transition-all duration-300 mb-2 sm:mb-3 shadow-md';
          let textClasses = 'font-bold transition-colors duration-300 text-center text-xs sm:text-base';

          if (isActive) {
            tileClasses += ' bg-white border-2 border-emerald-400 shadow-2xl shadow-emerald-500/20 scale-105 z-10';
            circleClasses += ' bg-emerald-400 text-white ring-4 ring-emerald-100';
            textClasses += ' text-slate-800';
          } else if (isCompleted) {
            tileClasses += ' bg-white/60 backdrop-blur-md border border-transparent';
            circleClasses += ' bg-emerald-400 text-white';
            textClasses += ' text-slate-700';
          } else {
            tileClasses += ' bg-white/40 backdrop-blur-md border border-white/50 shadow-lg';
            circleClasses += ' bg-slate-200 text-slate-500';
            textClasses += ' text-slate-500';
          }

          return (
            <React.Fragment key={step.id}>
              <li className="relative flex-1 flex justify-center">
                <div className={tileClasses}>
                  <span className={circleClasses}>
                    {isCompleted ? <HiCheck className="w-5 h-5" /> : stepNumber}
                  </span>
                  <span className={textClasses}>{step.name}</span>
                </div>
              </li>

              {index < steps.length - 1 && (
                <li className="flex-shrink-0" aria-hidden="true">
                  <div className="w-4 sm:w-16 h-0.5 bg-slate-300" />
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