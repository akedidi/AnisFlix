import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Set the ffmpeg path from the installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log(`[FFmpeg Download] Using FFmpeg binary at: ${ffmpegInstaller.path}`);


// Actually, to make it work 'nicely' if possible, we could check environment.
// For now, simple implementation as requested.

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, headers: headersStr, filename } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url' });
    }

    const outputFilename = filename || 'video.mp4';

    // Parse headers
    let customHeaders = '';
    if (headersStr) {
        try {
            const parsed = JSON.parse(decodeURIComponent(headersStr));
            // Format for ffmpeg: "Key: Value\r\nKey2: Value2\r\n"
            customHeaders = Object.entries(parsed)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\r\n') + '\r\n';
        } catch (e) {
            console.error('Failed to parse headers:', e);
        }
    }

    console.log(`[FFmpeg Download] Starting download for: ${url}`);
    if (customHeaders) console.log(`[FFmpeg Download] Headers: \n${customHeaders}`);

    // Set response headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);

    // Create FFmpeg command
    const command = ffmpeg(url);

    if (customHeaders) {
        command.inputOptions([
            '-headers', customHeaders,
            '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]);
    }

    command
        .outputOptions([
            '-c copy',           // Copy stream (no re-encoding) - FASTEST
            '-movflags frag_keyframe+empty_moov', // REQUIRED for streaming MP4
            '-bsf:a aac_adtstoasc' // Fix for AAC audio in some HLS streams
        ])
        .format('mp4')
        .on('start', (commandLine) => {
            console.log('[FFmpeg Download] Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', (err) => {
            console.error('[FFmpeg Download] Error:', err.message);
            // If headers haven't been sent, send 500. If partial, just end.
            if (!res.headersSent) {
                res.status(500).end();
            } else {
                res.end();
            }
        })
        .on('end', () => {
            console.log('[FFmpeg Download] Finished processing');
        });

    // Pipe directly to response
    command.pipe(res, { end: true });
}
