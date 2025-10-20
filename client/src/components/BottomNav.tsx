import { Home, Film, Tv, Radio, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Film, label: t("nav.movies"), path: "/films" },
    { icon: Tv, label: t("nav.series"), path: "/series" },
    { icon: Radio, label: t("nav.tvChannels"), path: "/tv" },
    { icon: Settings, label: t("nav.settings"), path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-card-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <button
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
