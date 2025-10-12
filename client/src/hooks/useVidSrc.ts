import { useState, useEffect } from 'react';
import { extractVidSrcStreamingLinks, extractVidSrcM3u8, generateVidSrcMovieUrl, generateVidSrcSeriesUrl } from '@/lib/vidsrc';

interface VidSrcPlayer {
  name: string;
  url: string;
  type: 'm3u8' | 'mp4' | 'embed';
}

interface VidSrcResult {
  success: boolean;
  m3u8Url?: string;
  players?: VidSrcPlayer[];
  error?: string;
}

export function useVidSrc(type: 'movie' | 'tv', id: number, season?: number, episode?: number) {
  const [data, setData] = useState<VidSrcResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateUrl = () => {
    if (type === 'movie') {
      return generateVidSrcMovieUrl(id);
    } else if (type === 'tv' && season && episode) {
      return generateVidSrcSeriesUrl(id, season, episode);
    }
    return null;
  };

  const fetchVidSrcData = async () => {
    const url = generateUrl();
    if (!url) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await extractVidSrcStreamingLinks(url);
      setData(result);
      
      if (!result.success) {
        setError(result.error || 'Erreur lors de l\'extraction VidSrc');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const extractM3u8 = async (): Promise<string | null> => {
    const url = generateUrl();
    if (!url) return null;

    try {
      return await extractVidSrcM3u8(url);
    } catch (err) {
      console.error('Erreur extraction m3u8 VidSrc:', err);
      return null;
    }
  };

  useEffect(() => {
    if (id && (type === 'movie' || (type === 'tv' && season && episode))) {
      fetchVidSrcData();
    }
  }, [id, type, season, episode]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchVidSrcData,
    extractM3u8,
    url: generateUrl()
  };
}

export function useVidSrcMovie(movieId: number) {
  return useVidSrc('movie', movieId);
}

export function useVidSrcSeries(seriesId: number, season: number, episode: number) {
  return useVidSrc('tv', seriesId, season, episode);
}
