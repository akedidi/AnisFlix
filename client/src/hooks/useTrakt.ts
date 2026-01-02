import { useState, useEffect } from 'react';

export function useTrakt() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        checkConnection();

        // Also check if we just came back from auth
        const params = new URLSearchParams(window.location.search);
        if (params.get('trakt') === 'connected') {
            checkConnection();
            // Optional: Clean up URL
            window.history.replaceState({}, '', '/settings');
        }
    }, []);

    const checkConnection = async () => {
        try {
            const response = await fetch('/api/proxy?type=trakt-status');
            setIsConnected(response.ok);
        } catch {
            setIsConnected(false);
        }
    };

    const connect = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/proxy?type=trakt-auth');
            const { authUrl } = await response.json();
            window.location.href = authUrl;
        } catch (error) {
            console.error('Failed to initiate Trakt auth:', error);
            setIsLoading(false);
        }
    };

    const disconnect = async () => {
        try {
            await fetch('/api/proxy?type=trakt-disconnect', { method: 'POST' });
            setIsConnected(false);
        } catch (error) {
            console.error('Failed to disconnect from Trakt:', error);
        }
    };

    const scrobble = async (
        type: 'movie' | 'episode',
        tmdbId: number,
        progress: number,
        action: 'start' | 'pause' | 'stop',
        season?: number,
        episode?: number
    ) => {
        try {
            let body: any = {
                progress,
                action,
            };

            if (type === 'episode' && season !== undefined && episode !== undefined) {
                // TV Show scrobbling: Need Show ID + Season + Episode
                body.show = {
                    ids: { tmdb: tmdbId }
                };
                body.episode = {
                    season: season,
                    number: episode
                };
            } else {
                // Movie or direct Episode ID (fallback)
                body[type] = {
                    ids: { tmdb: tmdbId }
                };
            }

            await fetch('/api/proxy?type=trakt-scrobble', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch (error) {
            console.error('Failed to scrobble:', error);
        }
    };

    return {
        isConnected,
        isLoading,
        connect,
        disconnect,
        scrobble,
    };
}
