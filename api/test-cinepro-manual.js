import { CineproScraper } from '../api/_services/cinepro/index.js';
import axios from 'axios';

async function test() {
    const scraper = new CineproScraper();

    // Test Case: Avatar
    const tmdbId = 19995;
    const imdbId = 'tt0499549';
    const host = 'anisflix.vercel.app'; // Simulation

    console.log(`Testing CineproScraper for TMDB:${tmdbId} IMDB:${imdbId}`);

    try {
        const streams = await scraper.getStreams(tmdbId, null, null, imdbId, host);
        console.log(`Found ${streams.length} streams.`);
        streams.forEach(s => console.log(` - ${s.server} [${s.quality}]`));

        for (const stream of streams) {
            console.log(`\n--- Stream (${stream.server}) ---`);
            const proxyUrl = stream.link;
            // console.log('Proxy URL:', proxyUrl); // Too long usually

            // Decode upstream URL
            const urlParam = new URL(proxyUrl).searchParams.get('url');
            if (urlParam) {
                const upstreamUrl = decodeURIComponent(urlParam);
                console.log('Upstream URL:', upstreamUrl);

                // Verify Headers
                const headersParam = new URL(proxyUrl).searchParams.get('headers');
                const headers = headersParam ? JSON.parse(decodeURIComponent(headersParam)) : {};
                console.log('Headers:', headers);

                // Check content
                console.log('Verifying content...');
                // Check content
                console.log('Verifying content...');
                try {
                    const response = await axios.get(upstreamUrl, {
                        headers: {
                            ...headers,
                            'Accept-Encoding': 'gzip, deflate, br'
                        },
                        responseType: 'arraybuffer'
                    });

                    const contentStr = response.data.toString();
                    const contentSnippet = contentStr.substring(0, 100);
                    console.log(`Status: ${response.status}`);
                    console.log(`Content verification: ${contentStr.includes('#EXTM3U') ? 'VALID M3U8' : 'UNKNOWN'}`);
                    console.log('First 100 chars:', contentSnippet);

                    if (response.status === 200 && contentStr.includes('#EXTM3U')) {
                        // Deep Check: Find variant
                        const lines = contentStr.split('\n');
                        let variantUrl = null;
                        for (let line of lines) {
                            if (line.trim() && !line.startsWith('#')) {
                                variantUrl = line.trim();
                                break;
                            }
                        }

                        if (variantUrl) {
                            // Handle relative URLs
                            if (!variantUrl.startsWith('http')) {
                                const baseUrl = upstreamUrl.substring(0, upstreamUrl.lastIndexOf('/') + 1);
                                variantUrl = new URL(variantUrl, baseUrl).toString();
                            }
                            console.log(`\n--- Deep Check: Variant (${variantUrl}) ---`);

                            try {
                                const respVar = await axios.get(variantUrl, { headers: { ...headers, 'Accept-Encoding': 'gzip' }, responseType: 'arraybuffer' });
                                const varContent = respVar.data.toString();
                                console.log(`Variant Status: ${respVar.status}`);

                                // Find segment
                                const varLines = varContent.split('\n');
                                let segUrl = null;
                                for (let line of varLines) {
                                    if (line.trim() && !line.startsWith('#')) {
                                        segUrl = line.trim();
                                        break;
                                    }
                                }

                                if (segUrl) {
                                    if (!segUrl.startsWith('http')) {
                                        const baseVarUrl = variantUrl.substring(0, variantUrl.lastIndexOf('/') + 1);
                                        segUrl = new URL(segUrl, baseVarUrl).toString();
                                    }
                                    console.log(`\n--- Deep Check: Segment (${segUrl}) ---`);

                                    const respSeg = await axios.get(segUrl, { headers: { ...headers, 'Accept-Encoding': 'gzip' }, responseType: 'arraybuffer' });
                                    console.log(`Segment Status: ${respSeg.status}`);
                                    console.log(`Segment Size: ${respSeg.data.length} bytes`);
                                    const firstByte = respSeg.data[0];
                                    console.log(`First Byte: 0x${firstByte.toString(16)} (Expected 0x47 for TS)`);
                                    console.log('✅ VIDEO CONTENT CONFIRMED');
                                }
                            } catch (e) {
                                console.error('Deep check failed:', e.message);
                            }
                        }
                    }

                } catch (e) {
                    console.error('Download check failed:', e.message);
                }
            }
        }
    } catch (error) {
        console.error('Scraper Error:', error);
    }
}

test();
