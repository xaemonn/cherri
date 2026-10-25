'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';

export type Language = 'en' | 'hi';

export interface Translations {
  [key: string]: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.log': 'Log',
    'nav.chat': 'Ask Cherri',
    'nav.insights': 'Insights',
    'nav.care_group': 'Care',
    'nav.consult': 'Consult a doctor',
    'nav.report': 'Doctor report',
    'nav.labs': 'Lab decoder',
    'nav.prep': 'Visit prep',
    'nav.find_care': 'Find care',
    'nav.track_group': 'Track',
    'nav.pregnancy': 'Pregnancy & baby',
    'nav.cycle': 'Cycle calendar',
    'nav.checks': 'Health checks',
    'nav.meds': 'Medicine guardian',
    'nav.learn': 'Learn & myths',
    'nav.wrapped': 'Cycle Wrapped',
    'nav.safety_group': 'Safety',
    'nav.ec': 'Accident help',
    'nav.settings': 'Settings',
    'nav.account': 'Account',
    'nav.quick_exit': 'Quick exit',
    'nav.open_app': 'Open app',
    'nav.login': 'Log in',

    // Landing Page
    'landing.badge': 'Women’s health, made for India',
    'landing.title_prefix': 'Understand your body.',
    'landing.title_highlight': 'Get real care.',
    'landing.subtitle': 'Track your cycle, ask a gynaecologist and walk into the clinic with a report your doctor can use. Private, free and quick to hide.',
    'landing.cta_login': 'Log in or sign up',
    'landing.cta_guest': 'Try as a guest',
    'landing.cta_open': 'Open my Cherri',
    'landing.nav_features': 'Features',
    'landing.nav_mobile': 'Mobile app',
    'landing.nav_how': 'How it works',
    'landing.nav_privacy': 'Privacy',
    'landing.privacy_tag': 'Privacy',
    'landing.privacy_title_prefix': 'Your data.',
    'landing.privacy_title_highlight': 'Your rules.',
    'landing.privacy_sub': 'Built around India’s DPDP Act.',
    'landing.enc_title': 'Encrypted',
    'landing.enc_desc': 'Notes, chats and shared reports are encrypted before they’re stored.',
    'landing.no_ads_title': 'No ads, ever',
    'landing.no_ads_desc': 'Your health data is never sold or used for advertising.',
    'landing.ai_title': 'AI sees summaries',
    'landing.ai_desc': 'Phone numbers and emails are removed before any AI is involved.',
    'landing.del_title': 'Delete anytime',
    'landing.del_desc': 'Export everything, or erase it for good in one tap.',
    'landing.start_title': 'Start in under a minute.',

    // Common / UI
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.loading': 'Loading…',
    'common.new': 'NEW',
    'common.language': 'Language',
    'common.lang_en': 'English',
    'common.lang_hi': 'हिंदी',
  },
  hi: {
    // Navigation (Pure Devanagari)
    'nav.home': 'होम',
    'nav.log': 'लक्षण दर्ज करें',
    'nav.chat': 'चेरी से पूछें',
    'nav.insights': 'स्वास्थ्य रुझान',
    'nav.care_group': 'चिकित्सा परामर्श',
    'nav.consult': 'डॉक्टर से परामर्श',
    'nav.report': 'डॉक्टर रिपोर्ट',
    'nav.labs': 'लैब रिपोर्ट समझें',
    'nav.prep': 'क्लिनिक तैयारी',
    'nav.find_care': 'नज़दीकी केंद्र',
    'nav.track_group': 'स्वास्थ्य निगरानी',
    'nav.pregnancy': 'गर्भावस्था एवं शिशु',
    'nav.cycle': 'मासिक चक्र कैलेंडर',
    'nav.checks': 'स्वास्थ्य जाँच',
    'nav.meds': 'दवा एवं खानपान सुरक्षा',
    'nav.learn': 'भ्रांतियाँ एवं तथ्य',
    'nav.wrapped': 'चक्र सारांश',
    'nav.safety_group': 'आपातकालीन सुरक्षा',
    'nav.ec': 'आपातकालीन सहायता',
    'nav.settings': 'सेटिंग्स',
    'nav.account': 'खाता विवरण',
    'nav.quick_exit': 'त्वरित निकास',
    'nav.open_app': 'ऐप खोलें',
    'nav.login': 'लॉग इन करें',

    // Landing Page (Pure Devanagari)
    'landing.badge': 'महिलाओं का स्वास्थ्य, भारत के लिए समर्पित',
    'landing.title_prefix': 'अपने शरीर को समझें।',
    'landing.title_highlight': 'सही उपचार पाएँ।',
    'landing.subtitle': 'अपने मासिक चक्र को ट्रैक करें, स्त्री रोग विशेषज्ञ से परामर्श लें और क्लिनिक में ऐसी रिपोर्ट लेकर जाएँ जिसे आपका डॉक्टर तुरंत समझ सके। पूर्णतः निजी, निःशुल्क और सुरक्षित।',
    'landing.cta_login': 'लॉग इन या पंजीकरण',
    'landing.cta_guest': 'अतिथि के रूप में आज़माएँ',
    'landing.cta_open': 'मेरी चेरी खोलें',
    'landing.nav_features': 'विशेषताएँ',
    'landing.nav_mobile': 'मोबाइल ऐप',
    'landing.nav_how': 'कार्यप्रणाली',
    'landing.nav_privacy': 'गोपनीयता',
    'landing.privacy_tag': 'डेटा सुरक्षा',
    'landing.privacy_title_prefix': 'आपका डेटा।',
    'landing.privacy_title_highlight': 'आपका पूर्ण नियंत्रण।',
    'landing.privacy_sub': 'भारत के डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम के पूर्णतः अनुरूप।',
    'landing.enc_title': 'पूर्णतः सुरक्षित एन्क्रिप्शन',
    'landing.enc_desc': 'आपके नोट्स, चैट और साझा रिपोर्ट स्टोर होने से पहले आधुनिक एन्क्रिप्शन द्वारा सुरक्षित किए जाते हैं।',
    'landing.no_ads_title': 'कोई विज्ञापन नहीं, कभी नहीं',
    'landing.no_ads_desc': 'आपका स्वास्थ्य डेटा कभी किसी तीसरे पक्ष या विज्ञापनों के लिए नहीं बेचा जाता।',
    'landing.ai_title': 'सुरक्षित एआई विश्लेषण',
    'landing.ai_desc': 'एआई विश्लेषण से पहले फ़ोन नंबर, ईमेल और संवेदनशील पहचान पूरी तरह हटा दी जाती है।',
    'landing.del_title': 'जब चाहें तब हटाएँ',
    'landing.del_desc': 'एक क्लिक में अपना संपूर्ण डेटा डाउनलोड करें, या हमेशा के लिए स्थायी रूप से मिटा दें।',
    'landing.start_title': 'एक मिनट से भी कम समय में शुरू करें।',

    // Common / UI
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.continue': 'आगे बढ़ें',
    'common.back': 'पीछे जाएँ',
    'common.loading': 'प्रतीक्षा करें…',
    'common.new': 'नवीन',
    'common.language': 'भाषा',
    'common.lang_en': 'English',
    'common.lang_hi': 'हिंदी',
  },
};

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key, defaultText) => defaultText || key,
});

const STORAGE_KEY = 'cherri_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [, startTransition] = useTransition();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === 'hi' || stored === 'en') {
        setLangState(stored);
        document.documentElement.lang = stored;
      }
    } catch {
      // ignore storage access issues
    }
  }, []);

  const setLang = (next: Language) => {
    startTransition(() => {
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
      } catch {
        // ignore storage errors
      }
    });
  };

  const t = (key: string, defaultText?: string): string => {
    const text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || defaultText || key;
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

