

import React, { useEffect, useRef } from 'react';
import { AnalysisResult, AISuggestion, StructuredJd, ImprovementLog, AnalysisSession } from '../types';
import AnalysisPanel from './AnalysisPanel';
import SubScoreBars from './SubScoreBars';
import CVCoachPanel from './CVCoachPanel';
import { HiSparkles, HiArrowPath } from 'react-icons/hi2';

interface Step3AnalysisProps {
  result: AnalysisResult | null;
  analysisSessions: AnalysisSession[];
  cvText: string;
  structuredJd: StructuredJd | null;
  jdText: string;
  onCvTextChange: (text: string) => void;
  onJdTextChange: (text: string) => void;
  onApplySuggestion: (suggestion: AISuggestion) => void;
  onReanalyze: () => void;
  onStartOver: () => void;
  isAnalyzing: boolean;
  onAddImprovementLog: (log: Omit<ImprovementLog, 'id' | 'timestamp'>) => void;
}

const Step3Analysis: React.FC<Step3AnalysisProps> = ({
  result,
  analysisSessions,
  cvText,
  structuredJd,
  jdText,
  onCvTextChange,
  onJdTextChange,
  onApplySuggestion,
  onReanalyze,
  onStartOver,
  isAnalyzing,
  onAddImprovementLog,
}) => {
  if (!result) {
    return (
        <div className="text-center text-gray-500 bg-white p-8 rounded-2xl shadow-lg border border-gray-200/50 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-gray-800">Analysis Unavailable</h3>
            <p className="mt-2">Something went wrong, and the analysis result could not be displayed.</p>
            <button
                onClick={onStartOver}
                className="mt-6 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors"
            >
                Start Over
            </button>
        </div>
    );
  }
  
  const SimpleLoader = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-200/60 via-white/40 to-emerald-100/60 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl z-20 transition-all duration-500 animate__animated animate__fadeIn">
        <div className="group flex items-center gap-4 bg-gradient-to-br from-white/90 via-white/80 to-emerald-50/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/50 hover:shadow-emerald-500/20 transition-all duration-500">
            {/* Animated spinner with gradient */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-pulse"></div>
              <HiArrowPath className="relative h-8 w-8 text-white animate-spin" style={{animationDuration: '1s'}} />
            </div>
            
            <div className="text-left">
                <p className="font-bold text-xl bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent">
                  Re-analyzing...
                </p>
                <p className="text-sm text-emerald-700/80 mt-1">
                  Updating your score with AI-powered insights
                </p>
                
                {/* Loading dots animation */}
                <div className="flex gap-1 mt-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
            </div>
        </div>
    </div>
  );

  const previousScore = analysisSessions.length > 0 ? analysisSessions[analysisSessions.length - 1].scoreBefore : null;

  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const applyEqualHeights = () => {
      if (!leftRef.current || !rightRef.current) return;
      const leftHeight = leftRef.current.getBoundingClientRect().height;
      rightRef.current.style.height = `${leftHeight}px`;
      rightRef.current.style.maxHeight = `${leftHeight}px`;
    };

    applyEqualHeights();
    window.addEventListener('resize', applyEqualHeights);
    return () => window.removeEventListener('resize', applyEqualHeights);
  }, [result, analysisSessions, structuredJd]);

  // Robust auto-scroll to align Step 3 (desktop only)
  useEffect(() => {
    if (!leftRef.current) return;
    // Do not auto-scroll on mobile/tablet (< xl)
    if (window.innerWidth < 1280) return;
    const offset = 160; // adjust 120–200 to taste (distance from top)
    const safeBottom = 140; // generic safety from absolute bottom (px)
    const footerMargin = 24; // keep viewport bottom at least this far above footer top (px)
    const doScroll = () => {
      if (!leftRef.current) return;
      const rect = leftRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const maxTop = Math.max(
        0,
        (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight
      );
      // prevent clamping to absolute bottom so the focal area appears higher
      let bottomClamp = Math.max(0, maxTop - safeBottom);

      // additionally, if a footer exists, ensure viewport bottom stays above it
      const footer = document.querySelector('footer');
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        const footerTopY = (window.pageYOffset || 0) + footerRect.top;
        const maxBeforeFooter = footerTopY - window.innerHeight - footerMargin;
        bottomClamp = Math.min(bottomClamp, Math.max(0, maxBeforeFooter));
      }
      const desired = rect.top + scrollTop - offset;
      let target = Math.min(Math.max(desired, 0), bottomClamp);

      window.scrollTo({ top: target, behavior: 'smooth' });
    };
    // double rAF to wait for layout to settle
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
  }, []);

  return (
    <div id="step3-section" className="animate__animated animate__fadeInUp animate__fast">
      <div className="max-w-6xl mx-auto">
        <div className="relative">
          {isAnalyzing && <SimpleLoader />}
          
          {/* Compact Responsive Layout */}
          <div className="flex flex-col xl:grid xl:grid-cols-[35%_65%] xl:grid-rows-1 xl:items-stretch gap-2 sm:gap-3 lg:gap-4 xl:gap-5">
          {/* Scores Section - Compact sizing */}
          <div ref={leftRef} className="xl:col-span-1 flex flex-col space-y-2 sm:space-y-2.5 lg:space-y-3">
            {/* Main Score Card - Compact padding */}
            <div className="bg-gradient-to-br from-white via-white to-emerald-50/30 rounded-lg sm:rounded-xl lg:rounded-2xl p-2.5 sm:p-3 lg:p-4 xl:p-5 shadow-xl shadow-emerald-500/10 border border-emerald-100/50">
              <AnalysisPanel
                score={result.suitability_score}
                previousScore={previousScore}
                summary={result.summary}
              />
            </div>
            
            {/* Sub Scores Card - Compact styling */}
            <SubScoreBars subScores={result.sub_scores} />
          </div>
          
          {/* CV Coach Section - Compact responsive behavior */}
          <div className="xl:col-span-1 flex min-h-[500px] xl:min-h-0">
            <div ref={rightRef} className="w-full h-full bg-gradient-to-br from-white via-white to-teal-50/30 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl shadow-teal-500/10 border border-teal-100/50 overflow-hidden">
              <CVCoachPanel
                analysisResult={result}
                cvText={cvText}
                structuredJd={structuredJd}
                jdText={jdText}
                onJdTextChange={onJdTextChange}
                onApplySuggestion={onApplySuggestion}
                onReanalyze={onReanalyze}
                onStartOver={onStartOver}
                isAnalyzing={isAnalyzing}
                analysisSessions={analysisSessions}
                onAddImprovementLog={onAddImprovementLog}
              />
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3Analysis;