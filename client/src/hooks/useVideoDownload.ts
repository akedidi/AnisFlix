
import { useState, useRef, useEffect } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export const useVideoDownload = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    // Use useRef to keep the ffmpeg instance stable
    const ffmpegRef = useRef(createFFmpeg({ log: true }));

    const downloadVideo = async (m3u8Url: string, fileName: string = 'video.mp4') => {
        setLoading(true);
        setMessage('Initializing FFmpeg v0.11 (Compatible Mode)...');
        setProgress(0);

        const ffmpeg = ffmpegRef.current;

        try {
            if (!ffmpeg.isLoaded()) {
                await ffmpeg.load();
            }

            setMessage('Downloading & Transcoding...');

            // Hook into progress
            ffmpeg.setProgress(({ ratio }) => {
                setProgress(Math.round(ratio * 100));
            });

            // FFmpeg v0.11 run command
            // We use the URL directly as input. 
            // Note: If CORS issues persist with direct URL, we might need to fetch blobs manually,
            // but usually ffmpeg.wasm handles this via fetch inside if the server allows CORS.
            await ffmpeg.run(
                '-i', m3u8Url,
                '-c', 'copy',
                '-bsf:a', 'aac_adtstoasc',
                'output.mp4'
            );

            setMessage('Finalizing...');
            const data = ffmpeg.FS('readFile', 'output.mp4');

            // Create download link
            // v0.11 FS('readFile') returns Uint8Array directly
            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Cleanup check: ffmpeg.FS('unlink', 'output.mp4')?
            try { ffmpeg.FS('unlink', 'output.mp4'); } catch (e) { }
            // URL.revokeObjectURL(url); // Keep it alive for a bit for the download to start

            setMessage('Done!');
        } catch (error: any) {
            console.error('FFmpeg error:', error);
            setMessage(`Error: ${error.message}`);
            // If it's a SharedArrayBuffer error, it means we still have issues, but v0.11 usually avoids this by default
            if (error.message.includes('SharedArrayBuffer')) {
                setMessage('Error: Your browser requires strict security for this feature. Try Chrome Desktop.');
            }
        } finally {
            setLoading(false);
        }
    };

    return { downloadVideo, loading, progress, message };
};
