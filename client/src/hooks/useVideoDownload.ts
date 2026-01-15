
import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export const useVideoDownload = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const ffmpegRef = useRef(new FFmpeg());

    const downloadVideo = async (m3u8Url: string, fileName: string = 'video.mp4') => {
        setLoading(true);
        setMessage('Initializing FFmpeg...');
        setProgress(0);

        const ffmpeg = ffmpegRef.current;

        try {
            // Load FFmpeg.wasm
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });

            setMessage('Downloading & Transcoding...');

            // Hook into progress
            ffmpeg.on('progress', ({ progress: p }) => {
                setProgress(Math.round(p * 100));
            });

            // FFmpeg command to download M3U8 and output MP4
            // Input URL must be CORS-enabled.
            await ffmpeg.exec([
                '-i', m3u8Url,
                '-c', 'copy',
                '-bsf:a', 'aac_adtstoasc', // Often needed for HLS to MP4
                'output.mp4'
            ]);

            setMessage('Finalizing...');
            const data = await ffmpeg.readFile('output.mp4');

            // Create download link
            const u8 = data as Uint8Array;
            const url = URL.createObjectURL(new Blob([u8 as any], { type: 'video/mp4' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessage('Done!');
        } catch (error: any) {
            console.error('FFmpeg error:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return { downloadVideo, loading, progress, message };
};
