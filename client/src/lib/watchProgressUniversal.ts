import { isWeb } from '@/config/platform';

// Import conditionnel selon la plateforme
const webWatchProgress = isWeb ? require('./watchProgress') : null;
const rnWatchProgress = !isWeb ? require('./watchProgressRN') : null;

export function getWatchProgress() {
  if (isWeb && webWatchProgress) {
    return webWatchProgress.getWatchProgress();
  } else if (!isWeb && rnWatchProgress) {
    return rnWatchProgress.getWatchProgress();
  } else {
    return Promise.resolve([]);
  }
}

export function saveWatchProgress(progress: any) {
  if (isWeb && webWatchProgress) {
    return webWatchProgress.saveWatchProgress(progress);
  } else if (!isWeb && rnWatchProgress) {
    return rnWatchProgress.saveWatchProgress(progress);
  }
}

export function removeWatchProgress(mediaId: number, mediaType: string) {
  if (isWeb && webWatchProgress) {
    return webWatchProgress.removeWatchProgress(mediaId, mediaType);
  } else if (!isWeb && rnWatchProgress) {
    return rnWatchProgress.removeWatchProgress(mediaId, mediaType);
  }
}

export function getMediaProgress(mediaId: number, mediaType: string, seasonNumber?: number, episodeNumber?: number) {
  if (isWeb && webWatchProgress) {
    return webWatchProgress.getMediaProgress(mediaId, mediaType, seasonNumber, episodeNumber);
  } else if (!isWeb && rnWatchProgress) {
    return rnWatchProgress.getMediaProgress(mediaId, mediaType, seasonNumber, episodeNumber);
  } else {
    return Promise.resolve(null);
  }
}
