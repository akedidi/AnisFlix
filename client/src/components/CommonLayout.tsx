import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import DesktopSidebar from "@/components/DesktopSidebar";
import OfflineAlert from "@/components/OfflineAlert";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { useMultiSearch } from "@/hooks/useTMDB";
import { useOffline } from "@/hooks/useOffline";
import { useMobileScroll } from "@/hooks/useMobileScroll";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useNativeDetection } from "@/hooks/useNativeDetection";

interface CommonLayoutProps {
  title?: string;
  showSearch?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  enablePullToRefresh?: boolean;
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
  enablePullToRefresh = true,
  customSearchQuery,
  customSearchResults,
  onCustomSearch,
  onCustomSearchSelect
}: CommonLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { isOffline } = useOffline();
  const { data: searchResults = [] } = useMultiSearch(searchQuery);
  
  // Utiliser la recherche personnalisée si fournie
  const isCustomSearch = !!customSearchQuery;
  const finalSearchQuery = isCustomSearch ? customSearchQuery : searchQuery;
  const finalSearchResults = isCustomSearch ? (customSearchResults || []) : searchResults;
  
  // Gérer le scroll sur mobile
  useMobileScroll();
  
  // Détecter l'environnement natif
  const { isNativeMobile, getContainerClass } = useNativeDetection();

  // Gérer le pull-to-refresh
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh: onRefresh || (() => {
      console.log('🔄 [PULL] Refresh de la page...');
      window.location.reload();
    }),
    disabled: !enablePullToRefresh,
    threshold: 60, // Seuil plus bas pour faciliter le déclenchement
    resistance: 0.8 // Moins de résistance
  });


  return (
    <>
      {/* Offline Alert for Native Mobile */}
      <OfflineAlert 
        onRefresh={onRefresh} 
        showRefreshButton={showRefreshButton}
      />
      
      {/* Pull to Refresh Indicator - seulement si activé */}
      {enablePullToRefresh && (
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          isPulling={isPulling}
          threshold={80}
        />
      )}
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Header - Fixed on all devices */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border fixed top-0 left-0 right-0 z-50 md:left-64">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center gap-4">
            {title && (
              <div className="flex items-center gap-3">
                {icon}
                <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
              </div>
            )}
            
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
      <div className={getContainerClass("main-content min-h-screen md:ml-64 pt-20 md:pt-20 pb-20 md:pb-0 overflow-y-auto")}>
        {children}
      </div>
    </>
  );
}
