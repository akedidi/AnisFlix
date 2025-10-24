import { useState, useEffect } from 'react';
import { useTopStream } from '@/hooks/useTopStream';
import { useFStream } from '@/hooks/useFStream';
import { useMovixDownload } from '@/hooks/useMovixDownload';
import { useVidMolyLinks } from '@/hooks/useWiFlix';
import { useDarkiboxSeries } from '@/hooks/useDarkiboxSeries';
import { useDarkiSeries } from '@/hooks/useDarkiSeries';
import { useAnimeVidMolyLinks } from '@/hooks/useAnimeSeries';
import { useMovixDownload as useMovixDownloadNew } from '@/hooks/useMovixSeriesDownload';
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
  isVidMoly?: boolean;
  isDarkibox?: boolean;
  isDarki?: boolean;
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
  genres?: { id: number; name: string }[];
  onSourceClick: (source: { 
    url: string; 
    type: "m3u8" | "mp4" | "embed"; 
    name: string;
    isTopStream?: boolean;
    isFStream?: boolean;
    isMovixDownload?: boolean;
    isVidMoly?: boolean;
    isDarki?: boolean;
    quality?: string;
    language?: string;
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
  genres,
  onSourceClick, 
  isLoadingSource,
  season,
  episode,
  imdbId
}: StreamingSourcesProps) {
  console.log('🚀 StreamingSources chargé avec:', { type, id, title, season, episode });
  
  const { t } = useLanguage();
  const { data: topStreamData, isLoading: isLoadingTopStream } = useTopStream(type, id, season, episode);
  const { data: fStreamData, isLoading: isLoadingFStream } = useFStream(type, id, season);
  const { data: movixDownloadData, isLoading: isLoadingMovixDownload } = useMovixDownload(type, id, season, episode, title);
  const { data: vidmolyData, isLoading: isLoadingVidMoly, hasVidMolyLinks } = useVidMolyLinks(type, id, season);
  const { data: darkiboxData, isLoading: isLoadingDarkibox } = useDarkiboxSeries(type === 'tv' ? id : 0, season || 1, episode || 1);
  const { data: darkiData, isLoading: isLoadingDarki } = useDarkiSeries(type === 'tv' ? id : 0, season || 1, episode || 1, title);
  const { data: movixDownloadNewData, isLoading: isLoadingMovixDownloadNew } = useMovixDownloadNew(type, id, season, episode);
  
  // Détecter si c'est une série anime en utilisant les genres TMDB
  console.log('🔍 StreamingSources - Genres reçus:', genres);
  console.log('🔍 StreamingSources - Type:', type);
  console.log('🔍 StreamingSources - Title:', title);
  
  // Détection par genres TMDB
  const isAnimeByGenre = Boolean(type === 'tv' && genres && genres.some(genre => 
    genre.name.toLowerCase() === 'animation' || 
    genre.name.toLowerCase() === 'anime' ||
    genre.id === 16 // ID du genre Animation dans TMDB
  ));
  
  // Détection de fallback par titre (pour les cas où les genres ne sont pas disponibles)
  const isAnimeByTitle = Boolean(type === 'tv' && title && (
    title.toLowerCase().includes('one punch man') ||
    title.toLowerCase().includes('demon slayer') ||
    title.toLowerCase().includes('naruto') ||
    title.toLowerCase().includes('dragon ball') ||
    title.toLowerCase().includes('attack on titan') ||
    title.toLowerCase().includes('my hero academia') ||
    title.toLowerCase().includes('tokyo ghoul') ||
    title.toLowerCase().includes('death note') ||
    title.toLowerCase().includes('fullmetal alchemist') ||
    title.toLowerCase().includes('bleach') ||
    title.toLowerCase().includes('fairy tail') ||
    title.toLowerCase().includes('one piece') ||
    title.toLowerCase().includes('hunter x hunter') ||
    title.toLowerCase().includes('sword art online') ||
    title.toLowerCase().includes('anime')
  ));
  
  const isAnimeSeries = isAnimeByGenre || isAnimeByTitle;
  
  console.log('🔍 StreamingSources - isAnimeSeries:', isAnimeSeries);
  console.log('🔍 StreamingSources - isAnimeByGenre:', isAnimeByGenre);
  console.log('🔍 StreamingSources - isAnimeByTitle:', isAnimeByTitle);
  console.log('🔍 StreamingSources - Title pour détection:', title);
  console.log('🔍 StreamingSources - Genres pour détection:', genres);
  
  const { data: animeVidMolyData, isLoading: isLoadingAnimeVidMoly, hasVidMolyLinks: hasAnimeVidMolyLinks } = useAnimeVidMolyLinks(
    title || '', 
    season || 1, 
    episode || 1,
    isAnimeSeries // Ajouter la condition pour ne l'appeler que si c'est une série anime
  );
  
  console.log('🔍 StreamingSources - animeVidMolyData:', animeVidMolyData);
  console.log('🔍 StreamingSources - hasAnimeVidMolyLinks:', hasAnimeVidMolyLinks);

  const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR'>('VF');

  // Fonction pour vérifier s'il y a des sources disponibles pour une langue donnée
  const hasSourcesForLanguage = (language: 'VF' | 'VOSTFR') => {
    // Vérifier TopStream (VF uniquement)
    if (language === 'VF' && topStreamData && topStreamData.stream && topStreamData.stream.url) {
      return true;
    }
    
    // Vérifier MovixDownload (VF uniquement)
    if (language === 'VF' && movixDownloadData && movixDownloadData.sources && movixDownloadData.sources.length > 0) {
      return true;
    }
    
    // Vérifier VidMoly (normal)
    if (vidmolyData) {
      if (language === 'VF' && vidmolyData.vf && vidmolyData.vf.length > 0) {
        return true;
      }
      if (language === 'VOSTFR' && vidmolyData.vostfr && vidmolyData.vostfr.length > 0) {
        return true;
      }
    }
    
    // Vérifier VidMoly anime (pour les séries anime)
    if (isAnimeSeries && animeVidMolyData) {
      console.log(`🔍 hasSourcesForLanguage - Vérification ${language} pour anime:`, {
        vf: animeVidMolyData.vf,
        vostfr: animeVidMolyData.vostfr,
        vfLength: animeVidMolyData.vf?.length,
        vostfrLength: animeVidMolyData.vostfr?.length
      });
      
      if (language === 'VF' && animeVidMolyData.vf && animeVidMolyData.vf.length > 0) {
        console.log('✅ Sources VF anime trouvées');
        return true;
      }
      if (language === 'VOSTFR' && animeVidMolyData.vostfr && animeVidMolyData.vostfr.length > 0) {
        console.log('✅ Sources VOSTFR anime trouvées');
        return true;
      }
    }
    
    // Vérifier Darki (pour les séries uniquement)
    if (type === 'tv' && darkiboxData && darkiboxData.sources) {
      const hasVFSources = darkiboxData.sources.some(source => 
        source.language === 'TrueFrench' || source.language === 'MULTI'
      );
      const hasVOSTFRSources = darkiboxData.sources.some(source => 
        source.language === 'MULTI' // MULTI peut contenir VOSTFR
      );
      
      if (language === 'VF' && hasVFSources) return true;
      if (language === 'VOSTFR' && hasVOSTFRSources) return true;
    }
    
    // Vérifier Darki (pour les séries uniquement)
    if (type === 'tv' && darkiData && darkiData.sources) {
      const hasVFSources = darkiData.sources.some(source => 
        source.language === 'TrueFrench' || source.language === 'MULTI'
      );
      const hasVOSTFRSources = darkiData.sources.some(source => 
        source.language === 'MULTI' // MULTI peut contenir VOSTFR
      );
      
      if (language === 'VF' && hasVFSources) return true;
      if (language === 'VOSTFR' && hasVOSTFRSources) return true;
    }
    
    // Vérifier FStream
    if (fStreamData && fStreamData.players) {
      if (language === 'VF') {
        // Vérifier les clés VF (VFF, VFQ, Default)
        const vfKeys = Object.keys(fStreamData.players).filter(key => 
          key.startsWith('VF') || key === 'VF' || key === 'Default'
        );
        return vfKeys.some(key => fStreamData.players![key] && fStreamData.players![key].length > 0);
      } else {
        // Vérifier VOSTFR
        return fStreamData.players.VOSTFR && fStreamData.players.VOSTFR.length > 0;
      }
    }
    
    // Vérifier les épisodes pour les séries
    if (type === 'tv' && fStreamData && fStreamData.episodes && episode) {
      const episodeData = fStreamData.episodes[episode.toString()];
      if (episodeData && episodeData.languages) {
        if (language === 'VF') {
          const vfKeys = Object.keys(episodeData.languages).filter(key => 
            key.startsWith('VF') || key === 'VF' || key === 'Default'
          );
          return vfKeys.some(key => episodeData.languages![key as keyof typeof episodeData.languages] && 
            episodeData.languages![key as keyof typeof episodeData.languages]!.length > 0);
        } else {
          return episodeData.languages.VOSTFR && episodeData.languages.VOSTFR.length > 0;
        }
      }
    }
    
    return false;
  };

  // Ajuster la langue sélectionnée si VF n'est pas disponible mais VOSTFR l'est
  useEffect(() => {
    if (selectedLanguage === 'VF' && !hasSourcesForLanguage('VF') && hasSourcesForLanguage('VOSTFR')) {
      console.log('🔄 Changement automatique vers VOSTFR car VF non disponible');
      setSelectedLanguage('VOSTFR');
    }
  }, [selectedLanguage, hasSourcesForLanguage]);

  // Créer la liste unifiée des sources
  const allSources: Source[] = [];


  // Ajouter TopStream en premier si disponible (VF uniquement)
  if (topStreamData && topStreamData.stream && topStreamData.stream.url && selectedLanguage === 'VF') {
    allSources.push({
      id: 'topstream',
      name: topStreamData.stream.label,
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
          name: `${qualityLabel} (${languageLabel})`,
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

  // Ajouter les sources MovixDownload (nouvelle API) si disponibles
  if (movixDownloadNewData && movixDownloadNewData.sources && selectedLanguage === 'VF') {
    console.log('🔍 [MOVIX DOWNLOAD NEW] Processing sources:', movixDownloadNewData.sources);
    
    // Trier les sources par qualité (du meilleur au moins bon)
    const qualityOrder = ['4K', '2160p', '1080p', '720p', '480p', '360p', '240p'];
    
    const sortedSources = movixDownloadNewData.sources.sort((a: any, b: any) => {
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
          id: `movix-download-new-${quality.toLowerCase()}-${index}`,
          name: `${qualityLabel} (${languageLabel})`,
          provider: 'movix-download-new',
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

  // Ajouter les sources VidMoly si disponibles
  console.log('🔍 StreamingSources - VidMoly data:', vidmolyData);
  console.log('🔍 StreamingSources - hasVidMolyLinks:', hasVidMolyLinks);
  console.log('🔍 StreamingSources - selectedLanguage:', selectedLanguage);
  
  if (vidmolyData && hasVidMolyLinks) {
    let vidmolyCounter = 1;
    
    if (selectedLanguage === 'VF' && vidmolyData.vf) {
      console.log('🔍 Ajout des sources VidMoly VF:', vidmolyData.vf);
      vidmolyData.vf.forEach((player: any) => {
        console.log('🔍 Player VidMoly VF original:', player);
        const source = {
          id: `vidmoly-vf-${vidmolyCounter}`,
          name: `VidMoly${vidmolyCounter} (VF)`,
          provider: 'vidmoly',
          url: player.url,
          type: 'embed' as const,
          player: 'vidmoly',
          isVidMoly: true,
          sourceKey: 'VF'
        };
        console.log('✅ Ajout source VidMoly VF:', source);
        allSources.push(source);
        vidmolyCounter++;
      });
    }
    
    if (selectedLanguage === 'VOSTFR' && vidmolyData.vostfr) {
      console.log('🔍 Ajout des sources VidMoly VOSTFR:', vidmolyData.vostfr);
      vidmolyData.vostfr.forEach((player: any) => {
        const source = {
          id: `vidmoly-vostfr-${vidmolyCounter}`,
          name: `VidMoly${vidmolyCounter} (VOSTFR)`,
          provider: 'vidmoly',
          url: player.url,
          type: 'embed' as const,
          player: 'vidmoly',
          isVidMoly: true,
          sourceKey: 'VOSTFR'
        };
        console.log('✅ Ajout source VidMoly VOSTFR:', source);
        allSources.push(source);
        vidmolyCounter++;
      });
    }
  } else {
    console.log('❌ Pas de sources VidMoly - vidmolyData:', vidmolyData, 'hasVidMolyLinks:', hasVidMolyLinks);
  }

  // Ajouter les sources VidMoly anime si disponibles (pour les séries anime)
  if (isAnimeSeries && animeVidMolyData && hasAnimeVidMolyLinks) {
    console.log('🔍 StreamingSources - Anime VidMoly data:', animeVidMolyData);
    let animeVidmolyCounter = 1;
    
    if (selectedLanguage === 'VF' && animeVidMolyData.vf) {
      console.log('🔍 Ajout des sources VidMoly Anime VF:', animeVidMolyData.vf);
      animeVidMolyData.vf.forEach((player: any) => {
        const source = {
          id: `anime-vidmoly-vf-${animeVidmolyCounter}`,
          name: `VidMoly Anime${animeVidmolyCounter} (VF)`,
          provider: 'vidmoly',
          url: player.url,
          type: 'embed' as const,
          player: 'vidmoly',
          isVidMoly: true,
          sourceKey: 'VF',
          quality: player.quality
        };
        console.log('✅ Ajout source VidMoly Anime VF:', source);
        allSources.push(source);
        animeVidmolyCounter++;
      });
    }
    
    if (selectedLanguage === 'VOSTFR' && animeVidMolyData.vostfr) {
      console.log('🔍 Ajout des sources VidMoly Anime VOSTFR:', animeVidMolyData.vostfr);
      animeVidMolyData.vostfr.forEach((player: any) => {
        const source = {
          id: `anime-vidmoly-vostfr-${animeVidmolyCounter}`,
          name: `VidMoly Anime${animeVidmolyCounter} (VOSTFR)`,
          provider: 'vidmoly',
          url: player.url,
          type: 'embed' as const,
          player: 'vidmoly',
          isVidMoly: true,
          sourceKey: 'VOSTFR',
          quality: player.quality
        };
        console.log('✅ Ajout source VidMoly Anime VOSTFR:', source);
        allSources.push(source);
        animeVidmolyCounter++;
      });
    }
  } else if (isAnimeSeries) {
    console.log('❌ Pas de sources VidMoly Anime - animeVidMolyData:', animeVidMolyData, 'hasAnimeVidMolyLinks:', hasAnimeVidMolyLinks);
  }

  // Ajouter les sources Darki pour les séries si disponibles
  if (type === 'tv' && darkiboxData && darkiboxData.sources) {
    darkiboxData.sources.forEach((source: any) => {
      // Filtrer par langue sélectionnée
      const isVFSource = source.language === 'TrueFrench' || source.language === 'MULTI';
      const isVOSTFRSource = source.language === 'MULTI'; // MULTI peut contenir VOSTFR
      
      if ((selectedLanguage === 'VF' && isVFSource) || (selectedLanguage === 'VOSTFR' && isVOSTFRSource)) {
        allSources.push({
          id: source.id,
          name: `${source.quality} - ${source.language}`,
          provider: 'darki',
          url: source.m3u8,
          type: 'm3u8' as const,
          player: 'darki',
          isDarki: true,
          sourceKey: selectedLanguage,
          quality: source.quality,
          language: source.language
        });
      }
    });
  }


  // Sources statiques supprimées - on utilise maintenant uniquement les APIs TopStream, FStream, VidMoly et Darkibox


  const handleSourceClick = (source: any) => {
    console.log('🔍 StreamingSources handleSourceClick appelé avec source:', source);
    console.log('🔍 Source URL complète:', source.url);
    console.log('🔍 Source type:', source.type);
    console.log('🔍 Source isVidMoly:', source.isVidMoly);
    
    if (source.isTopStream) {
      console.log('✅ Source TopStream détectée');
      // Pour TopStream, on utilise directement l'URL
      onSourceClick({
        url: source.url,
        type: source.type,
        name: source.name,
        isTopStream: true
      });
    } else if (source.isFStream) {
      console.log('✅ Source FStream détectée');
      // Pour Vidzy via FStream, on utilise le scraper existant
      onSourceClick({
        url: source.url,
        type: 'm3u8' as const,
        name: source.name,
        isFStream: true
      });
    } else if (source.isMovixDownload) {
      console.log('✅ Source MovixDownload détectée');
      // Pour les sources MovixDownload (Darkibox), on utilise directement le lien m3u8
      onSourceClick({
        url: source.url,
        type: 'mp4' as const, // Traiter comme mp4 pour éviter le scraper
        name: source.name,
        isMovixDownload: true
      });
    } else if (source.isVidMoly) {
      console.log('✅ Source VidMoly détectée, appel de onSourceClick');
      // Pour VidMoly, on utilise le player dédié
      onSourceClick({
        url: source.url,
        type: 'embed' as const,
        name: source.name,
        isVidMoly: true
      });
    } else if (source.isDarki) {
      console.log('✅ Source Darki détectée');
      // Pour Darki, on utilise le player dédié
      onSourceClick({
        url: source.url,
        type: 'm3u8' as const,
        name: source.name,
        isDarki: true,
        quality: source.quality,
        language: source.language
      });
    } else {
      console.log('❌ Type de source non reconnu:', source);
    }
  };

  if (isLoadingTopStream || isLoadingFStream || isLoadingMovixDownload || isLoadingVidMoly || isLoadingDarkibox || isLoadingDarki || isLoadingAnimeVidMoly || isLoadingMovixDownloadNew) {
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

      {/* Sélecteur de langue - afficher si on a des sources pour au moins une langue */}
      {(hasSourcesForLanguage('VF') || hasSourcesForLanguage('VOSTFR')) && (
        <div className="flex gap-2">
          <Button
            variant={selectedLanguage === 'VF' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VF')}
            disabled={!hasSourcesForLanguage('VF')}
          >
            {t("topstream.vf")}
          </Button>
          <Button
            variant={selectedLanguage === 'VOSTFR' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VOSTFR')}
            disabled={!hasSourcesForLanguage('VOSTFR')}
          >
            {t("topstream.vostfr")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {allSources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>
              {selectedLanguage === 'VF' 
                ? "Aucune source VF disponible pour ce contenu." 
                : "Aucune source VOSTFR disponible pour ce contenu."
              }
            </p>
            {selectedLanguage === 'VOSTFR' && hasSourcesForLanguage('VF') && (
              <p className="text-sm mt-2">
                Des sources VF sont disponibles. Cliquez sur l'onglet VF pour les voir.
              </p>
            )}
          </div>
        ) : (
          allSources.map((source) => {
            console.log('🎬 Rendu source:', source);
            return (
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
                {source.isVidMoly && (
                  <Badge variant="destructive" className="text-xs">
                    VidMoly
                  </Badge>
                )}
                {source.isDarki && (
                  <Badge variant="secondary" className="text-xs">
                    Darki
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
          );
          })
        )}
      </div>
    </div>
  );
}