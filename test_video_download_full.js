/**
 * Test de téléchargement vidéo SANS PROXY - Version complète
 * 
 * Ce script:
 * 1. Récupère des URLs fraîches depuis AutoEmbed (MegaCDN)
 * 2. Récupère des URLs Vidmoly/Vidzy depuis AfterDark (si disponible)
 * 3. Teste le téléchargement avec ffmpeg
 * 
 * Usage: node test_video_download_full.js
 * Prérequis: ffmpeg installé (brew install ffmpeg)
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

const OUTPUT_DIR = './test_downloads';

// ==================== CRYPTO HELPERS ====================

function baseTransform(d, e, f) {
    const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
    const g = [...charset];
    const h = g.slice(0, e);
    const i = g.slice(0, f);
    let j = 0;
    const reversedD = d.split('').reverse();
    for (let c = 0; c < reversedD.length; c++) {
        const b = reversedD[c];
        if (h.includes(b)) j += h.indexOf(b) * Math.pow(e, c);
    }
    let k = '';
    while (j > 0) {
        k = i[j % f] + k;
        j = Math.floor(j / f);
    }
    return k || '0';
}

function decryptData(encryptedObjectB64) {
    const encryptedObject = JSON.parse(Buffer.from(encryptedObjectB64, 'base64').toString('utf8'));
    const { algorithm, key, iv, salt, iterations, encryptedData } = encryptedObject;
    const derivedKey = crypto.pbkdf2Sync(key, Buffer.from(salt, 'hex'), iterations, 32, 'sha256');
    const ivBuffer = Buffer.from(iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, derivedKey, ivBuffer);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
}

// ==================== HTTP HELPERS ====================

function httpGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...headers
            },
            timeout: 15000
        };

        const req = client.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString()
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

// ==================== FETCH REAL URLs ====================

async function fetchMegaCDNUrl(tmdbId = 550) {
    console.log(`\n🔍 Récupération URL MegaCDN pour TMDB:${tmdbId}...`);

    const serverUrl = `https://test.autoembed.cc/api/server?id=${tmdbId}&sr=10`;
    const headers = { 'Referer': 'https://player.vidsrc.co/', 'Origin': 'https://player.vidsrc.co/' };

    try {
        const response = await httpGet(serverUrl, headers);
        if (response.statusCode !== 200) {
            console.log(`   ❌ Erreur HTTP: ${response.statusCode}`);
            return null;
        }

        const data = JSON.parse(response.body);
        if (!data.data) {
            console.log('   ❌ Pas de données chiffrées');
            return null;
        }

        const decrypted = decryptData(data.data);
        let directUrl = decrypted.url;

        // De-proxy si nécessaire
        if (directUrl.includes('proxy') && directUrl.includes('url=')) {
            const urlMatch = directUrl.match(/[?&]url=([^&]+)/);
            if (urlMatch) directUrl = decodeURIComponent(urlMatch[1]);
        }

        console.log(`   ✅ URL obtenue: ${directUrl.substring(0, 80)}...`);
        return {
            name: 'MegaCDN',
            url: directUrl,
            headers: {},
            description: 'Direct HLS depuis AutoEmbed Server 10'
        };

    } catch (e) {
        console.log(`   ❌ Erreur: ${e.message}`);
        return null;
    }
}

async function fetchAfterDarkUrls(tmdbId = 550) {
    console.log(`\n🔍 Récupération URLs AfterDark pour TMDB:${tmdbId}...`);

    const apiUrl = `https://afterdark.mom/api/movie/${tmdbId}`;

    try {
        const response = await httpGet(apiUrl, { 'Referer': 'https://afterdark.mom/' });

        if (response.statusCode !== 200) {
            console.log(`   ❌ Erreur HTTP: ${response.statusCode}`);
            return [];
        }

        const data = JSON.parse(response.body);
        const sources = [];

        if (data.sources && Array.isArray(data.sources)) {
            for (const src of data.sources) {
                if (src.file && (src.file.includes('vidmoly') || src.file.includes('vidzy') || src.file.includes('darkibox'))) {
                    sources.push({
                        name: src.name || 'AfterDark',
                        url: src.file,
                        headers: {
                            'Referer': 'https://afterdark.mom/',
                            'Origin': 'https://afterdark.mom'
                        },
                        description: `Source: ${src.name || 'Unknown'}`
                    });
                    console.log(`   ✅ ${src.name}: ${src.file.substring(0, 60)}...`);
                }
            }
        }

        if (sources.length === 0) {
            console.log('   ⚠️ Aucune source Vidmoly/Vidzy trouvée');
        }

        return sources;

    } catch (e) {
        console.log(`   ❌ Erreur: ${e.message}`);
        return [];
    }
}

// ==================== DOWNLOAD TESTS ====================

async function checkFfmpeg() {
    return new Promise((resolve) => {
        exec('ffmpeg -version', (error, stdout) => {
            if (!error) {
                const version = stdout.match(/ffmpeg version (\S+)/)?.[1] || 'unknown';
                resolve({ installed: true, version });
            } else {
                resolve({ installed: false });
            }
        });
    });
}

async function testDirectAccess(source) {
    try {
        const response = await httpGet(source.url, source.headers);
        return {
            success: response.statusCode >= 200 && response.statusCode < 400,
            statusCode: response.statusCode,
            contentType: response.headers['content-type'],
            isM3U8: response.body.includes('#EXTM3U'),
            hasVariants: response.body.includes('#EXT-X-STREAM-INF'),
            segmentCount: (response.body.match(/\.ts/g) || []).length
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function downloadWithFfmpeg(source, outputFile, duration = 10) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        const args = ['-y', '-loglevel', 'warning', '-t', String(duration)];

        // Headers pour ffmpeg
        if (source.headers && Object.keys(source.headers).length > 0) {
            const headerString = Object.entries(source.headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\r\n');
            args.push('-headers', headerString + '\r\n');
        }

        args.push('-i', source.url, '-c', 'copy', outputFile);

        const ffmpeg = spawn('ffmpeg', args);

        let stderr = '';
        ffmpeg.stderr.on('data', (data) => stderr += data.toString());

        ffmpeg.on('close', (code) => {
            const elapsed = Date.now() - startTime;

            if (code === 0 && fs.existsSync(outputFile)) {
                const stats = fs.statSync(outputFile);
                resolve({
                    success: true,
                    fileSize: stats.size,
                    fileSizeHuman: formatBytes(stats.size),
                    duration: elapsed
                });
            } else {
                resolve({ success: false, error: stderr.substring(0, 300) || `Exit ${code}`, duration: elapsed });
            }
        });

        ffmpeg.on('error', (err) => resolve({ success: false, error: err.message }));

        // Timeout 120s
        setTimeout(() => ffmpeg.kill('SIGTERM'), 120000);
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== MAIN ====================

async function main() {
    console.log('═'.repeat(70));
    console.log('🎬 TEST DE TÉLÉCHARGEMENT VIDÉO SANS PROXY');
    console.log('═'.repeat(70));
    console.log(`📅 ${new Date().toLocaleString()}\n`);

    // Créer dossier
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Check ffmpeg
    const ffmpegInfo = await checkFfmpeg();
    console.log(`📦 ffmpeg: ${ffmpegInfo.installed ? `✅ v${ffmpegInfo.version}` : '❌ Non installé (brew install ffmpeg)'}`);

    // Collecter les sources
    const sources = [];

    // MegaCDN
    const megacdn = await fetchMegaCDNUrl(550); // Fight Club
    if (megacdn) sources.push(megacdn);

    // AfterDark (Vidmoly, Vidzy)
    const afterdarkSources = await fetchAfterDarkUrls(550);
    sources.push(...afterdarkSources);

    if (sources.length === 0) {
        console.log('\n❌ Aucune source trouvée pour les tests');
        return;
    }

    // Tester chaque source
    for (const source of sources) {
        console.log('\n' + '─'.repeat(70));
        console.log(`📹 ${source.name}`);
        console.log(`   ${source.description}`);
        console.log(`   URL: ${source.url.substring(0, 70)}...`);

        // Test 1: Accès HTTP
        console.log('\n   📡 Test HTTP direct...');
        const access = await testDirectAccess(source);
        if (access.success) {
            console.log(`      ✅ HTTP ${access.statusCode}`);
            console.log(`      Type: ${access.contentType || 'N/A'}`);
            console.log(`      M3U8: ${access.isM3U8 ? 'Oui' : 'Non'} | Variantes: ${access.hasVariants ? 'Oui' : 'Non'} | Segments: ${access.segmentCount}`);
        } else {
            console.log(`      ❌ ${access.error || `HTTP ${access.statusCode}`}`);
        }

        // Test 2: ffmpeg download
        if (ffmpegInfo.installed && access.success) {
            console.log('\n   📥 Test ffmpeg (10 sec)...');
            const safeName = source.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const outputFile = path.join(OUTPUT_DIR, `${safeName}_test.mp4`);

            const download = await downloadWithFfmpeg(source, outputFile, 10);
            if (download.success) {
                console.log(`      ✅ Téléchargé: ${download.fileSizeHuman} en ${download.duration}ms`);
                console.log(`      Fichier: ${outputFile}`);
            } else {
                console.log(`      ❌ ${download.error}`);
            }
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ Tests terminés');
    console.log(`   Fichiers: ${path.resolve(OUTPUT_DIR)}`);
    console.log('═'.repeat(70));
}

main().catch(console.error);
