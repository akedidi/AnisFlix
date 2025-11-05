import { useLanguage, Language } from "@/lib/i18n/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

const languages: { value: Language; label: string; flag: string }[] = [
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
  { value: "pt", label: "Português", flag: "🇵🇹" },
];

export default function LanguageSelect() {
  const { language, setLanguage, t } = useLanguage();

  // Trouver la langue actuelle pour afficher son drapeau
  const currentLanguage = languages.find(lang => lang.value === language);

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger className="w-[50px] relative [&>span]:flex-1 [&>svg]:absolute [&>svg]:right-0 [&>svg]:top-[14px] [&>svg]:h-3 [&>svg]:w-3" data-testid="select-language">
        <span className="text-lg">{currentLanguage?.flag}</span>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem 
            key={lang.value} 
            value={lang.value}
            data-testid={`option-language-${lang.value}`}
          >
            <span className="text-lg">{lang.flag}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
