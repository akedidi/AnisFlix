
// Found in video bundle: /player/jw8_26/jwplayer.js, /player/jw8_26/red-theme.css, /player/jw8_26/bafsd.js
// These are likely the player files. bafsd.js might contain the M3U8 config.

import fs from 'fs';

const id = '4m0a4it8eu6q';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': `https://bysebuho.com/e/${id}`,
    'Origin': 'https://bysebuho.com'
};

async function probe() {
    // Try fetching bafsd.js with the video ID
    const bafsdUrls = [
        `https://bysebuho.com/player/jw8_26/bafsd.js`,
        `https://bysebuho.com/player/jw8_26/bafsd.js?id=${id}`,
        `https://bysebuho.com/player/jw8_26/bafsd.js?v=${id}`,
        `https://bysebuho.com/player/jw8_26/bafsd.js?code=${id}`,
        // Maybe the file is named after the ID
        `https://bysebuho.com/player/jw8_26/${id}.js`,
        // Or maybe the video bundle fetches a config endpoint
        `https://bysebuho.com/api/source?code=${id}`,
        `https://bysebuho.com/api/source?file_code=${id}`,
        `https://bysebuho.com/api/source?id=${id}`,
        // Common FStream/Bysebuho patterns
        `https://bysebuho.com/api/file/info?file_code=${id}`,
        `https://bysebuho.com/api/file/hls?file_code=${id}`,
    ];

    console.log(`🔍 Probing player config endpoints for ID: ${id}\n`);

    for (const url of bafsdUrls) {
        try {
            const resp = await fetch(url, { headers });
            console.log(`[${resp.status}] ${url}`);
            if (resp.ok) {
                const text = await resp.text();
                console.log(`  ✅ Response (${text.length} bytes)`);
                if (text.includes('m3u8') || text.includes('master') || text.includes('hls')) {
                    console.log(`  🎯 CONTAINS STREAM DATA!`);
                    const m3u8Match = text.match(/(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/);
                    if (m3u8Match) console.log(`  📺 M3U8: ${m3u8Match[1]}`);
                    fs.writeFileSync(`bysebuho_config_${Date.now()}.js`, text);
                    console.log(`  💾 Saved!`);
                }
                if (text.length < 300) console.log(`  Content: ${text}`);
            }
        } catch (e) {
            console.log(`[ERR] ${url}: ${e.message}`);
        }
    }

    // Now let's look at the video bundle more carefully for the actual API call
    console.log('\n🔍 Searching video bundle for API patterns...');
    if (fs.existsSync('bysebuho_video_bundle.js')) {
        const bundle = fs.readFileSync('bysebuho_video_bundle.js', 'utf-8');

        // Look for fetch calls with specific patterns
        const fetchPattern = /fetch\s*\([^)]{5,100}\)/g;
        const fetchMatches = bundle.match(fetchPattern);
        if (fetchMatches) {
            console.log('Fetch calls found:');
            fetchMatches.slice(0, 20).forEach(m => console.log(' -', m));
        }

        // Look for source/file/hls patterns
        const sourcePatterns = [
            /["']source["'][^,]{0,50}/g,
            /["']hls["'][^,]{0,50}/g,
            /file_code[^,]{0,50}/g,
            /bafsd[^,]{0,50}/g,
        ];

        for (const pattern of sourcePatterns) {
            const matches = bundle.match(pattern);
            if (matches) {
                console.log(`\nPattern ${pattern}:`);
                [...new Set(matches)].slice(0, 5).forEach(m => console.log(' -', m));
            }
        }
    }
}

probe();
