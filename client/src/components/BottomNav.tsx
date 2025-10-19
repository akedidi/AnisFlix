import { Home, Film, Tv, Radio, Heart, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Film, label: t("nav.movies"), path: "/movies" },
    { icon: Tv, label: t("nav.series"), path: "/series" },
    { icon: Radio, label: t("nav.tvChannels"), path: "/tv-channels" },
    { icon: Heart, label: t("nav.favorites"), path: "/favorites" },
    { icon: Settings, label: t("nav.settings"), path: "/settings" },
  ];

  return (
    <nav 
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-card-border md:hidden"
      style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)' // Support pour les appareils avec encoche
      }}
    >
      <div className="flex items-center justify-around h-20 w-full max-w-full overflow-hidden pb-4">
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
                className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg transition-colors min-w-0 flex-1 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ maxWidth: 'calc(100vw / 6)', marginBottom: '4px' }}
              >
                <Icon className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-xs font-medium" style={{ marginBottom: '2px' }}>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
