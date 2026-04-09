import pt from './pt.json';

export type Language = 'pt' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'zh' | 'ja' | 'ko' | 'ru' | 'ar' | 'hi' | 'tr';

// Only default language loaded statically; others loaded lazily
const _loadedTranslations: Record<string, typeof pt> = { pt };

const loaders: Record<Language, () => Promise<{ default: typeof pt }>> = {
  pt: () => Promise.resolve({ default: pt }),
  en: () => import('./en.json'),
  de: () => import('./de.json'),
  es: () => import('./es.json'),
  fr: () => import('./fr.json'),
  it: () => import('./it.json'),
  zh: () => import('./zh.json'),
  ja: () => import('./ja.json'),
  ko: () => import('./ko.json'),
  ru: () => import('./ru.json'),
  ar: () => import('./ar.json'),
  hi: () => import('./hi.json'),
  tr: () => import('./tr.json'),
};

export async function loadTranslation(lang: Language): Promise<typeof pt> {
  if (_loadedTranslations[lang]) return _loadedTranslations[lang];
  const mod = await loaders[lang]();
  _loadedTranslations[lang] = mod.default;
  return mod.default;
}

export function getLoadedTranslation(lang: Language): typeof pt | undefined {
  return _loadedTranslations[lang];
}

export type TranslationKeys = typeof pt;

export const translations = _loadedTranslations as Record<Language, typeof pt>;

export const languages = [
  { code: 'pt' as Language, name: 'Português', flag: '🇧🇷' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'de' as Language, name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
  { code: 'fr' as Language, name: 'Français', flag: '🇫🇷' },
  { code: 'it' as Language, name: 'Italiano', flag: '🇮🇹' },
  { code: 'zh' as Language, name: '中文', flag: '🇨🇳' },
  { code: 'ja' as Language, name: '日本語', flag: '🇯🇵' },
  { code: 'ko' as Language, name: '한국어', flag: '🇰🇷' },
  { code: 'ru' as Language, name: 'Русский', flag: '🇷🇺' },
  { code: 'ar' as Language, name: 'العربية', flag: '🇸🇦' },
  { code: 'hi' as Language, name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr' as Language, name: 'Türkçe', flag: '🇹🇷' },
];

export const defaultLanguage: Language = 'pt';

/** Map Language code → BCP-47 locale for SpeechRecognition / TTS */
export const languageToLocale: Record<Language, string> = {
  pt: 'pt-BR', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR',
  it: 'it-IT', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', ru: 'ru-RU',
  ar: 'ar-SA', hi: 'hi-IN', tr: 'tr-TR',
};

const i18nExport = { translations, languages, defaultLanguage, language: defaultLanguage };
export default i18nExport;
