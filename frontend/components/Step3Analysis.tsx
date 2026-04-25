import React, { useEffect, useRef, useState } from 'react';
import { AnalysisResult, AISuggestion, StructuredJd, ImprovementLog, AnalysisSession } from '../types';
import AnalysisPanel from './AnalysisPanel';
import CVCoachPanel from './CVCoachPanel';
import CoverLetterPanel from './CoverLetterPanel';
import JDPreviewPanel from './JDPreviewPanel';
import { HiArrowPath, HiSparkles, HiDocumentText, HiOutlineClipboardDocumentList, HiPaperAirplane, HiBriefcase } from 'react-icons/hi2';
import MobileActionBar from './MobileActionBar';
import { useLang } from '../hooks/useLang';
import type { TranslationKey } from '../i18n/translations';

type TabKey = 'coach' | 'jd' | 'cover' | 'ats' | 'interview';

interface TabDef {
  key: TabKey;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const TABS: TabDef[] = [
  { key: 'coach', labelKey: 'tab.coach', icon: HiSparkles },
  { key: 'jd', labelKey: 'tab.jd_preview', icon: HiBriefcase },
  { key: 'cover', labelKey: 'tab.cover_letter', icon: HiDocumentText },
  { key: 'ats', labelKey: 'tab.ats', icon: HiOutlineClipboardDocumentList, disabled: true },
  { key: 'interview', labelKey: 'tab.interview', icon: HiPaperAirplane, disabled: true },
];

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
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<TabKey>('coach');
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  if (!result) {
    return (
      <div className="text-center text-gray-500 bg-white p-8 rounded-2xl shadow-lg border border-gray-200/50 max-w-lg mx-auto">
        <h3 className="text-xl font-bold text-gray-800">Analysis Unavailable</h3>
        <p className="mt-2">Something went wrong, and the analysis result could not be displayed.</p>
        <button
          onClick={onStartOver}
          className="mt-6 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
        >
          Start Over
        </button>
      </div>
    );
  }

  const SimpleLoader = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-200/60 via-white/40 to-emerald-100/60 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl z-20 transition-all duration-500 animate__animated animate__fadeIn">
      <div className="group flex items-center gap-4 bg-gradient-to-br from-white/90 via-white/80 to-emerald-50/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/50 hover:shadow-emerald-500/20 transition-all duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-pulse" />
          <HiArrowPath className="relative h-8 w-8 text-white animate-spin" style={{ animationDuration: '1s' }} />
        </div>
        <div className="text-left">
          <p className="font-bold text-xl bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent">
            {t('reanalyze.title')}
          </p>
          <p className="text-sm text-emerald-700/80 mt-1">{t('reanalyze.subtitle')}</p>
          <div className="flex gap-1 mt-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );

  const previousScore = analysisSessions.length > 0 ? analysisSessions[analysisSessions.length - 1].scoreBefore : null;

  // Layout is pure flexbox now — no JS height syncing needed.

  return (
    <div
      id="step3-section"
      className="animate__animated animate__fadeInUp animate__fast pb-20 lg:pb-0 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col"
    >
      <div className="max-w-6xl mx-auto w-full lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
        <div className="relative lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
          {isAnalyzing && <SimpleLoader />}

          <div className="flex flex-col lg:grid lg:grid-cols-[36%_64%] lg:grid-rows-1 lg:items-stretch gap-2 sm:gap-3 lg:gap-4 xl:gap-5 lg:flex-1 lg:min-h-0">
            {/* Left: Scores */}
            <div
              ref={leftRef}
              className="lg:col-span-1 flex flex-col gap-2 sm:gap-2.5 lg:gap-2 animate-soft-rise lg:min-h-0"
              style={{ animationDelay: '60ms' }}
            >
              <div className="liquid-glass rounded-lg sm:rounded-xl lg:rounded-2xl p-2.5 sm:p-3 lg:p-4 xl:p-5 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
                <AnalysisPanel
                  score={result.suitability_score}
                  previousScore={previousScore}
                  summary={result.summary}
                  subScores={result.sub_scores}
                />
              </div>
            </div>

            {/* Right: Tabbed tools */}
            <div className="lg:col-span-1 flex min-h-[420px] sm:min-h-[460px] md:min-h-[500px] lg:min-h-0 animate-soft-rise" style={{ animationDelay: '160ms' }}>
              <div
                ref={rightRef}
                className="liquid-glass w-full h-full flex flex-col rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden"
              >
                {/* Tab bar */}
                <div
                  role="tablist"
                  aria-label="Analysis tools"
                  className="shrink-0 flex items-center gap-1 px-2 pt-2 pb-0 border-b border-slate-200/60 bg-white/40 overflow-x-auto hide-scrollbar"
                >
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key && !tab.disabled;
                    const base =
                      'relative inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap rounded-t-md transition-all';
                    const state = tab.disabled
                      ? 'text-slate-400 cursor-not-allowed'
                      : isActive
                      ? 'text-emerald-700 bg-white border-x border-t border-slate-200/70 -mb-px shadow-sm'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-white/80';
                    return (
                      <button
                        key={tab.key}
                        role="tab"
                        aria-selected={isActive}
                        aria-disabled={tab.disabled || undefined}
                        disabled={tab.disabled}
                        onClick={() => !tab.disabled && setActiveTab(tab.key)}
                        className={`${base} ${state}`}
                      >
                        <Icon className="h-4 w-4" />
                        {t(tab.labelKey)}
                        {tab.disabled && (
                          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            {t('tab.soon')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab panels — all mounted; only active is visible to preserve in-tab state */}
                <div className="flex-1 min-h-0 relative">
                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'coach'}
                    className={`absolute inset-0 ${activeTab === 'coach' ? '' : 'invisible pointer-events-none'}`}
                  >
                    <CVCoachPanel
                      analysisResult={result}
                      cvText={cvText}
                      structuredJd={structuredJd}
                      onApplySuggestion={onApplySuggestion}
                      onReanalyze={onReanalyze}
                      onStartOver={onStartOver}
                      isAnalyzing={isAnalyzing}
                      analysisSessions={analysisSessions}
                      onAddImprovementLog={onAddImprovementLog}
                    />
                  </div>

                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'jd'}
                    className={`absolute inset-0 ${activeTab === 'jd' ? '' : 'invisible pointer-events-none'}`}
                  >
                    <JDPreviewPanel
                      structuredJd={structuredJd}
                      jdText={jdText}
                      onJdTextChange={onJdTextChange}
                    />
                  </div>

                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'cover'}
                    className={`absolute inset-0 overflow-y-auto ${activeTab === 'cover' ? '' : 'invisible pointer-events-none'}`}
                  >
                    <CoverLetterPanel cvText={cvText} jdText={jdText} embedded />
                  </div>

                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'ats'}
                    className={`absolute inset-0 overflow-y-auto ${activeTab === 'ats' ? '' : 'invisible pointer-events-none'}`}
                  >
                    <ComingSoonPanel
                      title={t('coming.ats.title')}
                      description={t('coming.ats.desc')}
                      icon={HiOutlineClipboardDocumentList}
                      badge={t('coming.badge')}
                    />
                  </div>

                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'interview'}
                    className={`absolute inset-0 overflow-y-auto ${activeTab === 'interview' ? '' : 'invisible pointer-events-none'}`}
                  >
                    <ComingSoonPanel
                      title={t('coming.interview.title')}
                      description={t('coming.interview.desc')}
                      icon={HiPaperAirplane}
                      badge={t('coming.badge')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileActionBar
        onReanalyze={onReanalyze}
        onStartOver={onStartOver}
        disabled={isAnalyzing}
      />
    </div>
  );
};

interface ComingSoonProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

const ComingSoonPanel: React.FC<ComingSoonProps> = ({ title, description, icon: Icon, badge }) => (
  <div className="h-full w-full flex flex-col items-center justify-center text-center gap-3 px-6 py-8">
    <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-200/50">
      <Icon className="h-8 w-8 text-emerald-600 icon-float" />
    </div>
    <h4 className="text-lg font-bold text-slate-800 font-headline">{title}</h4>
    <p className="text-sm text-slate-500 max-w-sm">{description}</p>
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
      {badge}
    </span>
  </div>
);

export default Step3Analysis;
