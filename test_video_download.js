/**
 * Test de téléchargement vidéo SANS PROXY
 * Sources: Vidzy, Vidmoly, MegaCDN
 * 
 * Utilise ffmpeg pour le téléchargement de flux HLS
 * 
 * Usage: node test_video_download.js
 * Prérequis: ffmpeg installé (brew install ffmpeg)
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Dossier de sortie pour les tests
const OUTPUT_DIR = './test_downloads';

// URLs de test (remplacer par des URLs réelles)
const TEST_SOURCES = [
    {
        name: 'MegaCDN',
        // Exemple d'URL MegaCDN (à remplacer avec une vraie URL)
        url: 'https://f5.megacdn.co:2228/v3-hls-playback/49431733c0b3238bc7e36f43db0e499e6747d776e03e54090b1c6734f8ca65bd8b93f5ed7adfbf5e0b0a96bce63eb4c4f4f98eea0059fb4f26a61c26a3f78af0813fee6f2c19fee3dbed5b3423f3f9fe56c0d09e5e5af9e2c/playlist.m3u8',
        headers: {},
        description: 'Direct HLS, pas de protection spéciale'
    },
    {
        name: 'Vidmoly',
        // Exemple d'URL Vidmoly (nécessite souvent Referer)
        url: '', // À remplir avec une vraie URL
        headers: {
            'Referer': 'https://vidmoly.to/',
            'Origin': 'https://vidmoly.to'
        },
        description: 'Nécessite Referer header'
    },
    {
        name: 'Vidzy',
        // Exemple d'URL Vidzy
        url: '', // À remplir avec une vraie URL
        headers: {
            'Referer': 'https://vidzy.to/',
            'Origin': 'https://vidzy.to'
        },
        description: 'Nécessite Referer header'
    }
];

// Vérifie si ffmpeg est installé
async function checkFfmpeg() {
    return new Promise((resolve) => {
        exec('ffmpeg -version', (error) => {
            resolve(!error);
        });
    });
}

// Teste l'accès direct à une URL (HTTP HEAD/GET)
async function testDirectAccess(url, headers = {}) {
    return new Promise((resolve) => {
        if (!url) {
            resolve({ success: false, error: 'URL vide' });
            return;
        }

        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                ...headers
            },
            timeout: 10000
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk.toString().substring(0, 500));
            res.on('end', () => {
                resolve({
                    success: res.statusCode >= 200 && res.statusCode < 400,
                    statusCode: res.statusCode,
                    contentType: res.headers['content-type'],
                    contentLength: res.headers['content-length'],
                    isM3U8: data.includes('#EXTM3U') || data.includes('#EXT-X-')
                });
            });
        });

        req.on('error', (e) => resolve({ success: false, error: e.message }));
        req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        req.end();
    });
}

// Télécharge une vidéo avec ffmpeg
async function downloadWithFfmpeg(source, outputFile, duration = 10) {
    return new Promise((resolve) => {
        if (!source.url) {
            resolve({ success: false, error: 'URL vide', duration: 0 });
            return;
        }

        const startTime = Date.now();

        // Construire les arguments ffmpeg
        const args = [
            '-y',  // Overwrite output
            '-loglevel', 'error',
            '-t', String(duration),  // Limite à X secondes pour le test
        ];

        // Ajouter les headers si nécessaire
        if (source.headers && Object.keys(source.headers).length > 0) {
            const headerString = Object.entries(source.headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\r\n');
            args.push('-headers', headerString + '\r\n');
        }

        args.push(
            '-i', source.url,
            '-c', 'copy',  // Copie sans ré-encodage (plus rapide)
            outputFile
        );

        console.log(`    Commande: ffmpeg ${args.slice(0, 6).join(' ')} -i [URL] ${args.slice(-3).join(' ')}`);

        const ffmpeg = spawn('ffmpeg', args);

        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            const elapsed = Date.now() - startTime;

            if (code === 0) {
                // Vérifier la taille du fichier
                try {
                    const stats = fs.statSync(outputFile);
                    resolve({
                        success: true,
                        fileSize: stats.size,
                        duration: elapsed,
                        fileSizeHuman: formatBytes(stats.size)
                    });
                } catch (e) {
                    resolve({ success: false, error: 'Fichier non créé', duration: elapsed });
                }
            } else {
                resolve({
                    success: false,
                    error: stderr.substring(0, 200) || `Exit code: ${code}`,
                    duration: elapsed
                });
            }
        });

        ffmpeg.on('error', (err) => {
            resolve({ success: false, error: err.message, duration: Date.now() - startTime });
        });

        // Timeout de 60 secondes
        setTimeout(() => {
            ffmpeg.kill('SIGTERM');
        }, 60000);
    });
}

// Alternative: téléchargement manuel (sans ffmpeg)
async function downloadManually(source, outputFile) {
    return new Promise(async (resolve) => {
        if (!source.url) {
            resolve({ success: false, error: 'URL vide' });
            return;
        }

        try {
            const startTime = Date.now();

            // Étape 1: Récupérer le master playlist
            const masterResponse = await testDirectAccess(source.url, source.headers);
            if (!masterResponse.success) {
                resolve({ success: false, error: `Master playlist: ${masterResponse.error || masterResponse.statusCode}` });
                return;
            }

            // Étape 2: Télécharger le contenu complet du master playlist
            const urlObj = new URL(source.url);
            const client = urlObj.protocol === 'https:' ? https : http;

            const chunks = [];
            const req = client.get(source.url, {
                headers: { 'User-Agent': 'Mozilla/5.0', ...source.headers }
            }, (res) => {
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const content = Buffer.concat(chunks).toString();

                    // Compter les segments
                    const segmentLines = content.split('\n').filter(l =>
                        l.trim() && !l.startsWith('#') && (l.includes('.ts') || l.includes('.m4s'))
                    );

                    resolve({
                        success: true,
                        method: 'manual',
                        playlistSize: content.length,
                        segmentsFound: segmentLines.length,
                        isVariantPlaylist: content.includes('#EXT-X-STREAM-INF'),
                        duration: Date.now() - startTime
                    });
                });
            });

            req.on('error', e => resolve({ success: false, error: e.message }));

        } catch (e) {
            resolve({ success: false, error: e.message });
        }
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// === MAIN ===
async function main() {
    console.log('='.repeat(70));
    console.log('🎬 TEST DE TÉLÉCHARGEMENT VIDÉO SANS PROXY');
    console.log('='.repeat(70));
    console.log(`Date: ${new Date().toLocaleString()}\n`);

    // Vérifier ffmpeg
    const hasFfmpeg = await checkFfmpeg();
    console.log(`📦 ffmpeg installé: ${hasFfmpeg ? '✅ Oui' : '❌ Non (installer avec: brew install ffmpeg)'}\n`);

    // Créer le dossier de sortie
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Tester chaque source
    for (const source of TEST_SOURCES) {
        console.log('-'.repeat(70));
        console.log(`\n📹 ${source.name}`);
        console.log(`   ${source.description}`);
        console.log(`   URL: ${source.url ? source.url.substring(0, 80) + '...' : '(vide)'}`);

        if (!source.url) {
            console.log(`   ⚠️  URL non configurée - skipping`);
            continue;
        }

        // Test 1: Accès direct
        console.log('\n   🔍 Test 1: Accès direct HTTP...');
        const accessResult = await testDirectAccess(source.url, source.headers);
        if (accessResult.success) {
            console.log(`      ✅ Accessible (${accessResult.statusCode})`);
            console.log(`      Content-Type: ${accessResult.contentType}`);
            console.log(`      Est M3U8: ${accessResult.isM3U8 ? 'Oui' : 'Non'}`);
        } else {
            console.log(`      ❌ Échec: ${accessResult.error || accessResult.statusCode}`);
        }

        // Test 2: Téléchargement avec ffmpeg
        if (hasFfmpeg) {
            console.log('\n   🔍 Test 2: Téléchargement ffmpeg (10 sec)...');
            const outputFile = path.join(OUTPUT_DIR, `${source.name.toLowerCase()}_test.mp4`);
            const downloadResult = await downloadWithFfmpeg(source, outputFile, 10);

            if (downloadResult.success) {
                console.log(`      ✅ Succès!`);
                console.log(`      Fichier: ${outputFile}`);
                console.log(`      Taille: ${downloadResult.fileSizeHuman}`);
                console.log(`      Durée: ${downloadResult.duration}ms`);
            } else {
                console.log(`      ❌ Échec: ${downloadResult.error}`);
            }
        }

        // Test 3: Analyse manuelle du playlist
        console.log('\n   🔍 Test 3: Analyse du playlist...');
        const manualResult = await downloadManually(source, null);
        if (manualResult.success) {
            console.log(`      ✅ Playlist analysé`);
            console.log(`      Taille: ${manualResult.playlistSize} bytes`);
            console.log(`      Segments: ${manualResult.segmentsFound}`);
            console.log(`      Variante (multi-résolution): ${manualResult.isVariantPlaylist ? 'Oui' : 'Non'}`);
        } else {
            console.log(`      ❌ Échec: ${manualResult.error}`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Tests terminés');
    console.log(`   Fichiers de sortie dans: ${path.resolve(OUTPUT_DIR)}`);
    console.log('='.repeat(70));
}

// Instructions pour ajouter des URLs de test
console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║  INSTRUCTIONS                                                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║  1. Remplacer les URLs vides dans TEST_SOURCES avec des vraies URLs   ║
║  2. Lancer: node test_video_download.js                               ║
║  3. Les vidéos téléchargées seront dans ./test_downloads/             ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

main().catch(console.error);
