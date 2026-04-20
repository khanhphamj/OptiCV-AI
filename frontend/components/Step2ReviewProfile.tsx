import React, { useState } from 'react';
import {
  HiChevronLeft,
  HiChevronRight,
  HiSparkles,
  HiMapPin,
  HiBriefcase,
  HiAcademicCap,
  HiIdentification,
  HiCheckCircle,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import { CvProfile, JobLocation } from '../types';
import { useLang } from '../hooks/useLang';

interface Step2ReviewProfileProps {
  profile: CvProfile | null;
  isParsing: boolean;
  onSubmit: (profile: CvProfile) => void;
  onBack: () => void;
  error?: string | null;
}

const LEVEL_OPTIONS = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager'];
const LOCATION_OPTIONS: { value: JobLocation; label: string }[] = [
  { value: 'ho_chi_minh', label: 'Hồ Chí Minh' },
  { value: 'ha_noi', label: 'Hà Nội' },
];

const Step2ReviewProfile: React.FC<Step2ReviewProfileProps> = ({
  profile,
  isParsing,
  onSubmit,
  onBack,
  error,
}) => {
  const { t } = useLang();
  const [title, setTitle] = useState(profile?.title ?? '');
  const [role, setRole] = useState(profile?.role ?? '');
  const [level, setLevel] = useState(profile?.level ?? '');
  const [location, setLocation] = useState<JobLocation>(profile?.location ?? 'ho_chi_minh');
  const [skillsText, setSkillsText] = useState(profile?.skills?.join(', ') ?? '');
  const [touched, setTouched] = useState(false);

  React.useEffect(() => {
    if (profile && !touched) {
      setTitle(profile.title ?? '');
      setRole(profile.role ?? '');
      setLevel(profile.level ?? '');
      setLocation(profile.location ?? 'ho_chi_minh');
      setSkillsText(profile.skills?.join(', ') ?? '');
    }
  }, [profile, touched]);

  const markTouched = () => setTouched(true);

  const missingRequired = !title.trim() && !role.trim();

  const handleSubmit = () => {
    const skills = skillsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    onSubmit({
      title: title.trim() || null,
      role: role.trim() || null,
      level: level.trim() || null,
      location,
      skills,
      years_experience: profile?.years_experience ?? null,
    });
  };

  if (isParsing) {
    return (
      <div className="w-full max-w-xl mx-auto liquid-glass-soft rounded-3xl p-6 sm:p-8 text-center animate-soft-rise">
        <HiSparkles className="w-10 h-10 text-emerald-500 mx-auto animate-pulse" />
        <h2 className="mt-3 text-xl font-bold text-slate-900 font-headline">
          {t('find_jobs.review.parsing.title')}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {t('find_jobs.review.parsing.subtitle')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl lg:max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 lg:gap-4">
      <section
        className="liquid-glass-soft rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col animate-soft-rise"
        style={{ animationDelay: '40ms' }}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            <HiSparkles className="h-3.5 w-3.5" /> {t('find_jobs.review.eyebrow')}
          </span>
          <h2 className="mt-2 text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 font-headline text-gradient-emerald">
            {t('find_jobs.review.title')}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            {t('find_jobs.review.subtitle')}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <Field label={t('find_jobs.review.field.title')} icon={<HiBriefcase className="h-4 w-4" />}>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); markTouched(); }}
              placeholder={t('find_jobs.review.field.title_placeholder')}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </Field>

          <Field label={t('find_jobs.review.field.role')} icon={<HiIdentification className="h-4 w-4" />}>
            <input
              type="text"
              value={role}
              onChange={e => { setRole(e.target.value); markTouched(); }}
              placeholder={t('find_jobs.review.field.role_placeholder')}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('find_jobs.review.field.level')} icon={<HiAcademicCap className="h-4 w-4" />}>
              <select
                value={level}
                onChange={e => { setLevel(e.target.value); markTouched(); }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">{t('find_jobs.review.field.level_unset')}</option>
                {LEVEL_OPTIONS.map(lv => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
            </Field>

            <Field label={t('find_jobs.review.field.location')} icon={<HiMapPin className="h-4 w-4" />}>
              <select
                value={location}
                onChange={e => { setLocation(e.target.value as JobLocation); markTouched(); }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {LOCATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t('find_jobs.review.field.skills')}>
            <textarea
              value={skillsText}
              onChange={e => { setSkillsText(e.target.value); markTouched(); }}
              rows={2}
              placeholder={t('find_jobs.review.field.skills_placeholder')}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </Field>

          {missingRequired && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <HiExclamationTriangle className="h-4 w-4 shrink-0" />
              <span>{t('find_jobs.review.missing_required')}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-2 rounded-md border border-red-200">
              <strong>{t('find_jobs.review.error_label')}:</strong> {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-300 active:scale-95 transition"
          >
            <HiChevronLeft className="h-4 w-4" />
            {t('find_jobs.review.back')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={missingRequired}
            className="btn-sheen w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 border border-white/20 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all group"
          >
            <HiSparkles className="h-4 w-4" />
            {t('find_jobs.review.submit')}
            <HiChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      <aside
        className="liquid-glass-soft relative hidden lg:flex flex-col rounded-3xl p-5 overflow-hidden animate-soft-rise"
        style={{ animationDelay: '140ms' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-400/40 to-teal-500/30 blur-2xl"
        />
        <div className="relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            {t('find_jobs.review.hero.sources_eyebrow')}
          </p>
          <h3 className="text-lg font-bold text-slate-900 font-headline leading-tight mt-1">
            {t('find_jobs.review.hero.sources_title')}
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2"><HiCheckCircle className="h-4 w-4 text-emerald-600" /> topcv.vn</li>
            <li className="flex items-center gap-2"><HiCheckCircle className="h-4 w-4 text-emerald-600" /> vietnamworks.com</li>
            <li className="flex items-center gap-2"><HiCheckCircle className="h-4 w-4 text-emerald-600" /> careerviet.vn</li>
            <li className="flex items-center gap-2"><HiCheckCircle className="h-4 w-4 text-emerald-600" /> glints.com</li>
          </ul>
          <div className="mt-4 text-xs text-slate-600 bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-3">
            {t('find_jobs.review.hero.footer_note')}
          </div>
        </div>
      </aside>
    </div>
  );
};

interface FieldProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, icon, children }) => (
  <label className="block">
    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
      {icon}
      {label}
    </span>
    {children}
  </label>
);

export default Step2ReviewProfile;
