// Test direct download with CORS proxy
const axios = require('axios');

console.log('🧪 Testing Direct Download with CORS Proxy\n');
console.log('='.repeat(80));

const TMDB_ID = '550';  // Fight Club
const TYPE = 'movie';

async function testWithCorsProxy() {
    console.log('\n📡 Fetching AutoEmbed via cors.eu.org...');

    const targetUrl = `https://test.autoembed.cc/api/getVideoSource?type=${TYPE}&id=${TMDB_ID}`;
    const proxyUrl = `https://cors.eu.org/${targetUrl}`;

    try {
        const response = await axios.get(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 15000
        });

        if (response.data && response.data.videoSource) {
            const servers = response.data.videoSource;
            console.log(`✅ Found ${servers.length} servers\n`);

            // Print all servers
            console.log('Server List:');
            console.log('-'.repeat(80));
            for (let i = 0; i < servers.length; i++) {
                const s = servers[i];
                const url = s.url || s.embedUrl || '';
                console.log(`  ${i + 1}. ${s.name || 'Unknown'}`);
                console.log(`     URL: ${url.substring(0, 70)}...`);
            }

            // Look for our target servers (Vidzy, Vidmoly, MovieBox)
            console.log(`\n${'='.repeat(80)}`);
            console.log('🎯 Finding target servers (Vidzy/Vidhide, Vidmoly, Moviebox)...\n');

            const targets = ['vidmoly', 'darkibox', 'vidzy', 'vidhide', 'moviebox', 'flaswish'];
            const found = [];

            for (let i = 0; i < servers.length; i++) {
                const s = servers[i];
                const url = (s.url || s.embedUrl || '').toLowerCase();
                const name = (s.name || '').toLowerCase();

                for (const target of targets) {
                    if (url.includes(target) || name.includes(target)) {
                        found.push({ index: i + 1, server: s, target });
                        break;
                    }
                }
            }

            if (found.length > 0) {
                console.log(`Found ${found.length} target servers:\n`);
                for (const f of found) {
                    console.log(`  ✅ Server ${f.index}: ${f.server.name} (${f.target})`);
                    console.log(`     ${f.server.url || f.server.embedUrl}`);
                }
            } else {
                console.log('  ❌ No target servers found in AutoEmbed response');
            }

            return servers;
        }
    } catch (e) {
        console.log(`❌ Error: ${e.response?.status || e.message}`);
        if (e.response?.data) {
            console.log(`   Response: ${JSON.stringify(e.response.data).substring(0, 200)}`);
        }
    }
    return [];
}

async function testMegaCDNDirect() {
    console.log(`\n${'='.repeat(80)}`);
    console.log('🎬 Testing MegaCDN Direct Access (known working)...\n');

    // Test with a known MegaCDN URL pattern
    // MegaCDN URLs are like: https://f3.megacdn.co/v/xxxxxx/playlist.m3u8

    // First get the MegaCDN URL from Server 10
    const targetUrl = `https://test.autoembed.cc/api/getVideoSource?type=${TYPE}&id=${TMDB_ID}&server=10`;
    const proxyUrl = `https://cors.eu.org/${targetUrl}`;

    try {
        const response = await axios.get(proxyUrl, {
            timeout: 15000
        });

        if (response.data && response.data.videoSource) {
            const megacdnData = response.data.videoSource;
            console.log(`✅ Got MegaCDN response`);

            // Extract real URL if proxied
            let streamUrl = megacdnData.url || megacdnData.file || megacdnData.stream;

            if (streamUrl) {
                console.log(`   Raw URL: ${streamUrl.substring(0, 100)}...`);

                // De-proxy if needed
                if (streamUrl.includes('proxy') && streamUrl.includes('url=')) {
                    const urlMatch = streamUrl.match(/url=([^&]+)/);
                    if (urlMatch) {
                        streamUrl = decodeURIComponent(urlMatch[1]);
                        console.log(`   De-proxied: ${streamUrl.substring(0, 100)}...`);
                    }
                }

                // Test direct access
                console.log('\n   Testing direct M3U8 access...');
                try {
                    const m3u8Response = await axios.get(streamUrl, {
                        timeout: 10000,
                        validateStatus: () => true
                    });

                    if (m3u8Response.status === 200) {
                        const isM3u8 = m3u8Response.data.includes('#EXTM3U');
                        console.log(`   ✅ Direct access: 200 OK (Valid M3U8: ${isM3u8})`);

                        if (isM3u8) {
                            // Parse resolutions
                            const lines = m3u8Response.data.split('\n');
                            const resolutions = [];
                            for (const line of lines) {
                                const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
                                if (resMatch) resolutions.push(resMatch[1]);
                            }
                            if (resolutions.length > 0) {
                                console.log(`   📺 Resolutions: ${resolutions.join(', ')}`);
                            }
                        }
                    } else {
                        console.log(`   ❌ Direct access: ${m3u8Response.status}`);
                    }
                } catch (e) {
                    console.log(`   ❌ Direct access error: ${e.message}`);
                }
            }
        }
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }
}

async function main() {
    await testWithCorsProxy();
    await testMegaCDNDirect();

    console.log(`\n${'='.repeat(80)}`);
    console.log('\n✅ Tests Complete\n');
}

main().catch(console.error);
