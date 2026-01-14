import axios from 'axios';
import * as cheerio from 'cheerio';

const userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';
const headers = {
    'User-Agent': userAgent,
    'Referer': 'https://multiembed.mov',
    'X-Requested-With': 'XMLHttpRequest'
};

async function test(imdbId) {
    console.log(`Checking MultiEmbed for ${imdbId}...`);
    let baseUrl = `https://multiembed.mov/?video_id=${imdbId}`;

    try {
        const dataPayload = {
            'button-click': 'ZEhKMVpTLVF0LVBTLVF0LVAtMGs1TFMtUXpPREF0TC0wLVYzTi0wVS1RTi0wQTFORGN6TmprLTU=',
            'button-referer': ''
        };

        console.log('Fetching base check...');
        // First request to set cookies/session usually needed?
        // Logic copied from CineproScraper
        // Initial GET to resolve URL and set cookies
        if (baseUrl.includes('multiembed')) {
            const resolved = await axios.get(baseUrl, { headers });
            baseUrl = resolved.request.res.responseUrl || baseUrl;
        }

        const resp1 = await axios.post(baseUrl, new URLSearchParams(dataPayload), { headers });
        const tokenMatch = resp1.data.match(/load_sources\(\"(.*?)\"\)/);
        if (!tokenMatch) {
            console.log('No token found. Response might be CAPTCHA or Blocked.');
            // console.log(resp1.data);
            return;
        }
        const token = tokenMatch[1];
        console.log('Token:', token);

        const resp2 = await axios.post(
            'https://streamingnow.mov/response.php',
            new URLSearchParams({ token }),
            { headers }
        );
        const $ = cheerio.load(resp2.data);

        console.log('Available Servers:');
        $('li').each((i, el) => {
            console.log(`- ${$(el).text().trim()} (data-id: ${$(el).attr('data-id')}, data-server: ${$(el).attr('data-server')})`);
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

// await test('tt6263850'); // Deadpool
await test('tt0499549'); // Avatar
