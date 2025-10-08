import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Tv } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelect from "@/components/LanguageSelect";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Hls from "hls.js";

interface TVChannel {
  id: string;
  name: string;
  logo?: string;
  category: string;
}

const TV_CHANNELS: TVChannel[] = [
  { id: "78", name: "TF1", category: "Généraliste" },
  { id: "79", name: "France 2", category: "Généraliste" },
  { id: "80", name: "France 3", category: "Généraliste" },
  { id: "81", name: "Canal+", category: "Premium" },
  { id: "82", name: "France 5", category: "Culturel" },
  { id: "83", name: "M6", category: "Généraliste" },
  { id: "84", name: "Arte", category: "Culturel" },
  { id: "85", name: "C8", category: "Généraliste" },
  { id: "86", name: "W9", category: "Généraliste" },
  { id: "87", name: "TMC", category: "Généraliste" },
];

export default function TVChannels() {
  const { t } = useLanguage();
  const [selectedChannel, setSelectedChannel] = useState<TVChannel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!selectedChannel || !videoRef.current) return;

    const video = videoRef.current;
    const streamUrl = `/api/tv/stream/${selectedChannel.id}`;

    setIsLoading(true);
    setError(null);

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
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
              console.error("Erreur réseau fatale");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("Erreur média fatale");
              hls.recoverMediaError();
              break;
            default:
              console.error("Erreur fatale non récupérable");
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

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel]);

  const categories = Array.from(new Set(TV_CHANNELS.map(ch => ch.category)));

  return (
    <div className="min-h-screen pb-20 md:pb-0">
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
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    controls
                    autoPlay
                    data-testid="video-player"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{selectedChannel.name}</h2>
                      <Badge variant="secondary">{selectedChannel.category}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedChannel(null)}
                      data-testid="button-close-player"
                    >
                      Changer de chaîne
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="text-center py-20">
                <Tv className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Sélectionnez une chaîne</h2>
                <p className="text-muted-foreground">
                  Choisissez une chaîne dans la liste pour commencer à regarder
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {categories.map(category => {
              const channelsInCategory = TV_CHANNELS.filter(ch => ch.category === category);
              
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3">{category}</h3>
                  <div className="space-y-2">
                    {channelsInCategory.map(channel => (
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
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
