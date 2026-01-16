// Test direct download capability for Vidzy, Vidmoly, MovieBox
// Using real embed URLs and testing direct m3u8 access

import axios from 'axios';
import { DarkiboxExtractor } from './api/_services/universalvo/extractors/DarkiboxExtractor.js';
import { VidmolyExtractor } from './api/_services/universalvo/extractors/VidmolyExtractor.js';

console.log('🧪 Testing Direct Download from Extracted URLs\n');
console.log('='.repeat(80));

// Known working embed URLs from Autoembed servers or similar aggregators
// We need to find real embed URLs first by testing Autoembed server results

const TMDB_ID = '550';  // Fight Club
const TYPE = 'movie';

async function getAutoembedServers() {
    console.log('\n📡 Fetching AutoEmbed servers...');

    const autoEmbedUrl = `https://test.autoembed.cc/api/getVideoSource?type=${TYPE}&id=${TMDB_ID}`;

    try {
        const response = await axios.get(autoEmbedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000
        });

        if (response.data && response.data.videoSource) {
            console.log(`✅ Found ${response.data.videoSource.length} servers\n`);
            return response.data.videoSource;
        }
    } catch (e) {
        console.log(`❌ AutoEmbed Error: ${e.message}`);
    }
    return [];
}

async function testDirectM3u8Access(url, name, headers = {}) {
    console.log(`\n📥 Testing: ${name}`);
    console.log(`   URL: ${url.substring(0, 100)}...`);

    const tests = [
        { label: 'No Headers', headers: {} },
        { label: 'Referer Only', headers: { 'Referer': headers.referer || 'https://google.com' } },
        {
            label: 'Full Browser', headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': headers.referer || 'https://google.com',
                'Origin': headers.origin || new URL(headers.referer || 'https://google.com').origin
            }
        }
    ];

    for (const test of tests) {
        try {
            const res = await axios.get(url, {
                headers: test.headers,
                timeout: 8000,
                maxRedirects: 5,
                validateStatus: () => true
            });

            const isM3u8 = res.data && typeof res.data === 'string' && res.data.includes('#EXTM3U');
            const contentType = res.headers['content-type'];

            if (res.status === 200 && isM3u8) {
                console.log(`   ✅ ${test.label}: 200 OK (Valid M3U8)`);
            } else if (res.status === 200) {
                console.log(`   ⚠️ ${test.label}: 200 (Not M3U8, type: ${contentType})`);
            } else {
                console.log(`   ❌ ${test.label}: ${res.status}`);
            }
        } catch (e) {
            console.log(`   ❌ ${test.label}: ${e.code || e.message}`);
        }
    }
}

async function findAndTestEmbedUrls(servers) {
    const vidmolyExtractor = new VidmolyExtractor();
    const darkiboxExtractor = new DarkiboxExtractor();

    // Look for embed sources that match our targets
    const targetKeywords = ['vidmoly', 'darkibox', 'vidzy', 'vidhide', 'moviebox'];

    for (let i = 0; i < Math.min(servers.length, 15); i++) {
        const server = servers[i];
        const serverUrl = server.url || server.embedUrl || server.embed;

        if (!serverUrl) continue;

        const lowerUrl = serverUrl.toLowerCase();
        const matchedKeyword = targetKeywords.find(kw => lowerUrl.includes(kw));

        if (matchedKeyword) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🎯 Server ${i + 1}: ${server.name || 'Unknown'}`);
            console.log(`   Embed URL: ${serverUrl}`);
            console.log(`   Matched: ${matchedKeyword}`);

            let extractResult = null;
            let referer = 'https://google.com';

            try {
                if (matchedKeyword === 'vidmoly' || matchedKeyword === 'flaswish') {
                    extractResult = await vidmolyExtractor.extract(serverUrl);
                    referer = 'https://vidmoly.to/';
                } else if (['darkibox', 'vidzy', 'vidhide'].includes(matchedKeyword)) {
                    extractResult = await darkiboxExtractor.extract(serverUrl);
                    referer = 'https://darkibox.com/';
                }

                if (extractResult && extractResult.success && extractResult.m3u8Url) {
                    console.log(`   ✅ Extracted: ${extractResult.m3u8Url.substring(0, 80)}...`);
                    await testDirectM3u8Access(extractResult.m3u8Url, matchedKeyword, { referer });
                } else {
                    console.log(`   ❌ Extraction failed: ${extractResult?.message || 'Unknown error'}`);
                }
            } catch (e) {
                console.log(`   ❌ Extraction error: ${e.message}`);
            }
        }
    }
}

async function testMovieBox() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎯 Testing MovieBox directly...');

    // MovieBox provides MP4 download links, not m3u8
    // Let's test if moviebox streams are accessible directly

    try {
        // First get MovieBox streams from our API
        const showboxBaseUrl = 'https://www.showbox.media';
        const searchUrl = `${showboxBaseUrl}/api/wefeed-index/_search`;

        const searchResponse = await axios.post(searchUrl, {
            "from": 0,
            "size": 20,
            "query": {
                "bool": {
                    "must": [
                        { "match": { "title": "Fight Club" } },
                        { "term": { "itemType": 0 } } // 0 = movie
                    ]
                }
            }
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (searchResponse.data?.hits?.hits?.length > 0) {
            const hit = searchResponse.data.hits.hits[0];
            console.log(`   ✅ Found: ${hit._source?.title} (ID: ${hit._id})`);

            // Try to get streams for this content
            const streamsUrl = `${showboxBaseUrl}/api/wefeed-h5-bff/subject/get-download-list?subjectId=${hit._id}&episodeId=0`;
            const streamsResponse = await axios.get(streamsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                timeout: 10000
            });

            if (streamsResponse.data?.downloads) {
                console.log(`   ✅ Found ${streamsResponse.data.downloads.length} download options`);

                for (const download of streamsResponse.data.downloads.slice(0, 2)) {
                    console.log(`\n   📥 Testing: ${download.quality}p`);
                    console.log(`      URL: ${download.url?.substring(0, 80)}...`);

                    await testDirectM3u8Access(download.url, `MovieBox ${download.quality}p`, {
                        referer: 'https://www.showbox.media/'
                    });
                }
            }
        } else {
            console.log('   ❌ No MovieBox results found');
        }
    } catch (e) {
        console.log(`   ❌ MovieBox Error: ${e.message}`);
    }
}

async function main() {
    // Step 1: Get AutoEmbed servers
    const servers = await getAutoembedServers();

    // Step 2: Find and test Vidzy/Vidmoly embeds
    if (servers.length > 0) {
        await findAndTestEmbedUrls(servers);
    }

    // Step 3: Test MovieBox separately
    await testMovieBox();

    console.log(`\n${'='.repeat(80)}`);
    console.log('\n✅ Tests Complete\n');
}

main().catch(console.error);
