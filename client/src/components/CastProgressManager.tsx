import { useEffect, useRef } from 'react';
import { useChromecast } from '@/hooks/useChromecast';
import { saveWatchProgress } from '@/lib/watchProgress';

export default function CastProgressManager() {
    const { isConnected, cast, getMediaTime } = useChromecast();
    const lastSaveTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!isConnected) return;

        const interval = setInterval(async () => {
            // Get the Chromecast session directly from window as useChromecast might not expose the session object directly
            // but we can use the window.cast SDK
            if (!window.cast || !window.cast.framework) return;

            const context = window.cast.framework.CastContext.getInstance();
            const session = context.getCurrentSession();

            if (!session) return;

            const mediaSession = session.getMediaSession();
            if (!mediaSession || !mediaSession.media || !mediaSession.media.customData) return;

            const customData = mediaSession.media.customData;
            const { mediaId, mediaType, title, posterPath, season, episode } = customData;

            if (!mediaId || !mediaType) return;

            // Get current time
            const time = mediaSession.getEstimatedTime();
            const duration = mediaSession.media.duration;

            if (time > 0 && duration > 0) {
                const now = Date.now();
                // Save every 5 seconds
                if (now - lastSaveTimeRef.current >= 5000) {
                    const progress = Math.round((time / duration) * 100);

                    console.log('[CastProgressManager] Saving progress:', {
                        mediaId,
                        title,
                        progress,
                        time
                    });

                    saveWatchProgress({
                        mediaId,
                        mediaType,
                        title: title || "Cast Video",
                        posterPath: posterPath || null,
                        backdropPath: null,
                        currentTime: time,
                        duration: duration,
                        progress: progress,
                        seasonNumber: season,
                        episodeNumber: episode,
                    });

                    lastSaveTimeRef.current = now;
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isConnected]);

    return null; // Headless component
}
