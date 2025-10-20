import { Home, Film, Tv, Radio, Heart, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useOffline } from "@/hooks/useOffline";
import { useEffect } from "react";
import { useTabBarDiagnostic } from "@/hooks/useTabBarDiagnostic";

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { isOffline } = useOffline();
  
  // Diagnostic de la tab bar
  const { navRef } = useTabBarDiagnostic(true);

  // Reset scroll to top when location changes
  useEffect(() => {
    // Clear all saved scroll positions when navigating
    try {
      const positions = JSON.parse(localStorage.getItem('scrollPositions') || '{}');
      Object.keys(positions).forEach(key => {
        delete positions[key];
      });
      localStorage.setItem('scrollPositions', JSON.stringify(positions));
    } catch (error) {
      console.error('Erreur lors de l\'effacement des positions de scroll:', error);
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);


  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/", offline: true },
    { icon: Film, label: t("nav.movies"), path: "/movies", offline: false },
    { icon: Tv, label: t("nav.series"), path: "/series", offline: false },
    { icon: Radio, label: t("nav.tvChannels"), path: "/tv-channels", offline: true },
    { icon: Heart, label: t("nav.favorites"), path: "/favorites", offline: true },
    { icon: Settings, label: t("nav.settings"), path: "/settings", offline: true },
  ];

  return (
    <nav 
      ref={navRef}
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-card-border md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999999
      }}
    >
      <div className="flex items-center justify-around h-20 w-full max-w-full overflow-hidden pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          const isOfflineAvailable = item.offline;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <button
                className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg transition-colors min-w-0 flex-1 relative ${
                  isActive
                    ? "text-primary"
                    : isOffline && !isOfflineAvailable
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ maxWidth: 'calc(100vw / 6)', marginBottom: '4px' }}
                disabled={isOffline && !isOfflineAvailable}
              >
                <Icon className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-xs font-medium" style={{ marginBottom: '2px' }}>{item.label}</span>
                {isOfflineAvailable && isOffline && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
