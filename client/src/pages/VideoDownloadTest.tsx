/**
 * Page de test pour télécharger des vidéos depuis MegaCDN, Vidzy, Vidmoly
 * SANS proxy, en utilisant ffmpeg.wasm pour le remux
 */

import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface TestSource {
    name: string;
    url: string;
    headers?: Record<string, string>;
    status: 'pending' | 'testing' | 'success' | 'error';
    error?: string;
    httpStatus?: number;
    isM3U8?: boolean;
    segments?: number;
    downloadedSize?: string;
}

interface TestResult {
    source: string;
    httpAccess: boolean;
    corsOk: boolean;
    ffmpegOk: boolean;
    error?: string;
}

export default function VideoDownloadTest() {
    const [sources, setSources] = useState<TestSource[]>([]);
    const [results, setResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [ffmpegProgress, setFfmpegProgress] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const ffmpegRef = useRef<FFmpeg | null>(null);

    const log = useCallback((msg: string) => {
        console.log(msg);
        setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);

    // Charger ffmpeg.wasm
    const loadFFmpeg = async () => {
        if (ffmpegRef.current) return ffmpegRef.current;

        log('🔄 Chargement de ffmpeg.wasm...');
        setFfmpegProgress('Téléchargement des fichiers WASM...');

        const ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            log(`[ffmpeg] ${message}`);
        });

        ffmpeg.on('progress', ({ progress, time }) => {
            setFfmpegProgress(`Progression: ${(progress * 100).toFixed(1)}% (${(time / 1000000).toFixed(1)}s)`);
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        ffmpegRef.current = ffmpeg;
        setFfmpegLoaded(true);
        log('✅ ffmpeg.wasm chargé!');
        setFfmpegProgress('');

        return ffmpeg;
    };

    // Récupérer les sources depuis les APIs
    const fetchSources = async () => {
        setLoading(true);
        log('🔍 Récupération des sources...');

        const newSources: TestSource[] = [];

        // 1. MegaCDN via AutoEmbed
        try {
            log('📡 Fetching MegaCDN (AutoEmbed Server 10)...');
            const tmdbId = 550; // Fight Club
            const response = await fetch(`https://test.autoembed.cc/api/server?id=${tmdbId}&sr=10`, {
                headers: { 'Referer': 'https://player.vidsrc.co/' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    // Decrypt
                    const decrypted = JSON.parse(atob(data.data));
                    let url = decrypted.url;

                    // De-proxy
                    if (url.includes('proxy') && url.includes('url=')) {
                        const match = url.match(/[?&]url=([^&]+)/);
                        if (match) url = decodeURIComponent(match[1]);
                    }

                    newSources.push({
                        name: 'MegaCDN (AutoEmbed)',
                        url,
                        status: 'pending'
                    });
                    log(`✅ MegaCDN URL: ${url.substring(0, 60)}...`);
                }
            }
        } catch (e) {
            log(`❌ MegaCDN error: ${e}`);
        }

        // 2. AfterDark sources
        try {
            log('📡 Fetching AfterDark sources...');
            const response = await fetch('https://afterdark.mom/api/movie/550', {
                headers: { 'Referer': 'https://afterdark.mom/' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.sources) {
                    for (const src of data.sources) {
                        if (src.file && (
                            src.file.includes('vidmoly') ||
                            src.file.includes('vidzy') ||
                            src.file.includes('darkibox') ||
                            src.file.includes('megacdn')
                        )) {
                            newSources.push({
                                name: src.name || 'AfterDark',
                                url: src.file,
                                headers: { 'Referer': 'https://afterdark.mom/' },
                                status: 'pending'
                            });
                            log(`✅ ${src.name}: ${src.file.substring(0, 50)}...`);
                        }
                    }
                }
            }
        } catch (e) {
            log(`❌ AfterDark error: ${e}`);
        }

        // 3. Ajouter des URLs de test manuelles connues
        // (uncomment to test specific URLs)
        /*
        newSources.push({
          name: 'Test Vidmoly',
          url: 'https://vidmoly.to/xxx/xxx.m3u8',
          headers: { 'Referer': 'https://vidmoly.to/' },
          status: 'pending'
        });
        */

        setSources(newSources);
        setLoading(false);
        log(`📊 ${newSources.length} sources trouvées`);
    };

    // Tester l'accès direct à une source
    const testDirectAccess = async (source: TestSource, index: number) => {
        setSources(prev => prev.map((s, i) =>
            i === index ? { ...s, status: 'testing' } : s
        ));

        log(`🔍 Test HTTP: ${source.name}`);

        try {
            const response = await fetch(source.url, {
                method: 'GET',
                headers: source.headers || {},
                mode: 'cors'
            });

            const text = await response.text();
            const isM3U8 = text.includes('#EXTM3U');
            const segments = (text.match(/\.ts/g) || []).length;

            setSources(prev => prev.map((s, i) =>
                i === index ? {
                    ...s,
                    status: response.ok ? 'success' : 'error',
                    httpStatus: response.status,
                    isM3U8,
                    segments,
                    error: response.ok ? undefined : `HTTP ${response.status}`
                } : s
            ));

            log(`${response.ok ? '✅' : '❌'} ${source.name}: HTTP ${response.status}, M3U8: ${isM3U8}, Segments: ${segments}`);

            return { ok: response.ok, isM3U8, segments, content: text };

        } catch (e: any) {
            const errorMsg = e.message || 'CORS/Network error';

            setSources(prev => prev.map((s, i) =>
                i === index ? { ...s, status: 'error', error: errorMsg } : s
            ));

            log(`❌ ${source.name}: ${errorMsg}`);
            return { ok: false, error: errorMsg };
        }
    };

    // Télécharger avec ffmpeg.wasm
    const downloadWithFFmpeg = async (source: TestSource) => {
        const ffmpeg = await loadFFmpeg();

        log(`📥 Téléchargement ffmpeg: ${source.name}`);
        setFfmpegProgress('Récupération du playlist...');

        try {
            // Fetch le m3u8
            const m3u8Response = await fetch(source.url, {
                headers: source.headers || {}
            });

            if (!m3u8Response.ok) {
                throw new Error(`HTTP ${m3u8Response.status}`);
            }

            const m3u8Content = await m3u8Response.text();
            log(`📋 M3U8 récupéré: ${m3u8Content.length} bytes`);

            // Parser le m3u8 pour trouver les segments
            const lines = m3u8Content.split('\n');
            const segments: string[] = [];
            const baseUrl = source.url.substring(0, source.url.lastIndexOf('/') + 1);

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    // C'est un segment
                    const segmentUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
                    segments.push(segmentUrl);
                }
            }

            log(`📊 ${segments.length} segments trouvés`);

            if (segments.length === 0) {
                // C'est peut-être un master playlist, chercher le variant
                const variantMatch = m3u8Content.match(/^[^#\n].+\.m3u8.*$/m);
                if (variantMatch) {
                    const variantUrl = variantMatch[0].startsWith('http')
                        ? variantMatch[0]
                        : baseUrl + variantMatch[0];
                    log(`🔄 Master playlist détecté, récupération variant: ${variantUrl}`);

                    const variantResponse = await fetch(variantUrl, {
                        headers: source.headers || {}
                    });
                    const variantContent = await variantResponse.text();
                    const variantBaseUrl = variantUrl.substring(0, variantUrl.lastIndexOf('/') + 1);

                    for (const line of variantContent.split('\n')) {
                        const trimmed = line.trim();
                        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('.ts')) {
                            segments.push(trimmed.startsWith('http') ? trimmed : variantBaseUrl + trimmed);
                        }
                    }
                    log(`📊 ${segments.length} segments dans variant`);
                }
            }

            // Télécharger les 5 premiers segments (pour le test)
            const testSegments = segments.slice(0, 5);
            const downloadedSegments: Uint8Array[] = [];

            for (let i = 0; i < testSegments.length; i++) {
                setFfmpegProgress(`Segment ${i + 1}/${testSegments.length}...`);
                log(`📥 Segment ${i + 1}: ${testSegments[i].substring(0, 50)}...`);

                const segData = await fetchFile(testSegments[i]);
                downloadedSegments.push(segData);
            }

            // Concaténer et remux avec ffmpeg
            setFfmpegProgress('Remux TS → MP4...');

            // Écrire les segments dans le système de fichiers virtuel
            let totalSize = 0;
            for (let i = 0; i < downloadedSegments.length; i++) {
                await ffmpeg.writeFile(`segment${i}.ts`, downloadedSegments[i]);
                totalSize += downloadedSegments[i].length;
            }

            // Créer un fichier concat
            const concatList = downloadedSegments.map((_, i) => `file 'segment${i}.ts'`).join('\n');
            await ffmpeg.writeFile('concat.txt', concatList);

            // Exécuter ffmpeg pour remux
            await ffmpeg.exec([
                '-f', 'concat',
                '-safe', '0',
                '-i', 'concat.txt',
                '-c', 'copy',
                '-movflags', '+faststart',
                'output.mp4'
            ]);

            // Lire le résultat
            const data = await ffmpeg.readFile('output.mp4');
            const blob = new Blob([data], { type: 'video/mp4' });

            log(`✅ Remux terminé! Taille: ${(blob.size / 1024).toFixed(1)} KB`);
            setFfmpegProgress('');

            // Créer un lien de téléchargement
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${source.name.replace(/[^a-zA-Z0-9]/g, '_')}_test.mp4`;
            a.click();

            return { ok: true, size: blob.size };

        } catch (e: any) {
            log(`❌ FFmpeg error: ${e.message}`);
            setFfmpegProgress('');
            return { ok: false, error: e.message };
        }
    };

    // Tester toutes les sources
    const runAllTests = async () => {
        setResults([]);
        log('🚀 Démarrage des tests...');

        for (let i = 0; i < sources.length; i++) {
            const source = sources[i];
            const accessResult = await testDirectAccess(source, i);

            const result: TestResult = {
                source: source.name,
                httpAccess: accessResult.ok || false,
                corsOk: accessResult.ok || false,
                ffmpegOk: false,
                error: accessResult.error
            };

            // Si l'accès HTTP fonctionne, tester ffmpeg
            if (accessResult.ok && accessResult.isM3U8) {
                const ffmpegResult = await downloadWithFFmpeg(source);
                result.ffmpegOk = ffmpegResult.ok || false;
                if (!ffmpegResult.ok) result.error = ffmpegResult.error;
            }

            setResults(prev => [...prev, result]);
        }

        log('✅ Tous les tests terminés');
    };

    return (
        <div style={{
            padding: '20px',
            backgroundColor: '#1a1a2e',
            minHeight: '100vh',
            color: '#eee',
            fontFamily: 'monospace'
        }}>
            <h1 style={{ color: '#00d4ff' }}>🎬 Test Téléchargement Vidéo (Sans Proxy)</h1>
            <p style={{ color: '#888' }}>
                Test de téléchargement direct depuis MegaCDN, Vidzy, Vidmoly avec ffmpeg.wasm
            </p>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={fetchSources}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? '⏳ Chargement...' : '1. Récupérer les Sources'}
                </button>

                <button
                    onClick={runAllTests}
                    disabled={sources.length === 0 || loading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: sources.length > 0 ? '#00cc66' : '#555',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: sources.length > 0 ? 'pointer' : 'not-allowed'
                    }}
                >
                    2. Lancer les Tests
                </button>

                <button
                    onClick={loadFFmpeg}
                    disabled={ffmpegLoaded}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: ffmpegLoaded ? '#555' : '#cc6600',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: ffmpegLoaded ? 'not-allowed' : 'pointer'
                    }}
                >
                    {ffmpegLoaded ? '✅ FFmpeg Chargé' : '⚡ Précharger FFmpeg'}
                </button>
            </div>

            {ffmpegProgress && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#2a2a4e',
                    borderRadius: '5px',
                    marginBottom: '15px'
                }}>
                    ⏳ {ffmpegProgress}
                </div>
            )}

            {/* Sources */}
            {sources.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#00d4ff' }}>📋 Sources ({sources.length})</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2a2a4e' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Source</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>URL</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>M3U8</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Segments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sources.map((s, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '10px' }}>{s.name}</td>
                                    <td style={{ padding: '10px', fontSize: '12px', color: '#888' }}>
                                        {s.url.substring(0, 50)}...
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        {s.status === 'pending' && '⏳'}
                                        {s.status === 'testing' && '🔄'}
                                        {s.status === 'success' && '✅'}
                                        {s.status === 'error' && '❌'}
                                        {s.error && <span style={{ color: '#ff6666', fontSize: '12px' }}> {s.error}</span>}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        {s.isM3U8 === true && '✅'}
                                        {s.isM3U8 === false && '❌'}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        {s.segments ?? '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#00d4ff' }}>📊 Résultats</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#2a2a4e' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Source</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>HTTP</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>CORS</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>FFmpeg</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Erreur</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '10px' }}>{r.source}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        {r.httpAccess ? '✅' : '❌'}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        {r.corsOk ? '✅' : '❌'}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        {r.ffmpegOk ? '✅' : '❌'}
                                    </td>
                                    <td style={{ padding: '10px', color: '#ff6666', fontSize: '12px' }}>
                                        {r.error || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Logs */}
            <div>
                <h3 style={{ color: '#00d4ff' }}>📝 Logs</h3>
                <div style={{
                    backgroundColor: '#0d0d1a',
                    padding: '15px',
                    borderRadius: '5px',
                    maxHeight: '300px',
                    overflow: 'auto',
                    fontSize: '12px'
                }}>
                    {logs.length === 0 ? (
                        <span style={{ color: '#555' }}>En attente...</span>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} style={{ marginBottom: '5px' }}>{log}</div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
