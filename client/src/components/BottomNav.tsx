import { Home, Film, Tv, Radio, Heart, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useOffline } from "@/hooks/useOffline";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useViewportHeight } from "@/hooks/useViewportHeight";
// import { useTabBarDiagnostic } from "../hooks/useTabBarDiagnostic";

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { isOffline } = useOffline();
  const [isMounted, setIsMounted] = useState(false);
  
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

  // La préservation du scroll est maintenant gérée par useScrollPreservation dans AppWeb


  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/", offline: true },
    { icon: Film, label: t("nav.movies"), path: "/movies", offline: false },
    { icon: Tv, label: t("nav.series"), path: "/series", offline: false },
    { icon: Radio, label: t("nav.tvChannels"), path: "/tv-channels", offline: true },
    { icon: Heart, label: t("nav.favorites"), path: "/favorites", offline: true },
    { icon: Settings, label: t("nav.settings"), path: "/settings", offline: true },
  ];

  // Déterminer quel onglet doit être actif pour une URL donnée
  const getActiveRoot = (currentPath: string) => {
    const p = currentPath.split('?')[0].split('#')[0];
    const isOneOf = (prefixes: string[]) => prefixes.some((pref) => p === pref || p.startsWith(pref));

    // Movies: racine + détails + genres + pages dérivées (latest/popular)
    if (
      isOneOf([
        '/movies',
        '/movie',
        '/movies-',
        '/movies/genre',
        '/movies-genre',
        '/latest-movies',
        '/popular-movies'
      ])
    ) return '/movies';

    // Series: racine + détails + genres + pages dérivées (latest/popular)
    if (
      isOneOf([
        '/series',
        '/series-',
        '/series/genre',
        '/series-genre',
        '/latest-series',
        '/popular-series'
      ])
    ) return '/series';

    // TV
    if (isOneOf(['/tv-channels'])) return '/tv-channels';
    // Favorites
    if (isOneOf(['/favorites'])) return '/favorites';
    // Settings
    if (isOneOf(['/settings'])) return '/settings';
    // Home par défaut
    return '/';
  };

  const tabbarElement = (
    <nav
      ref={navRef}
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-card-border md:hidden"
      style={{
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        position: 'fixed',
        bottom: '0px',
        left: '0px',
        right: '0px',
        top: 'auto',
        zIndex: 99999, // Réduit de 2147483647 à 99999 pour éviter les problèmes de pointer-events
        width: '100vw',
        height: '70px',
        background: 'hsl(var(--card))',
        borderTop: '1px solid hsl(var(--card-border))',
        transform: 'translateZ(0)',
        willChange: 'transform',
        pointerEvents: 'auto' // S'assurer que les interactions sont possibles
      }}
    >
      <div className="flex items-center justify-around h-16 w-full max-w-full overflow-hidden pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Normaliser le path pour comparer correctement
          const normalizedLocation = location.split('?')[0].split('#')[0];
          const normalizedPath = item.path.split('?')[0].split('#')[0];
          const activeRoot = getActiveRoot(normalizedLocation || '/');
          const isActive = normalizedPath === activeRoot;
          const isOfflineAvailable = item.offline;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              style={{ pointerEvents: 'auto' }} // S'assurer que les liens sont cliquables
            >
              <button
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-colors min-w-0 flex-1 relative ${
                  isActive
                    ? "text-primary"
                    : isOffline && !isOfflineAvailable
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ 
                  maxWidth: 'calc(100vw / 6)',
                  pointerEvents: 'auto', // S'assurer que les boutons sont cliquables
                  cursor: 'pointer' // Ajouter le curseur pointer
                }}
                disabled={isOffline && !isOfflineAvailable}
                type="button"
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
  );

  // S'assurer que le composant est monté avant de rendre le Portal
  useEffect(() => {
    setIsMounted(true);
    console.log('[BottomNav] Component mounted, Portal ready');

    // Détecter si on est sur mobile (largeur d'écran ou user agent)
    const isMobile = () => {
      const width = window.innerWidth;
      const isMobileWidth = width <= 768;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      return isMobileWidth || isMobileUA;
    };

    // Créer ou récupérer l'élément de navigation directement dans le DOM
    const ensureNavElement = () => {
      let navElement = document.querySelector('.mobile-bottom-nav') as HTMLElement;
      
      if (!navElement) {
        // Créer l'élément directement dans le body si le Portal ne l'a pas encore créé
        navElement = document.createElement('nav');
        navElement.className = 'mobile-bottom-nav';
        document.body.appendChild(navElement);
        console.log('[BottomNav] Created nav element directly in DOM');
      }
      
      return navElement;
    };

    // Forcer le positionnement après le montage
    const forcePositioning = () => {
      const navElement = ensureNavElement();
      
      if (!navElement) return;
      
      // S'assurer que le parent (body) n'a pas de transform ou overflow qui pourrait casser le fixed
      const body = document.body;
      if (body) {
        // Forcer body à ne pas avoir de transform ou overflow qui pourrait casser le fixed
        body.style.setProperty('transform', 'none', 'important');
        body.style.setProperty('overflow-x', 'hidden', 'important');
      }
      
      // S'assurer que html n'a pas de transform
      const html = document.documentElement;
      if (html) {
        html.style.setProperty('transform', 'none', 'important');
      }

      // Forcer l'affichage sur mobile même si md:hidden est appliqué
      if (isMobile()) {
        navElement.style.setProperty('display', 'block', 'important');
        navElement.style.setProperty('visibility', 'visible', 'important');
        navElement.style.setProperty('opacity', '1', 'important');
      } else {
        navElement.style.setProperty('display', 'none', 'important');
        return; // Ne pas positionner sur desktop
      }
      
      // Forcer le positionnement fixe en bas de l'écran
      navElement.style.setProperty('position', 'fixed', 'important');
      navElement.style.setProperty('bottom', '0px', 'important');
      navElement.style.setProperty('left', '0px', 'important');
      navElement.style.setProperty('right', '0px', 'important');
      navElement.style.setProperty('top', 'auto', 'important');
      navElement.style.setProperty('z-index', '99999', 'important'); // Réduit pour éviter les problèmes
      navElement.style.setProperty('width', '100vw', 'important');
      navElement.style.setProperty('max-width', '100vw', 'important');
      navElement.style.setProperty('height', '70px', 'important');
      navElement.style.setProperty('transform', 'translateZ(0)', 'important');
      navElement.style.setProperty('will-change', 'transform', 'important');
      navElement.style.setProperty('margin', '0', 'important');
      navElement.style.setProperty('padding', '0', 'important');
      navElement.style.setProperty('box-sizing', 'border-box', 'important');
      navElement.style.setProperty('pointer-events', 'auto', 'important'); // S'assurer que les interactions sont possibles
      
      // Vérifier la position réelle après application
      const rect = navElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const expectedBottom = 0;
      const actualBottom = viewportHeight - rect.bottom;
      
      if (Math.abs(actualBottom - expectedBottom) > 1) {
        console.warn(`[BottomNav] Position mismatch! Expected bottom: ${expectedBottom}px, Actual: ${actualBottom}px, rect.bottom: ${rect.bottom}, viewportHeight: ${viewportHeight}`);
        // Forcer encore plus
        navElement.style.setProperty('bottom', '0px', 'important');
        navElement.style.setProperty('top', 'auto', 'important');
      }
      
      console.log('[BottomNav] Forced positioning applied, isMobile:', isMobile(), 'bottom:', rect.bottom, 'viewportHeight:', viewportHeight, 'actualBottom:', actualBottom);
    };

    // Appliquer immédiatement et après un délai
    forcePositioning();
    setTimeout(forcePositioning, 100);
    setTimeout(forcePositioning, 500);
    setTimeout(forcePositioning, 1000);

    // Réappliquer sur resize et scroll pour maintenir le positionnement fixe
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        forcePositioning();
      });
    };

    window.addEventListener('resize', forcePositioning);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Forcer le positionnement périodiquement pour éviter les problèmes
    const intervalId = setInterval(forcePositioning, 300);
    
    return () => {
      window.removeEventListener('resize', forcePositioning);
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      clearInterval(intervalId);
    };
  }, []);

  // Ne rendre le Portal que lorsque le composant est complètement monté
  if (!isMounted) {
    return null;
  }

  // S'assurer que le Portal est rendu directement dans le body
  const portalContainer = document.body;
  if (!portalContainer) {
    console.error('[BottomNav] document.body not found, cannot render Portal');
    return null;
  }

  return createPortal(tabbarElement, portalContainer);
}
