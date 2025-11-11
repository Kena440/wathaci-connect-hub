import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import sw from './locales/sw.json';

// Translation resources
const resources = {
  en: { translation: en },
  fr: { translation: fr },
  sw: { translation: sw },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false // react already does escaping
    },
    
    // Development options
    debug: import.meta.env.DEV,
  });

export default i18n;
