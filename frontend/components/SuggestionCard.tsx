import React, { useState } from 'react';
import { AISuggestion } from '../types';
import { HiCheck, HiXMark, HiSparkles } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onApply: (suggestion: AISuggestion) => void;
  onReject: (suggestion: AISuggestion) => void;
  /** When true, render without the outer rounded border/shadow so the card can
   *  sit inside a parent group container (used for stacking multiple cards). */
  bare?: boolean;
  /** Optional 1-based index shown as a subtle counter chip in the eyebrow when
   *  the card is part of a multi-suggestion group. */
  index?: number;
  total?: number;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onApply,
  onReject,
  bare = false,
  index,
  total,
}) => {
  const { t } = useLang();
  const [actionTaken, setActionTaken] = useState<'apply' | 'reject' | null>(null);

  const handleApply = () => {
    setActionTaken('apply');
    onApply(suggestion);
  };

  const handleReject = () => {
    setActionTaken('reject');
    onReject(suggestion);
  };

  const containerClass = bare
    ? 'bg-white overflow-hidden'
    : 'rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04] overflow-hidden my-1';

  return (
    <div className={containerClass}>
      {/* Eyebrow */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-emerald-700">
          <HiSparkles className="h-3.5 w-3.5" />
          {t('coach.suggestion.eyebrow')}
        </span>
        {typeof index === 'number' && typeof total === 'number' && total > 1 && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/70 tabular-nums">
            {index}/{total}
          </span>
        )}
      </div>

      {/* Diff */}
      <div className="px-3.5 pb-3 space-y-2">
        <div className="relative pl-3">
          <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-rose-300" />
          <p className="text-[10px] font-bold tracking-wider uppercase text-rose-600/90">
            {t('coach.suggestion.before')}
          </p>
          <p className="mt-1 text-sm text-slate-700 line-through decoration-rose-300/80 leading-relaxed">
            {suggestion.original}
          </p>
        </div>
        <div className="relative pl-3">
          <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-emerald-400" />
          <p className="text-[10px] font-bold tracking-wider uppercase text-emerald-700">
            {t('coach.suggestion.after')}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 leading-relaxed">
            {suggestion.replacement}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3.5 py-2.5 bg-slate-50/70 border-t border-slate-200/70 flex items-center justify-end gap-2">
        <button
          onClick={handleReject}
          disabled={!!actionTaken}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition disabled:cursor-default ${
            actionTaken === 'reject'
              ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
              : actionTaken === 'apply'
              ? 'bg-white text-slate-400 ring-1 ring-inset ring-slate-200 opacity-60'
              : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200'
          }`}
        >
          <HiXMark className="h-4 w-4" />
          {actionTaken === 'reject' ? t('coach.suggestion.rejected') : t('coach.suggestion.reject')}
        </button>
        <button
          onClick={handleApply}
          disabled={!!actionTaken}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition disabled:cursor-default ${
            actionTaken === 'apply'
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
              : actionTaken === 'reject'
              ? 'bg-emerald-600/40 text-white opacity-60'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]'
          }`}
        >
          <HiCheck className="h-4 w-4" />
          {actionTaken === 'apply' ? t('coach.suggestion.applied') : t('coach.suggestion.apply')}
        </button>
      </div>
    </div>
  );
};

export default SuggestionCard;
