import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import frTranslations from "./translations/fr";
import enTranslations from "./translations/en";
import esTranslations from "./translations/es";
import deTranslations from "./translations/de";
import itTranslations from "./translations/it";
import ptTranslations from "./translations/pt";
import { Storage } from "../storage";

export type Language = "fr" | "en" | "es" | "de" | "it" | "pt";

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
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger la langue sauvegardée
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await Storage.getItem("app-language");
        if (saved && Object.keys(translationsMap).includes(saved)) {
          setLanguageState(saved as Language);
        }
      } catch (error) {
        console.error("Error loading saved language:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadSavedLanguage();
  }, []);

  const [translations, setTranslations] = useState<Record<string, string>>(
    translationsMap[language] || translationsMap.fr
  );

  useEffect(() => {
    setTranslations(translationsMap[language] || translationsMap.fr);
  }, [language]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await Storage.setItem("app-language", lang);
    
    // Recharger la page seulement sur web
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const t = (key: string): string => {
    return translations[key] || key;
  };

  // Ne pas rendre le contenu tant que la langue n'est pas chargée
  if (!isLoaded) {
    return null;
  }

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
