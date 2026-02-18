
import { BysebuhoExtractor } from '../api/_services/universalvo/extractors/BysebuhoExtractor.js';
import fs from 'fs';

async function test() {
    const url = 'https://bysebuho.com/assets/index-XM1mlhAd.js';

    console.log(`🧪 Fetching JS bundle directly: ${url}`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://bysebuho.com/'
        }
    });

    const js = await response.text();
    console.log(`📄 JS content length: ${js.length}`);
    fs.writeFileSync('bysebuho_index.js', js);
    console.log('💾 Saved JS to bysebuho_index.js');

    // Quick check
    const m3u8Match = js.match(/(https:\/\/[^"']+\.m3u8[^"']*)/) ||
        js.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/) ||
        js.match(/source:\s*["']([^"']+\.m3u8[^"']*)["']/);

    if (m3u8Match) {
        console.log(`✅ Found M3U8 in JS: ${m3u8Match[1]}`);
    } else {
        console.log(`❌ No direct M3U8 match in JS`);
    }

    const packedMatch = js.match(/eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/s);
    console.log(`📦 Packed code found? ${!!packedMatch}`);
}

test();
