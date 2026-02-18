
// Analyze the M3U8 URL pattern and find the jwplayer.js endpoint
// Known M3U8: https://edge2-waw-sprintcdn.r66nv9ed.com/hls2/06/10744/,4m0a4it8eu6q_h,lang/fre/4m0a4it8eu6q_fre,lang/eng/4m0a4it8eu6q_eng,.urlset/master.m3u8?t=SLy8wicXSbmCQp72vh1aAO9kU9I5Zi7iTuKKgCBILps&s=1771425357&e=10800&f=53723450&srv=1060&asn=3215&sp=4000&p=0&fr=4m0a4it8eu6q

import fs from 'fs';

const id = '4m0a4it8eu6q';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': `https://bysebuho.com/e/${id}`,
    'Origin': 'https://bysebuho.com'
};

// Common jwplayer.js URL patterns for video hosting sites
const jwplayerUrls = [
    `https://bysebuho.com/jwplayer.js?id=${id}`,
    `https://bysebuho.com/jwplayer/${id}.js`,
    `https://bysebuho.com/player/${id}.js`,
    `https://bysebuho.com/js/player/${id}.js`,
    `https://bysebuho.com/embed/${id}.js`,
    `https://bysebuho.com/api/jwplayer/${id}`,
    `https://bysebuho.com/api/player/${id}.js`,
    // The site might use a different domain for the player
    `https://bysebuho.com/player.js?id=${id}`,
    `https://bysebuho.com/v/${id}/player.js`,
];

async function probe() {
    console.log(`🔍 Probing jwplayer.js endpoints for ID: ${id}\n`);

    for (const url of jwplayerUrls) {
        try {
            const resp = await fetch(url, { headers });
            console.log(`[${resp.status}] ${url}`);
            if (resp.ok) {
                const text = await resp.text();
                console.log(`  ✅ Response (${text.length} bytes)`);
                if (text.includes('m3u8') || text.includes('master')) {
                    console.log(`  🎯 CONTAINS M3U8!`);
                    const m3u8Match = text.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
                    if (m3u8Match) console.log(`  📺 M3U8: ${m3u8Match[1]}`);
                    fs.writeFileSync(`bysebuho_jwplayer_${Date.now()}.js`, text);
                }
                if (text.length < 500) console.log(`  Content: ${text}`);
            }
        } catch (e) {
            console.log(`[ERR] ${url}: ${e.message}`);
        }
    }

    // Also try fetching the video bundle and looking for the jwplayer URL pattern
    console.log('\n🔍 Searching video bundle for jwplayer URL pattern...');
    if (fs.existsSync('bysebuho_video_bundle.js')) {
        const bundle = fs.readFileSync('bysebuho_video_bundle.js', 'utf-8');

        // Look for URL patterns that could be jwplayer
        const patterns = [
            /jwplayer[^"'\s]*/gi,
            /player\.js[^"'\s]*/gi,
            /\/player\/[^"'\s]*/gi,
            /sprintcdn[^"'\s]*/gi,
            /r66nv9ed[^"'\s]*/gi,
            /hls2[^"'\s]*/gi,
        ];

        for (const pattern of patterns) {
            const matches = bundle.match(pattern);
            if (matches) {
                console.log(`Pattern ${pattern}: ${[...new Set(matches)].slice(0, 5)}`);
            }
        }
    }
}

probe();
