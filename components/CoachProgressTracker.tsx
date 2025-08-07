
import React from 'react';
import { AnalysisSession } from '../types';
import { HiCheckCircle, HiChevronDown, HiClock, HiArrowTrendingUp, HiArrowTrendingDown, HiPencilSquare } from 'react-icons/hi2/';

interface CoachProgressTrackerProps {
  sessions: AnalysisSession[];
  isExpanded: boolean;
  onToggle: () => void;
}

const ScoreChangeBadge: React.FC<{ before: number | null, after: number }> = ({ before, after }) => {
    if (before === null) {
        return <span className="text-sm font-semibold text-slate-700">Initial Score: {after}</span>;
    }

    const diff = after - before;
    const isPositive = diff > 0;
    const isNeutral = diff === 0;

    if (isNeutral) {
        return <span className="text-sm font-semibold text-slate-700">{before} → {after} (No Change)</span>;
    }
    
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    const Icon = isPositive ? HiArrowTrendingUp : HiArrowTrendingDown;

    return (
        <div className={`flex items-center gap-1 text-sm font-semibold ${colorClass}`}>
            <Icon className="w-4 h-4" />
            <span>{before} → {after} ({diff > 0 ? '+' : ''}{diff} pts)</span>
        </div>
    );
};

const CoachProgressTracker: React.FC<CoachProgressTrackerProps> = ({ sessions, isExpanded, onToggle }) => {
  const allImprovementsCount = sessions.reduce((acc, s) => acc + s.improvements.length, 0);

  // Hide the component if it's just the initial analysis with no changes yet.
  if (sessions.length === 0 || (sessions.length <= 1 && allImprovementsCount === 0)) {
    return null;
  }
  
  return (
    <div className="border-b border-slate-200">
      <button
        onClick={onToggle}
        className="w-full p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors duration-200"
        aria-expanded={isExpanded}
        aria-controls="improvement-history"
      >
        <div className="flex justify-between items-center">
          <p className="text-sm font-semibold text-gray-800">Change History</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-600">
              {allImprovementsCount} {allImprovementsCount === 1 ? 'update' : 'updates'}
            </p>
            <HiChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      <div
        id="improvement-history"
        className={`transition-all duration-500 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <div className="p-4 space-y-4 bg-white max-h-64 overflow-y-auto hide-scrollbar">
              {[...sessions].reverse().map((session, index, arr) => {
                  // Hide the last session (initial run) if it had no improvements.
                  if (index === arr.length - 1 && session.improvements.length === 0) {
                      return null;
                  }

                  return (
                      <div key={session.id} className="relative pl-8 pb-4 last:pb-0">
                          { index !== arr.length -1 && (
                            <div className="absolute left-3 top-7 h-full w-0.5 bg-slate-200" />
                          )}
                          <div className="absolute left-0 top-1">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-white">
                                  <HiPencilSquare className="h-4 w-4 text-emerald-600" />
                              </span>
                          </div>
                         
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm font-bold text-gray-800">
                                  Analysis Run #{sessions.length - index}
                              </p>
                              <ScoreChangeBadge before={session.scoreBefore} after={session.scoreAfter} />
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <HiClock className="w-3 h-3"/>
                              <span>{session.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className="mt-2 pl-1 space-y-1">
                              {session.improvements.length > 0 ? (
                                  session.improvements.map(log => (
                                      <div key={log.id} className="flex items-center gap-2 text-sm text-gray-700">
                                          <HiCheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                          <span>{log.taskName} improvement applied.</span>
                                      </div>
                                  ))
                              ) : (
                                  <p className="text-sm text-gray-500 italic">No changes applied in this run.</p>
                              )}
                          </div>
                      </div>
                  );
              })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CoachProgressTracker;
