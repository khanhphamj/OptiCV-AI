import React, { useMemo, useState } from 'react';
import {
  HiDocumentText,
  HiOutlineClipboardDocumentList,
  HiDocumentArrowDown,
  HiSparkles,
  HiArrowPath,
  HiCheckCircle,
} from 'react-icons/hi2';
import { generateCoverLetter, downloadCoverLetterDocx } from '../services/openAIService';
import { CoverLetterTone } from '../types';
import { useLang } from '../hooks/useLang';
import type { TranslationKey } from '../i18n/translations';

interface CoverLetterPanelProps {
  cvText: string;
  jdText: string;
  /** When true, skip the outer card shell (used inside a tab panel that provides its own card). */
  embedded?: boolean;
}

const TONE_DEFS: { value: CoverLetterTone; labelKey: TranslationKey; hintKey: TranslationKey }[] = [
  { value: 'professional', labelKey: 'tone.professional', hintKey: 'tone.professional.hint' },
  { value: 'enthusiastic', labelKey: 'tone.enthusiastic', hintKey: 'tone.enthusiastic.hint' },
  { value: 'concise',      labelKey: 'tone.concise',      hintKey: 'tone.concise.hint' },
  { value: 'friendly',     labelKey: 'tone.friendly',     hintKey: 'tone.friendly.hint' },
  { value: 'formal',       labelKey: 'tone.formal',       hintKey: 'tone.formal.hint' },
];

const BULLET_KEYS: TranslationKey[] = ['cl.bullet1', 'cl.bullet2', 'cl.bullet3', 'cl.bullet4'];

const CoverLetterPanel: React.FC<CoverLetterPanelProps> = ({ cvText, jdText, embedded = false }) => {
  const { t } = useLang();
  const [tone, setTone] = useState<CoverLetterTone>('professional');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ready = cvText.trim().length >= 20 && jdText.trim().length >= 20;
  const disabled = loading || !ready;

  const metrics = useMemo(() => {
    const trimmed = letter.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = trimmed.length;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).length : 0;
    const readMin = Math.max(1, Math.round(words / 200));
    return { words, chars, paragraphs, readMin };
  }, [letter]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const result = await generateCoverLetter(cvText, jdText, tone);
      setLetter(result.letter);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('cl.error_generate'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadDocx = async () => {
    if (!letter || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadCoverLetterDocx(letter, 'cover-letter');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cover-letter.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('cl.error_docx'));
    } finally {
      setDownloading(false);
    }
  };

  const activeTone = TONE_DEFS.find((td) => td.value === tone)!;

  const wrapperClass = embedded
    ? 'w-full h-full flex flex-col p-3 sm:p-4 lg:p-5'
    : 'mt-4 sm:mt-5 lg:mt-6 animate-soft-rise bg-gradient-to-br from-white via-white to-emerald-50/40 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 xl:p-6 shadow-xl shadow-emerald-500/10 border border-emerald-100/60';

  return (
    <section className={wrapperClass}>
      {/* ─────── Header ─────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md shrink-0">
            <HiDocumentText className="h-5 w-5 text-white icon-float" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gradient-emerald font-headline truncate">
              {t('cl.title')}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {t('cl.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <label htmlFor="cover-letter-tone" className="text-sm font-medium text-gray-700">
            {t('cl.tone')}
          </label>
          <select
            id="cover-letter-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as CoverLetterTone)}
            disabled={loading}
            title={t(activeTone.hintKey)}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100"
          >
            {TONE_DEFS.map((td) => (
              <option key={td.value} value={td.value}>
                {t(td.labelKey)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled}
            className={`btn-sheen inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-transform duration-200 active:scale-95 ${loading ? 'is-loading' : ''}`}
          >
            {loading ? (
              <>
                <HiArrowPath className="h-4 w-4 animate-spin" /> {t('cl.generating')}
              </>
            ) : letter ? (
              <>
                <HiArrowPath className="h-4 w-4" /> {t('cl.regenerate')}
              </>
            ) : (
              <>
                <HiSparkles className="h-4 w-4" /> {t('cl.generate')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tone hint — subtitle below header */}
      <p className="text-[11px] text-slate-500 mb-3">
        <span className="font-semibold text-emerald-700">{t(activeTone.labelKey)}</span>
        <span className="mx-1.5 text-slate-300">•</span>
        {t(activeTone.hintKey)}
      </p>

      {/* ─────── Not ready state ─────── */}
      {!ready && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-500 italic text-center px-4">
            {t('cl.not_ready')}
          </p>
        </div>
      )}

      {/* ─────── Error ─────── */}
      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 animate-reveal">
          {error}
        </div>
      )}

      {/* ─────── Loading state ─────── */}
      {loading && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 animate-reveal">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 animate-ping opacity-40" />
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <HiArrowPath className="h-6 w-6 text-white animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800">{t('cl.loading_title')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('cl.loading_subtitle')}</p>
          </div>
        </div>
      )}

      {/* ─────── Empty preview (ready, no letter yet) ─────── */}
      {ready && !letter && !loading && !error && (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-3 animate-reveal">
          {/* Left: what you'll get */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/60 border border-emerald-200/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <HiSparkles className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-800">{t('cl.you_get')}</h4>
            </div>
            <ul className="space-y-2">
              {BULLET_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
                  <HiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: preview skeleton */}
          <div className="rounded-xl border border-dashed border-emerald-300/70 bg-white/60 p-4 overflow-hidden relative">
            <div className="flex items-center gap-2 mb-3">
              <HiDocumentText className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-800">{t('cl.preview')}</h4>
              <span className="ml-auto text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ~{t(activeTone.labelKey)}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="h-2 rounded bg-slate-200/80 w-1/3" />
              <div className="h-2 rounded bg-slate-200/80 w-full" />
              <div className="h-2 rounded bg-slate-200/80 w-11/12" />
              <div className="h-2 rounded bg-slate-200/80 w-4/5" />
              <div className="h-2 rounded bg-slate-200/80 w-full" />
              <div className="h-2 rounded bg-slate-200/80 w-10/12" />
              <div className="h-2 rounded bg-slate-200/80 w-3/4" />
              <div className="h-2 rounded bg-slate-200/80 w-full" />
              <div className="h-2 rounded bg-slate-200/80 w-5/6" />
              <div className="h-2 rounded bg-slate-200/80 w-1/2" />
            </div>
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none">
              <p className="mb-3 text-xs text-slate-600 font-medium">
                {t('cl.preview_cta')} <span className="text-emerald-700 font-semibold">{t('cl.generate')}</span> {t('cl.preview_cta2')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────── Generated ─────── */}
      {letter && !loading && (
        <div className="flex-1 min-h-0 flex flex-col animate-reveal">
          <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-semibold">
              <HiCheckCircle className="h-3 w-3" /> {t('cl.ready')}
            </span>
            <span className="tabular-nums">{metrics.words} {t('cl.words')}</span>
            <span className="text-slate-300">·</span>
            <span className="tabular-nums">{metrics.chars} {t('cl.chars')}</span>
            <span className="text-slate-300">·</span>
            <span className="tabular-nums">{metrics.paragraphs} {t('cl.paragraphs')}</span>
            <span className="text-slate-300">·</span>
            <span className="tabular-nums">~{metrics.readMin} {t('cl.min_read')}</span>
            <span className="ml-auto text-slate-400">{t('cl.tone_used')}: <span className="text-slate-600 font-medium">{t(activeTone.labelKey)}</span></span>
          </div>

          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            className="flex-1 min-h-[240px] w-full resize-none rounded-lg border border-emerald-100 bg-white/95 px-4 py-3 text-sm text-gray-800 leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 whitespace-pre-wrap shadow-inner"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 active:scale-95 transition"
            >
              <HiOutlineClipboardDocumentList className="h-4 w-4" />
              {copied ? t('cl.copied') : t('cl.copy')}
            </button>
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 active:scale-95 transition"
            >
              {downloading ? (
                <HiArrowPath className="h-4 w-4 animate-spin" />
              ) : (
                <HiDocumentArrowDown className="h-4 w-4" />
              )}
              {downloading ? t('cl.preparing') : t('cl.download')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default CoverLetterPanel;
