import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import DesktopSidebar from "@/components/DesktopSidebar";
import OfflineAlert from "@/components/OfflineAlert";
import { useMultiSearch } from "@/hooks/useTMDB";
import { useOffline } from "@/hooks/useOffline";
import { useMobileScroll } from "@/hooks/useMobileScroll";
import { useNativeDetection } from "@/hooks/useNativeDetection";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import IonicPullToRefresh from "@/components/IonicPullToRefresh";
// import DeepOriginDiagnostic from "@/components/DeepOriginDiagnostic"; // Supprimé - problème résolu

interface CommonLayoutProps {
  title?: string;
  showSearch?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  // Props pour recherche personnalisée
  customSearchQuery?: string;
  customSearchResults?: any[];
  onCustomSearch?: (query: string) => void;
  onCustomSearchSelect?: (item: any) => void;
}

export default function CommonLayout({ 
  title, 
  showSearch = true, 
  icon,
  children,
  onRefresh,
  showRefreshButton = true,
  customSearchQuery,
  customSearchResults,
  onCustomSearch,
  onCustomSearchSelect
}: CommonLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { isOffline } = useOffline();
  
  // Utiliser la hauteur réelle du viewport (compatible iOS)
  const viewportHeight = useViewportHeight();
  
  // État pour ajuster le header sur iOS natif
  const [headerOffset, setHeaderOffset] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Utiliser la recherche personnalisée si fournie, sinon utiliser la recherche TMDB
  const isCustomSearch = !!customSearchQuery || !!customSearchResults;
  const finalSearchQuery = isCustomSearch ? customSearchQuery : searchQuery;
  
  // Seulement utiliser useMultiSearch si ce n'est pas une recherche personnalisée
  const { data: tmdbSearchResults = [] } = useMultiSearch(isCustomSearch ? "" : searchQuery);
  const finalSearchResults = isCustomSearch ? (customSearchResults || []) : tmdbSearchResults;
  
  // Debug pour les résultats de recherche
  if (finalSearchResults.length > 0) {
    console.log('🔍 [COMMON LAYOUT] Search results:', finalSearchResults.map((item: any) => ({
      id: item.id,
      title: item.title,
      mediaType: item.mediaType,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath
    })));
  }
  
  // Gérer le scroll sur mobile - TEMPORAIREMENT DÉSACTIVÉ pour tester
  // useMobileScroll();
  
  // Détecter l'environnement natif
  const { isNativeMobile, getContainerClass } = useNativeDetection();
  
  // Gérer le refresh Ionic pour les apps natives
  const handleIonicRefresh = (event: CustomEvent<any>) => {
    console.log('🔄 [IONIC REFRESH] Refresh triggered!', event);
    
    const refreshFunction = onRefresh || (() => {
      console.log('🔄 [IONIC REFRESH] Using default refresh (window.location.reload)');
      window.location.reload();
    });
    
    console.log('🔄 [IONIC REFRESH] Executing refresh function...');
    // Exécuter la fonction de refresh
    refreshFunction();
    
    // Compléter le refresh après un délai
    setTimeout(() => {
      console.log('🔄 [IONIC REFRESH] Completing refresh');
      event.detail.complete();
    }, 1000);
  };
  


  // Ajuster le header sur iOS natif pour éviter l'encoche et la status bar
  useEffect(() => {
    // Vérifier si on est sur iOS natif (Capacitor)
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isCapacitor && isIOS) {
      // Calculer l'offset pour éviter l'encoche et la status bar
      const statusBarHeight = 34; // Hauteur approximative de la status bar + encoche
      const additionalOffset = 20; // Ajustement supplémentaire
      const offset = statusBarHeight + additionalOffset;
      
      setHeaderOffset(offset);
      
      // Appliquer le style avec un délai pour s'assurer que le header est monté
      setTimeout(() => {
        if (headerRef.current) {
          headerRef.current.style.top = `${offset}px`;
          headerRef.current.style.paddingTop = '8px'; // Ajouter un peu de padding
        }
      }, 100);
    }
  }, [viewportHeight]);

  return (
    <>
      {/* Offline Alert for Native Mobile */}
      <OfflineAlert 
        onRefresh={onRefresh} 
        showRefreshButton={showRefreshButton}
      />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Header - Fixed on all devices */}
      <div 
        ref={headerRef}
        className={`bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border fixed top-0 left-0 right-0 z-[1000000] md:left-64 header-ios-safe ${isNativeMobile ? 'native-mobile' : ''}`}
        style={{
          top: isNativeMobile ? undefined : '0px',
          marginTop: isNativeMobile ? undefined : '0px',
          paddingTop: isNativeMobile ? undefined : '0px'
        }}
      >
        <div className={`container mx-auto px-4 md:px-8 lg:px-12 ${isNativeMobile ? 'py-4' : 'py-2 md:py-4'}`}>
          <div className="flex items-center gap-4">
            {showSearch && (
              <div className="flex-1 relative">
                <SearchBar
                  onSearch={isCustomSearch ? onCustomSearch : setSearchQuery}
                  suggestions={finalSearchQuery ? finalSearchResults : []}
                  onSelect={(item) => {
                    if (isCustomSearch && onCustomSearchSelect) {
                      onCustomSearchSelect(item);
                    } else {
                      const path = item.mediaType === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
                      setLocation(path);
                    }
                  }}
                />
              </div>
            )}
            
            {/* Spacer pour pousser les boutons vers la droite quand pas de search */}
            {!showSearch && <div className="flex-1"></div>}
            
            <div className="flex items-center gap-2">
              {isOffline && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-500 rounded-md text-xs">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Hors ligne
                </div>
              )}
              <LanguageSelect />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

          {/* Main Content */}
          <IonicPullToRefresh onRefresh={handleIonicRefresh}>
            <div 
              className={`${getContainerClass("main-content")} md:ml-64 md:pb-0`}
              id="main-content-desktop"
              style={{ 
                paddingTop: headerOffset > 0 
                  ? `${100 + headerOffset + 8}px` 
                  : window.innerWidth >= 768 
                    ? '70px' 
                    : '70px'
              }}
            >
              {children}
            </div>
          </IonicPullToRefresh>
      
      {/* Problème de hauteur résolu avec visualViewport.height */}
    </>
  );
}
