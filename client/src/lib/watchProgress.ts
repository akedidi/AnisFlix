import type { WatchProgress } from "@shared/schema";

const WATCH_PROGRESS_KEY = "streamapp_watch_progress";

export function getWatchProgress(): WatchProgress[] {
  try {
    const stored = localStorage.getItem(WATCH_PROGRESS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as WatchProgress[];
  } catch (error) {
    console.error("Error reading watch progress:", error);
    return [];
  }
}

export function saveWatchProgress(progress: Omit<WatchProgress, "id" | "lastWatched">): void {
  try {
    const allProgress = getWatchProgress();
    
    // Find existing progress for this media
    const existingIndex = allProgress.findIndex(
      p => p.mediaId === progress.mediaId && p.mediaType === progress.mediaType
    );
    
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
    
    localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Error saving watch progress:", error);
  }
}

export function removeWatchProgress(mediaId: number, mediaType: string): void {
  try {
    const allProgress = getWatchProgress();
    const filtered = allProgress.filter(
      p => !(p.mediaId === mediaId && p.mediaType === mediaType)
    );
    localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing watch progress:", error);
  }
}

export function getMediaProgress(mediaId: number, mediaType: string): WatchProgress | null {
  const allProgress = getWatchProgress();
  return allProgress.find(p => p.mediaId === mediaId && p.mediaType === mediaType) || null;
}
