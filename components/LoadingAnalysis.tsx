import React, { useRef, useEffect } from 'react';
import { useTypingEffect } from '../hooks/useTypingEffect';
import LottieAnimation from './LottieAnimation';

interface LoadingAnalysisProps {
  stage: 'validation' | 'analysis' | 'complete';
  onCancel: () => void;
  onComplete: () => void;
}

const VALIDATION_STEPS = [
  "Initializing validation agent...",
  "Confirming CV document integrity...",
  "Scanning Job Description for relevance...",
  "Checking for potential content issues...",
  "Validation complete. Proceeding to analysis.",
];

const ANALYSIS_STEPS = [
  "Parsing CV for key skills and experience...",
  "Initializing Gemini analysis agent...",
  "Cross-referencing with Job Description requirements...",
  "Evaluating experience fit and skill coverage...",
  "Identifying keywords and quantifiable achievements...",
  "Compiling strengths and improvement areas...",
  "Calculating final suitability score...",
  "Finalizing analysis report.",
];

const LoadingAnalysis: React.FC<LoadingAnalysisProps> = ({ stage, onCancel, onComplete }) => {
  const steps = stage === 'validation' ? VALIDATION_STEPS : ANALYSIS_STEPS;
  const displayedStep = useTypingEffect(steps, { typingSpeed: 25, pauseDuration: 800 });
  const mainContainerRef = useRef<HTMLDivElement>(null);
  
  const animationClass = stage === 'complete' 
    ? 'animate__animated animate__zoomOut animate__fast'
    : 'animate__animated animate__zoomIn animate__fast';

  const title = stage === 'validation' ? 'Validating Documents' : 'Analyzing Documents';
  
  useEffect(() => {
    const node = mainContainerRef.current;
    if (stage === 'complete' && node) {
        const handleAnimationEnd = (event: AnimationEvent) => {
            if (event.animationName === 'zoomOut') {
                onComplete();
            }
        };
        node.addEventListener('animationend', handleAnimationEnd);
        return () => {
            node.removeEventListener('animationend', handleAnimationEnd);
        };
    }
  }, [stage, onComplete]);


  return (
    <div 
      ref={mainContainerRef}
      className={`flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl w-full max-w-md mx-auto bg-white border border-slate-200/50 shadow-2xl ${animationClass}`}
    >
      <div className="text-center w-full flex flex-col items-center">
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 font-headline">
          {stage === 'complete' ? 'Analysis Complete' : title}
        </h3>

        <LottieAnimation
          animationPath="/animations/analyzing.json"
          className="w-56 h-56 sm:w-64 sm:h-64 mx-auto -my-8 sm:-my-10"
          loop={true}
          autoplay={true}
        />

        <div className="h-12 flex items-center justify-center px-4">
          <p className="text-base text-gray-600 font-mono transition-opacity duration-300">
            {stage === 'complete' ? 'Presenting your results...' : displayedStep}
            {stage !== 'complete' && <span className="animate-pulse">_</span>}
          </p>
        </div>

        <button
          onClick={onCancel}
          disabled={stage === 'complete'}
          className="mt-4 px-8 py-3 bg-white text-slate-800 font-semibold rounded-xl hover:bg-slate-100 transition-colors border border-slate-300/80 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LoadingAnalysis;