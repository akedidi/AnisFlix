import { Home, Film, Tv, Radio, Heart, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useOffline } from "@/hooks/useOffline";
import { useEffect, useRef, useState } from "react";
import { useViewportHeight } from "@/hooks/useViewportHeight";
// import { useTabBarDiagnostic } from "../hooks/useTabBarDiagnostic";

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { isOffline } = useOffline();
  
  // Utiliser la hauteur réelle du viewport (compatible iOS)
  const viewportHeight = useViewportHeight();
  
  // État pour bloquer la position après le changement initial
  const [isPositionLocked, setIsPositionLocked] = useState(false);
  const [lockedBottom, setLockedBottom] = useState(0);
  
  const navRef = useRef<HTMLElement>(null);

  // Log de la hauteur du viewport pour debug (désactivé en production)
  // useEffect(() => {
  //   const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
  //   const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  //   console.log('📏 [BOTTOMNAV] Viewport height:', viewportHeight, '| Capacitor:', isCapacitor, '| iOS:', isIOS, '| Offline:', isOffline);
  // }, [viewportHeight, isOffline]);

  // Corriger la position de la tab bar qui remonte de +34px (iOS natif uniquement)
  useEffect(() => {
    // Vérifier si on est sur iOS natif (Capacitor)
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isCapacitor && isIOS && navRef.current && !isPositionLocked) {
      // Si la hauteur a changé (probablement de 778 à 812), corriger la position
      if (viewportHeight >= 800) { // Seuil pour détecter le changement
        const correctedBottom = -34; // Corriger en descendant de 34px
        setLockedBottom(correctedBottom);
        setIsPositionLocked(true);
        console.log('🔒 [BOTTOMNAV] Position corrigée à:', correctedBottom, 'px (iOS natif - descend de 34px)');
        
        // Appliquer le style de position fixe avec correction
        navRef.current.style.position = 'fixed';
        navRef.current.style.bottom = `${correctedBottom}px`;
        navRef.current.style.left = '0';
        navRef.current.style.right = '0';
        navRef.current.style.zIndex = '999999';
      }
    }
  }, [viewportHeight, isPositionLocked]);

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
    
    // Scroll to top - TEMPORAIREMENT DÉSACTIVÉ pour tester
    // window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <>
      <nav 
        ref={navRef}
        className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-card-border md:hidden"
      >
        <div className="flex items-center justify-around h-16 w-full max-w-full overflow-hidden pb-2">
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
                  className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-colors min-w-0 flex-1 relative ${
                    isActive
                      ? "text-primary"
                      : isOffline && !isOfflineAvailable
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ maxWidth: 'calc(100vw / 6)' }}
                  disabled={isOffline && !isOfflineAvailable}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`} />
                  <span className="text-xs font-medium leading-tight text-center">{item.label}</span>
                  {isOfflineAvailable && isOffline && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
      
    </>
  );
}
