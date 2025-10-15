import { useState } from 'react';
import { useTopStream } from '@/hooks/useTopStream';
import { useFStream } from '@/hooks/useFStream';
import { useMovixDownload } from '@/hooks/useMovixDownload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Source {
  id: string;
  name: string;
  provider: string;
  url?: string;
  type?: "m3u8" | "mp4" | "embed";
  player?: string;
  isFStream?: boolean;
  isTopStream?: boolean;
  isMovixDownload?: boolean;
  sourceKey?: string;
  isEpisode?: boolean;
  quality?: string;
  language?: string;
}

interface StreamingSourcesProps {
  type: 'movie' | 'tv';
  id: number;
  title: string;
  sources: Source[];
  onSourceClick: (source: { 
    url: string; 
    type: "m3u8" | "mp4"; 
    name: string;
    isTopStream?: boolean;
    isFStream?: boolean;
    isMovixDownload?: boolean;
  }) => void;
  isLoadingSource: boolean;
  season?: number;
  episode?: number;
  imdbId?: string;
}

export default function StreamingSources({ 
  type, 
  id, 
  title, 
  sources, 
  onSourceClick, 
  isLoadingSource,
  season,
  episode,
  imdbId
}: StreamingSourcesProps) {
  const { t } = useLanguage();
  const { data: topStreamData, isLoading: isLoadingTopStream } = useTopStream(type, id);
  const { data: fStreamData, isLoading: isLoadingFStream } = useFStream(type, id, season);
  const { data: movixDownloadData, isLoading: isLoadingMovixDownload } = useMovixDownload(type, id, season, episode, title);

  const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR'>('VF');

  // Créer la liste unifiée des sources
  const allSources = [];


  // Ajouter TopStream en premier si disponible (VF uniquement)
  if (topStreamData && topStreamData.stream && topStreamData.stream.url && selectedLanguage === 'VF') {
    allSources.push({
      id: 'topstream',
      name: `TopStream (${topStreamData.stream.label})`,
      provider: 'topstream',
      url: topStreamData.stream.url,
      type: 'mp4' as const,
      isTopStream: true
    });
  }

  // Ajouter les sources MovixDownload (Darkibox) si disponibles (VF uniquement)
  if (movixDownloadData && movixDownloadData.sources && selectedLanguage === 'VF') {
    // Trier les sources par qualité (du meilleur au moins bon)
    const qualityOrder = ['4K', '2160p', '1080p', '720p', '480p', '360p', '240p'];
    
    const sortedSources = movixDownloadData.sources.sort((a: any, b: any) => {
      const qualityA = a.quality || 'Unknown';
      const qualityB = b.quality || 'Unknown';
      
      const indexA = qualityOrder.indexOf(qualityA);
      const indexB = qualityOrder.indexOf(qualityB);
      
      // Si les deux qualités sont dans la liste, trier par index
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // Si une seule est dans la liste, la prioriser
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Si aucune n'est dans la liste, trier alphabétiquement
      return qualityA.localeCompare(qualityB);
    });

    // Grouper par qualité et numéroter
    const sourcesByQuality = sortedSources.reduce((acc: any, source: any) => {
      const quality = source.quality || 'Unknown';
      if (!acc[quality]) {
        acc[quality] = [];
      }
      acc[quality].push(source);
      return acc;
    }, {});

    // Ajouter les sources groupées par qualité
    Object.entries(sourcesByQuality).forEach(([quality, sources]: [string, any]) => {
      sources.forEach((source: any, index: number) => {
        const languageLabel = source.language === 'MULTI' ? 'Multi' : 
                             source.language === 'FRE' ? 'Français' : 
                             source.language === 'ENG' ? 'Anglais' : source.language;

        // Ajouter un numéro si plusieurs sources de même qualité
        const qualityLabel = sources.length > 1 ? `${quality} #${index + 1}` : quality;
        
        // Modifier l'URL pour forcer les sous-titres français
        let modifiedUrl = source.m3u8;
        if (source.language === 'MULTI' || source.language === 'FRE') {
          // Ajouter le paramètre pour forcer les sous-titres français
          const url = new URL(source.m3u8);
          url.searchParams.set('subtitle', 'fr');
          modifiedUrl = url.toString();
        }

        allSources.push({
          id: `movix-download-${quality.toLowerCase()}-${index}`,
          name: `Darkibox ${qualityLabel} (${languageLabel})`,
          provider: 'darkibox',
          url: modifiedUrl,
          type: 'm3u8' as const,
          isMovixDownload: true,
          quality: quality,
          language: source.language
        });
      });
    });
  }

  // Ajouter seulement Vidzy depuis FStream si disponible
  if (fStreamData && fStreamData.players) {
    
    let vidzyCounter = 1;
    
    if (selectedLanguage === 'VF') {
      // Pour VF, traiter chaque clé séparément pour distinguer les sources
      // Default est maintenant considéré comme VF
      const vfKeys = Object.keys(fStreamData.players).filter(key => 
        key.startsWith('VF') || key === 'VF' || key === 'Default'
      );
      
      console.log('VF keys found (including Default):', vfKeys);
      
      // Traiter toutes les clés VF (VFF, VFQ, Default, etc.)
      vfKeys.forEach(key => {
        if (fStreamData.players![key]) {
          console.log(`Processing players from ${key}:`, fStreamData.players![key]);
          
          // Filtrer seulement Vidzy pour cette clé
          const vidzyPlayers = fStreamData.players![key].filter((player: any) => 
            player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
          );
          
          // Ajouter chaque source Vidzy avec une mention distincte
          vidzyPlayers.forEach((player: any) => {
            allSources.push({
              id: `fstream-vidzy-${key.toLowerCase()}-${vidzyCounter}`,
              name: `Vidzy${vidzyCounter} (${key === 'Default' ? 'VF' : key}) - ${player.quality}`,
              provider: 'fstream',
              url: player.url,
              type: 'm3u8' as const,
              player: player.player,
              isFStream: true,
              sourceKey: key
            });
            vidzyCounter++;
          });
        }
      });
    } else {
      // Pour VOSTFR, utiliser la clé VOSTFR
      const vostfrPlayers = fStreamData.players.VOSTFR || [];
      console.log('VOSTFR players:', vostfrPlayers);
      
      const vostfrVidzyPlayers = vostfrPlayers.filter((player: any) => 
        player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
      );
      
      vostfrVidzyPlayers.forEach((player: any) => {
        allSources.push({
          id: `fstream-vidzy-vostfr-${vidzyCounter}`,
          name: `Vidzy${vidzyCounter} (VOSTFR) - ${player.quality}`,
          provider: 'fstream',
          url: player.url,
          type: 'm3u8' as const,
          player: player.player,
          isFStream: true,
          sourceKey: 'VOSTFR'
        });
        vidzyCounter++;
      });
    }
  }

  // Ajouter seulement Vidzy depuis les épisodes FStream si c'est une série
  if (type === 'tv' && fStreamData && fStreamData.episodes && episode) {
    const episodeData = fStreamData.episodes[episode.toString()];
    if (episodeData && episodeData.languages) {
      let episodeVidzyCounter = 1;
      
      if (selectedLanguage === 'VF') {
        // Pour VF, traiter chaque clé séparément pour distinguer les sources
        // Default est maintenant considéré comme VF
        const vfKeys = Object.keys(episodeData.languages).filter(key => 
          key.startsWith('VF') || key === 'VF' || key === 'Default'
        );
        
        // Traiter toutes les clés VF (VFF, VFQ, Default, etc.)
        vfKeys.forEach(key => {
          if (episodeData.languages && episodeData.languages[key as keyof typeof episodeData.languages]) {
            // Filtrer seulement Vidzy pour cette clé
            const vidzyPlayers = episodeData.languages[key as keyof typeof episodeData.languages]!.filter((player: any) => 
              player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
            );
            
            // Ajouter chaque source Vidzy avec une mention distincte
            vidzyPlayers.forEach((player: any) => {
              allSources.push({
                id: `fstream-episode-vidzy-${key.toLowerCase()}-${episodeVidzyCounter}`,
                name: `Vidzy${episodeVidzyCounter} (${key === 'Default' ? 'VF' : key}) - ${player.quality}`,
                provider: 'fstream',
                url: player.url,
                type: 'm3u8' as const,
                player: player.player,
                isFStream: true,
                sourceKey: key,
                isEpisode: true
              });
              episodeVidzyCounter++;
            });
          }
        });
      } else {
        // Pour VOSTFR, utiliser la clé VOSTFR
        const vostfrPlayers = episodeData.languages.VOSTFR || [];
        
        const vostfrVidzyPlayers = vostfrPlayers.filter((player: any) => 
          player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
        );
        
        vostfrVidzyPlayers.forEach((player: any) => {
          allSources.push({
            id: `fstream-episode-vidzy-vostfr-${episodeVidzyCounter}`,
            name: `Vidzy${episodeVidzyCounter} (VOSTFR) - ${player.quality}`,
            provider: 'fstream',
            url: player.url,
            type: 'm3u8' as const,
            player: player.player,
            isFStream: true,
            sourceKey: 'VOSTFR',
            isEpisode: true
          });
          episodeVidzyCounter++;
        });
      }
    }
  }


  // Sources statiques supprimées - on utilise maintenant uniquement les APIs TopStream et FStream


  const handleSourceClick = (source: any) => {
    if (source.isTopStream) {
      // Pour TopStream, on utilise directement l'URL
      onSourceClick({
        url: source.url,
        type: source.type,
        name: source.name,
        isTopStream: true
      });
    } else if (source.isFStream) {
      // Pour Vidzy via FStream, on utilise le scraper existant
      onSourceClick({
        url: source.url,
        type: 'm3u8' as const,
        name: source.name,
        isFStream: true
      });
    } else if (source.isMovixDownload) {
      // Pour les sources MovixDownload (Darkibox), on utilise directement le lien m3u8
      onSourceClick({
        url: source.url,
        type: 'mp4' as const, // Traiter comme mp4 pour éviter le scraper
        name: source.name,
        isMovixDownload: true
      });
    }
  };

  if (isLoadingTopStream || isLoadingFStream || isLoadingMovixDownload) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Play className="w-5 h-5" />
          {t("topstream.sources")}
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-muted-foreground">{t("topstream.searching")}</span>
        </div>
      </div>
    );
  }

  if (allSources.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Play className="w-5 h-5" />
          {t("topstream.sources")}
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucune source de streaming disponible pour le moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Play className="w-5 h-5" />
        {t("topstream.sources")}
      </h2>

      {/* Sélecteur de langue - seulement si on a des sources FStream */}
      {fStreamData && (
        <div className="flex gap-2">
          <Button
            variant={selectedLanguage === 'VF' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VF')}
          >
            {t("topstream.vf")}
          </Button>
          <Button
            variant={selectedLanguage === 'VOSTFR' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VOSTFR')}
          >
            {t("topstream.vostfr")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {allSources.map((source) => (
          <div key={source.id} className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-3"
              onClick={() => handleSourceClick(source)}
              disabled={isLoadingSource}
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                {source.name}
                {source.isTopStream && (
                  <Badge variant="secondary" className="text-xs">
                    TopStream
                  </Badge>
                )}
                {source.isFStream && (
                  <Badge variant="outline" className="text-xs">
                    FStream
                  </Badge>
                )}
                {source.isMovixDownload && (
                  <Badge variant="default" className="text-xs">
                    Darkibox
                  </Badge>
                )}
                {source.quality && (
                  <Badge variant="secondary" className="text-xs">
                    {source.quality}
                  </Badge>
                )}
                {source.language && source.language !== 'MULTI' && (
                  <Badge variant="outline" className="text-xs">
                    {source.language}
                  </Badge>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {isLoadingSource ? t("topstream.loading") : "Regarder"}
              </span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}