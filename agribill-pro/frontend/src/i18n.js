import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import mr from './locales/mr.json';

const stored = (() => {
  try {
    return JSON.parse(localStorage.getItem('agribill-lang'))?.state?.language;
  } catch {
    return null;
  }
})();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    mr: { translation: mr },
  },
  lng: stored || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
