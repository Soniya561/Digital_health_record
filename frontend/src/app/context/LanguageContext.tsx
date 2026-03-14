import React, { createContext, useContext, useState, useEffect } from 'react';

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LANGUAGE_LOCK_KEY = 'language_locked';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem(LANGUAGE_LOCK_KEY) || localStorage.getItem('language') || 'en';
  });

  const setLanguage = (next: string) => {
    const locked = localStorage.getItem(LANGUAGE_LOCK_KEY);
    if (locked && locked !== next) {
      return;
    }
    setLanguageState(next);
  };

  useEffect(() => {
    localStorage.setItem('language', language);
    // Dispatch event for components that might not be in React tree or legacy components
    window.dispatchEvent(new CustomEvent('change-language', { detail: language }));
  }, [language]);

  useEffect(() => {
    const handleLangChange = (e: any) => {
      const locked = localStorage.getItem(LANGUAGE_LOCK_KEY);
      if (locked && locked !== e.detail) {
        return;
      }
      setLanguageState(e.detail);
    };
    window.addEventListener('change-language', handleLangChange);
    return () => window.removeEventListener('change-language', handleLangChange);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
