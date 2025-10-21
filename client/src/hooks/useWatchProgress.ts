import { useState, useEffect } from 'react';
import type { WatchProgress } from '@shared/schema';
import { getWatchProgress as getProgress, saveWatchProgress as saveProgress, removeWatchProgress as removeProgress } from '@/lib/watchProgress';

export function useWatchProgress() {
  const [progress, setProgress] = useState<WatchProgress[]>([]);

  const loadProgress = () => {
    const data = getProgress();
    setProgress(data);
  };

  useEffect(() => {
    loadProgress();

    // Écouter les mises à jour de progression
    const handleProgressUpdate = () => {
      loadProgress();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('watchProgressUpdated', handleProgressUpdate);
      return () => {
        window.removeEventListener('watchProgressUpdated', handleProgressUpdate);
      };
    }
  }, []);

  const saveWatchProgress = (progressData: Omit<WatchProgress, 'id' | 'lastWatched'>) => {
    saveProgress(progressData);
    loadProgress();
  };

  const removeWatchProgress = (mediaId: number, mediaType: string) => {
    removeProgress(mediaId, mediaType);
    loadProgress();
  };

  const getMediaProgress = (mediaId: number, mediaType: string, seasonNumber?: number, episodeNumber?: number) => {
    return progress.find(p => {
      if (p.mediaId !== mediaId || p.mediaType !== mediaType) {
        return false;
      }
      
      // Pour les séries, vérifier aussi season et episode
      if (mediaType === 'tv' && (seasonNumber !== undefined || episodeNumber !== undefined)) {
        return p.seasonNumber === seasonNumber && p.episodeNumber === episodeNumber;
      }
      
      return true;
    });
  };

  return {
    progress,
    saveWatchProgress,
    removeWatchProgress,
    getMediaProgress,
    refreshProgress: loadProgress
  };
}
