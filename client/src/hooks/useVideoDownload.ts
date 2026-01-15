
import { useState, useRef, useEffect } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export const useVideoDownload = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const ffmpegRef = useRef<any>(null);

    // Function to load FFmpeg implementation with explicit Blobs
    const loadFFmpeg = async () => {
        if (ffmpegRef.current) return ffmpegRef.current;

        const baseUrl = 'https://unpkg.com/@ffmpeg/core@0.11.0/dist';

        // Helper to fetch and create Blob URL
        const toBlobURL = async (url: string, type: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to load ${url}`);
            const blob = await res.blob();
            return URL.createObjectURL(new Blob([blob], { type }));
        };

        setMessage('Loading FFmpeg core...');

        const coreURL = await toBlobURL(`${baseUrl}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, 'application/wasm');
        const workerURL = await toBlobURL(`${baseUrl}/ffmpeg-core.worker.js`, 'text/javascript');

        const ffmpeg = createFFmpeg({
            log: true,
            corePath: coreURL,
            wasmPath: wasmURL,
            workerPath: workerURL,
        });

        await ffmpeg.load();
        ffmpegRef.current = ffmpeg;
        return ffmpeg;
    };

    const resolveUrl = (baseUrl: string, relativeUrl: string) => {
        try {
            return new URL(relativeUrl, baseUrl).toString();
        } catch (e) {
            return relativeUrl;
        }
    };

    const fetchText = async (url: string) => {
        try {
            console.log('Trying direct fetch:', url);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Direct fetch failed: ${res.status}`);
            return await res.text();
        } catch (e) {
            console.warn('Direct fetch failed, trying proxy...', e);
            // Fallback to proxy
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
            return await res.text();
        }
    };

    const downloadVideo = async (m3u8Url: string, fileName: string = 'video.mp4') => {
        setLoading(true);
        setMessage('Initializing...');
        setProgress(0);
        console.log('🚀 [Downloader] Starting download for:', m3u8Url);

        try {
            // Ensure FFmpeg is loaded
            console.log('🚀 [Downloader] Loading FFmpeg...');
            const ffmpeg = await loadFFmpeg();

            if (!ffmpeg.isLoaded()) {
                await ffmpeg.load();
            }
            console.log('🚀 [Downloader] FFmpeg loaded!');

            setMessage('Fetching playlist...');

            // 1. Fetch M3U8 with fallback
            const originalM3u8 = await fetchText(m3u8Url);
            console.log('🚀 [Downloader] Playlist fetched. Length:', originalM3u8.length);

            // 2. Rewrite relative URLs to absolute
            const modifiedM3u8 = originalM3u8.split('\n').map(line => {
                const trimmed = line.trim();
                // Check if line is a URL (not empty, not starting with #)
                if (trimmed && !trimmed.startsWith('#')) {
                    return resolveUrl(m3u8Url, trimmed);
                }
                return line;
            }).join('\n');

            ffmpeg.FS('writeFile', 'input.m3u8', modifiedM3u8);
            console.log('🚀 [Downloader] Playlist written to FS');

            setMessage('Downloading & Transcoding...');

            ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
                const pct = Math.round(ratio * 100);
                console.log(`🚀 [Downloader] Progress: ${pct}%`);
                setProgress(pct);
                setMessage(`Downloading: ${pct}%`);
            });

            // 3. Run FFmpeg
            console.log('🚀 [Downloader] Running FFmpeg...');
            await ffmpeg.run(
                '-i', 'input.m3u8',
                '-c', 'copy',
                '-bsf:a', 'aac_adtstoasc',
                'output.mp4'
            );
            console.log('🚀 [Downloader] FFmpeg finished');

            setMessage('Saving file...');
            const data = ffmpeg.FS('readFile', 'output.mp4');

            // 4. Trigger Download
            // Use any casting for Blob to avoid SharedArrayBuffer type issues
            const u8 = data as Uint8Array;
            const url = URL.createObjectURL(new Blob([u8 as any], { type: 'video/mp4' }));

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Cleanup
            // setTimeout to allow download to start
            setTimeout(() => {
                try { ffmpeg.FS('unlink', 'output.mp4'); } catch (e) { }
                try { ffmpeg.FS('unlink', 'input.m3u8'); } catch (e) { }
                URL.revokeObjectURL(url);
            }, 1000);

            setMessage('Done!');
            return true;
        } catch (error: any) {
            console.error('FFmpeg Download Error:', error);
            let errMsg = error.message;
            if (errMsg.includes('Load failed')) errMsg = 'Network Error (CORS?) or Codec issue. Check console.';
            setMessage(`Error: ${errMsg}`);
            throw new Error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return { downloadVideo, loading, progress, message };
};
