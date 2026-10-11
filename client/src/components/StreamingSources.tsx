import { useState, useEffect, memo } from 'react';
import { useFStream } from '@/hooks/useFStream';

import { useAnimeVidMolyLinks } from '@/hooks/useAnimeSeries';
import { useMovieBox } from '@/hooks/useMovieBox';
import { useFrenchProviders } from '@/hooks/useFrenchProviders';

import { useMovixLinks } from '@/hooks/useMovixLinks';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { isPlayableMovieBoxStream } from '@/utils/codecSupport';
import { isLuluvidCdnUrl, wrapLuluvidPlaybackUrl } from '@/lib/movix';

interface Source {
  id: string;
  name: string;
  provider: string;
  url?: string;
  type?: "m3u8" | "mp4" | "embed" | "mkv" | "dash";
  player?: string;
  isFStream?: boolean;
  isMovixDownload?: boolean;
  isVidMoly?: boolean;
  isVidzy?: boolean;
  isDarkibox?: boolean;
  isDarki?: boolean;
  isAnimeAPI?: boolean;
  isAfterDark?: boolean;
  isLuluvid?: boolean;
  isExternalEmbed?: boolean;
  sourceKey?: string;
  isEpisode?: boolean;
  quality?: string;
  language?: string;
  codec?: string | null;
  tracks?: Array<{ file: string; label: string; kind?: string; default?: boolean }>;
  headers?: Record<string, string>;
}

interface StreamingSourcesProps {
  type: 'movie' | 'tv';
  id: number;
  title: string;
  sources: Source[];
  genres?: { id: number; name: string }[];
  onSourceClick: (source: {
    url: string;
    type: "m3u8" | "mp4" | "embed" | "mkv" | "dash";
    name: string;
    isFStream?: boolean;
    isMovixDownload?: boolean;
    isVidMoly?: boolean;
    isVidzy?: boolean;
    isDarki?: boolean;
    isAnimeAPI?: boolean;
    isLuluvid?: boolean;
    isExternalEmbed?: boolean;
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

  const { data: movieBoxData, isLoading: isLoadingMovieBox } = useMovieBox(type, id, season, episode);
  // DISABLED: AfterDark sources
  const afterDarkData: any = null;
  const { data: movixLinksData, isLoading: isLoadingMovixLinks } = useMovixLinks(type, id, season, episode);

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
  const isAnimationContent = Boolean(genres && genres.some(genre =>
    genre.name.toLowerCase() === 'animation' ||
    genre.name.toLowerCase() === 'anime' ||
    genre.id === 16 // ID du genre Animation dans TMDB
  ));
  const isAnimeByGenre = type === 'tv' && isAnimationContent;

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
  const { data: frenchProvidersData, isLoading: isLoadingFrenchProviders } = useFrenchProviders(
    type,
    id,
    season,
    episode,
    isAnimationContent || isAnimeByTitle,
    enabled,
  );

  console.log('🔍 StreamingSources - animeVidMolyData:', animeVidMolyData);
  console.log('🔍 StreamingSources - hasAnimeVidMolyLinks:', hasAnimeVidMolyLinks);

  const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR' | 'VO'>('VF');

  const isFSVidSource = (source: Source) =>
    source.provider?.toLowerCase() === 'fsvid' ||
    source.player?.toLowerCase() === 'premium' ||
    source.name.toLowerCase().includes('fsvid') ||
    source.url?.toLowerCase().includes('fsvid');

  const hasVidzyPlayer = (players?: Array<{ player?: string }>) =>
    players?.some(player => player.player?.toLowerCase() === 'vidzy') ?? false;

  // Fonction pour vérifier s'il y a des sources disponibles pour une langue donnée
  const hasSourcesForLanguage = (language: 'VF' | 'VOSTFR' | 'VO') => {
    // Vérifier les sources passées en paramètre (props)
    if (sources && sources.length > 0) {
      const hasMatchedPropSource = sources.some(s => {
        if (isFSVidSource(s)) return false;
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
        if (vfKeys.some(key => hasVidzyPlayer(fStreamData.players![key]))) return true;
      } else if (language === 'VOSTFR') {
        // Vérifier VOSTFR
        if (hasVidzyPlayer(fStreamData.players.VOSTFR)) return true;
      } else {
        // Vérifier VO (VO, ENG, English)
        const voKeys = Object.keys(fStreamData.players).filter(key =>
          key === 'VO' || key === 'ENG' || key === 'English'
        );
        if (voKeys.some(key => hasVidzyPlayer(fStreamData.players![key]))) return true;
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
          if (vfKeys.some(key => hasVidzyPlayer(episodeData.languages![key as keyof typeof episodeData.languages]))) return true;
        } else if (language === 'VOSTFR') {
          if (hasVidzyPlayer(episodeData.languages.VOSTFR)) return true;
        } else {
          // VO
          const voKeys = Object.keys(episodeData.languages).filter(key =>
            key === 'VO' || key === 'ENG' || key === 'English'
          );
          if (voKeys.some(key => hasVidzyPlayer(episodeData.languages![key as keyof typeof episodeData.languages]))) return true;
        }
      }
    }

    // MovieBox exposes VF, VOSTFR and VO variants. Older cached responses with
    // no language remain VO for backward compatibility.
    if (movieBoxData?.success && movieBoxData.streams?.some((stream) =>
      (stream.language || 'VO').toUpperCase() === language && isPlayableMovieBoxStream(stream)
    )) {
      return true;
    }

    if (frenchProvidersData?.streams?.some(stream => stream.language.toUpperCase() === language)) {
      return true;
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
    // Attendre les providers qui déterminent les langues disponibles.
    if (
      isLoadingFStream ||
      isLoadingFrenchProviders ||
      isLoadingMovieBox
    ) return;

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

  // Providers français natifs : Anime-Sama, French-Anime, French Stream et Streamzo.
  frenchProvidersData?.streams?.forEach((stream, index) => {
    const language = stream.language.toUpperCase();
    if (language !== selectedLanguage) return;
    const labels: Record<string, string> = {
      animesama: 'Anime-Sama',
      frenchanime: 'French-Anime',
      frenchstream: 'French Stream',
      streamzo: 'Streamzo',
    };
    const isLulu = isLuluvidCdnUrl(stream.url);
    // ASN-bound Luluvid CDN must never hit the browser directly (403).
    const playUrl = isLulu && stream.url && !stream.url.includes('cinepro-proxy')
      ? wrapLuluvidPlaybackUrl(stream.url, stream.headers?.Referer)
      : stream.url;
    allSources.push({
      id: `${stream.provider}-${index}-${language}`,
      name: `${labels[stream.provider] || stream.provider} (${language}) - ${stream.quality || 'HD'}`,
      provider: isLulu ? 'luluvid' : stream.provider,
      url: playUrl,
      type: isLulu ? 'm3u8' : stream.type,
      quality: stream.quality || 'HD',
      language,
      headers: isLulu ? undefined : stream.headers,
      isLuluvid: isLulu,
      isExternalEmbed: !isLulu && stream.type === 'embed',
    });
  });

  // Ajouter les sources passées en paramètre (sources TMDB VidMoly/Darki)
  if (sources && sources.length > 0) {
    console.log('🔍 [STREAMING SOURCES] Adding passed sources:', sources);
    // Filtrage par langue pour les sources passées en paramètre
    const filteredSources = sources.filter(s => {
      if (isFSVidSource(s)) return false;
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
              name: `FStream Movix · Vidzy${vidzyCounter} (${key === 'Default' ? 'VF' : key}) - ${player.quality}`,
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
          name: `FStream Movix · Vidzy${vidzyCounter} (VOSTFR) - ${player.quality}`,
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
              name: `FStream Movix · Vidzy${vidzyCounter} (VO) - ${player.quality}`,
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
                name: `FStream Movix · Vidzy${episodeVidzyCounter} (${key === 'Default' ? 'VF' : key}) - ${player.quality}`,
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
            name: `FStream Movix · Vidzy${episodeVidzyCounter} (VOSTFR) - ${player.quality}`,
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
                name: `FStream Movix · Vidzy${episodeVidzyCounter} (VO) - ${player.quality}`,
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



  // Ajouter toutes les résolutions MovieBox de la catégorie sélectionnée.
  if (movieBoxData && movieBoxData.success && movieBoxData.streams) {
    console.log('📦 [MovieBox] Sources trouvées:', movieBoxData.streams);
    movieBoxData.streams.forEach((stream: any, index: number) => {
      const streamLanguage = (stream.language || 'VO').toUpperCase();
      if (streamLanguage !== selectedLanguage) return;
      if (!isPlayableMovieBoxStream(stream)) {
        console.log(`📦 [MovieBox] Source ${stream.quality} masquée (incompatible ou lien expiré)`);
        return;
      }
      const isDash = stream.type === 'dash' || stream.url?.includes('.mpd');
      const movieBoxType: Source['type'] = isDash
        ? 'dash'
        : stream.type === 'hls' || stream.url?.includes('.m3u8')
          ? 'm3u8'
          : 'mp4';
      const tracks = (stream.subtitles || []).map((subtitle: any) => ({
        file: subtitle.url,
        label: subtitle.label || subtitle.language || 'Subtitle',
        kind: 'subtitles',
        default: Boolean(subtitle.default || (selectedLanguage === 'VOSTFR' && subtitle.code === 'fr')),
      }));
      allSources.push({
        id: `moviebox-${index}`,
        name: `MovieBox ${selectedLanguage} ${stream.quality}${stream.size ? ` - ${stream.size}` : ''}`,
        provider: 'moviebox',
        url: stream.url,  // Worker proxy URL (includes CloudFront cookies)
        type: movieBoxType,
        player: 'moviebox',
        sourceKey: selectedLanguage,
        quality: stream.quality,
        language: selectedLanguage,
        codec: stream.codec,
        tracks,
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

  // En VF/VOSTFR : French Stream et Streamzo, puis FStream Movix, puis le reste.
  allSources.sort((a, b) => {
    // Helper pour déterminer le rang
    const getRank = (source: Source) => {
      const provider = source.provider?.toLowerCase() || '';

      if (selectedLanguage !== 'VO') {
        if (provider === 'frenchstream' || provider === 'streamzo') return -10;
        if (provider === 'fstream' || source.name.toLowerCase().includes('fstream movix')) return -9;
      }

      // Rang -2: Bysebuho - HIGHEST PRIORITY
      if (provider === 'bysebuho' ||
        source.name.toLowerCase().includes('bysebuho')) {
        return -2;
      }

      // Rang -1: AnimeAPI (Highest priority for VO anime)
      if (provider === 'animeapi' ||
        source.name.toLowerCase().includes('animeapi')) {
        return -1;
      }

      if (['animesama', 'frenchanime', 'frenchstream', 'streamzo'].includes(provider)) {
        return 0.5;
      }

      // Rang 0: Vidzy (Priorité haute)
      if (source.isVidzy ||
        source.name.toLowerCase().includes('vidzy') ||
        source.provider.toLowerCase() === 'vidzy' ||
        (source.player && source.player.toLowerCase().includes('vidzy'))) {
        return 0;
      }

      // Rang 1: MovieBox
      if (source.provider.toLowerCase() === 'moviebox' ||
        source.name.toLowerCase().includes('moviebox')) {
        return 1;
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

      // Rang 5: Le reste (Darki, Movix, etc.)
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


  const handleSourceClick = async (source: any) => {
    console.log('🔍 StreamingSources handleSourceClick appelé avec source:', source);
    console.log('🔍 Source URL complète:', source.url);
    console.log('🔍 Source type:', source.type);
    console.log('🔍 Source isVidMoly:', source.isVidMoly);

    // Marquer cette source comme en cours de chargement
    setLoadingSources(prev => new Set(prev).add(source.id));



    try {
      if (source.isFStream) {
        // Vidzy now binds extracted URLs to the extractor IP. Loading its
        // embed keeps the page and HLS requests on the user's connection.
        onSourceClick({
          url: source.url,
          type: 'embed' as const,
          name: source.name,
          isVidzy: true,
          provider: 'vidzy'
        });
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
          language: source.language,
          quality: source.quality,
          provider: source.provider,
          isExternalEmbed: source.isExternalEmbed,
          tracks: source.tracks,
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

  const isLoadingProviders =
    isLoadingFStream ||
    isLoadingAnimeVidMoly ||
    isLoadingExternal ||
    isLoadingFrenchProviders ||
    isLoadingMovieBox ||
    isLoadingMovixLinks;

  if (isLoadingProviders) {
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
