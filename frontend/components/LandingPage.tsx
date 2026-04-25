import React from 'react';
import {
  HiSparkles,
  HiChartBar,
  HiArrowTrendingUp,
  HiDocumentText,
  HiBriefcase,
  HiArrowLongRight,
  HiShieldCheck,
} from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';
import { TranslationKey } from '../i18n/translations';
import LandingHeroDemo from './LandingHeroDemo';
import LivePreview from './LivePreview';
import BeforeAfterSlider from './BeforeAfterSlider';
import TiltCard from './TiltCard';

interface LandingPageProps {
  onGetStarted: () => void;
}

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  tone: 'emerald' | 'teal' | 'amber' | 'sky';
};

const FEATURES: Feature[] = [
  { icon: HiChartBar,         titleKey: 'landing.features.f1.title', descKey: 'landing.features.f1.desc', tone: 'emerald' },
  { icon: HiArrowTrendingUp,  titleKey: 'landing.features.f2.title', descKey: 'landing.features.f2.desc', tone: 'teal' },
  { icon: HiDocumentText,     titleKey: 'landing.features.f3.title', descKey: 'landing.features.f3.desc', tone: 'amber' },
  { icon: HiBriefcase,        titleKey: 'landing.features.f4.title', descKey: 'landing.features.f4.desc', tone: 'sky' },
];

const TONE_CLASSES: Record<Feature['tone'], { bg: string; ring: string; iconBg: string }> = {
  emerald: { bg: 'from-emerald-100 to-emerald-50',  ring: 'ring-emerald-200/70', iconBg: 'from-emerald-500 to-teal-600' },
  teal:    { bg: 'from-teal-100 to-emerald-50',     ring: 'ring-teal-200/70',    iconBg: 'from-teal-500 to-emerald-600' },
  amber:   { bg: 'from-amber-100 to-orange-50',     ring: 'ring-amber-200/70',   iconBg: 'from-amber-500 to-orange-500' },
  sky:     { bg: 'from-sky-100 to-blue-50',         ring: 'ring-sky-200/70',     iconBg: 'from-sky-500 to-blue-600' },
};

const STEPS: Array<{ titleKey: TranslationKey; descKey: TranslationKey }> = [
  { titleKey: 'landing.steps.s1.title', descKey: 'landing.steps.s1.desc' },
  { titleKey: 'landing.steps.s2.title', descKey: 'landing.steps.s2.desc' },
  { titleKey: 'landing.steps.s3.title', descKey: 'landing.steps.s3.desc' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { t } = useLang();

  const scrollToHowItWorks = () => {
    const el = document.getElementById('landing-how');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full">
      {/* ─── Hero ─── */}
      <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 lg:pt-14 pb-10 sm:pb-14 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center">
          {/* Copy */}
          <div className="animate-soft-rise" style={{ animationDelay: '40ms' }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] sm:text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <HiSparkles className="h-3.5 w-3.5" />
              {t('landing.eyebrow')}
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-900 font-headline leading-[1.05]">
              {t('landing.hero.title_1')}{' '}
              <span className="text-gradient-emerald">{t('landing.hero.title_accent')}</span>
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {t('landing.hero.subtitle')}
            </p>

            <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={onGetStarted}
                className="btn-sheen group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 sm:px-7 py-3 sm:py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 border border-white/20 hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <HiSparkles className="h-5 w-5" />
                  {t('landing.hero.cta_primary')}
                  <HiArrowLongRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
              <button
                onClick={scrollToHowItWorks}
                className="liquid-glass-button inline-flex items-center justify-center gap-2 rounded-xl px-5 sm:px-6 py-3 sm:py-3.5 text-base font-semibold text-emerald-800"
              >
                {t('landing.hero.cta_secondary')}
              </button>
            </div>

            <p className="mt-4 sm:mt-5 inline-flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <HiShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              {t('landing.hero.note')}
            </p>
          </div>

          {/* Visual — animated AI rewrite demo (with 3D tilt + glare) */}
          <div
            className="relative animate-soft-rise hidden md:block"
            style={{ animationDelay: '160ms' }}
          >
            <LandingHeroDemo />
          </div>
        </div>
      </section>

      {/* ─── Live AI Preview — interactive demo of skill priority engine ─── */}
      <LivePreview onGetStarted={onGetStarted} />

      {/* ─── Before/After CV slider — drag-to-reveal AI rewrite ─── */}
      <BeforeAfterSlider />

      {/* ─── Features ─── */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            {t('landing.features.eyebrow')}
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 font-headline tracking-tight">
            {t('landing.features.title')}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            {t('landing.features.subtitle')}
          </p>
        </div>

        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {FEATURES.map(({ icon: Icon, titleKey, descKey, tone }, i) => {
            const c = TONE_CLASSES[tone];
            return (
              <TiltCard
                key={titleKey}
                className={`liquid-glass-soft rounded-2xl p-5 ring-1 ${c.ring} animate-soft-rise flex flex-col`}
                style={{ animationDelay: `${80 + i * 80}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${c.iconBg} shadow-md`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {t(titleKey)}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-snug">
                  {t(descKey)}
                </p>
              </TiltCard>
            );
          })}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section
        id="landing-how"
        className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 scroll-mt-24"
      >
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            {t('landing.steps.eyebrow')}
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 font-headline tracking-tight">
            {t('landing.steps.title')}
          </h2>
        </div>

        <ol className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {STEPS.map((s, i) => (
            <li
              key={s.titleKey}
              className="liquid-glass-soft rounded-2xl p-5 sm:p-6 animate-soft-rise relative"
              style={{ animationDelay: `${100 + i * 100}ms` }}
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-base font-bold shadow-md shadow-emerald-500/30">
                {i + 1}
              </div>
              <h3 className="mt-4 text-base sm:text-lg font-semibold text-slate-900">
                {t(s.titleKey)}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-snug">
                {t(s.descKey)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="liquid-glass relative rounded-3xl p-6 sm:p-10 lg:p-14 text-center overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-300/40 to-teal-400/25 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-gradient-to-br from-amber-300/30 to-orange-400/20 blur-2xl"
          />

          <h2 className="relative z-10 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 font-headline tracking-tight">
            {t('landing.cta.title')}
          </h2>
          <p className="relative z-10 mt-3 text-sm sm:text-base text-slate-600">
            {t('landing.cta.subtitle')}
          </p>
          <button
            onClick={onGetStarted}
            className="btn-sheen group relative z-10 mt-6 sm:mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-7 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 border border-white/20 hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-2">
              <HiSparkles className="h-5 w-5" />
              {t('landing.cta.button')}
              <HiArrowLongRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
