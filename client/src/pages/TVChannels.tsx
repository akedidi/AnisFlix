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

interface TVChannelLink {
  type: 'mpd' | 'hls_direct' | 'hls_segments';
  url: string;
}

interface TVChannel {
  id: string;
  name: string;
  logo?: string;
  category: string;
  section: string;
  links: TVChannelLink[];
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
    categories: ["Généraliste", "Info", "Sport", "Fiction & Série", "Jeunesse", "Découverte", "Cinéma"]
  },
  {
    id: "arabe",
    name: "Arabe",
    categories: ["Sport", "Tunisie", "Info"]
  }
];

const TV_CHANNELS: TVChannel[] = [
  // ===== SECTION FRANCE =====
  
  // Généraliste
  { id: "tf1", name: "TF1", category: "Généraliste", section: "france", links: [
    { type: "mpd", url: "https://viamotionhsi.netplus.ch/live/eds/tf1hd/browser-dash/tf1hd.mpd" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/87.m3u8" }
  ]},
  { id: "tf1-serie", name: "TF1 Serie", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/hd1.m3u8" }
  ]},
  { id: "france2", name: "France 2", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://simulcast-p.ftven.fr/ZXhwPTE3NjA3ODM0NjF+YWNsPSUyZip+aG1hYz0wMTMyZjkyODNmZTQ5OGM4M2MwMDY4OGFkYjg1ODA5OGNkMmE0OWYwZjZkMTlhZGNlNjZlNzU5ZWMzMmYyYzAx/simulcast/France_2/hls_fr2/France_2-avc1_2500000=5.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/137.m3u8" }
  ]},
  { id: "france3", name: "France 3", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/france3hd.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/138.m3u8" }
  ]},
  { id: "france4", name: "France 4", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://raw.githubusercontent.com/ipstreet312/freeiptv/master/ressources/ftv/py/fr4.m3u8" }
  ]},
  { id: "france5", name: "France 5", category: "Généraliste", section: "france", links: [
    { type: "hls_segments", url: "https://simulcast-p.ftven.fr/ZXhwPTE3NjA3ODM0NjF+YWNsPSUyZip+aG1hYz0wMTMyZjkyODNmZTQ5OGM4M2MwMDY4OGFkYjg1ODA5OGNkMmE0OWYwZjZkMTlhZGNlNjZlNzU5ZWMzMmYyYzAx/simulcast/France_5/hls_fr5/France_5-avc1_2500000=5.m3u8" }
  ]},
  { id: "m6", name: "M6", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/m6hd.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/102.m3u8" }
  ]},
  { id: "arte", name: "Arte", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8" }
  ]},
  { id: "tfx", name: "TFX", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/nt1/browser-HLS8/nt1.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/77.m3u8" }
  ]},
  { id: "canal-plus", name: "Canal+", category: "Généraliste", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/106.m3u8" }
  ]},
  { id: "tmc", name: "TMC", category: "Généraliste", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/78.m3u8" }
  ]},
  { id: "w9", name: "W9", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/w9.m3u8" },
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/79.m3u8" }
  ]},
  { id: "rmc-decouverte", name: "RMC Découverte", category: "Généraliste", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/90.m3u8" }
  ]},
  { id: "gulli", name: "Gulli", category: "Généraliste", section: "france", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/gulli/browser-HLS8/gulli.m3u8" }
  ]},

  // Info
  { id: "bfmtv", name: "BFM TV", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8" }
  ]},
  { id: "bfm-business", name: "BFM Business", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_BUSINESS/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "bfm-paris", name: "BFM Paris", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://www.viously.com/video/hls/G86AvlqLgXj/index.m3u8" }
  ]},
  { id: "bfm-lyon", name: "BFM Lyon", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_LYON/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "bfm-litoral", name: "BFM Litoral", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLITTORAL/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "bfm-alsace", name: "BFM Alsace", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_ALSACE/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "bfm-grand-lille", name: "BFM Grand Lille", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLILLE/index.m3u8?start=LIVE&end=END" }
  ]},
  { id: "rt-france", name: "RT France", category: "Info", section: "france", links: [
    { type: "hls_direct", url: "https://rt-fra.rttv.com/live/rtfrance/playlist.m3u8" }
  ]},

  // Sport
  { id: "bein-sports-1", name: "Bein Sports 1", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/44.m3u8" }
  ]},
  { id: "bein-sports-2", name: "Bein Sports 2", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/49.m3u8" }
  ]},
  { id: "bein-sports-3", name: "Bein Sports 3", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/50.m3u8" }
  ]},
  { id: "canal-plus-foot", name: "Canal+ Foot", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/88.m3u8" }
  ]},
  { id: "canal-plus-sport-360", name: "Canal+ Sport 360", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/58.m3u8" }
  ]},
  { id: "rmc-sport-1", name: "RMC Sport 1", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/33.m3u8" }
  ]},
  { id: "rmc-sport-2", name: "RMC Sport 2", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/40.m3u8" }
  ]},
  { id: "rmc-sport-3", name: "RMC Sport 3", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/42.m3u8" }
  ]},
  { id: "lequipe-tv", name: "L'Équipe TV", category: "Sport", section: "france", links: [
    { type: "hls_segments", url: "https://live2.eu-north-1b.cf.dmcdn.net/sec2(ermuWFoalFOnbKlK1xFl5N6-RFs8TR8ytC0BN_948kQeziLQ1-fkqkfWedz6vwq2pV6cqOmVPXuHrmkEOQaWFwzk0ey6_-rMEdaMlm0fB0xLwngtrfO1pgJlnMjnpi2h)/cloud/3/x2lefik/d/live-720.m3u8" }
  ]},

  // Fiction & Série
  { id: "syfy", name: "Syfy", category: "Fiction & Série", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/91.m3u8" }
  ]},

  // Jeunesse
  { id: "game-one", name: "Game One", category: "Jeunesse", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/104.m3u8" }
  ]},
  { id: "mangas", name: "Mangas", category: "Jeunesse", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/97.m3u8" }
  ]},
  { id: "boomerang", name: "Boomerang", category: "Jeunesse", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/180.m3u8" }
  ]},
  { id: "cartoon-network", name: "Cartoon Network", category: "Jeunesse", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/76.m3u8" }
  ]},

  // Découverte
  { id: "natgeo", name: "National Geographic Channel", category: "Découverte", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/81.m3u8" }
  ]},
  { id: "natgeo-wild", name: "National Geographic Wild", category: "Découverte", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/82.m3u8" }
  ]},

  // Cinéma
  { id: "tcm-cinema", name: "TCM Cinema", category: "Cinéma", section: "france", links: [
    { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/95.m3u8" }
  ]},

  // ===== SECTION ARABE =====
  
  // Sport
  { id: "elkass-1", name: "ElKass 1", category: "Sport", section: "arabe", links: [
    { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164621_live/148164621_296.sdp/playlist.m3u8" }
  ]},
  { id: "elkass-2", name: "ElKass 2", category: "Sport", section: "arabe", links: [
    { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164528_live/148164528_296.sdp/playlist.m3u8" }
  ]},
  { id: "elkass-3", name: "ElKass 3", category: "Sport", section: "arabe", links: [
    { type: "hls_direct", url: "https://streamer2.qna.org.qa/148161470_live/148161470_296.sdp/playlist.m3u8" }
  ]},
  { id: "elkass-4", name: "ElKass 4", category: "Sport", section: "arabe", links: [
    { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164621_live/148164621_296.sdp/playlist.m3u8" }
  ]},

  // Tunisie
  { id: "watania-1", name: "Watania 1", category: "Tunisie", section: "arabe", links: [
    { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/tunisienationale/browser-HLS8/tunisienationale.m3u8" }
  ]},
  { id: "hiwar-tounsi", name: "Hiwar Tounsi", category: "Tunisie", section: "arabe", links: [
    { type: "hls_direct", url: "https://live20.bozztv.com/akamaissh101/ssh101/venolie-hiwar/playlist.m3u8" }
  ]},

  // Info
  { id: "eljazira", name: "ElJazira", category: "Info", section: "arabe", links: [
    { type: "hls_direct", url: "https://live-hls-web-aja.getaj.net/AJA/04.m3u8" }
  ]},
  { id: "eljazira-english", name: "ElJazira English", category: "Info", section: "arabe", links: [
    { type: "hls_direct", url: "https://live-hls-web-aje.getaj.net/AJE/04.m3u8" }
  ]},
  { id: "rt-arabe", name: "RT Arabe", category: "Info", section: "arabe", links: [
    { type: "hls_direct", url: "https://rt-arb.rttv.com/live/rtarab/playlist.m3u8" }
  ]},
  { id: "elarabiya", name: "ElAarabiya", category: "Info", section: "arabe", links: [
    { type: "hls_direct", url: "https://shls-live-ak.akamaized.net/out/v1/f5f319206ed740f9a831f2097c2ead23/index_37.m3u8" }
  ]}
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

  // Fonction pour sélectionner le meilleur lien et déterminer le player
  const selectBestLink = (channel: TVChannel): { url: string; playerType: 'hls' | 'shaka' } => {
    // Priorité des types de liens (du meilleur au moins bon)
    const linkPriority = ['mpd', 'hls_direct', 'hls_segments'];
    
    for (const priority of linkPriority) {
      const link = channel.links.find(l => l.type === priority);
      if (link) {
        const playerType = (priority === 'mpd' || priority === 'hls_direct') ? 'shaka' : 'hls';
        console.log(`📺 Lien sélectionné pour ${channel.name}:`, { type: priority, playerType, url: link.url });
        return { url: link.url, playerType };
      }
    }
    
    // Fallback si aucun lien trouvé
    console.warn(`⚠️ Aucun lien trouvé pour ${channel.name}`);
    return { url: '', playerType: 'hls' };
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
      
      // Sélectionner le meilleur lien pour cette chaîne
      const { url: streamUrl, playerType: detectedPlayerType } = selectBestLink(selectedChannel);
      
      if (!streamUrl) {
        setError("Aucun lien de streaming disponible pour cette chaîne");
        setIsLoading(false);
        return;
      }
      
      setStreamUrl(streamUrl);
      setPlayerType(detectedPlayerType);
      
      if (detectedPlayerType === 'hls') {
        await initHLSPlayer(streamUrl);
      } else {
        // Pour Shaka Player, on l'affiche dans la carte
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
                      onClose={() => setSelectedChannel(null)}
                      embedded={true}
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
