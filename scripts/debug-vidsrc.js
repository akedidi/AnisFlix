import axios from 'axios';

async function test(tmdbId) {
    console.log(`Checking VidSrc for ${tmdbId}...`);
    const urls = [
        `https://player.vidsrc.co/embed/movie/${tmdbId}`,
        `https://test.autoembed.cc/embed/movie/${tmdbId}`
    ];

    for (const url of urls) {
        console.log(`Fetching ${url}...`);
        try {
            const resp = await axios.get(url);
            if (resp.data.includes('Megacloud') || resp.data.includes('MegaCDN')) {
                console.log(`✅ FOUND Megacloud in ${url}`);
            } else {
                console.log(`❌ Megacloud/MegaCDN NOT found in ${url}`);
            }
            if (resp.data.includes('Premilkyway')) {
                console.log(`✅ FOUND Premilkyway in ${url}`);
            }
        } catch (e) {
            console.error(`Error fetching ${url}:`, e.message);
        }
    }
}

test(19995);
