import pt from './pt.json';
import en from './en.json';
import de from './de.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import zh from './zh.json';
import ja from './ja.json';
import ko from './ko.json';
import ru from './ru.json';
import ar from './ar.json';
import hi from './hi.json';
import tr from './tr.json';

export type Language = 'pt' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'zh' | 'ja' | 'ko' | 'ru' | 'ar' | 'hi' | 'tr';

export const translations = {
  pt, en, de, es, fr, it, zh, ja, ko, ru, ar, hi, tr,
} as const;

export type TranslationKeys = typeof pt;

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
