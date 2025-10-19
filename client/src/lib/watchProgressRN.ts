import type { WatchProgress } from "@shared/schema";
import { Storage } from "./storage";

const WATCH_PROGRESS_KEY = "anisflix_watch_progress";

export async function getWatchProgress(): Promise<WatchProgress[]> {
  try {
    const stored = await Storage.getItem(WATCH_PROGRESS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as WatchProgress[];
  } catch (error) {
    console.error("Error reading watch progress:", error);
    return [];
  }
}

export async function saveWatchProgress(progress: Omit<WatchProgress, "id" | "lastWatched">): Promise<void> {
  try {
    const allProgress = await getWatchProgress();
    
    // Find existing progress for this media
    // Pour les séries, chercher par mediaId, mediaType, seasonNumber et episodeNumber
    const existingIndex = allProgress.findIndex(p => {
      if (p.mediaId !== progress.mediaId || p.mediaType !== progress.mediaType) {
        return false;
      }
      // Pour les séries, vérifier aussi season et episode
      if (progress.mediaType === 'tv' && (progress.seasonNumber !== undefined || progress.episodeNumber !== undefined)) {
        return p.seasonNumber === progress.seasonNumber && p.episodeNumber === progress.episodeNumber;
      }
      return true;
    });
    
    const newProgress: WatchProgress = {
      ...progress,
      id: existingIndex >= 0 ? allProgress[existingIndex].id : crypto.randomUUID(),
      lastWatched: new Date().toISOString(),
    };
    
    if (existingIndex >= 0) {
      allProgress[existingIndex] = newProgress;
    } else {
      allProgress.unshift(newProgress);
    }
    
    // Keep only last 20 items
    const trimmed = allProgress.slice(0, 20);
    
    await Storage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(trimmed));
    
    // Déclencher un événement personnalisé pour notifier les composants (web seulement)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('watchProgressUpdated'));
    }
  } catch (error) {
    console.error("Error saving watch progress:", error);
  }
}

export async function removeWatchProgress(mediaId: number, mediaType: string): Promise<void> {
  try {
    const allProgress = await getWatchProgress();
    const filtered = allProgress.filter(
      p => !(p.mediaId === mediaId && p.mediaType === mediaType)
    );
    await Storage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(filtered));
    
    // Déclencher un événement personnalisé pour notifier les composants (web seulement)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('watchProgressUpdated'));
    }
  } catch (error) {
    console.error("Error removing watch progress:", error);
  }
}

export async function getMediaProgress(
  mediaId: number, 
  mediaType: string, 
  seasonNumber?: number, 
  episodeNumber?: number
): Promise<WatchProgress | null> {
  const allProgress = await getWatchProgress();
  return allProgress.find(p => {
    if (p.mediaId !== mediaId || p.mediaType !== mediaType) {
      return false;
    }
    // Pour les séries, vérifier aussi season et episode si fournis
    if (mediaType === 'tv' && seasonNumber !== undefined && episodeNumber !== undefined) {
      return p.seasonNumber === seasonNumber && p.episodeNumber === episodeNumber;
    }
    return true;
  }) || null;
}
