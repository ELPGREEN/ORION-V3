import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, Language, TranslationKeys, defaultLanguage } from '@/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'preferred-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get saved language from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved && translations[saved]) {
        return saved;
      }
    }
    return defaultLanguage;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Update HTML lang attribute
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    // Set initial HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return default values instead of throwing to handle edge cases during HMR/initial render
    return {
      language: defaultLanguage,
      setLanguage: () => {},
      t: translations[defaultLanguage],
    };
  }
  return context;
}

// Utility hook for getting a specific translation path
export function useTranslation() {
  const { t, language, setLanguage } = useLanguage();
  return { t, language, setLanguage };
}
