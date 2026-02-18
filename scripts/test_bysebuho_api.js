
import fs from 'fs';

async function test() {
    const id = '4m0a4it8eu6q';
    const endpoints = [
        `https://bysebuho.com/api/source/${id}`,
        `https://bysebuho.com/api/video/${id}`,
        `https://bysebuho.com/api/embed/${id}`,
        `https://bysebuho.com/api/player/${id}`,
        `https://bysebuho.com/api/v/${id}`,
        `https://bysebuho.com/api/file/${id}`,
        // Based on index.js logic "operation=..."
        `https://bysebuho.com/api/source?id=${id}`,
        `https://bysebuho.com/api/video?id=${id}`
    ];

    console.log(`🧪 Probing API endpoints for ID: ${id}`);

    for (const url of endpoints) {
        try {
            console.log(`Trying: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://bysebuho.com/',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            console.log(`Status: ${response.status}`);
            if (response.ok) {
                const text = await response.text();
                // Check if JSON
                try {
                    const json = JSON.parse(text);
                    console.log('✅ JSON Response:', JSON.stringify(json, null, 2));

                    // Check for m3u8
                    if (text.includes('.m3u8')) {
                        console.log('🎯 FOUND M3U8 in response!');
                    }
                } catch (e) {
                    console.log('Response is not JSON:', text.substring(0, 100));
                }
            }
        } catch (e) {
            console.error(`Error fetching ${url}:`, e.message);
        }
    }
}

test();
