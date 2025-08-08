

import React from 'react';
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

  return (
    <div className="animate__animated animate__fadeInUp animate__fast">
      <div className="relative">
        {isAnalyzing && <SimpleLoader />}
        
        {/* Wide Responsive Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-1 gap-4 lg:gap-6 lg:h-fit">
          {/* Scores Section - Wider layout */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            {/* Main Score Card - Compact for wider layout */}
            <div className="bg-gradient-to-br from-white via-white to-emerald-50/30 rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-2xl shadow-emerald-500/10 border border-emerald-100/50">
              <AnalysisPanel
                score={result.suitability_score}
                previousScore={previousScore}
                summary={result.summary}
              />
            </div>
            
            {/* Sub Scores Card - Compact styling */}
            <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-xl shadow-slate-500/5 border border-slate-200/50">
              <SubScoreBars subScores={result.sub_scores} />
            </div>
          </div>
          
          {/* CV Coach Section - Fixed height to force internal scrolling */}
          <div className="lg:col-span-8 relative">
            <div className="h-[600px] lg:h-[700px] xl:h-[750px] w-full bg-gradient-to-br from-white via-white to-teal-50/30 rounded-2xl lg:rounded-3xl shadow-2xl shadow-teal-500/10 border border-teal-100/50 overflow-hidden">
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
  );
};

export default Step3Analysis;