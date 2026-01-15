
import { useState, useRef } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export const useVideoDownload = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const ffmpegRef = useRef(createFFmpeg({
        log: true,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    }));

    const resolveUrl = (baseUrl: string, relativeUrl: string) => {
        try {
            return new URL(relativeUrl, baseUrl).toString();
        } catch (e) {
            return relativeUrl;
        }
    };

    const downloadVideo = async (m3u8Url: string, fileName: string = 'video.mp4') => {
        setLoading(true);
        setMessage('Starting download...');
        setProgress(0);

        const ffmpeg = ffmpegRef.current;

        try {
            if (!ffmpeg.isLoaded()) {
                setMessage('Loading FFmpeg engine...');
                await ffmpeg.load();
            }

            setMessage('Fetching playlist...');

            // 1. Manually fetch the M3U8 to handle relative paths
            const response = await fetch(m3u8Url);
            if (!response.ok) throw new Error(`Failed to fetch playlist: ${response.statusText}`);
            const originalM3u8 = await response.text();

            // 2. Rewrite relative URLs to absolute
            const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
            const modifiedM3u8 = originalM3u8.split('\n').map(line => {
                if (line.trim() && !line.startsWith('#')) {
                    // It's a URL (segment or playlist)
                    return resolveUrl(m3u8Url, line.trim());
                }
                return line;
            }).join('\n');

            ffmpeg.FS('writeFile', 'input.m3u8', modifiedM3u8);

            setMessage('Downloading & Transcoding...');

            ffmpeg.setProgress(({ ratio }) => {
                setProgress(Math.round(ratio * 100));
                setMessage(`Downloading: ${Math.round(ratio * 100)}%`);
            });

            // 3. Run FFmpeg on local file
            // Note: If segments are CORS-protected, standard fetch inside FFmpeg will fail.
            // We can't easily fix that client-side without a proxy, forcing headers is not possible in browser fetch.
            await ffmpeg.run(
                '-i', 'input.m3u8',
                '-c', 'copy',
                '-bsf:a', 'aac_adtstoasc',
                'output.mp4'
            );

            setMessage('Saving file...');
            const data = ffmpeg.FS('readFile', 'output.mp4');

            // 4. Trigger Download
            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Cleanup
            try { ffmpeg.FS('unlink', 'output.mp4'); } catch (e) { }
            try { ffmpeg.FS('unlink', 'input.m3u8'); } catch (e) { }

            setMessage('Done!');
            return true;
        } catch (error: any) {
            console.error('FFmpeg Download Error:', error);
            // Enhance error message
            let errMsg = error.message;
            if (errMsg.includes('Load failed')) errMsg = 'Network Error (CORS?) or Codec issue';
            if (errMsg.includes('SharedArrayBuffer')) errMsg = 'Browser security blocked strict mode';

            setMessage(`Error: ${errMsg}`);
            throw new Error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return { downloadVideo, loading, progress, message };
};
