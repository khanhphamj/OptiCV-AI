import React, { useState } from 'react';
import { AISuggestion } from '../types';
import { HiCheck, HiXMark } from 'react-icons/hi2';


interface SuggestionCardProps {
  suggestion: AISuggestion;
  onApply: (suggestion: AISuggestion) => void;
  onReject: (suggestion: AISuggestion) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onApply, onReject }) => {
    const [actionTaken, setActionTaken] = useState<'apply' | 'reject' | null>(null);

    const handleApply = () => {
        setActionTaken('apply');
        onApply(suggestion);
    };

    const handleReject = () => {
        setActionTaken('reject');
        onReject(suggestion);
    };

    return (
        <div className="bg-white border border-gray-200/80 rounded-lg p-3 my-2 shadow-md shadow-gray-500/5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">AI Suggestion</p>
            <div className="space-y-2 text-sm">
                <div>
                    <p className="font-medium text-red-600 line-through decoration-red-400/80 bg-red-50 p-2 rounded-md">- {suggestion.original}</p>
                </div>
                <div>
                    <p className="font-medium text-green-700 bg-green-50/80 p-2 rounded-md">+ {suggestion.replacement}</p>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
                 {actionTaken !== 'apply' && (
                    <button
                        onClick={handleReject}
                        disabled={!!actionTaken}
                        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200
                            ${actionTaken === 'reject' 
                                ? 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200'
                                : 'bg-white text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 hover:text-red-700 hover:ring-red-300'
                            }
                            disabled:opacity-100 disabled:cursor-default
                        `}
                    >
                        <HiXMark className="h-4 w-4" />
                        {actionTaken === 'reject' ? 'Rejected' : 'Reject'}
                    </button>
                 )}
                {actionTaken !== 'reject' && (
                    <button
                        onClick={handleApply}
                        disabled={!!actionTaken}
                        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white transition-all duration-200
                            ${actionTaken === 'apply'
                                ? 'bg-emerald-100 !text-emerald-700 ring-1 ring-inset ring-emerald-200'
                                : 'bg-emerald-600 shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600'
                            }
                           disabled:opacity-100 disabled:cursor-default
                        `}
                    >
                        <HiCheck className="h-4 w-4" />
                        {actionTaken === 'apply' ? 'Applied' : 'Apply Change'}
                    </button>
                 )}
            </div>
        </div>
    );
}

export default SuggestionCard;