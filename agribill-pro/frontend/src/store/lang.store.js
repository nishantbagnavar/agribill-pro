import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLangStore = create(
  persist(
    (set, get) => ({
      language: 'en',
      toggleLanguage: () => set({ language: get().language === 'en' ? 'mr' : 'en' }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'agribill-lang',
      partialize: (state) => ({ language: state.language }),
    }
  )
);
