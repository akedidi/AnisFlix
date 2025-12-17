import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import frTranslations from "./translations/fr";
import enTranslations from "./translations/en";
import esTranslations from "./translations/es";
import deTranslations from "./translations/de";
import itTranslations from "./translations/it";
import ptTranslations from "./translations/pt";
import arTranslations from "./translations/ar";

export type Language = "fr" | "en" | "es" | "de" | "it" | "pt" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translationsMap: Record<Language, Record<string, string>> = {
  fr: frTranslations,
  en: enTranslations,
  es: esTranslations,
  de: deTranslations,
  it: itTranslations,
  pt: ptTranslations,
  ar: arTranslations,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved as Language) || "fr";
  });

  const [translations, setTranslations] = useState<Record<string, string>>(
    translationsMap[language] || translationsMap.fr
  );

  useEffect(() => {
    setTranslations(translationsMap[language] || translationsMap.fr);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
    // Removed window.location.reload() - translations update via useEffect
  };

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
