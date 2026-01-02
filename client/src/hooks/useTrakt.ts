import { useState, useEffect } from 'react';

interface TraktTokens {
    access_token: string;
    refresh_token: string;
}

export function useTrakt() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check connection status on mount
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const response = await fetch('/api/trakt/status');
            setIsConnected(response.ok);
        } catch {
            setIsConnected(false);
        }
    };

    const connect = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/trakt/auth');
            const { authUrl } = await response.json();
            window.location.href = authUrl;
        } catch (error) {
            console.error('Failed to initiate Trakt auth:', error);
            setIsLoading(false);
        }
    };

    const disconnect = async () => {
        try {
            await fetch('/api/trakt/disconnect', { method: 'POST' });
            setIsConnected(false);
        } catch (error) {
            console.error('Failed to disconnect from Trakt:', error);
        }
    };

    const scrobble = async (
        type: 'movie' | 'episode',
        tmdbId: number,
        progress: number,
        action: 'start' | 'pause' | 'stop'
    ) => {
        try {
            const body = {
                [type]: {
                    ids: { tmdb: tmdbId },
                },
                progress,
                action,
            };

            await fetch('/api/trakt/scrobble', {
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
