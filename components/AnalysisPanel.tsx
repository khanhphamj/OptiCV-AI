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
const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
    const { text, stroke } = getScoreColorClasses(score);
    const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

    return (
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto">
            <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
                <circle cx="22" cy="22" r="20" fill="none" strokeWidth="3" className="stroke-slate-200" />
                <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    className={`transition-all duration-1000 ease-in-out ${stroke}`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-numeric text-3xl sm:text-5xl lg:text-6xl font-bold ${text}`}>
                    {score}
                </span>
                <span className="text-xs sm:text-sm font-medium text-gray-500 -mt-1">/ 100</span>
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
      <span className={`inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-slate-200 transition-all duration-300 ${className}`}>
        <HiSparkles className="w-4 h-4" /> Initial Analysis
      </span>
    );

  if (current === previous)
    return (
      <span className={`inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-slate-200 transition-all duration-300 ${className}`}>
        <HiArrowLongRight className="w-4 h-4" /> No Change
      </span>
    );

  const diffPct = Math.abs(current - previous);
  const positive = current > previous;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-all duration-300 animate__animated animate__bounceIn
        ${positive 
          ? 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-200' 
          : 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200'
        } ${className}`}
    >
      {positive ? <HiArrowTrendingUp className="w-4 h-4" /> : <HiArrowTrendingDown className="w-4 h-4" />}
      {positive ? '+' : ''}{diffPct} pts {positive ? 'Improvement' : 'Decline'}
    </span>
  );
};

/* -------------------------------------------
   Main Analysis Panel
--------------------------------------------*/
const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ score, previousScore, summary }) => {
  return (
    <div className="flex flex-col items-center text-center space-y-2.5 lg:space-y-3">
      <ScoreCircle score={score} />

      <div className="space-y-3 w-full">
        <h3 tabIndex={0} className="font-headline text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent tracking-tight">
          Overall Match Score
        </h3>

        <div className="space-y-2.5">
          <ScoreStatus score={score} />
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-3 lg:p-4 rounded-2xl border border-slate-200/60 shadow-inner text-left">
            <div className="flex items-start gap-2.5 mb-2">
              <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg shadow-md flex-shrink-0">
                <HiSparkles className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-semibold text-slate-800 text-base lg:text-lg m-0">AI Analysis Summary</h4>
            </div>

            <div className="relative pl-11">
              <p className="text-gray-700 leading-relaxed text-sm lg:text-base m-0" title={summary}>
                {summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <ModernImprovementBadge current={score} previous={previousScore} />
        
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-sm font-medium text-emerald-700 rounded-full border border-emerald-200/50 shadow-sm">
          <HiSparkles className="h-4 w-4" />
          Powered by GPT-4.1-mini
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;