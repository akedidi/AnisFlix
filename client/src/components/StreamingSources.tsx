import { useState, useEffect, memo, useCallback } from 'react';
import axios from "axios";
import { useFStream } from '@/hooks/useFStream';
import { useMovixDownload } from '@/hooks/useMovixDownload';
import { useVidMolyLinks } from '@/hooks/useWiFlix';

import { useAnimeVidMolyLinks } from '@/hooks/useAnimeSeries';
import { useMovixDownload as useMovixDownloadNew } from '@/hooks/useMovixSeriesDownload';
import { useVixsrc } from '@/hooks/useVixsrc';
import { useMovieBox } from '@/hooks/useMovieBox';

import { useFourKHDHub } from '@/hooks/useFourKHDHub';
import { useAfterDark } from '@/hooks/useAfterDark';
import { useCinepro } from '@/hooks/useCinepro';
import { useVidlink } from '@/hooks/useVidlink';
import { useTmdbProxyLinks } from '@/hooks/useTmdbProxy';
import { useMovixLinks } from '@/hooks/useMovixLinks';
import { useVideoDownload } from '@/hooks/useVideoDownload';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, ExternalLink, Download, Copy, FileText } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { apiClient } from "@/lib/apiClient"; // ADDED IMPORT

interface Source {
  id: string;
  name: string;
  provider: string;
  url?: string;
  type?: "m3u8" | "mp4" | "embed" | "mkv";
  player?: string;
  isFStream?: boolean;
  isMovixDownload?: boolean;
  isVidMoly?: boolean;
  isVidzy?: boolean;
  isDarkibox?: boolean;
  isDarki?: boolean;
  isVixsrc?: boolean;

  isAnimeAPI?: boolean;
  isFourKHDHub?: boolean;
  isAfterDark?: boolean;
  isLuluvid?: boolean;
  sourceKey?: string;
  isEpisode?: boolean;
  quality?: string;
  language?: string;
  tracks?: Array<{ file: string; label: string; kind?: string; default?: boolean }>;
}

interface StreamingSourcesProps {
  type: 'movie' | 'tv';
  id: number;
  title: string;
  sources: Source[];
  genres?: { id: number; name: string }[];
  onSourceClick: (source: {
    url: string;
    type: "m3u8" | "mp4" | "embed" | "mkv";
    name: string;
    isFStream?: boolean;
    isMovixDownload?: boolean;
    isVidMoly?: boolean;
    isVidzy?: boolean;
    isDarki?: boolean;
    isVixsrc?: boolean;
    isAnimeAPI?: boolean;
    isLuluvid?: boolean;
    quality?: string;
    language?: string;
    tracks?: Array<{ file: string; label: string; kind?: string; default?: boolean }>;
    provider?: string;
  }) => void;
  isLoadingSource: boolean;
  season?: number;
  episode?: number;
  imdbId?: string;
  enabled?: boolean; // Nouvelle prop pour désactiver les hooks
  isLoadingExternal?: boolean;
}

const StreamingSources = memo(function StreamingSources({
  type,
  id,
  title,
  sources,
  genres,
  onSourceClick,
  isLoadingSource,
  season,
  episode,
  imdbId,
  enabled = true,
  isLoadingExternal = false
}: StreamingSourcesProps) {
  console.log('🚀 StreamingSources chargé avec:', { type, id, title, season, episode });
  console.log('🔍 [STREAMING SOURCES] Component render - timestamp:', Date.now());

  const { t } = useLanguage();

  // État local pour gérer le chargement de chaque source individuellement
  const [loadingSources, setLoadingSources] = useState<Set<string>>(new Set());

  // Nettoyer l'état de chargement quand une source est sélectionnée avec succès
  useEffect(() => {
    if (!isLoadingSource) {
      // Si aucune source n'est en cours de chargement global, nettoyer tous les états locaux
      setLoadingSources(new Set());
    }
  }, [isLoadingSource]);

  // Désactiver les hooks si enabled est false
  const { data: fStreamData, isLoading: isLoadingFStream } = useFStream(type, id, season);
  const { data: vidmolyData, isLoading: isLoadingVidMoly, hasVidMolyLinks } = useVidMolyLinks(type, id, season);

  const { data: movixDownloadData, isLoading: isLoadingMovixDownload } = useMovixDownloadNew(type, id, season, episode, title);
  const { data: vixsrcData, isLoading: isLoadingVixsrc } = useVixsrc(type, id, season, episode);

  const { data: movieBoxData, isLoading: isLoadingMovieBox } = useMovieBox(type, id, season, episode);
  const { data: fourKHDHubData, isLoading: isLoadingFourKHDHub } = useFourKHDHub(type, id, season, episode);
  // DISABLED: AfterDark sources
  // const { data: afterDarkData, isLoading: isLoadingAfterDark } = useAfterDark(type, id, season, episode, title);
  const afterDarkData: { success: boolean; streams: any[] } | null = null;
  const isLoadingAfterDark = false;
  const { data: cineproData, isLoading: isLoadingCinepro } = useCinepro(type, id, season, episode);
  const { data: vidlinkData, isLoading: isLoadingVidlink } = useVidlink(type, id, season, episode);
  const { data: tmdbProxyData, isLoading: isLoadingTmdbProxy, hasLinks: hasTmdbProxyLinks } = useTmdbProxyLinks(type, id, season, episode);
  const { data: movixLinksData, isLoading: isLoadingMovixLinks } = useMovixLinks(type, id, season, episode);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { downloadVideo } = useVideoDownload();

  console.log('🔍 [VIXSRC DEBUG]', {
    type, id, season, episode,
    isLoading: isLoadingVixsrc,
    hasData: !!vixsrcData,
    success: vixsrcData?.success,
    streams: vixsrcData?.streams?.length,
    data: vixsrcData
  });

  // Debug logs pour MovixDownload
  console.log('🔍 [STREAMING SOURCES] MovixDownload Debug:', {
    type,
    id,
    season,
    episode,
    title,
    isLoading: isLoadingMovixDownload,
    hasData: !!movixDownloadData,
    sourcesCount: movixDownloadData?.sources?.length || 0
  });

  // Debug spécifique pour comprendre pourquoi le hook n'est pas activé
  console.log('🔍 [STREAMING SOURCES] Hook Activation Check:', {
    hasId: !!id,
    isMovie: type === 'movie',
    isTv: type === 'tv',
    hasSeason: !!season,
    hasEpisode: !!episode,
    seasonValue: season,
    episodeValue: episode,
    shouldBeEnabled: !!id && (type === 'movie' || (type === 'tv' && !!season && !!episode))
  });

  // Debug des valeurs passées au hook
  console.log('🔍 [STREAMING SOURCES DEBUG] Props:', { imdbId, type, id, title, season, episode }); // ADDED LOG
  console.log('🔍 [STREAMING SOURCES] Hook Parameters:', {
    type: type,
    id: id,
    season: season,
    episode: episode,
    title: title,
    typeCheck: typeof type,
    idCheck: typeof id,
    seasonCheck: typeof season,
    episodeCheck: typeof episode,
    titleCheck: typeof title,
    seasonValue: season,
    episodeValue: episode,
    seasonTruthy: !!season,
    episodeTruthy: !!episode
  });

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
    season ?? 1,
    episode ?? 1,
    isAnimeSeries // Ajouter la condition pour ne l'appeler que si c'est une série anime
  );

  console.log('🔍 StreamingSources - animeVidMolyData:', animeVidMolyData);
  console.log('🔍 StreamingSources - hasAnimeVidMolyLinks:', hasAnimeVidMolyLinks);

  const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR' | 'VO'>('VF');

  // Fonction pour vérifier s'il y a des sources disponibles pour une langue donnée
  const hasSourcesForLanguage = (language: 'VF' | 'VOSTFR' | 'VO') => {
    // Vérifier les sources passées en paramètre (props)
    if (sources && sources.length > 0) {
      const hasMatchedPropSource = sources.some(s => {
        if (!s.language) return language === 'VF'; // Par défaut VF si non spécifié

        const lang = s.language.toLowerCase();
        if (language === 'VF') {
          return lang.includes('french') ||
            lang.includes('français') ||
            lang === 'vf' ||
            lang === 'multi' ||
            lang === 'truefrench';
        }
        if (language === 'VOSTFR') {
          return lang.includes('vostfr') || lang === 'multi';
        }
        if (language === 'VO') {
          return lang.includes('english') ||
            lang === 'vo' ||
            lang === 'eng' ||
            lang.includes('original');
        }
        return false;
      });
      if (hasMatchedPropSource) return true;
    }

    console.log(`🔍 [DEBUG LANG] hasSourcesForLanguage(${language}) - Checking scrapers...`, {
      movixDownloadData: !!movixDownloadData,
      vidmolyData: !!vidmolyData,
      fStreamData: !!fStreamData,
      animeVidMolyData: !!animeVidMolyData,
      isLoadingAnimeVidMoly,
      vixsrcData
    });
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
      // VidMoly ne semble pas avoir de section explicite VO dans l'API actuelle, 
      // mais si on en ajoute, ce sera ici. Pour l'instant on assume non.
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
        return true;
      }
      if (language === 'VOSTFR' && animeVidMolyData.vostfr && animeVidMolyData.vostfr.length > 0) {
        return true;
      }
    }



    // Vérifier FStream
    if (fStreamData && fStreamData.players) {
      if (language === 'VF') {
        // Vérifier les clés VF (VFF, VFQ, Default)
        const vfKeys = Object.keys(fStreamData.players).filter(key =>
          key.startsWith('VF') || key === 'VF' || key === 'Default'
        );
        if (vfKeys.some(key => fStreamData.players![key] && fStreamData.players![key].length > 0)) return true;
      } else if (language === 'VOSTFR') {
        // Vérifier VOSTFR
        if (fStreamData.players.VOSTFR && fStreamData.players.VOSTFR.length > 0) return true;
      } else {
        // Vérifier VO (VO, ENG, English)
        const voKeys = Object.keys(fStreamData.players).filter(key =>
          key === 'VO' || key === 'ENG' || key === 'English'
        );
        if (voKeys.some(key => fStreamData.players![key] && fStreamData.players![key].length > 0)) return true;
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
          if (vfKeys.some(key => episodeData.languages![key as keyof typeof episodeData.languages] &&
            episodeData.languages![key as keyof typeof episodeData.languages]!.length > 0)) return true;
        } else if (language === 'VOSTFR') {
          if (episodeData.languages.VOSTFR && episodeData.languages.VOSTFR.length > 0) return true;
        } else {
          // VO
          const voKeys = Object.keys(episodeData.languages).filter(key =>
            key === 'VO' || key === 'ENG' || key === 'English'
          );
          if (voKeys.some(key => episodeData.languages![key as keyof typeof episodeData.languages] &&
            episodeData.languages![key as keyof typeof episodeData.languages]!.length > 0)) return true;
        }
      }
    }

    // Vérifier Vixsrc (VO uniquement)
    if (language === 'VO') {
      if (vixsrcData && vixsrcData.success && vixsrcData.streams && vixsrcData.streams.length > 0) {
        return true;
      }
      // Vérifier MovieBox (VO uniquement)
      if (movieBoxData && movieBoxData.success && movieBoxData.streams && movieBoxData.streams.length > 0) {
        return true;
      }
      // Vérifier Cinepro (VO uniquement)
      if (cineproData && cineproData.success && cineproData.streams && cineproData.streams.length > 0) {
        return true;
      }
      // Vérifier Vidlink (VO uniquement)
      if (vidlinkData && vidlinkData.success && vidlinkData.streams && vidlinkData.streams.length > 0) {
        return true;
      }
    }

    // Vérifier AfterDark (VF, VOSTFR, VO) - DISABLED
    if (afterDarkData !== null && afterDarkData.success && afterDarkData.streams) {
      if (afterDarkData.streams.some((s: any) => {
        const lang = s.language?.toLowerCase() || 'vf';
        if (language === 'VF') return lang === 'vf' || lang === 'multi';
        if (language === 'VOSTFR') return lang === 'vostfr';
        if (language === 'VO') return lang === 'vo';
        return false;
      })) return true;
    }

    console.log(`❌ hasSourcesForLanguage(${language}) - Aucune source trouvée`);
    return false;
  };

  // Ajuster la langue sélectionnée si la langue actuelle n'est pas disponible
  useEffect(() => {
    const hasVF = hasSourcesForLanguage('VF');
    const hasVOSTFR = hasSourcesForLanguage('VOSTFR');
    const hasVO = hasSourcesForLanguage('VO');

    // Si VF sélectionné mais pas dispo, basculer vers la première dispo
    if (selectedLanguage === 'VF' && !hasVF) {
      if (hasVOSTFR) {
        console.log('🔄 Changement automatique vers VOSTFR car VF non disponible');
        setSelectedLanguage('VOSTFR');
      } else if (hasVO) {
        console.log('🔄 Changement automatique vers VO car VF et VOSTFR non disponibles');
        setSelectedLanguage('VO');
      }
    }
    // Si VOSTFR sélectionné mais pas dispo, basculer
    else if (selectedLanguage === 'VOSTFR' && !hasVOSTFR) {
      if (hasVF) {
        console.log('🔄 Changement automatique vers VF car VOSTFR non disponible');
        setSelectedLanguage('VF');
      } else if (hasVO) {
        console.log('🔄 Changement automatique vers VO car VOSTFR non disponible');
        setSelectedLanguage('VO');
      }
    }
    // Si VO sélectionné mais pas dispo, basculer
    else if (selectedLanguage === 'VO' && !hasVO) {
      if (hasVF) {
        console.log('🔄 Changement automatique vers VF car VO non disponible');
        setSelectedLanguage('VF');
      } else if (hasVOSTFR) {
        console.log('🔄 Changement automatique vers VOSTFR car VO non disponible');
        setSelectedLanguage('VOSTFR');
      }
    }
  }, [selectedLanguage, hasSourcesForLanguage]);

  // Créer la liste unifiée des sources
  const allSources: Source[] = [];

  // Ajouter les sources passées en paramètre (sources TMDB VidMoly/Darki)
  if (sources && sources.length > 0) {
    console.log('🔍 [STREAMING SOURCES] Adding passed sources:', sources);
    // Filtrage par langue pour les sources passées en paramètre
    const filteredSources = sources.filter(s => {
      // Si pas de langue spécifiée par TMDB, on la met dans VF par défaut
      if (!s.language) return selectedLanguage === 'VF';

      const lang = s.language.toLowerCase();
      if (selectedLanguage === 'VF') {
        return lang.includes('french') ||
          lang.includes('français') ||
          lang === 'vf' ||
          lang === 'multi' ||
          lang === 'truefrench';
      }
      if (selectedLanguage === 'VOSTFR') {
        return lang.includes('vostfr') || lang === 'multi';
      }
      if (selectedLanguage === 'VO') {
        return lang.includes('english') ||
          lang === 'vo' ||
          lang === 'eng' ||
          lang.includes('original');
      }
      return false;
    });
    console.log(`🔍 [STREAMING SOURCES] Filtered sources for ${selectedLanguage}:`, filteredSources.length);
    allSources.push(...filteredSources);
  }

  // Ajouter les sources Bysebuho depuis Movix Links API (PRIORITÉ ABSOLUE)
  if (movixLinksData && movixLinksData.hasLinks && selectedLanguage === 'VF') {
    console.log('🔗 [MOVIX LINKS] Adding Bysebuho sources:', movixLinksData.links);

    movixLinksData.links.forEach((link: string, index: number) => {
      allSources.push({
        id: `bysebuho-${index}`,
        name: `Bysebuho ${index + 1} (VF) - HD`,
        provider: 'bysebuho',
        url: link,
        type: 'embed' as const,
        quality: 'HD',
        language: 'VF'
      });
    });
  }

  if (movixDownloadData && movixDownloadData.sources && selectedLanguage === 'VF') {
    console.log('🔍 [MOVIX DOWNLOAD NEW] Processing sources:', movixDownloadData.sources);

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
        // Filter out Alpha sources as requested
        if (source.label === 'Alpha') return;

        // Normalize Language for Display
        let languageDisplay = source.language || 'VF';
        const langLower = languageDisplay.toLowerCase();

        if (['vf', 'vff', 'vfq', 'truefrench', 'french'].some(l => langLower.includes(l)) || langLower === 'multi') {
          languageDisplay = 'VF';
        } else if (langLower.includes('english') || langLower.includes('eng') || langLower === 'vo') {
          languageDisplay = 'VO';
        } else {
          // Keep original if not standard
          languageDisplay = source.language;
        }

        const languageLabel = languageDisplay;

        // Ajouter un numéro si plusieurs sources de même qualité
        const qualityLabel = sources.length > 1 ? `${quality} #${index + 1}` : quality;

        // Modifier l'URL pour forcer les sous-titres français si nécessaire
        // Note: For now we just use the url directly, but we can append params if needed.
        const originalUrl = source.m3u8 || source.src || "";
        // Some providers might need specific params for french subs if Multi
        const isMulti = source.language?.toLowerCase().includes('multi');
        // Example: logic to add subs if needed, for now keep original
        const modifiedUrl = originalUrl;

        const isLuluvidSource = modifiedUrl.includes('luluvid') || modifiedUrl.includes('lulustream');

        allSources.push({
          id: `movix-download-${quality.toLowerCase()}-${index}`,
          name: `${qualityLabel} (${languageLabel})`,
          provider: 'movix',
          url: modifiedUrl,
          type: 'm3u8' as const,
          isMovixDownload: true,
          isLuluvid: isLuluvidSource, // Correctly flag Luluvid sources
          quality: quality,
          // Store as VF for Multi sources
          language: isMulti ? 'VF' : source.language
        });
      });
    });
  }

  // Sources Premium (FSVid) déplacées après Vidzy pour dépriorisation

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
            player.player.toLowerCase() === 'vidzy'
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
    } else if (selectedLanguage === 'VOSTFR') {
      // Pour VOSTFR, utiliser la clé VOSTFR
      const vostfrPlayers = fStreamData.players.VOSTFR || [];
      console.log('VOSTFR players:', vostfrPlayers);

      const vostfrVidzyPlayers = vostfrPlayers.filter((player: any) =>
        player.player.toLowerCase() === 'vidzy'
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
    } else if (selectedLanguage === 'VO') {
      // Pour VO, chercher les clés VO, ENG, English
      const voKeys = Object.keys(fStreamData.players).filter(key =>
        key === 'VO' || key === 'ENG' || key === 'English'
      );

      voKeys.forEach(key => {
        if (fStreamData.players![key]) {
          const vidzyPlayers = fStreamData.players![key].filter((player: any) =>
            player.player.toLowerCase() === 'vidzy'
          );

          vidzyPlayers.forEach((player: any) => {
            allSources.push({
              id: `fstream-vidzy-vo-${vidzyCounter}`,
              name: `Vidzy${vidzyCounter} (VO) - ${player.quality}`,
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
    }
  }

  // Ajouter les sources Premium (FSVid) depuis FStream si disponible (Dépriorisé après Vidzy)
  if (fStreamData && fStreamData.players) {
    let premiumCounter = 1;

    if (selectedLanguage === 'VF') {
      // Pour VF, chercher les clés VFQ et VFF pour les players premium
      const vfKeys = Object.keys(fStreamData.players).filter(key =>
        key.startsWith('VF') || key === 'VF' || key === 'VFQ'
      );

      console.log('VF keys for premium (including VFQ):', vfKeys);

      vfKeys.forEach(key => {
        if (fStreamData.players![key]) {
          // Filtrer seulement les players premium
          const premiumPlayers = fStreamData.players![key].filter((player: any) =>
            player.player.toLowerCase() === 'premium'
          );

          premiumPlayers.forEach((player: any) => {
            allSources.push({
              id: `fstream-premium-${key.toLowerCase()}-${premiumCounter}`,
              name: `FSVid${premiumCounter} (${key}) - ${player.quality}`,
              provider: 'fstream',
              url: player.url,
              type: 'embed' as const,
              player: 'premium',
              isFStream: true,
              sourceKey: key
            });
            premiumCounter++;
          });
        }
      });
    } else if (selectedLanguage === 'VOSTFR') {
      // Pour VOSTFR, utiliser la clé VOSTFR
      const vostfrPlayers = fStreamData.players.VOSTFR || [];
      console.log('VOSTFR premium players:', vostfrPlayers);

      const vostfrPremiumPlayers = vostfrPlayers.filter((player: any) =>
        player.player.toLowerCase() === 'premium'
      );

      vostfrPremiumPlayers.forEach((player: any) => {
        allSources.push({
          id: `fstream-premium-vostfr-${premiumCounter}`,
          name: `FSVid${premiumCounter} (VOSTFR) - ${player.quality}`,
          provider: 'fstream',
          url: player.url,
          type: 'embed' as const,
          player: 'premium',
          isFStream: true,
          sourceKey: 'VOSTFR'
        });
        premiumCounter++;
      });
    }
  }

  // Ajouter les sources Vidzy pour les épisodes si disponible
  if (type === 'tv' && fStreamData && fStreamData.episodes && episode) {
    const episodeData = fStreamData.episodes[episode.toString()];
    if (episodeData && episodeData.languages) {
      let episodeVidzyCounter = 1;

      if (selectedLanguage === 'VF') {
        const vfKeys = Object.keys(episodeData.languages).filter(key =>
          key.startsWith('VF') || key === 'VF' || key === 'Default'
        );

        vfKeys.forEach(key => {
          if (episodeData.languages && episodeData.languages[key as keyof typeof episodeData.languages]) {
            const vidzyPlayers = episodeData.languages[key as keyof typeof episodeData.languages]!.filter((player: any) =>
              player.player.toLowerCase() === 'vidzy'
            );

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
      } else if (selectedLanguage === 'VOSTFR') {
        const vostfrPlayers = episodeData.languages.VOSTFR || [];
        const vostfrVidzyPlayers = vostfrPlayers.filter((player: any) =>
          player.player.toLowerCase() === 'vidzy'
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
      } else if (selectedLanguage === 'VO') {
        const voKeys = Object.keys(episodeData.languages).filter(key =>
          key === 'VO' || key === 'ENG' || key === 'English'
        );

        voKeys.forEach(key => {
          if (episodeData.languages && episodeData.languages[key as keyof typeof episodeData.languages]) {
            const vidzyPlayers = episodeData.languages[key as keyof typeof episodeData.languages]!.filter((player: any) =>
              player.player.toLowerCase() === 'vidzy'
            );

            vidzyPlayers.forEach((player: any) => {
              allSources.push({
                id: `fstream-episode-vidzy-vo-${episodeVidzyCounter}`,
                name: `Vidzy${episodeVidzyCounter} (VO) - ${player.quality}`,
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
      }
    }
  }

  // Ajouter les sources FSVid (premium) pour les épisodes de séries
  if (type === 'tv' && fStreamData && fStreamData.episodes && episode) {
    const episodeData = fStreamData.episodes[episode.toString()];
    if (episodeData && episodeData.languages) {
      let episodeFsvidCounter = 1;

      if (selectedLanguage === 'VF') {
        const vfKeys = Object.keys(episodeData.languages).filter(key =>
          key.startsWith('VF') || key === 'VF' || key === 'Default'
        );

        vfKeys.forEach(key => {
          if (episodeData.languages && episodeData.languages[key as keyof typeof episodeData.languages]) {
            const premiumPlayers = episodeData.languages[key as keyof typeof episodeData.languages]!.filter((player: any) =>
              player.player.toLowerCase() === 'premium' || player.player.toLowerCase() === 'fsvid'
            );

            premiumPlayers.forEach((player: any) => {
              allSources.push({
                id: `fstream-episode-premium-${key.toLowerCase()}-${episodeFsvidCounter}`,
                name: `FSVid${episodeFsvidCounter} (${key === 'Default' ? 'VF' : key}) - ${player.quality}`,
                provider: 'fstream',
                url: player.url,
                type: 'embed' as const,
                player: 'premium',
                isFStream: true,
                sourceKey: key,
                isEpisode: true
              });
              episodeFsvidCounter++;
            });
          }
        });
      } else if (selectedLanguage === 'VOSTFR') {
        const vostfrPlayers = episodeData.languages.VOSTFR || [];
        const vostfrPremiumPlayers = vostfrPlayers.filter((player: any) =>
          player.player.toLowerCase() === 'premium' || player.player.toLowerCase() === 'fsvid'
        );

        vostfrPremiumPlayers.forEach((player: any) => {
          allSources.push({
            id: `fstream-episode-premium-vostfr-${episodeFsvidCounter}`,
            name: `FSVid${episodeFsvidCounter} (VOSTFR) - ${player.quality}`,
            provider: 'fstream',
            url: player.url,
            type: 'embed' as const,
            player: 'premium',
            isFStream: true,
            sourceKey: 'VOSTFR',
            isEpisode: true
          });
          episodeFsvidCounter++;
        });
      } else if (selectedLanguage === 'VO') {
        const voKeys = Object.keys(episodeData.languages).filter(key =>
          key === 'VO' || key === 'ENG' || key === 'English'
        );

        voKeys.forEach(key => {
          if (episodeData.languages && episodeData.languages[key as keyof typeof episodeData.languages]) {
            const premiumPlayers = episodeData.languages[key as keyof typeof episodeData.languages]!.filter((player: any) =>
              player.player.toLowerCase() === 'premium' || player.player.toLowerCase() === 'fsvid'
            );

            premiumPlayers.forEach((player: any) => {
              allSources.push({
                id: `fstream-episode-premium-vo-${episodeFsvidCounter}`,
                name: `FSVid${episodeFsvidCounter} (VO) - ${player.quality}`,
                provider: 'fstream',
                url: player.url,
                type: 'embed' as const,
                player: 'premium',
                isFStream: true,
                sourceKey: key,
                isEpisode: true
              });
              episodeFsvidCounter++;
            });
          }
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
      console.log('🔍 Ajout des sources VidMoly/Luluvid VF:', vidmolyData.vf);
      vidmolyData.vf.forEach((player: any) => {
        console.log('🔍 Player VF original:', player);
        const isLuluvid = player.name.toLowerCase().includes('luluvid') || player.name.toLowerCase().includes('lulustream');
        const providerName = isLuluvid ? 'Luluvid' : 'VidMoly';
        const providerKey = isLuluvid ? 'luluvid' : 'vidmoly';

        let sourceUrl = player.url;
        let sourceType: 'embed' | 'm3u8' = 'embed';

        if (isLuluvid) {
          // For Luluvid, route through proxy to extract M3U8
          // The proxy will detect Luluvid domain, extract M3U8, and process it
          sourceUrl = `/api/movix-proxy?path=cinepro-proxy&url=${encodeURIComponent(player.url)}`;
          sourceType = 'm3u8' as const;
        }

        const source = {
          id: `${providerKey}-vf-${vidmolyCounter}`,
          name: `${providerName} ${vidmolyCounter} (VF)`,
          provider: providerKey,
          url: sourceUrl,
          type: sourceType,
          player: providerKey,
          isVidMoly: !isLuluvid, // For specialized click handling if needed
          isLuluvid: isLuluvid, // Add flags if needed
          quality: isLuluvid ? 'HD' : undefined, // Luluvid defaults to HD
          sourceKey: 'VF'
        };
        console.log(`✅ Ajout source ${providerName} VF:`, source);
        allSources.push(source);
        vidmolyCounter++;
      });
    }

    if (selectedLanguage === 'VOSTFR' && vidmolyData.vostfr) {
      console.log('🔍 Ajout des sources VidMoly/Luluvid VOSTFR:', vidmolyData.vostfr);
      vidmolyData.vostfr.forEach((player: any) => {
        const isLuluvid = player.name.toLowerCase().includes('luluvid') || player.name.toLowerCase().includes('lulustream');
        const providerName = isLuluvid ? 'Luluvid' : 'VidMoly';
        const providerKey = isLuluvid ? 'luluvid' : 'vidmoly';

        let sourceUrl = player.url;
        let sourceType: 'embed' | 'm3u8' = 'embed';

        if (isLuluvid) {
          sourceUrl = `/api/movix-proxy?path=cinepro-proxy&url=${encodeURIComponent(player.url)}`;
          sourceType = 'm3u8' as const;
        }

        const source = {
          id: `${providerKey}-vostfr-${vidmolyCounter}`,
          name: `${providerName} ${vidmolyCounter} (VOSTFR)`,
          provider: providerKey,
          url: sourceUrl,
          type: sourceType,
          player: providerKey,
          isVidMoly: !isLuluvid,
          isLuluvid: isLuluvid,
          quality: isLuluvid ? 'HD' : undefined, // Luluvid defaults to HD
          sourceKey: 'VOSTFR'
        };
        console.log(`✅ Ajout source ${providerName} VOSTFR:`, source);
        allSources.push(source);
        vidmolyCounter++;
      });
    }
  } else {
    console.log('❌ Pas de sources VidMoly - vidmolyData:', vidmolyData, 'hasVidMolyLinks:', hasVidMolyLinks);
  }


  // Ajouter les sources TMDB Proxy (Luluvid)
  if (hasTmdbProxyLinks && tmdbProxyData) {
    console.log('🔍 [TMDB PROXY] Ajout des sources Luluvid:', tmdbProxyData);
    let tmdbProxyCounter = 1;

    tmdbProxyData.forEach((link) => {
      const lang = (link.language || 'VF').toUpperCase();
      const displayLang = lang.includes('FRENCH') ? 'VF' : lang;

      // Filter by selected language
      if (selectedLanguage === 'VF' && !['VF', 'VFF', 'VFQ'].includes(displayLang)) return;
      if (selectedLanguage === 'VOSTFR' && displayLang !== 'VOSTFR') return;
      if (selectedLanguage === 'VO' && displayLang !== 'VO') return;

      // Use direct URL for embed
      const sourceUrl = link.decoded_url;

      const source: Source = {
        id: `tmdb-proxy-luluvid-${tmdbProxyCounter}`,
        name: `Luluvid ${tmdbProxyCounter} (${displayLang})`,
        provider: 'luluvid',
        url: sourceUrl,
        type: 'm3u8',
        player: 'luluvid',
        quality: 'HD', // Luluvid is always HD
        language: displayLang,
        isLuluvid: true
      };

      allSources.push(source);
      tmdbProxyCounter++;
    });
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
          isVidMoly: true, // Extraction on click (like Vidzy)
          sourceKey: 'VF',
          quality: player.quality
        };
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
          isVidMoly: true, // Extraction on click (like Vidzy)
          sourceKey: 'VOSTFR',
          quality: player.quality
        };
        allSources.push(source);
        animeVidmolyCounter++;
      });
    }
  } else if (isAnimeSeries) {
    console.log('❌ Pas de sources VidMoly Anime - animeVidMolyData:', animeVidMolyData, 'hasAnimeVidMolyLinks:', hasAnimeVidMolyLinks);
  }

  // DISABLED: AfterDark sources
  if (afterDarkData !== null && afterDarkData.success && afterDarkData.streams) {
    console.log('🔍 [AfterDark] Adding sources:', afterDarkData.streams);
    afterDarkData.streams.forEach((stream: any, index: number) => {
      let langMatches = false;
      const lang = stream.language?.toLowerCase() || 'vf';

      if (selectedLanguage === 'VF') {
        langMatches = (lang === 'vf' || lang === 'multi' || lang.includes('french'));
      } else if (selectedLanguage === 'VOSTFR') {
        langMatches = (lang === 'vostfr');
      } else if (selectedLanguage === 'VO') {
        langMatches = (lang === 'vo' || lang === 'eng' || lang.includes('english'));
      }

      if (langMatches) {
        allSources.push({
          id: `afterdark-${stream.quality || 'HD'}-${index}`,
          name: stream.name,
          provider: 'afterdark',
          url: stream.url,
          type: 'm3u8',
          isAfterDark: true,
          quality: stream.quality || 'HD',
          language: stream.language
        });
      }
    });
  }



  // Ajouter les sources Vixsrc (VO uniquement)
  if (selectedLanguage === 'VO' && vixsrcData && vixsrcData.success && vixsrcData.streams) {
    console.log('🔍 [VIXSRC] Sources trouvées:', vixsrcData.streams);
    vixsrcData.streams.forEach((stream: any, index: number) => {
      allSources.push({
        id: `vixsrc-${index}`,
        name: `Vixsrc (VO) - ${stream.quality}`,
        provider: 'vixsrc',
        url: stream.url,
        type: 'm3u8' as const,
        player: 'vixsrc',
        isVixsrc: true,
        sourceKey: 'VO',
        quality: stream.quality,
        language: 'VO'
      });
    });
  }

  // Ajouter les sources MovieBox (VO uniquement)
  if (selectedLanguage === 'VO' && movieBoxData && movieBoxData.success && movieBoxData.streams) {
    console.log('📦 [MovieBox] Sources trouvées:', movieBoxData.streams);
    movieBoxData.streams.forEach((stream: any, index: number) => {
      allSources.push({
        id: `moviebox-${index}`,
        name: `MovieBox ${stream.quality} - ${stream.size}`,  // Format: "MovieBox 720p - 2.9 GB"
        provider: 'moviebox',
        url: stream.url,  // Already proxied URL
        type: 'mp4' as const,
        player: 'moviebox',
        sourceKey: 'VO',
        quality: stream.quality,
        language: 'VO'
      });
    });

  }

  // Ajouter les sources 4KHDHub (VO uniquement)
  if (selectedLanguage === 'VO' && fourKHDHubData && fourKHDHubData.success && fourKHDHubData.streams) {
    console.log('📦 [4KHDHub] Sources trouvées:', fourKHDHubData.streams);
    fourKHDHubData.streams.forEach((stream: any, index: number) => {
      allSources.push({
        id: `4khdhub-${index}`,
        name: `4KHDHub ${stream.quality} - ${stream.size}`,
        provider: '4khdhub',
        url: stream.url,
        type: 'mkv' as const,
        player: '4khdhub',
        sourceKey: 'VO',
        quality: stream.quality,
        language: 'VO',
        isFourKHDHub: true
      });
    });
  }



  // Ajouter les sources Vidlink (VO uniquement) - PREMIER AU TOP
  if (selectedLanguage === 'VO' && vidlinkData && vidlinkData.success && vidlinkData.streams) {
    console.log('🌐 [Vidlink] Sources trouvées:', vidlinkData.streams);
    const qualityOrder = ['4K', '1440p', '1080p', '720p', '480p', '360p', '240p', 'Auto', 'Unknown'];
    const sortedVidlink = [...vidlinkData.streams].sort((a: any, b: any) => {
      const qA = qualityOrder.indexOf(a.quality || 'Auto');
      const qB = qualityOrder.indexOf(b.quality || 'Auto');
      return (qA === -1 ? 999 : qA) - (qB === -1 ? 999 : qB);
    });
    // unshift in reverse so that best quality ends up first
    sortedVidlink.reverse().forEach((stream: any, index: number) => {
      allSources.unshift({
        id: `vidlink-${index}`,
        name: `Vidlink ${stream.quality || 'Auto'} (VO)`,
        provider: 'vidlink',
        url: stream.url,
        type: 'm3u8' as const,
        player: 'vidlink',
        sourceKey: 'VO',
        quality: stream.quality,
        language: 'VO'
      });
    });
  }

  // Ajouter les sources Cinepro MegaCDN (VO uniquement) - PRIORITIZED AT TOP
  // Use unshift to add at the beginning of the array so MegaCDN appears first
  if (selectedLanguage === 'VO' && cineproData && cineproData.success && cineproData.streams) {
    console.log('🔍 [Cinepro MegaCDN] Sources trouvées (prioritized):', cineproData.streams);
    // Sort by quality (1080p first, then 720p, then 360p)
    const qualityOrder = ['1080p', '720p', '480p', '360p', 'Auto'];
    const sortedStreams = [...cineproData.streams].sort((a: any, b: any) => {
      const qA = qualityOrder.indexOf(a.quality || 'Auto');
      const qB = qualityOrder.indexOf(b.quality || 'Auto');
      return (qA === -1 ? 999 : qA) - (qB === -1 ? 999 : qB);
    });

    // Add in reverse order so highest quality ends up first after all unshifts
    sortedStreams.reverse().forEach((stream: any, index: number) => {
      allSources.unshift({
        id: `cinepro-megacdn-${index}`,
        name: `${stream.server || 'MegaCDN'} ${stream.quality || 'Auto'} (VO)`,
        provider: 'cinepro',
        url: stream.link,
        type: stream.type === 'mp4' ? 'mp4' : 'm3u8',
        player: 'cinepro',
        sourceKey: 'VO',
        quality: stream.quality || 'Auto',
        language: 'VO'
      });
    });
  }

  // Ajouter les sources AfterDark
  /* AfterDark sources removed from Web Client
  if (afterDarkData && afterDarkData.success && afterDarkData.streams) {
    console.log('🌑 [AfterDark] Sources trouvées:', afterDarkData.streams);
    afterDarkData.streams.forEach((stream: any, index: number) => {
      const lang = stream.language?.toLowerCase() || 'vf';
      let mappedLang = 'VF';
  
      if (lang === 'vo') mappedLang = 'VO';
      if (lang === 'vostfr') mappedLang = 'VOSTFR';
      if (lang === 'multi') mappedLang = 'VF';
  
      if (selectedLanguage !== mappedLang) return;
  
      allSources.push({
        id: `afterdark-${index}`,
        name: stream.name || `AfterDark ${stream.quality}`,
        provider: 'afterdark',
        url: stream.url,
        type: 'm3u8' as const,
        player: 'afterdark',
        sourceKey: mappedLang,
        quality: stream.quality,
        language: mappedLang,
        isAfterDark: true
      });
    });
  }
  */




  /**
   * Compare deux chaînes de qualité (ex: "4K", "1080p", "720p")
   * Retourne > 0 si b > a, < 0 si a > b, 0 si égal (pour trier du meilleur au pire)
   */
  const compareQuality = (a: string = '', b: string = ''): number => {
    const getQualityValue = (q: string): number => {
      const lowerQ = q.toLowerCase();
      if (lowerQ.includes('4k') || lowerQ.includes('2160p') || lowerQ.includes('uhd')) return 2160;
      if (lowerQ.includes('1080p') || lowerQ.includes('fhd') || lowerQ.includes('full hd')) return 1080;
      if (lowerQ.includes('720p') || lowerQ.includes('hd')) return 720;
      if (lowerQ.includes('480p') || lowerQ.includes('sd')) return 480;
      if (lowerQ.includes('360p')) return 360;

      // Essayer d'extraire n'importe quel nombre
      const match = lowerQ.match(/(\d+)/);
      if (match) return parseInt(match[1]);

      return 0; // Inconnu
    };

    return getQualityValue(b) - getQualityValue(a); // Tri décroissant (Best quality first)
  };

  // Trie final des sources : Bysebuho > AnimeAPI > Vidzy > FSVid > MovieBox > MegaCDN > Luluvid > Reste
  allSources.sort((a, b) => {
    // Helper pour déterminer le rang
    const getRank = (source: Source) => {
      // Rang -2: Bysebuho - HIGHEST PRIORITY
      if (source.provider?.toLowerCase() === 'bysebuho' ||
        source.name.toLowerCase().includes('bysebuho')) {
        return -2;
      }

      // Rang -1: AnimeAPI (Highest priority for VO anime)
      if (source.provider?.toLowerCase() === 'animeapi' ||
        source.name.toLowerCase().includes('animeapi')) {
        return -1;
      }

      // Rang 0: Vidzy (Priorité haute)
      if (source.isVidzy ||
        source.name.toLowerCase().includes('vidzy') ||
        source.provider.toLowerCase() === 'vidzy' ||
        (source.player && source.player.toLowerCase().includes('vidzy'))) {
        return 0;
      }

      // Rang 1: FSVid (après Vidzy)
      if (source.player?.toLowerCase() === 'premium' ||
        source.name.toLowerCase().includes('fsvid')) {
        return 1;
      }

      // Rang 1: MovieBox
      if (source.provider.toLowerCase() === 'moviebox' ||
        source.name.toLowerCase().includes('moviebox')) {
        return 1;
      }

      // Rang 1.5: Vixsrc (Added for prioritization)
      if (source.provider.toLowerCase() === 'vixsrc' ||
        source.name.toLowerCase().includes('vixsrc')) {
        return 1.5;
      }

      // Rang 2: MegaCDN (sources Cinepro)
      if (source.provider?.toLowerCase() === 'cinepro' ||
        source.name.toLowerCase().includes('megacdn')) {
        return 2;
      }

      // Rang 3: VidMoly
      if (source.isVidMoly ||
        source.provider.toLowerCase() === 'vidmoly' ||
        source.name.toLowerCase().includes('vidmoly')) {
        return 3;
      }

      // Rang 10: Luluvid (Last Priority - User Request)
      if (source.name.toLowerCase().includes('luluvid') ||
        source.url?.includes('luluvid')) {
        return 10;
      }

      // Rang 4: AfterDark
      if (source.isAfterDark || source.provider.toLowerCase() === 'afterdark') {
        return 4;
      }

      // Rang 10: 4KHDHub (Dernier)
      if (source.isFourKHDHub || source.provider.toLowerCase() === '4khdhub') {
        return 10;
      }

      // Rang 5: Le reste (Darki, Movix, Vixsrc, etc.)
      return 5;
    };

    const rankA = getRank(a);
    const rankB = getRank(b);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // Même rang, trier par qualité
    return compareQuality(a.quality, b.quality);
  });


  // Sources statiques supprimées - on utilise maintenant uniquement les APIs TopStream, FStream, VidMoly et Darkibox


  const handleDownloadVideo = async (source: Source, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🔍 [DOWNLOAD DEBUG] Video download clicked for:', source);

    let downloadUrl = source.url || '';
    let downloadHeaders = (source as any).headers || {};

    // 1. Extraction logic for Embed sources
    if (source.isAfterDark || source.name.toLowerCase().includes('darki') || source.url?.includes('darkibox') || source.url?.includes('vidzy')) {
      toast.info("Extracting download link...");
      try {
        const response = await apiClient.post('/api/extract', { type: 'darkibox', url: source.url });
        if (response.ok) {
          const data = await response.json();
          if (data.m3u8Url) {
            downloadUrl = data.m3u8Url;
            console.log('✅ [DOWNLOAD] Extracted Darki URL:', downloadUrl);
          }
        } else {
          console.error("Extraction failed");
        }
      } catch (err) {
        console.error("Extraction error:", err);
      }
    } else if (source.name.toLowerCase().includes('vidmoly')) {
      toast.info("Extracting download link...");
      try {
        // Vidmoly extraction
        const result = await apiClient.extractVidMoly(source.url || '');
        if (result.success && result.m3u8Url) {
          downloadUrl = result.m3u8Url;
          console.log('✅ [DOWNLOAD] Extracted Vidmoly URL:', downloadUrl);
        }
      } catch (err) { console.error(err); }
    }

    // 2. Identification and Proxy Logic
    const isVidmolyOrVidzy = source.name.toLowerCase().includes('vidmoly') || source.name.toLowerCase().includes('vidzy') || downloadUrl.includes('vidmoly') || downloadUrl.includes('vidzy');
    const isHls = downloadUrl.includes('.m3u8');
    const isMp4 = downloadUrl.includes('.mp4') || downloadUrl.includes('.mkv') || source.type === 'mp4' || source.type === 'mkv';

    // 3. Download Routing Logic
    // If we have headers, we MUST use a proxy that supports them.
    // If it's HLS, we use our new ffmpeg-based downloader (api/proxy?action=download).
    // If it's MP4/MKV with headers, we can also use api/proxy (it supports simple copy).
    // If it's MP4 without headers, direct link might fail (CORS/Referer) so safer to use proxy too.

    // EXCEPTION: 4KHDHub links are direct MKV downloads that don't need proxying
    if ((source as any).isFourKHDHub || source.name.toLowerCase().includes('4khdhub') || source.provider === '4khdhub') {
      console.log('✅ [DOWNLOAD] Direct download for 4KHDHub (no proxy needed)');
      window.open(downloadUrl, '_blank');
      toast.success(t("Download started..."));
      return;
    }

    // Client-Side Download using FFmpeg
    console.log('✅ [DOWNLOAD] Starting Client-Side FFmpeg Download');

    setDownloadingId(source.id);

    // Show toast for start
    const promise = downloadVideo(downloadUrl, `${title || 'video'}.mp4`);

    toast.promise(promise, {
      loading: 'Downloading & Converting locally... (Classic Download)',
      success: 'Download ready!',
      error: (err) => `Download failed: ${err.message}`
    });

    try {
      await promise;
    } catch (e) {
      // Error handled by toast
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadSubtitles = async () => {
    console.log('🔍 [DOWNLOAD DEBUG] Subtitles download clicked. IMDB ID:', imdbId); // ADDED LOG
    if (!imdbId) {
      toast.error("IMDB ID missing, cannot fetch subtitles");
      return;
    }

    const params = new URLSearchParams({
      action: 'subtitles',
      imdbId: imdbId,
      type: type,
      title: title || 'video'
    });

    if (season) params.append('season', season.toString());
    if (episode) params.append('episode', episode.toString());

    const url = `/api/proxy?${params.toString()}`;

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Subtitle download started...");
  };

  const handleSourceClick = async (source: any) => {
    console.log('🔍 StreamingSources handleSourceClick appelé avec source:', source);
    console.log('🔍 Source URL complète:', source.url);
    console.log('🔍 Source type:', source.type);
    console.log('🔍 Source isVidMoly:', source.isVidMoly);

    // Marquer cette source comme en cours de chargement
    setLoadingSources(prev => new Set(prev).add(source.id));



    try {
      if (source.isFStream) {
        console.log('✅ Source FStream détectée');

        // Cas spécial : FSVid Premium (player: "premium")
        if (source.player?.toLowerCase() === 'premium') {
          console.log('🎬 Source FSVid Premium détectée, utilisation de l\'extracteur FSVid');
          onSourceClick({
            url: source.url,
            type: 'embed' as const,
            name: source.name,
            provider: 'fsvid'
          });
        } else {
          // Pour Vidzy via FStream, on utilise le scraper existant
          onSourceClick({
            url: source.url,
            type: 'm3u8' as const,
            name: source.name,
            isFStream: true
          });
        }
      } else if (source.provider?.toLowerCase() === 'bysebuho') {
        console.log('✅ Source Bysebuho détectée, utilisation de l\'extracteur Bysebuho');
        onSourceClick({
          url: source.url,
          type: 'embed' as const,
          name: source.name,
          provider: 'bysebuho'
        });
      } else if (source.isMovixDownload) {
        console.log('✅ Source MovixDownload détectée');
        console.log('🎬 [DARKIBOX SOURCE] URL complète:', source.url);
        console.log('🎬 [DARKIBOX SOURCE] Nom de la source:', source.name);
        console.log('🎬 [DARKIBOX SOURCE] Qualité:', source.quality);
        console.log('🎬 [DARKIBOX SOURCE] Langue:', source.language);
        // Pour les sources MovixDownload (Darkibox), on utilise directement le lien m3u8
        onSourceClick({
          url: source.url,
          type: 'm3u8' as const, // Traiter comme m3u8 pour HLS
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
      } else if (source.isDarki || source.isDarkibox) {
        console.log(`✅ Source ${source.isDarki ? 'Darki' : 'Darkibox'} détectée`);
        // Pour Darki ou Darkibox, on utilise le player dédié (m3u8)
        onSourceClick({
          url: source.url,
          type: 'm3u8' as const,
          name: source.name,
          isDarki: source.isDarki || source.isDarkibox,
          quality: source.quality,
          language: source.language
        });
      } else if (source.isVixsrc) {
        console.log('✅ Source Vixsrc détectée, URL:', source.url);
        // L'URL est déjà proxifiée par le serveur (via api/movix-proxy/index.js)
        onSourceClick({
          url: source.url,
          type: 'm3u8' as const,
          name: source.name,
          quality: source.quality,
          language: source.language,
          isVixsrc: true,
          provider: 'vixsrc'
        });
        /* REMOVED MANUAL FETCH
        try {
          // Use the same API as iOS - GET /api/vixsrc with query params
          const params = new URLSearchParams({
            tmdbId: id.toString(),
            type: type
          });
   
          if (season) params.append('season', season.toString());
          if (episode) params.append('episode', episode.toString());
   
          const response = await fetch(`/api/vixsrc?${params.toString()}`);
   
          if (!response.ok) {
            throw new Error(`Erreur extraction Vixsrc: ${response.statusText}`);
          }
   
          const data = await response.json();
   
          if (data.success && data.streams && data.streams.length > 0) {
            const stream = data.streams[0];
            console.log('✅ Stream Vixsrc extrait:', stream.url);
   
            // IMPORTANT: Like iOS, wrap the URL in vixsrc-proxy to handle CORS/Headers
            // AND append .m3u8 extension hint for Safari/Browsers which are pickier than AVPlayer
            const proxyUrl = `/api/vixsrc-proxy?url=${encodeURIComponent(stream.url)}&ext=.m3u8`;
            console.log('✅ URL proxifiée:', proxyUrl);
            onSourceClick({
              url: proxyUrl,
              type: 'm3u8' as const,
              name: source.name,
              quality: stream.quality || source.quality,
              language: source.language,
              isVixsrc: true,
              provider: 'vixsrc'
            });
          } else {
            throw new Error('Pas de streams dans la réponse');
          }
        } catch (error) {
          console.error('Erreur lors de l\'extraction Vixsrc:', error);
          alert('Impossible de lire cette source Vixsrc. Veuillez réessayer.');
          // Retirer du chargement
          setLoadingSources(prev => {
            const newSet = new Set(prev);
            newSet.delete(source.id);
            return newSet;
          });
        } */


      } else if (source.isLuluvid) {
        console.log('✅ Source Luluvid détectée, via proxy');
        onSourceClick({
          url: source.url,
          type: 'm3u8' as const, // Always treat as m3u8 for extraction
          name: source.name,
          quality: source.quality,
          language: source.language,
          isLuluvid: true,
          provider: 'luluvid'
        });

      } else if ((source as any).isAnimeAPI) {
        console.log('✅ Source AnimeAPI détectée, passage des tracks:', (source as any).tracks);
        // Pour AnimeAPI, passer les tracks (sous-titres)
        onSourceClick({
          url: source.url,
          type: source.type || 'm3u8',
          name: source.name,
          quality: source.quality,
          language: source.language,
          isAnimeAPI: true,
          tracks: (source as any).tracks, // IMPORTANT: Pass subtitle tracks!
        } as any);
      } else if (source.url) {
        console.log('✅ Source générique détectée (UniversalVO/Autre)');
        // Pour les sources génériques avec URL (UniversalVO, PrimeWire, etc.)
        onSourceClick({
          url: source.url,
          type: source.type || 'mp4',
          name: source.name,
          language: source.language
        });
      } else if (source.isAfterDark) {
        console.log('✅ Source AfterDark détectée, URL:', source.url);
        onSourceClick({
          url: source.url,
          type: 'm3u8' as const,
          name: source.name,
          quality: source.quality,
          language: source.language,
          provider: 'afterdark'
        });
      } else {
        console.log('❌ Type de source non reconnu:', source);
      }
    } catch (error) {
      console.error('Erreur lors du clic sur la source:', error);
      // Retirer cette source du chargement en cas d'erreur
      setLoadingSources(prev => {
        const newSet = new Set(prev);
        newSet.delete(source.id);
        return newSet;
      });
    }
  };

  if (isLoadingFStream || isLoadingMovixDownload || isLoadingVidMoly || isLoadingAnimeVidMoly || isLoadingVixsrc || isLoadingExternal || isLoadingFourKHDHub) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Play className="w-5 h-5" />
          {t("streaming.sources")}
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-muted-foreground">{t("streaming.searching")}</span>
        </div>
      </div>
    );
  }

  if (allSources.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Play className="w-5 h-5" />
          {t("streaming.sources")}
        </h2>

        {/* Sélecteur de langue - toujours afficher les onglets */}

        <div className="flex gap-2">
          <Button
            variant={selectedLanguage === 'VF' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VF')}
            disabled={!hasSourcesForLanguage('VF')}
          >
            {t("streaming.vf")}
          </Button>
          <Button
            variant={selectedLanguage === 'VOSTFR' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VOSTFR')}
            disabled={!hasSourcesForLanguage('VOSTFR')}
          >
            {t("streaming.vostfr")}
          </Button>
          <Button
            variant={selectedLanguage === 'VO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VO')}
            disabled={!hasSourcesForLanguage('VO')}
          >
            VO
          </Button>
        </div>

        <div className="text-center py-8 text-muted-foreground">
          <p>
            {selectedLanguage === 'VF'
              ? "Aucune source VF disponible pour ce contenu."
              : selectedLanguage === 'VOSTFR'
                ? "Aucune source VOSTFR disponible pour ce contenu."
                : "Aucune source VO disponible pour ce contenu."
            }
          </p>
          {selectedLanguage === 'VOSTFR' && hasSourcesForLanguage('VF') && (
            <p className="text-sm mt-2">
              Des sources VF sont disponibles. Cliquez sur l'onglet VF pour les voir.
            </p>
          )}
          {selectedLanguage === 'VF' && hasSourcesForLanguage('VOSTFR') && (
            <p className="text-sm mt-2">
              Des sources VOSTFR sont disponibles. Cliquez sur l'onglet VOSTFR pour les voir.
            </p>
          )}
        </div>
      </div >
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Play className="w-5 h-5" />
        {t("streaming.sources")}
      </h2>



      <div className="flex gap-2 items-center">
        <div className="flex gap-2">
          <Button
            variant={selectedLanguage === 'VF' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VF')}
            disabled={!hasSourcesForLanguage('VF')}
          >
            {t("streaming.vf")}
          </Button>
          <Button
            variant={selectedLanguage === 'VOSTFR' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VOSTFR')}
            disabled={!hasSourcesForLanguage('VOSTFR')}
          >
            {t("streaming.vostfr")}
          </Button>
          <Button
            variant={selectedLanguage === 'VO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('VO')}
            disabled={!hasSourcesForLanguage('VO')}
          >
            VO
          </Button>
        </div>


      </div>

      <div className="space-y-3">
        {allSources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>
              {selectedLanguage === 'VF'
                ? "Aucune source VF disponible pour ce contenu."
                : selectedLanguage === 'VOSTFR'
                  ? "Aucune source VOSTFR disponible pour ce contenu."
                  : "Aucune source VO disponible pour ce contenu."
              }
            </p>
            {selectedLanguage === 'VOSTFR' && hasSourcesForLanguage('VF') && (
              <p className="text-sm mt-2">
                Des sources VF sont disponibles. Cliquez sur l'onglet VF pour les voir.
              </p>
            )}
            {selectedLanguage === 'VF' && hasSourcesForLanguage('VOSTFR') && (
              <p className="text-sm mt-2">
                Des sources VOSTFR sont disponibles. Cliquez sur l'onglet VOSTFR pour les voir.
              </p>
            )}
          </div>
        ) : (
          allSources.map((source) => {
            console.log('🎬 Rendu source:', source);
            return (
              <div key={source.id} className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                    onClick={() => handleSourceClick(source)}
                    disabled={loadingSources.has(source.id)}
                  >
                    <span className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      {source.name}
                      {source.isVixsrc && (
                        <Badge variant="default" className="text-xs">
                          Vixsrc
                        </Badge>
                      )}
                      {source.isFourKHDHub && (
                        <Badge variant="destructive" className="text-xs">
                          MKV
                        </Badge>
                      )}
                      {source.isFourKHDHub && (
                        <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-700 border-yellow-500">
                          MKV Not natively supported
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
                      {loadingSources.has(source.id) ? t("streaming.loading") : "Regarder"}
                    </span>
                  </Button>
                  {source.isFourKHDHub && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(source.url || '');
                        toast.success("Lien copié !");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Always show download button if URL is present */}
                  {/* Only show download button for 4KHDHub sources */}
                  {source.url && source.isFourKHDHub && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="shrink-0"
                      onClick={(e) => handleDownloadVideo(source, e)}
                      title="Download Video (Local)"
                      disabled={downloadingId === source.id}
                    >
                      {downloadingId === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div >
  );
});

export default StreamingSources;
