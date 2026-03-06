// Test MovieBox scraper standalone
const CryptoJS = require('crypto-js');

const HEADERS = {
    'User-Agent': 'com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)',
    'Connection': 'keep-alive',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-client-info': '{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"da2b99c821e6ea023e4be55b54d5f7d8","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}',
    'x-client-status': '0'
};

const API_BASE = "https://api.inmoviebox.com";
const KEY_B64_DEFAULT = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
const KEY_B64_ALT = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ==";

const SECRET_KEY_DEFAULT = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64_DEFAULT).toString(CryptoJS.enc.Utf8)
);
const SECRET_KEY_ALT = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64_ALT).toString(CryptoJS.enc.Utf8)
);

const TMDB_API_KEY = 'd131017ccc6e5462a81c9304d21476de';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function md5(input) {
    return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);
}

function hmacMd5(key, data) {
    return CryptoJS.HmacMD5(data, key).toString(CryptoJS.enc.Base64);
}

function generateXClientToken(timestamp) {
    const ts = (timestamp || Date.now()).toString();
    const reversed = ts.split('').reverse().join('');
    const hash = md5(reversed);
    return `${ts},${hash}`;
}

function buildCanonicalString(method, accept, contentType, url, body, timestamp) {
    let path = "";
    let query = "";
    try {
        const urlObj = new URL(url);
        path = urlObj.pathname;
        const params = Array.from(urlObj.searchParams.keys()).sort();
        if (params.length > 0) {
            query = params.map(key => {
                const values = urlObj.searchParams.getAll(key);
                return values.map(val => `${key}=${val}`).join('&');
            }).join('&');
        }
    } catch (e) {
        console.error("Invalid URL for canonical:", url);
    }
    const canonicalUrl = query ? `${path}?${query}` : path;
    let bodyHash = "";
    let bodyLength = "";
    if (body) {
        const bodyWords = CryptoJS.enc.Utf8.parse(body);
        const totalBytes = bodyWords.sigBytes;
        bodyHash = md5(bodyWords);
        bodyLength = totalBytes.toString();
    }
    return `${method.toUpperCase()}\n${accept || ""}\n${contentType || ""}\n${bodyLength}\n${timestamp}\n${bodyHash}\n${canonicalUrl}`;
}

function generateXTrSignature(method, accept, contentType, url, body, useAltKey = false, customTimestamp = null) {
    const timestamp = customTimestamp || Date.now();
    const canonical = buildCanonicalString(method, accept, contentType, url, body, timestamp);
    const secret = useAltKey ? SECRET_KEY_ALT : SECRET_KEY_DEFAULT;
    const signatureB64 = hmacMd5(secret, canonical);
    return `${timestamp}|2|${signatureB64}`;
}

function request(method, url, body = null, customHeaders = {}) {
    const timestamp = Date.now();
    const xClientToken = generateXClientToken(timestamp);
    let headerContentType = customHeaders['Content-Type'] || 'application/json';
    let sigContentType = headerContentType;
    const accept = customHeaders['Accept'] || 'application/json';
    const xTrSignature = generateXTrSignature(method, accept, sigContentType, url, body, false, timestamp);
    const headers = {
        'Accept': accept,
        'Content-Type': headerContentType,
        'x-client-token': xClientToken,
        'x-tr-signature': xTrSignature,
        'User-Agent': HEADERS['User-Agent'],
        'x-client-info': HEADERS['x-client-info'],
        'x-client-status': HEADERS['x-client-status'],
        ...customHeaders
    };
    const options = { method, headers };
    if (body) options.body = body;
    return fetch(url, options)
        .then(res => {
            return res.text().then(text => {
                console.log(`   [${method}] ${url.substring(0, 80)}... => ${res.status}`);
                if (!res.ok) { console.log(`   Response: ${text.substring(0, 200)}`); return null; }
                try { return JSON.parse(text); } catch (e) { return text; }
            });
        })
        .catch(err => { console.log(`   ❌ Fetch error: ${err.message}`); return null; });
}

function fetchTmdbDetails(tmdbId, mediaType) {
    const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    return fetch(url).then(res => res.json()).then(data => ({
        title: mediaType === 'movie' ? (data.title || data.original_title) : (data.name || data.original_name),
        year: (data.release_date || data.first_air_date || '').substring(0, 4),
        imdbId: data.external_ids?.imdb_id,
        originalTitle: data.original_title || data.original_name,
    })).catch(e => null);
}

function normalizeTitle(s) {
    if (!s) return "";
    return s.replace(/\[.*?\]/g, " ").replace(/\(.*?\)/g, " ")
        .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, " ")
        .trim().toLowerCase().replace(/:/g, " ").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");
}

function searchMovieBox(query) {
    console.log(`🔍 Searching MovieBox for: "${query}"`);
    const url = `${API_BASE}/wefeed-mobile-bff/subject-api/search/v2`;
    const body = `{"page": 1, "perPage": 10, "keyword": "${query}"}`;
    return request('POST', url, body).then(res => {
        if (res && res.data && res.data.results) {
            let allSubjects = [];
            res.data.results.forEach(group => {
                if (group.subjects) allSubjects = allSubjects.concat(group.subjects);
            });
            console.log(`   Found ${allSubjects.length} subjects`);
            allSubjects.forEach((s, i) => {
                console.log(`   [${i}] "${s.title}" (${s.year || '?'}) type=${s.subjectType} id=${s.subjectId}`);
            });
            return allSubjects;
        }
        console.log('   ❌ No results');
        return [];
    });
}

function findBestMatch(subjects, tmdbTitle, tmdbYear, mediaType) {
    const normTmdbTitle = normalizeTitle(tmdbTitle);
    const targetType = mediaType === 'movie' ? 1 : 2;
    let bestMatch = null;
    let bestScore = 0;
    for (const subject of subjects) {
        if (subject.subjectType !== targetType) continue;
        const normTitle = normalizeTitle(subject.title);
        const year = subject.year || (subject.releaseDate ? subject.releaseDate.substring(0, 4) : null);
        let score = 0;
        if (normTitle === normTmdbTitle) score += 50;
        else if (normTitle.includes(normTmdbTitle) || normTmdbTitle.includes(normTitle)) score += 15;
        if (tmdbYear && year && tmdbYear == year) score += 35;
        if (score > bestScore) { bestScore = score; bestMatch = subject; }
    }
    console.log(`   Best match: "${bestMatch?.title}" score=${bestScore}`);
    if (bestScore >= 40) return bestMatch;
    return null;
}

function getStreamLinks(subjectId, season = 0, episode = 0, mediaTitle = '', mediaType = 'movie') {
    console.log(`\n📡 Getting stream links for subjectId=${subjectId}...`);
    const subjectUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;

    function parseQualityNumber(value) {
        const match = String(value || '').match(/(\d{3,4})/);
        return match ? parseInt(match[1], 10) : 0;
    }
    function formatQualityLabel(value) {
        if (!value) return 'Auto';
        const s = String(value).trim();
        if (/\d{3,4}p$/i.test(s)) return s;
        const n = parseQualityNumber(s);
        return n ? `${n}p` : s;
    }
    function getFormatType(url) {
        const u = String(url || '').toLowerCase();
        if (u.includes('.mpd')) return 'DASH';
        if (u.includes('.m3u8')) return 'HLS';
        if (u.includes('.mp4')) return 'MP4';
        if (u.includes('.mkv')) return 'MKV';
        return 'VIDEO';
    }

    return request('GET', subjectUrl).then(subjectRes => {
        if (!subjectRes || !subjectRes.data) { console.log('   ❌ No subject data'); return []; }

        console.log(`   Subject: "${subjectRes.data.title}" (${subjectRes.data.year})`);

        const subjectIds = [];
        let originalLang = "Original";
        const dubs = subjectRes.data.dubs;
        if (Array.isArray(dubs)) {
            console.log(`   Dubs: ${dubs.length}`);
            dubs.forEach(dub => {
                console.log(`     - ${dub.lanName} (id=${dub.subjectId})`);
                if (dub.subjectId == subjectId) {
                    originalLang = dub.lanName || "Original";
                } else {
                    subjectIds.push({ id: dub.subjectId, lang: dub.lanName });
                }
            });
        }
        subjectIds.unshift({ id: subjectId, lang: originalLang });

        const promises = subjectIds.map(item => {
            const playUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/play-info?subjectId=${item.id}&se=${season}&ep=${episode}`;
            console.log(`   Fetching play-info for ${item.lang} (id=${item.id})...`);
            return request('GET', playUrl).then(playRes => {
                const streams = [];
                if (playRes && playRes.data && playRes.data.streams) {
                    console.log(`   ✅ ${item.lang}: ${playRes.data.streams.length} streams`);
                    playRes.data.streams.forEach(stream => {
                        if (stream.url) {
                            const qualityField = stream.resolutions || stream.quality || 'Auto';
                            let candidates = [];
                            if (Array.isArray(qualityField)) candidates = qualityField;
                            else if (typeof qualityField === 'string' && qualityField.includes(',')) {
                                candidates = qualityField.split(',').map(s => s.trim()).filter(Boolean);
                            } else candidates = [qualityField];
                            const maxQ = candidates.reduce((m, v) => Math.max(m, parseQualityNumber(v)), 0);
                            const quality = maxQ ? `${maxQ}p` : formatQualityLabel(candidates[0]);
                            const formatType = getFormatType(stream.url);
                            streams.push({
                                name: `MovieBox (${item.lang}) ${quality} [${formatType}]`,
                                url: stream.url,
                                quality,
                                format: formatType,
                            });
                        }
                    });
                } else {
                    console.log(`   ⚠️ ${item.lang}: No streams (${JSON.stringify(playRes?.data || playRes).substring(0, 200)})`);
                }
                return streams;
            });
        });

        return Promise.all(promises).then(res => res.flat());
    });
}

// ===== RUN TEST =====
async function main() {
    const TMDB_ID = '1242898'; // Predator: Badlands
    const MEDIA_TYPE = 'movie';

    console.log('🎬 Testing MovieBox Scraper');
    console.log(`   TMDB ID: ${TMDB_ID}, Type: ${MEDIA_TYPE}\n`);

    // Step 1: Get TMDB details
    console.log('📋 Step 1: Fetching TMDB details...');
    const details = await fetchTmdbDetails(TMDB_ID, MEDIA_TYPE);
    if (!details) { console.log('❌ TMDB fetch failed'); return; }
    console.log(`   Title: "${details.title}"`);
    console.log(`   Year: ${details.year}`);
    console.log(`   IMDB: ${details.imdbId}`);
    console.log(`   Original: "${details.originalTitle}"\n`);

    // Step 2: Search MovieBox
    console.log('📋 Step 2: Searching MovieBox...');
    const subjects = await searchMovieBox(details.title);

    // Step 3: Find best match
    console.log('\n📋 Step 3: Finding best match...');
    let bestMatch = findBestMatch(subjects, details.title, details.year, MEDIA_TYPE);

    if (!bestMatch && details.originalTitle && details.originalTitle !== details.title) {
        console.log('   Trying original title...');
        const subjects2 = await searchMovieBox(details.originalTitle);
        bestMatch = findBestMatch(subjects2, details.originalTitle, details.year, MEDIA_TYPE);
    }

    if (!bestMatch) {
        console.log('\n❌ No match found on MovieBox');
        return;
    }

    console.log(`\n✅ Best match: "${bestMatch.title}" (id=${bestMatch.subjectId})`);

    // Step 4: Get stream links
    console.log('\n📋 Step 4: Getting stream links...');
    const streams = await getStreamLinks(bestMatch.subjectId, 0, 0, details.title, MEDIA_TYPE);

    console.log(`\n🎬 ===== RESULTS =====`);
    console.log(`Found ${streams.length} streams:\n`);
    streams.forEach((s, i) => {
        console.log(`[${i}] ${s.name}`);
        console.log(`    Quality: ${s.quality}`);
        console.log(`    Format: ${s.format}`);
        console.log(`    URL: ${s.url.substring(0, 100)}...`);
        console.log('');
    });
}

main().catch(e => console.error('Fatal:', e));
