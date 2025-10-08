import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchBar from "@/components/SearchBar";
import { Play } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";

interface Channel {
  id: number;
  name: string;
  logo: string;
  category: string;
  isLive: boolean;
}

export default function TVChannels() {
  const [searchQuery, setSearchQuery] = useState("");

  // Static channel data - NOT from API
  const allChannels: Channel[] = [
    // Généraliste
    { id: 1, name: "TF1", logo: "https://upload.wikimedia.org/wikipedia/commons/d/dc/TF1_logo_2013.png", category: "Généraliste", isLive: true },
    { id: 2, name: "France 2", logo: "https://upload.wikimedia.org/wikipedia/commons/0/0c/France_2_2008.svg", category: "Généraliste", isLive: true },
    { id: 3, name: "M6", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/M6_2009.svg", category: "Généraliste", isLive: true },
    
    // Information
    { id: 4, name: "BFM TV", logo: "https://upload.wikimedia.org/wikipedia/commons/9/9a/BFM_TV_2016.svg", category: "Information", isLive: true },
    { id: 5, name: "France 24", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8a/France24.svg", category: "Information", isLive: true },
    { id: 6, name: "LCI", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b4/LCI_-_La_Cha%C3%AEne_Info_%282016%29.svg", category: "Information", isLive: true },
    
    // Sport
    { id: 7, name: "Eurosport", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Eurosport_Logo_2015.svg", category: "Sport", isLive: true },
    { id: 8, name: "L'Équipe", logo: "https://upload.wikimedia.org/wikipedia/fr/5/57/Logo_La_Cha%C3%AEne_L%27%C3%89quipe.svg", category: "Sport", isLive: true },
    
    // Découverte
    { id: 9, name: "National Geographic", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Natgeologo.svg", category: "Découverte", isLive: true },
    { id: 10, name: "Discovery Channel", logo: "https://upload.wikimedia.org/wikipedia/commons/2/27/Discovery_Channel_-_Logo_2019.svg", category: "Découverte", isLive: true },
    
    // Cinéma
    { id: 11, name: "Canal+", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Canal%2B.svg", category: "Cinéma", isLive: true },
    { id: 12, name: "OCS", logo: "https://upload.wikimedia.org/wikipedia/fr/4/4c/Orange_Cinema_Series_logo.svg", category: "Cinéma", isLive: true },
    
    // Fiction et Série
    { id: 13, name: "13ème Rue", logo: "https://upload.wikimedia.org/wikipedia/commons/6/69/13eme_rue_logo_2018.svg", category: "Fiction et Série", isLive: true },
    { id: 14, name: "Warner TV", logo: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Warner2018LA.svg", category: "Fiction et Série", isLive: true },
    
    // Jeunesse
    { id: 15, name: "Disney Channel", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Disney_Channel_logo_%282014%29.svg", category: "Jeunesse", isLive: true },
    { id: 16, name: "Cartoon Network", logo: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Cartoon_Network_logo.svg", category: "Jeunesse", isLive: true },
    
    // Musique
    { id: 17, name: "MTV", logo: "https://upload.wikimedia.org/wikipedia/commons/6/68/MTV_2021_%28brand_version%29.svg", category: "Musique", isLive: true },
    { id: 18, name: "NRJ Hits", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/NRJ_Hits_logo_2018.svg", category: "Musique", isLive: true },
  ];

  const categories = [
    "Tous",
    "Généraliste",
    "Information",
    "Sport",
    "Découverte",
    "Cinéma",
    "Fiction et Série",
    "Jeunesse",
    "Musique",
  ];

  const getChannelsByCategory = (category: string) => {
    if (category === "Tous") return allChannels;
    return allChannels.filter((channel) => channel.category === category);
  };

  const filteredChannels = searchQuery
    ? allChannels.filter((channel) =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allChannels;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar
                onSearch={setSearchQuery}
                suggestions={[]}
                onSelect={() => {}}
              />
            </div>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Chaînes TV</h1>

        {searchQuery ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredChannels.map((channel) => (
              <Card
                key={channel.id}
                className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                data-testid={`card-channel-${channel.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center p-2">
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{channel.name}</h3>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {channel.category}
                      </Badge>
                    </div>
                  </div>
                  {channel.isLive && (
                    <Badge variant="default" className="gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      LIVE
                    </Badge>
                  )}
                </div>
                <Button className="w-full gap-2" data-testid={`button-watch-${channel.name.toLowerCase()}`}>
                  <Play className="w-4 h-4" />
                  Regarder
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="Tous" className="w-full">
            <TabsList className="flex-wrap h-auto mb-6">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  data-testid={`tab-${category.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getChannelsByCategory(category).map((channel) => (
                    <Card
                      key={channel.id}
                      className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`card-channel-${channel.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center p-2">
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold">{channel.name}</h3>
                            <p className="text-sm text-muted-foreground">{channel.category}</p>
                          </div>
                        </div>
                        {channel.isLive && (
                          <Badge variant="default" className="gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            LIVE
                          </Badge>
                        )}
                      </div>
                      <Button className="w-full gap-2" data-testid={`button-watch-${channel.name.toLowerCase()}`}>
                        <Play className="w-4 h-4" />
                        Regarder
                      </Button>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
