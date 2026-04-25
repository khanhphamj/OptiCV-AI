import React from 'react';
import {
  HiChevronLeft,
  HiSparkles,
  HiMapPin,
  HiBuildingOffice2,
  HiArrowTopRightOnSquare,
  HiExclamationTriangle,
  HiAcademicCap,
  HiCheckCircle,
} from 'react-icons/hi2';
import { JobMatch } from '../types';
import { useLang } from '../hooks/useLang';
import { useCountUp } from '../hooks/useCountUp';
import type { TranslationKey } from '../i18n/translations';
import LoadingAnalysis from './LoadingAnalysis';

interface Step3JobMatchesProps {
  matches: JobMatch[];
  isLoading: boolean;
  loadingStage: 'searching' | 'matching' | null;
  locationLabel: string;
  query: string;
  error?: string | null;
  onBack: () => void;
  onPickJob: (match: JobMatch) => void;
  onRetry: () => void;
  matchThreshold?: number;
}

const getScoreStyle = (score: number): { bar: string; text: string; labelKey: TranslationKey } => {
  if (score >= 85) return { bar: 'from-emerald-500 to-teal-500', text: 'text-emerald-700', labelKey: 'find_jobs.matches.score.excellent' };
  if (score >= 70) return { bar: 'from-emerald-400 to-teal-400', text: 'text-emerald-600', labelKey: 'find_jobs.matches.score.good' };
  if (score >= 50) return { bar: 'from-amber-400 to-orange-400', text: 'text-amber-700', labelKey: 'find_jobs.matches.score.needs_work' };
  return { bar: 'from-rose-400 to-red-500', text: 'text-rose-700', labelKey: 'find_jobs.matches.score.poor' };
};

const Step3JobMatches: React.FC<Step3JobMatchesProps> = ({
  matches,
  isLoading,
  loadingStage,
  locationLabel,
  query,
  error,
  onBack,
  onPickJob,
  onRetry,
  matchThreshold = 70,
}) => {
  const { t } = useLang();

  if (isLoading) {
    return (
      <LoadingAnalysis
        stage={loadingStage === 'searching' ? 'job_search' : 'job_matching'}
        onCancel={onBack}
        onComplete={() => {}}
      />
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto liquid-glass-soft rounded-3xl p-6 sm:p-8 text-center animate-soft-rise">
        <HiExclamationTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="mt-3 text-xl font-bold text-slate-900 font-headline">
          {t('find_jobs.matches.error.title')}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-300 transition"
          >
            <HiChevronLeft className="h-4 w-4" />
            {t('find_jobs.matches.error.back')}
          </button>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
          >
            {t('find_jobs.matches.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto liquid-glass-soft rounded-3xl p-6 sm:p-8 text-center animate-soft-rise">
        <HiExclamationTriangle className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="mt-3 text-xl font-bold text-slate-900 font-headline">
          {t('find_jobs.matches.empty.title')}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {t('find_jobs.matches.empty.subtitle')}
        </p>
        <div className="mt-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
          >
            <HiChevronLeft className="h-4 w-4" />
            {t('find_jobs.matches.empty.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col lg:h-full lg:min-h-0">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            <HiSparkles className="h-3.5 w-3.5" /> {matches.length} {t('find_jobs.matches.header.jd_count_suffix')} · {locationLabel}
          </span>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 font-headline">
            {t('find_jobs.matches.header.title')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{t('find_jobs.matches.header.query_label')}: {query}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-slate-300 transition"
          >
            <HiChevronLeft className="h-3.5 w-3.5" />
            {t('find_jobs.matches.header.back_short')}
          </button>
        </div>
      </header>

      <div className="liquid-glass-soft rounded-2xl p-3 lg:flex-1 lg:min-h-0 lg:overflow-auto animate-soft-rise">
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matches.map((match, index) => (
            <MatchCard
              key={match.url}
              match={match}
              index={index}
              matchThreshold={matchThreshold}
              onPickJob={onPickJob}
              t={t}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

interface MatchCardProps {
  match: JobMatch;
  index: number;
  matchThreshold: number;
  onPickJob: (match: JobMatch) => void;
  t: (key: TranslationKey) => string;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, index, matchThreshold, onPickJob, t }) => {
  const style = getScoreStyle(match.match_score);
  const isLowMatch = match.match_score < matchThreshold;
  // Count-up + bar fill start after the card's staggered entrance so the
  // motion feels intentional: card slides in → score rolls up → bar fills.
  const entranceDelay = index * 70;
  const animatedScore = useCountUp(match.match_score, 900, entranceDelay + 200);

  // Per-card initial tilt — alternates sign and varies magnitude so the deal
  // feels human, not stamped. Seeded by index so the visual is stable per render.
  const dealRot = ((index % 2 === 0 ? -1 : 1) * (6 + ((index * 37) % 10))).toFixed(1) + 'deg';

  return (
    <li
      className="relative bg-white/85 border border-slate-200/70 rounded-xl p-3 flex flex-col shadow-sm hover:shadow-lg hover:border-emerald-300 hover:-translate-y-0.5 transition-[transform,box-shadow,border-color] duration-200 animate-card-deal"
      style={{
        animationDelay: `${entranceDelay}ms`,
        animationFillMode: 'both',
        ['--deal-rot' as string]: dealRot,
      } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
            {match.title || t('find_jobs.matches.card.untitled')}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
            {match.company && (
              <span className="inline-flex items-center gap-1">
                <HiBuildingOffice2 className="h-3 w-3" />
                {match.company}
              </span>
            )}
            {match.location && (
              <span className="inline-flex items-center gap-1">
                <HiMapPin className="h-3 w-3" />
                {match.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <HiBuildingOffice2 className="h-3 w-3" />
              {match.source}
            </span>
          </div>
        </div>
        <div className={`flex flex-col items-end shrink-0 ${style.text}`}>
          <span className="text-xl font-bold leading-none tabular-nums">{animatedScore}%</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold">{t(style.labelKey)}</span>
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
        <div
          className={`h-full bg-gradient-to-r ${style.bar}`}
          style={{
            width: `${Math.min(animatedScore, 100)}%`,
            transition: 'width 120ms linear',
          }}
        />
        {/* Sheen sweep — plays once as the bar fills */}
        <div
          className="absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: '30%',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
            animation: `bar-sheen 1.6s cubic-bezier(.22,.61,.36,1) ${entranceDelay + 300}ms both`,
          }}
        />
      </div>

      {match.match_reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12px] text-slate-700">
          {match.match_reasons.slice(0, 2).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <HiCheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{r}</span>
            </li>
          ))}
        </ul>
      )}

      {match.skill_gaps.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {match.skill_gaps.slice(0, 3).map((gap, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-medium"
            >
              {t('find_jobs.matches.card.missing_prefix')}: {gap}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <a
          href={match.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-700 transition"
        >
          <HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
          {t('find_jobs.matches.card.view_source')}
        </a>
        <button
          onClick={() => onPickJob(match)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow transition active:scale-95 ${
            isLowMatch
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
          }`}
        >
          {isLowMatch ? (
            <>
              <HiAcademicCap className="h-3.5 w-3.5" />
              {t('find_jobs.matches.card.action_coach')}
            </>
          ) : (
            <>
              <HiSparkles className="h-3.5 w-3.5" />
              {t('find_jobs.matches.card.action_analyze')}
            </>
          )}
        </button>
      </div>
    </li>
  );
};

export default Step3JobMatches;
