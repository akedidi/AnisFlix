import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Tv } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import DesktopSidebar from "@/components/DesktopSidebar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Hls from "hls.js";
import ShakaPlayer from "@/components/ShakaPlayer";

interface TVChannel {
  id: string;
  name: string;
  logo?: string;
  category: string;
  section: string;
}

interface TVSection {
  id: string;
  name: string;
  categories: string[];
}

const TV_SECTIONS: TVSection[] = [
  {
    id: "france",
    name: "France",
    categories: ["Généraliste", "Sport", "Fiction & Série", "Jeunesse", "Découverte", "Cinéma"]
  },
  {
    id: "international",
    name: "International",
    categories: ["Généraliste", "Sport", "Fiction & Série", "Jeunesse", "Découverte", "Cinéma"]
  },
  {
    id: "news",
    name: "Actualités",
    categories: ["Généraliste", "Sport", "Fiction & Série", "Jeunesse", "Découverte", "Cinéma"]
  }
];

const TV_CHANNELS: TVChannel[] = [
  // === SECTION FRANCE ===
  // Généraliste
  { id: "87", name: "TF1", category: "Généraliste", section: "france" },
  { id: "137", name: "France 2", category: "Généraliste", section: "france" },
  { id: "138", name: "France 3", category: "Généraliste", section: "france" },
  { id: "102", name: "M6", category: "Généraliste", section: "france" },
  { id: "106", name: "Canal+", category: "Généraliste", section: "france" },
  { id: "78", name: "TMC", category: "Généraliste", section: "france" },
  { id: "79", name: "W9", category: "Généraliste", section: "france" },
  { id: "77", name: "TFX", category: "Généraliste", section: "france" },
  { id: "90", name: "RMC Découverte", category: "Généraliste", section: "france" },
  
  // Sport
  { id: "44", name: "Bein Sports 1", category: "Sport", section: "france" },
  { id: "49", name: "Bein Sports 2", category: "Sport", section: "france" },
  { id: "50", name: "Bein Sports 3", category: "Sport", section: "france" },
  { id: "88", name: "Canal+ Foot", category: "Sport", section: "france" },
  { id: "58", name: "Canal+ Sport 360", category: "Sport", section: "france" },
  { id: "33", name: "RMC Sport 1", category: "Sport", section: "france" },
  { id: "40", name: "RMC Sport 2", category: "Sport", section: "france" },
  { id: "42", name: "RMC Sport 3", category: "Sport", section: "france" },
  
  // Fiction & Série
  { id: "91", name: "Syfy", category: "Fiction & Série", section: "france" },
  
  // Jeunesse
  { id: "104", name: "Game One", category: "Jeunesse", section: "france" },
  { id: "97", name: "Mangas", category: "Jeunesse", section: "france" },
  { id: "180", name: "Boomerang", category: "Jeunesse", section: "france" },
  { id: "76", name: "Cartoon Network", category: "Jeunesse", section: "france" },
  
  // Découverte
  { id: "81", name: "National Geographic Channel", category: "Découverte", section: "france" },
  { id: "82", name: "National Geographic Wild", category: "Découverte", section: "france" },
  
  // Cinéma
  { id: "95", name: "TCM Cinema", category: "Cinéma", section: "france" },
];

export default function TVChannels() {
  const { t } = useLanguage();
  const [selectedChannel, setSelectedChannel] = useState<TVChannel | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("france");
  const [selectedCategory, setSelectedCategory] = useState<string>("Généraliste");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerType, setPlayerType] = useState<'hls' | 'shaka' | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Filtrer les chaînes par section et catégorie
  const filteredChannels = TV_CHANNELS.filter(
    channel => channel.section === selectedSection && channel.category === selectedCategory
  );

  // Obtenir les catégories disponibles pour la section sélectionnée
  const availableCategories = TV_SECTIONS.find(section => section.id === selectedSection)?.categories || [];

  // Réinitialiser la catégorie quand on change de section
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [selectedSection, availableCategories, selectedCategory]);

  // Fonction pour détecter le type de lien et déterminer le player
  const detectPlayerType = async (channelId: string): Promise<'hls' | 'shaka'> => {
    try {
      // Faire une requête HEAD pour analyser le type de contenu
      const response = await fetch(`/api/tv-stream?channelId=${channelId}`, {
        method: 'HEAD'
      });
      
      const contentType = response.headers.get('content-type') || '';
      const url = response.url;
      
      console.log('🔍 Analyse du lien TV:', { contentType, url });
      
      // Détecter le type de lien
      if (url.includes('.mpd') || contentType.includes('application/dash+xml')) {
        console.log('📺 Lien MPD détecté → Shaka Player');
        return 'shaka';
      } else if (url.includes('.m3u8') && !url.includes('segments')) {
        // M3U8 direct (pas de segments) → Shaka Player
        console.log('📺 Lien M3U8 direct détecté → Shaka Player');
        return 'shaka';
      } else {
        // M3U8 avec segments → HLS Player
        console.log('📺 Lien M3U8 avec segments détecté → HLS Player');
        return 'hls';
      }
    } catch (error) {
      console.warn('⚠️ Impossible de détecter le type, utilisation du HLS Player par défaut');
      return 'hls';
    }
  };

  // Fonction pour initialiser le player HLS
  const initHLSPlayer = async (streamUrl: string) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1,
        capLevelToPlayerSize: true,
        liveBackBufferLength: 10,
        maxLiveSyncPlaybackRate: 1.05,
      });
      
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(err => {
          console.error("Erreur de lecture:", err);
          setError("Impossible de lire le flux");
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data: any) => {
        console.error("Erreur HLS:", data);
        setIsLoading(false);
        if (data.fatal) {
          setError("Erreur fatale lors du chargement du flux");
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 2000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.recoverMediaError();
                }
              }, 1000);
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(err => {
          console.error("Erreur de lecture:", err);
          setError("Impossible de lire le flux");
        });
      });
    } else {
      setError("Votre navigateur ne supporte pas HLS");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedChannel) {
      setPlayerType(null);
      setStreamUrl(null);
      return;
    }

    const initializePlayer = async () => {
      setIsLoading(true);
      setError(null);
      
      const streamUrl = `/api/tv-stream?channelId=${selectedChannel.id}`;
      setStreamUrl(streamUrl);
      
      // Détecter le type de player nécessaire
      const detectedPlayerType = await detectPlayerType(selectedChannel.id);
      setPlayerType(detectedPlayerType);
      
      if (detectedPlayerType === 'hls') {
        await initHLSPlayer(streamUrl);
      } else {
        // Pour Shaka Player, on laisse le composant ShakaPlayer gérer la lecture
        setIsLoading(false);
      }
    };

    initializePlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel]);


  return (
    <div className="min-h-screen fade-in-up">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className="md:ml-64">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tv className="w-8 h-8" />
                <h1 className="text-2xl md:text-3xl font-bold">{t('nav.tvChannels')}</h1>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSelect />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="grid lg:grid-cols-[1fr_350px] gap-8">
          <div className="space-y-6">
            {selectedChannel ? (
              <Card className="overflow-hidden">
                <div className="aspect-video bg-black relative">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-xl">Chargement du flux...</div>
                    </div>
                  )}
                  {error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-red-500 text-xl">{error}</div>
                    </div>
                  )}
                  
                  {/* Affichage conditionnel du player selon le type détecté */}
                  {playerType === 'hls' && streamUrl ? (
                    <video
                      ref={videoRef}
                      className="w-full h-full"
                      controls
                      autoPlay
                      data-testid="video-player-hls"
                    />
                  ) : playerType === 'shaka' && streamUrl ? (
                    <ShakaPlayer
                      url={streamUrl}
                      title={selectedChannel.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <Tv className="w-12 h-12 mx-auto mb-2" />
                        <p>Initialisation du player...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{selectedChannel.name}</h2>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{selectedChannel.category}</Badge>
                        <Badge variant="outline">{TV_SECTIONS.find(s => s.id === selectedChannel.section)?.name}</Badge>
                        {playerType && (
                          <Badge variant="outline" className="text-xs">
                            {playerType === 'hls' ? 'HLS Player' : 'Shaka Player'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="text-center py-20">
                <Tv className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Sélectionnez une chaîne</h2>
                <p className="text-muted-foreground">
                  Choisissez une section, puis une catégorie et une chaîne pour commencer à regarder
                </p>
              </div>
            )}
          </div>

          {/* Navigation par sections et catégories */}
          <div className="space-y-6">
            {/* Sélection de section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Sections</h3>
              <div className="grid grid-cols-1 gap-2">
                {TV_SECTIONS.map(section => (
                  <Button
                    key={section.id}
                    variant={selectedSection === section.id ? "default" : "outline"}
                    onClick={() => setSelectedSection(section.id)}
                    className="justify-start"
                    data-testid={`section-${section.id}`}
                  >
                    {section.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sélection de catégorie */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Catégories</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableCategories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    className="text-sm"
                    data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {/* Liste des chaînes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Chaînes {TV_SECTIONS.find(s => s.id === selectedSection)?.name} - {selectedCategory}
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredChannels.length > 0 ? (
                  filteredChannels.map(channel => (
                    <Card
                      key={channel.id}
                      className={`p-4 cursor-pointer transition-colors hover-elevate ${
                        selectedChannel?.id === channel.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedChannel(channel)}
                      data-testid={`channel-${channel.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Tv className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{channel.name}</h4>
                          </div>
                        </div>
                        <Play className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tv className="w-12 h-12 mx-auto mb-2" />
                    <p>Aucune chaîne disponible</p>
                    <p className="text-sm">pour cette section et catégorie</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      </div>
    </div>
  );
}
