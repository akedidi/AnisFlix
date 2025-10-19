import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useMultiSearch } from "@/hooks/useTMDB";
import { useOffline } from "@/hooks/useOffline";

interface CommonLayoutProps {
  title?: string;
  showSearch?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function CommonLayout({ 
  title, 
  showSearch = true, 
  icon,
  children 
}: CommonLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { isOffline } = useOffline();
  const { data: searchResults = [] } = useMultiSearch(searchQuery);


  return (
    <>
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
                  onSearch={setSearchQuery}
                  suggestions={searchQuery ? searchResults : []}
                  onSelect={(item) => {
                    const path = item.mediaType === 'movie' ? `/movie/${item.id}` : `/series/${item.id}`;
                    setLocation(path);
                  }}
                />
              </div>
            )}
            
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
      <div className="min-h-screen fade-in-up md:ml-64 pt-20 md:pt-20">
        {children}
      </div>
    </>
  );
}
