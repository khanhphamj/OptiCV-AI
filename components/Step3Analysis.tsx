

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
    <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-20 transition-opacity duration-300 animate__animated animate__fadeIn">
        <div className="flex items-center gap-3 bg-white/70 backdrop-blur-lg p-4 rounded-2xl shadow-lg border border-white/30">
            <HiArrowPath className="h-6 w-6 text-emerald-600 animate-spin" />
            <div className="text-left">
                <p className="font-bold text-lg text-emerald-800">Re-analyzing...</p>
                <p className="text-sm text-emerald-700">Updating your score based on your edits.</p>
            </div>
        </div>
    </div>
  );

  const previousScore = analysisSessions.length > 0 ? analysisSessions[analysisSessions.length - 1].scoreBefore : null;

  return (
    <div className="animate__animated animate__fadeInUp animate__fast">
      <div className="relative">
        {isAnalyzing && <SimpleLoader />}
        
        {/* Mobile-First Responsive Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-2 lg:gap-8">
          {/* Scores Section - Full width on mobile, left column on desktop */}
          <div className="lg:col-span-5 space-y-4 lg:space-y-8">
              <div className="bg-white rounded-xl lg:rounded-2xl p-3 lg:p-6 shadow-xl shadow-emerald-500/10 border border-gray-200/30">
                   <AnalysisPanel
                      score={result.suitability_score}
                      previousScore={previousScore}
                      summary={result.overall_summary}
                  />
              </div>
               <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg shadow-gray-500/5 border border-gray-200/30">
                  <SubScoreBars subScores={result.sub_scores} />
              </div>
          </div>
          
          {/* CV Coach Section - Full width on mobile, right column on desktop */}
          <div className="lg:col-span-7 relative min-h-[90vh] lg:h-[85vh] lg:h-auto">
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
  );
};

export default Step3Analysis;