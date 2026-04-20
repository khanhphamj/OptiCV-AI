import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Lang, TranslationKey } from '../i18n/translations';

const STORAGE_KEY = 'opticv-ai:v1:lang';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'vi') return saved;
  } catch {}
  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('vi')) return 'vi';
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);

  const t = (key: TranslationKey) => {
    const bundle = translations[lang] ?? translations.en;
    return (bundle as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within <LanguageProvider>');
  return ctx;
}
