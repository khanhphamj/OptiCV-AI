import React, { useState } from 'react';
import FileUpload from './FileUpload';
import {
  HiCheck,
  HiChevronLeft,
  HiSparkles,
  HiPencil,
  HiDocumentArrowUp,
  HiLightBulb,
  HiArrowLongRight,
} from 'react-icons/hi2';
import FileStatusDisplay from './FileStatusDisplay';
import LottieAnimation from './LottieAnimation';
import { SAMPLE_JD } from '../utils/sampleData';
import { trackEvent } from '../utils/analytics';
import { useLang } from '../hooks/useLang';

interface Step2UploadJDProps {
  onUploadSuccess: (text: string, fileName: string) => void;
  onBack: () => void;
  cvFileName: string;
}

const Step2UploadJD: React.FC<Step2UploadJDProps> = ({ onUploadSuccess, onBack, cvFileName }) => {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [pastedJd, setPastedJd] = useState('');
  const [fileData, setFileData] = useState<{ text: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileParsed = (text: string, name: string, size: number) => {
    setFileData({ text, name, size });
    setError(null);
  };

  const handleRemoveFile = () => {
    setFileData(null);
    setError(null);
  };

  const handleAnalyze = () => {
    setError(null);
    if (activeTab === 'paste') {
      if (pastedJd.trim().length < 50) {
        setError(t('step2.min_error'));
        return;
      }
      onUploadSuccess(pastedJd, 'Pasted Job Description');
    } else if (fileData) {
      onUploadSuccess(fileData.text, fileData.name);
    }
  };

  const isAnalyzeDisabled =
    (activeTab === 'paste' && pastedJd.trim().length < 50) || (activeTab === 'upload' && !fileData);

  const tips = [t('step2.hero.tip1'), t('step2.hero.tip2'), t('step2.hero.tip3'), t('step2.hero.tip4')];

  return (
    <div className="w-full max-w-2xl lg:max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 lg:gap-4 lg:h-full lg:min-h-0">
      {/* LEFT — Form */}
      <section
        className="liquid-glass-soft rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 lg:p-5 flex flex-col animate-soft-rise lg:min-h-0 lg:max-h-full"
        style={{ animationDelay: '40ms' }}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            <HiSparkles className="h-3.5 w-3.5" /> {t('step2.eyebrow')}
          </span>
          <h2 className="mt-2 text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 font-headline text-gradient-emerald">
            {t('step2.title')}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">{t('step2.subtitle')}</p>
        </div>

        <div className="mt-3 lg:mt-3 space-y-2.5 sm:space-y-3 lg:space-y-2.5 flex-1 flex flex-col">
          {/* CV banner */}
          <div className="bg-slate-100/80 border border-slate-200/80 rounded-xl p-2 sm:p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="bg-emerald-100 p-1.5 rounded-full shrink-0">
                  <HiCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {t('step2.cv_label')}: <span className="font-normal">{cvFileName}</span>
                </p>
              </div>
              <button
                onClick={onBack}
                className="text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors shrink-0"
              >
                {t('step2.change_cv')}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => { setActiveTab('paste'); setError(null); }}
              className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                activeTab === 'paste' ? 'bg-white text-emerald-700 shadow' : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <HiPencil className="h-4 w-4" />
              {t('step2.tab_paste')}
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setError(null); }}
              className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                activeTab === 'upload' ? 'bg-white text-emerald-700 shadow' : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <HiDocumentArrowUp className="h-4 w-4" />
              {t('step2.tab_upload')}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 lg:min-h-[120px]">
            {activeTab === 'paste' ? (
              <div className="relative h-full">
                <textarea
                  value={pastedJd}
                  onChange={(e) => setPastedJd(e.target.value)}
                  placeholder={t('step2.placeholder')}
                  className="w-full h-full p-2.5 sm:p-3 md:p-3 bg-slate-50 text-gray-800 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-inner hide-scrollbar resize-none min-h-40 sm:min-h-48 md:min-h-52 lg:min-h-0 overflow-auto"
                />
                <span className="absolute bottom-2.5 right-2.5 text-xs text-gray-500 bg-white/70 backdrop-blur-sm px-1.5 rounded">
                  {pastedJd.trim().length} {t('step2.chars')}
                </span>
                {pastedJd.trim().length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPastedJd(SAMPLE_JD);
                      setError(null);
                      try { trackEvent('sample_jd_used'); } catch {}
                    }}
                    className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white/90 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 active:scale-95 transition"
                  >
                    <HiSparkles className="h-3.5 w-3.5" />
                    {t('step2.sample')}
                  </button>
                )}
              </div>
            ) : (
              <div>
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
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-2 rounded-md border border-red-200 animate-reveal">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 sm:mt-4 lg:mt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-gray-800 shadow-sm border border-slate-300/50 hover:bg-slate-300 active:scale-95 transition"
          >
            <HiChevronLeft className="h-4 w-4" />
            {t('step2.back')}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzeDisabled}
            className="btn-sheen group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 sm:px-7 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-emerald-500/25 border border-white/20 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300"
          >
            <LottieAnimation
              animationPath="/animations/sparkles-loop-loader.json"
              className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-20 transition-opacity"
            />
            <span className="relative z-10 flex items-center gap-2">
              <HiSparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('step2.analyze')}
            </span>
          </button>
        </div>
      </section>

      {/* RIGHT — Tips hero */}
      <aside
        className="liquid-glass relative hidden lg:flex flex-col rounded-3xl p-5 overflow-hidden animate-soft-rise lg:min-h-0 lg:max-h-full"
        style={{ animationDelay: '140ms' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-amber-300/40 to-orange-400/25 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-gradient-to-br from-teal-400/30 to-emerald-400/20 blur-2xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-orange-500/30">
            <HiLightBulb className="h-5 w-5 text-white icon-float" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Pro tips</p>
            <h3 className="text-lg font-bold text-slate-900 font-headline leading-tight">
              {t('step2.hero.title')}
            </h3>
          </div>
        </div>

        <ul className="relative z-10 mt-4 space-y-3 flex-1">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[11px] font-bold flex items-center justify-center shadow-md shadow-emerald-500/30">
                {i + 1}
              </div>
              <p className="text-sm text-slate-700 leading-snug">{tip}</p>
            </li>
          ))}
        </ul>

        <div className="relative z-10 mt-auto pt-3 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-200/60">
          <HiArrowLongRight className="h-4 w-4 text-emerald-600" />
          <span>{t('step2.hero.footer')}</span>
        </div>
      </aside>
    </div>
  );
};

export default Step2UploadJD;
