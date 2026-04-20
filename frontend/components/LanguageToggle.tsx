import React from 'react';
import { useLang } from '../hooks/useLang';

type LanguageToggleVariant = 'light' | 'dark';

interface LanguageToggleProps {
  /** 'dark' for aurora/dark bg (white text). 'light' for white/slate chrome (slate text). */
  variant?: LanguageToggleVariant;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = 'dark' }) => {
  const { lang, setLang } = useLang();

  const containerClass =
    variant === 'light'
      ? 'inline-flex items-center rounded-full p-0.5 bg-slate-100 border border-slate-200 text-[11px] font-semibold'
      : 'liquid-glass-tinted inline-flex items-center rounded-full p-0.5 text-[11px] font-semibold';

  return (
    <div role="radiogroup" aria-label="Language" className={containerClass}>
      {(['en', 'vi'] as const).map((code) => {
        const active = lang === code;
        const buttonClass =
          variant === 'light'
            ? `relative px-2.5 py-1 rounded-full transition-all duration-200 uppercase tracking-wide ${
                active
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            : `relative px-2.5 py-1 rounded-full transition-all duration-200 uppercase tracking-wide ${
                active
                  ? 'bg-white/90 text-emerald-700 shadow-sm'
                  : 'text-white/85 hover:text-white'
              }`;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLang(code)}
            className={buttonClass}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageToggle;
