import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadTranslation, getLoadedTranslation, Language, TranslationKeys, defaultLanguage } from '@/i18n';
import pt from '@/i18n/pt.json';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'preferred-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved && ['pt','en','de','es','fr','it','zh','ja','ko','ru','ar','hi','tr'].includes(saved)) {
        return saved;
      }
    }
    return defaultLanguage;
  });

  const [currentTranslation, setCurrentTranslation] = useState<TranslationKeys>(pt);

  // Load translation on mount and language change
  useEffect(() => {
    let cancelled = false;
    loadTranslation(language).then((t) => {
      if (!cancelled) setCurrentTranslation(t);
    });
    return () => { cancelled = true; };
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    // Pre-load translation eagerly
    const cached = getLoadedTranslation(lang);
    if (cached) {
      setCurrentTranslation(cached);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: currentTranslation }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: defaultLanguage,
      setLanguage: () => {},
      t: pt as TranslationKeys,
    };
  }
  return context;
}

export function useTranslation() {
  const { t, language, setLanguage } = useLanguage();
  return { t, language, setLanguage };
}
