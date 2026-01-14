import axios from 'axios';
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';
const headers = {
    'User-Agent': userAgent,
    'Referer': 'https://multiembed.mov',
    'X-Requested-With': 'XMLHttpRequest'
};

async function debugPlayVideo(imdbId) {
    console.log(`Debug PlayVideo for ${imdbId} (with Cookies)...`);
    let baseUrl = `https://multiembed.mov/?video_id=${imdbId}`;

    try {
        if (baseUrl.includes('multiembed')) {
            const resolved = await client.get(baseUrl, { headers });
            baseUrl = resolved.request.res.responseUrl || baseUrl;
        }

        const dataPayload = {
            'button-click': 'ZEhKMVpTLVF0LVBTLVF0LVAtMGs1TFMtUXpPREF0TC0wLVYzTi0wVS1RTi0wQTFORGN6TmprLTU=',
            'button-referer': ''
        };

        const resp1 = await client.post(baseUrl, new URLSearchParams(dataPayload), { headers });
        const tokenMatch = resp1.data.match(/load_sources\(\"(.*?)\"\)/);
        if (!tokenMatch) { console.log('No token'); return; }
        const token = tokenMatch[1];

        const resp2 = await client.post(
            'https://streamingnow.mov/response.php',
            new URLSearchParams({ token }),
            { headers }
        );
        const $ = cheerio.load(resp2.data);

        // Find ALL vipstreams
        const sources = [];
        $('li').each((i, el) => {
            const txt = $(el).text().toLowerCase();
            if (txt.includes('vipstream') && $(el).attr('data-id')) {
                sources.push({
                    name: txt,
                    id: $(el).attr('data-id'),
                    server: $(el).attr('data-server')
                });
            }
        });

        if (!sources.length) { console.log('No VIP sources found'); return; }
        console.log(`Found ${sources.length} VIP sources.`);

        for (const source of sources) {
            console.log(`Testing Source: ${source.name}`);
            const vipUrl = `https://streamingnow.mov/playvideo.php?video_id=${source.id}&server_id=${source.server}&token=${token}&init=1`;
            const resp3 = await client.get(vipUrl, { headers });

            const $2 = cheerio.load(resp3.data);
            const iframe = $2('iframe');
            if (iframe.length) {
                const src = iframe.attr('src');
                console.log(`✅ Success! Iframe found: ${src}`);
            } else {
                console.log('❌ Still no iframe Check contents:');
                // console.log(resp3.data.substring(0, 500));
                if (resp3.data.includes('captcha')) console.log('>> Response contains CAPTCHA');
            }
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugPlayVideo('tt0499549');
