import axios from "axios";

// ==========================================
// SUBTITLE LOGIC
// ==========================================

/**
 * Convert SRT format to WebVTT format
 */
function srtToVtt(srtContent) {
    let vtt = "WEBVTT\n\n" + srtContent
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    return vtt;
}

/**
 * Apply time offset to VTT/SRT content
 */
function applyOffset(content, offsetSeconds) {
    // Regex to find timestamps: 00:00:00,000 or 00:00:00.000
    return content.replace(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/g, (match, h, m, s, ms) => {
        const totalSeconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
        const newTotalSeconds = Math.max(0, totalSeconds + offsetSeconds);

        const newH = Math.floor(newTotalSeconds / 3600);
        const newM = Math.floor((newTotalSeconds % 3600) / 60);
        const newS = Math.floor(newTotalSeconds % 60);
        const newMs = Math.round((newTotalSeconds % 1) * 1000);

        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')}.${String(newMs).padStart(3, '0')}`;
    });
}

async function handleSubtitle(req, res) {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log(`[SUBTITLE PROXY] Fetching: ${url}`);

        // Fetch subtitle using fetch API
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let subtitleContent = await response.text();
        console.log(`[SUBTITLE PROXY] Fetched ${subtitleContent.length} bytes`);

        // Apply offset if provided
        const { offset } = req.query;
        if (offset) {
            const offsetSeconds = parseFloat(offset);
            if (!isNaN(offsetSeconds) && offsetSeconds !== 0) {
                console.log(`[SUBTITLE PROXY] Applying offset: ${offsetSeconds}s`);
                subtitleContent = applyOffset(subtitleContent, offsetSeconds);
            }
        }

        // Convert SRT to VTT if needed
        if (!subtitleContent.trim().startsWith('WEBVTT')) {
            console.log('[SUBTITLE PROXY] Converting SRT to VTT');
            subtitleContent = srtToVtt(subtitleContent);
        }

        // Set proper headers for VTT with CORS
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        return res.status(200).send(subtitleContent);

    } catch (error) {
        console.error('[SUBTITLE PROXY] Error:', error.message, error.stack);

        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
            error: 'Failed to fetch or convert subtitle',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

// ==========================================
// TV AUDIO LOGIC
// ==========================================

async function handleAudio(req, res) {
    try {
        const { channel, filename, catchall } = req.query;

        let audioUrl;

        if (catchall) {
            // Mode catch-all pour les fichiers audio directs
            const filename = catchall;
            if (filename.startsWith('hd1-')) {
                audioUrl = `https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/${filename}`;
            } else if (filename.startsWith('nt1-')) {
                audioUrl = `https://viamotionhsi.netplus.ch/live/eds/nt1/browser-HLS8/${filename}`;
            } else if (filename.startsWith('france3hd-')) {
                audioUrl = `https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/${filename}`;
            } else if (filename.startsWith('m6hd-')) {
                audioUrl = `https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/${filename}`;
            } else if (filename.startsWith('w9-')) {
                audioUrl = `https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/${filename}`;
            } else if (filename.startsWith('gulli-')) {
                audioUrl = `https://viamotionhsi.netplus.ch/live/eds/gulli/browser-HLS8/${filename}`;
            } else {
                return res.status(404).json({ error: 'Unknown audio file' });
            }
        } else if (filename) {
            // Si un nom de fichier est fourni, construire l'URL directement
            audioUrl = `https://viamotionhsi.netplus.ch/live/eds/${channel}/browser-HLS8/${filename}`;
        } else if (channel) {
            // Mapping des chaînes vers leurs URLs audio par défaut
            const channelAudioUrls = {
                'hd1': 'https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/hd1-mp4a_128000_fra=20009.m3u8',
                'nt1': 'https://viamotionhsi.netplus.ch/live/eds/nt1/browser-HLS8/nt1-mp4a_128000_fra=20005.m3u8',
                'france3hd': 'https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/france3hd-mp4a_128000_fra=20003.m3u8',
                'm6hd': 'https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/m6hd-mp4a_128000_fra=20004.m3u8',
                'w9': 'https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/w9-mp4a_128000_fra=20006.m3u8',
                'gulli': 'https://viamotionhsi.netplus.ch/live/eds/gulli/browser-HLS8/gulli-mp4a_128000_fra=20007.m3u8'
            };
            audioUrl = channelAudioUrls[channel];
        } else {
            return res.status(400).json({ error: 'Channel or filename parameter is required' });
        }

        if (!audioUrl) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        console.log(`[TV AUDIO PROXY] Requête pour la chaîne: ${channel}`);
        console.log(`[TV AUDIO PROXY] URL audio: ${audioUrl}`);

        const response = await axios.get(audioUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 10000,
            responseType: 'text'
        });

        console.log(`[TV AUDIO PROXY] ${response.status} ${response.headers['content-type']} ← ${audioUrl}`);

        if (typeof response.data !== 'string') {
            return res.status(502).send('Pas une playlist M3U8.');
        }

        // Réécrire les URLs dans la playlist pour qu'elles passent par le proxy
        const baseUrl = `https://viamotionhsi.netplus.ch/live/eds/${channel}/browser-HLS8/`;
        const rewritten = response.data
            .replace(/^([^#\n].*\.m3u8)$/gm, (match) => {
                const encodedUrl = encodeURIComponent(baseUrl + match);
                return `/api/media-proxy?url=${encodedUrl}`;
            })
            .replace(/^([^#\n].*\.ts)$/gm, (match) => {
                const encodedUrl = encodeURIComponent(baseUrl + match);
                return `/api/media-proxy?url=${encodedUrl}`;
            });

        // Headers spécifiques pour les streams live
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).send(rewritten);
    } catch (error) {
        console.error('[TV AUDIO PROXY ERROR]', error.message);
        res.status(500).send('Erreur lors de la récupération de la sous-playlist audio.');
    }
}

// ==========================================
// TV PROXY LOGIC
// ==========================================

const ORIGIN_HOST = 'https://fremtv.lol';
const EMBED_HOST = 'https://directfr.lat';

const http = axios.create({
    timeout: 15000
});

const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'Origin': EMBED_HOST,
    'Referer': EMBED_HOST + '/',
    'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/dash+xml, */*',
    'Accept-Language': 'fr-FR,fr;q=0.7,en;q=0.6',
    'Connection': 'keep-alive'
};

const ALLOWED_HOSTS = ['fremtv.lol', 'directfr.lat', 'viamotionhsi.netplus.ch', 'simulcast-p.ftven.fr', 'cache1a.netplus.ch', 'cachehsi1a.netplus.ch', 'cachehsi1b.netplus.ch', 'cachehsi2b.netplus.ch', 'dcpv2eq7lu6ve.cloudfront.net', 'video.pscp.tv', '135.125.109.73', 'alkassdigital.net', 'ab.footballii.ir', 'py.dencreak.com', 'py.online-tv.biz'];

function isAllowedUrl(urlString) {
    try {
        const url = new URL(urlString);
        return ALLOWED_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
    } catch {
        return false;
    }
}

function toAbsolute(base, maybeRelative) {
    try {
        return new URL(maybeRelative, base).toString();
    } catch {
        return maybeRelative;
    }
}

function rewritePlaylistUrls(playlistText, baseUrl) {
    console.log(`[TV PROXY] rewritePlaylistUrls appelée avec baseUrl: ${baseUrl}`);
    return playlistText
        .split('\n')
        .map((line) => {
            const t = line.trim();
            if (!t) return line;

            // Traiter les lignes de segments (pas de #)
            if (!t.startsWith('#')) {
                const abs = toAbsolute(baseUrl, t);
                return `/api/media-proxy?url=${encodeURIComponent(abs)}`;
            }

            // Traiter les tags #EXT-X-MEDIA pour les URLs audio
            if (t.startsWith('#EXT-X-MEDIA:') && t.includes('URI=')) {
                const uriMatch = t.match(/URI="([^"]+)"/);
                if (uriMatch) {
                    const audioUrl = uriMatch[1];
                    const abs = toAbsolute(baseUrl, audioUrl);
                    const proxifiedAudioUrl = `/api/media-proxy?url=${encodeURIComponent(abs)}`;
                    const result = t.replace(/URI="[^"]+"/, `URI="${proxifiedAudioUrl}"`);
                    return result;
                }
            }

            return line;
        })
        .join('\n');
}

function rewriteMpdUrls(mpdText, baseUrl) {
    // Réécrire les URLs relatives dans le manifest MPD
    return mpdText.replace(/<BaseURL>([^<]+)<\/BaseURL>/g, (match, relativeUrl) => {
        const absoluteUrl = toAbsolute(baseUrl, relativeUrl);
        return `<BaseURL>/api/media-proxy?url=${encodeURIComponent(absoluteUrl)}</BaseURL>`;
    });
}

async function handleTV(req, res) {
    const { url, channelId } = req.query;

    // ===== MODE STREAM CHAÎNE (channelId) =====
    if (channelId) {
        console.log(`[TV STREAM] ===== NOUVELLE REQUÊTE CHAÎNE =====`);
        console.log(`[TV STREAM] Channel ID: ${channelId}`);

        try {
            const originalUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/${channelId}.m3u8`;
            console.log(`[TV STREAM] URL originale: ${originalUrl}`);

            const response = await http.get(originalUrl, {
                headers: browserHeaders,
                responseType: 'text'
            });

            console.log(`[TV STREAM] Réponse reçue - Status: ${response.status}`);

            const manifestData = response.data;
            const finalUrl = `${ORIGIN_HOST}/live/5A24C0D16059EDCC6A20E0CE234C7A25/`;

            if (typeof manifestData !== 'string') {
                console.error(`[TV STREAM] Données invalides`);
                return res.status(502).send('Pas une playlist M3U8.');
            }

            console.log(`[TV STREAM] Réécriture des URLs...`);
            const rewritten = rewritePlaylistUrls(manifestData, finalUrl);

            console.log(`[TV STREAM] Envoi de la réponse...`);
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(rewritten);

        } catch (e) {
            console.error('[TV STREAM ERROR]', e.message);
            res.status(500).send(`Erreur lors de la récupération de la playlist: ${e.message}`);
        }
        return;
    }

    // ===== MODE PROXY URL (url) =====
    if (!url) {
        return res.status(400).send('Paramètre "url" ou "channelId" manquant.');
    }

    // Décoder l'URL pour nettoyer les encodages multiples
    let cleanUrl = url;
    try {
        // Décoder jusqu'à 3 fois pour nettoyer les encodages multiples
        for (let i = 0; i < 3; i++) {
            if (cleanUrl.includes('%')) {
                cleanUrl = decodeURIComponent(cleanUrl);
            } else {
                break;
            }
        }
        console.log(`[TV PROXY] URL nettoyée: ${cleanUrl}`);

        // Détecter les boucles infinies (URLs qui pointent vers notre propre API)
        if (cleanUrl.includes('/api/media-proxy?url=') || cleanUrl.includes('anisflix.vercel.app/api/media-proxy')) {
            console.error(`[TV PROXY] Boucle infinie détectée: ${cleanUrl}`);
            return res.status(400).send('Boucle infinie détectée dans l\'URL');
        }
    } catch (e) {
        console.log(`[TV PROXY] Erreur de décodage, utilisation de l'URL originale: ${url}`);
        cleanUrl = url;
    }

    // Validation SSRF: vérifier que l'URL est autorisée
    if (!isAllowedUrl(cleanUrl)) {
        console.error(`[TV PROXY] URL non autorisée: ${cleanUrl}`);
        return res.status(403).send('URL non autorisée.');
    }

    try {
        console.log(`[TV PROXY] Appel de l'URL: ${cleanUrl}`);

        // ===== MODE PLAYLIST M3U8/MPD =====
        // Traiter explicitement Bein Sports comme une playlist même sans extension (mais PAS les segments .js)
        if ((cleanUrl.includes('.m3u8') || cleanUrl.includes('.mpd') || cleanUrl.includes('dcpv2eq7lu6ve.cloudfront.net') || cleanUrl.includes('video.pscp.tv')) && !cleanUrl.endsWith('.js')) {
            // Headers spécifiques selon le domaine
            let requestHeaders = { ...browserHeaders };

            if (cleanUrl.includes('simulcast-p.ftven.fr')) {
                requestHeaders = {
                    ...requestHeaders,
                    'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                };
            }

            // Headers spécifiques pour les tokens JWT (cachehsi)
            if (cleanUrl.includes('cachehsi') && cleanUrl.includes('tok_')) {
                requestHeaders = {
                    ...requestHeaders,
                    'Accept': 'video/mp2t, video/*, */*',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://viamotionhsi.netplus.ch',
                    'Referer': 'https://viamotionhsi.netplus.ch/'
                };
            }

            // Headers spécifiques pour Bein Sports (Cloudfront)
            // Supprimer Origin et Referer pour éviter les blocages
            if (cleanUrl.includes('dcpv2eq7lu6ve.cloudfront.net') || cleanUrl.includes('video.pscp.tv')) {
                console.log(`[TV PROXY] Nettoyage des headers pour Bein Sports (Cloudfront/Pscp)`);
                requestHeaders = {
                    // Utiliser le User-Agent du client pour éviter d'être détecté comme bot/axios
                    'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                };
                // Explicitement supprimer Origin/Referer s'ils étaient copiés
                delete requestHeaders['Origin'];
                delete requestHeaders['Referer'];
            }

            const r = await http.get(cleanUrl, {
                headers: requestHeaders,
                responseType: 'text',
                validateStatus: () => true // Ne pas throw sur 404/500 pour pouvoir lire le body
            });

            const ctype = (r.headers['content-type'] || '').toLowerCase();
            const finalUrl = r.request?.res?.responseUrl || cleanUrl;

            console.log(`[TV PROXY] Réponse playlist reçue:`);
            console.log(`[TV PROXY] - Status: ${r.status}`);
            console.log(`[TV PROXY] - Content-Type: ${ctype}`);
            console.log(`[TV PROXY] - URL finale: ${finalUrl}`);
            console.log(`[TV PROXY] - Taille: ${r.data?.length || 0} caractères`);

            if (r.status >= 400) {
                console.error(`[TV PROXY] Erreur HTTP: ${r.status}`);
                return res.status(r.status).send(`Erreur distante playlist (${r.status}): ${typeof r.data === 'string' ? r.data.substring(0, 200) : 'No body'}`);
            }
            if (typeof r.data !== 'string') {
                console.error(`[TV PROXY] Données invalides`);
                return res.status(502).send('Pas un manifest valide.');
            }

            // Déterminer le type de contenu et traiter en conséquence
            let finalData = r.data;
            let contentType = 'application/vnd.apple.mpegurl';

            if (url.includes('.mpd')) {
                // Pour les streams MPD, réécrire les URLs relatives
                contentType = 'application/dash+xml';
                finalData = rewriteMpdUrls(r.data, finalUrl);
                console.log(`[TV PROXY] Stream MPD détecté, URLs relatives réécrites`);
            } else {
                // Pour les streams M3U8, réécrire les URLs
                finalData = rewritePlaylistUrls(r.data, finalUrl);
                console.log(`[TV PROXY] Stream M3U8 détecté, URLs réécrites`);
            }

            console.log(`[TV PROXY] Manifest traité, envoi de la réponse`);

            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(finalData);

        } else {
            // ===== MODE SEGMENT VIDÉO =====
            const headers = { ...browserHeaders };
            if (req.headers.range) {
                headers.Range = req.headers.range;
                console.log(`[TV PROXY] Range demandé: ${req.headers.range}`);
            }

            // Headers spécifiques pour les segments avec tokens JWT
            if (cleanUrl.includes('cachehsi') && cleanUrl.includes('tok_')) {
                headers['Accept'] = 'video/mp2t, video/*, */*';
                headers['Origin'] = 'https://viamotionhsi.netplus.ch';
                headers['Referer'] = 'https://viamotionhsi.netplus.ch/';
                console.log(`[TV PROXY] Headers JWT appliqués pour segment: ${cleanUrl}`);
            }

            // Headers spécifiques pour Bein Sports (Cloudfront) - SEGMENTS
            if (cleanUrl.includes('dcpv2eq7lu6ve.cloudfront.net') || cleanUrl.includes('video.pscp.tv')) {
                console.log(`[TV PROXY] Nettoyage des headers "Segment" pour Bein Sports (Cloudfront/Pscp)`);
                headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
                headers['Accept'] = '*/*';
                delete headers['Origin'];
                delete headers['Referer'];
            }

            console.log(`[TV PROXY] Appel de l'URL segment: ${cleanUrl}`);

            // Pour les requêtes HEAD, utiliser HEAD au lieu de GET
            const requestMethod = req.method === 'HEAD' ? 'head' : 'get';
            const r = await http[requestMethod](cleanUrl, {
                headers,
                responseType: req.method === 'HEAD' ? 'stream' : 'stream',
                validateStatus: () => true
            });

            console.log(`[TV PROXY] Réponse segment reçue:`);
            console.log(`[TV PROXY] - Status: ${r.status}`);
            console.log(`[TV PROXY] - Content-Type: ${r.headers['content-type'] || 'Non spécifié'}`);
            console.log(`[TV PROXY] - Content-Length: ${r.headers['content-length'] || 'Non spécifié'}`);
            console.log(`[TV PROXY] - Accept-Ranges: ${r.headers['accept-ranges'] || 'Non spécifié'}`);

            if (r.status >= 400) {
                console.error(`[TV PROXY] Erreur HTTP: ${r.status}`);
                return res.status(r.status).send('Erreur distante segment.');
            }

            // Propager quelques headers utiles
            ['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control'].forEach(h => {
                if (r.headers[h]) {
                    // Si c'est un segment .js de Bein Sports, forcer le type MIME vidéo
                    if (h === 'content-type' && cleanUrl.includes('dcpv2eq7lu6ve.cloudfront.net') && cleanUrl.endsWith('.js')) {
                        res.setHeader('Content-Type', 'video/mp2t');
                        console.log(`[TV PROXY] Correction Content-Type: ${r.headers[h]} -> video/mp2t`);
                    } else {
                        res.setHeader(h, r.headers[h]);
                        console.log(`[TV PROXY] Header propagé: ${h} = ${r.headers[h]}`);
                    }
                }
            });

            // Pour les requêtes HEAD, retourner seulement les headers
            if (req.method === 'HEAD') {
                console.log(`[TV PROXY] Requête HEAD - retour des headers seulement`);
                return res.status(r.status).end();
            }

            console.log(`[TV PROXY] Streaming du segment vers le client`);
            res.status(r.status);
            r.data.pipe(res);
        }

    } catch (e) {
        console.error('[TV PROXY ERROR]', e.message);
        console.error('[TV PROXY ERROR] Stack:', e.stack);

        if (e.response) {
            console.error('[TV PROXY ERROR] Response status:', e.response.status);
            console.error('[TV PROXY ERROR] Response data:', e.response.data);
            return res.status(e.response.status).send(`Erreur distante: ${e.response.status} - ${e.response.statusText}`);
        }

        res.status(500).send(`Erreur proxy: ${e.message}`);
    }
}

// ==========================================
// MAIN HANDLER
// ==========================================

export default async function handler(req, res) {
    // Common CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { type, channel, filename, catchall } = req.query;

    // Dispatch based on type or params
    if (type === 'subtitle') {
        return handleSubtitle(req, res);
    }

    if (type === 'audio' || channel || filename || catchall) {
        return handleAudio(req, res);
    }

    // Default to TV Proxy
    return handleTV(req, res);
}
