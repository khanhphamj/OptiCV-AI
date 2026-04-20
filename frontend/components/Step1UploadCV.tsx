import React, { useState } from 'react';
import FileUpload from './FileUpload';
import FileStatusDisplay from './FileStatusDisplay';
import {
  HiChevronRight,
  HiSparkles,
  HiChartBar,
  HiArrowTrendingUp,
  HiDocumentText,
  HiCheckCircle,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import { SAMPLE_CV, SAMPLE_CV_FILENAME } from '../utils/sampleData';
import { trackEvent } from '../utils/analytics';
import CoachIcon from './CoachIcon';
import { useLang } from '../hooks/useLang';

export type Step1Mode = 'upload-jd' | 'find-jobs';

interface Step1UploadCVProps {
  onUploadSuccess: (text: string, fileName: string, mode?: Step1Mode) => void;
}

type FeatureKeys = {
  titleKey: 'step1.hero.feature1.title' | 'step1.hero.feature2.title' | 'step1.hero.feature3.title';
  descKey: 'step1.hero.feature1.desc' | 'step1.hero.feature2.desc' | 'step1.hero.feature3.desc';
  icon: React.ComponentType<{ className?: string }>;
};

const FEATURES: FeatureKeys[] = [
  { icon: HiChartBar,     titleKey: 'step1.hero.feature1.title', descKey: 'step1.hero.feature1.desc' },
  { icon: HiArrowTrendingUp, titleKey: 'step1.hero.feature2.title', descKey: 'step1.hero.feature2.desc' },
  { icon: HiDocumentText, titleKey: 'step1.hero.feature3.title', descKey: 'step1.hero.feature3.desc' },
];

const Step1UploadCV: React.FC<Step1UploadCVProps> = ({ onUploadSuccess }) => {
  const { t } = useLang();
  const [fileData, setFileData] = useState<{ text: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUseSample = () => {
    try { trackEvent('sample_cv_used'); } catch {}
    onUploadSuccess(SAMPLE_CV, SAMPLE_CV_FILENAME);
  };

  const handleFileParsed = (text: string, name: string, size: number) => {
    setFileData({ text, name, size });
    setError(null);
  };

  const handleRemoveFile = () => {
    setFileData(null);
    setError(null);
  };

  const handleProceed = (mode: Step1Mode = 'upload-jd') => {
    setError(null);
    if (fileData) onUploadSuccess(fileData.text, fileData.name, mode);
  };

  const isProceedDisabled = !fileData;

  return (
    <div className="w-full max-w-2xl lg:max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 lg:gap-4">
      {/* LEFT — Upload form */}
      <section
        className="liquid-glass-soft rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 lg:p-5 flex flex-col animate-soft-rise"
        style={{ animationDelay: '40ms' }}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            <HiSparkles className="h-3.5 w-3.5" /> {t('step1.eyebrow')}
          </span>
          <h2 className="mt-2 text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 font-headline text-gradient-emerald">
            {t('step1.title')}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            {t('step1.subtitle')}
          </p>
        </div>

        <div className="mt-3 lg:mt-3 flex-1 flex flex-col gap-2.5">
          {!fileData ? (
            <FileUpload
              onUploadSuccess={handleFileParsed}
              onUploadStart={() => setError(null)}
              onUploadError={setError}
            />
          ) : (
            <FileStatusDisplay
              fileName={fileData.name}
              statusText={t('step1.ready')}
              onRemove={handleRemoveFile}
              fileSize={fileData.size}
            />
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-2 rounded-md border border-red-200 flex items-center gap-2 animate-reveal">
              <span role="img" aria-label="Warning icon">⚠️</span>
              <span><strong>Error:</strong> {error}</span>
            </div>
          )}
        </div>

        <div className="mt-3 sm:mt-4 lg:mt-3 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col sm:flex-row items-stretch gap-2">
            <button
              onClick={() => handleProceed('upload-jd')}
              disabled={isProceedDisabled}
              className="btn-sheen flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-emerald-500/25 border border-white/20 hover:from-emerald-500 hover:to-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none group"
            >
              <HiDocumentText className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t('step1.mode_have_jd')}</span>
              <HiChevronRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => handleProceed('find-jobs')}
              disabled={isProceedDisabled}
              className="btn-sheen flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-emerald-500 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-emerald-700 shadow-md hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 transition-all duration-200 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed group"
            >
              <HiMagnifyingGlass className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t('step1.mode_find_jobs')}</span>
            </button>
          </div>

          {!fileData && (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-px w-6 bg-slate-200" />
                <span>{t('step1.or')}</span>
                <span className="h-px w-6 bg-slate-200" />
              </div>
              <button
                type="button"
                onClick={handleUseSample}
                className="btn-sheen inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 active:scale-95 transition"
              >
                <HiSparkles className="h-4 w-4 text-emerald-500" />
                {t('step1.sample')}
              </button>
            </>
          )}
        </div>
      </section>

      {/* RIGHT — Hero / showcase (hidden on small screens) */}
      <aside
        className="liquid-glass-soft relative hidden lg:flex flex-col rounded-3xl p-5 overflow-hidden animate-soft-rise"
        style={{ animationDelay: '140ms' }}
      >
        {/* Decorative gradient blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-400/40 to-teal-500/30 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-400/20 blur-2xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <CoachIcon className="w-12 h-12 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">{t('step1.hero.eyebrow')}</p>
            <h3 className="text-lg font-bold text-slate-900 font-headline leading-tight">
              {t('step1.hero.title')}
            </h3>
          </div>
        </div>

        <ul className="relative z-10 mt-4 space-y-2.5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.titleKey} className="flex items-start gap-2.5">
                <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{t(f.titleKey)}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">{t(f.descKey)}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="relative z-10 mt-auto pt-3 flex items-center gap-2 text-[11px] text-slate-500 border-t border-slate-200/60">
          <HiCheckCircle className="h-3.5 w-3.5 text-emerald-600" />
          <span>{t('step1.hero.privacy')}</span>
        </div>
      </aside>
    </div>
  );
};

export default Step1UploadCV;
