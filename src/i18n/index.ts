import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Default to Spanish for landing/auth and any unconfigured user
    fallbackLng: 'es',
    supportedLngs: ['en', 'es'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Only honor an explicit user choice from localStorage; otherwise default to es
      order: ['localStorage'],
      lookupLocalStorage: 'preferred_language',
      caches: ['localStorage'],
    },
  });

export default i18n;
