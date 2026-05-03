import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStorage } from '@/utils/token-storage';

export type AppLanguage = 'de' | 'en';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('de');

  useEffect(() => {
    tokenStorage.getLanguage().then(setLanguageState).catch(() => {});
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    setLanguageState(next);
    await tokenStorage.setLanguage(next);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: 'de',
      setLanguage: async () => {},
    };
  }
  return ctx;
}
