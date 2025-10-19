import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useMultiSearch } from "@/hooks/useTMDB";

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
  const { data: searchResults = [] } = useMultiSearch(searchQuery);

  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        {/* Header - Fixed on all devices */}
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border fixed top-0 left-0 right-0 z-40 md:left-64">
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
                      window.location.href = path;
                    }}
                  />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <LanguageSelect />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Content with top padding for fixed header */}
        <div className="pt-16 md:pt-16">
          {children}
        </div>
      </div>
    </div>
  );
}
