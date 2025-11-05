import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function LanguageToggle() {
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as "fr" | "en" | null;
    const initialLanguage = savedLanguage || "fr";
    setLanguage(initialLanguage);
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === "fr" ? "en" : "fr";
    setLanguage(newLanguage);
    localStorage.setItem("language", newLanguage);
    window.dispatchEvent(new CustomEvent("languageChange", { detail: newLanguage }));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      data-testid="button-language-toggle"
      className="relative"
    >
      <span className="text-2xl">
        {language === "fr" ? "🇫🇷" : "🇬🇧"}
      </span>
    </Button>
  );
}
