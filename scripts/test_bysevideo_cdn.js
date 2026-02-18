
import { createDecipheriv } from 'crypto';

const id = '4m0a4it8eu6q';

function b64urlDecode(str) {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return Buffer.from(padded, 'base64');
}

function decrypt(keyBuf, ivBuf, payloadBuf) {
    const authTag = payloadBuf.slice(-16);
    const ciphertext = payloadBuf.slice(0, -16);
    const decipher = createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
}

async function test() {
    // Fetch fresh data
    const resp = await fetch(`https://bysebuho.com/api/videos/${id}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': `https://bysebuho.com/e/${id}`,
            'Origin': 'https://bysebuho.com',
        }
    });
    const data = await resp.json();
    const pb = data.playback;

    // Decrypt payload2 (bysevideo.net)
    const edge1 = b64urlDecode(pb.decrypt_keys.edge_1);
    const edge2 = b64urlDecode(pb.decrypt_keys.edge_2);
    const key2 = Buffer.concat([edge1, edge2]);
    const iv2 = b64urlDecode(pb.iv2);
    const payload2 = b64urlDecode(pb.payload2);
    const sources2 = JSON.parse(decrypt(key2, iv2, payload2));

    console.log('=== Sources from payload2 (bysevideo.net) ===');
    sources2.sources?.forEach(s => console.log(`[${s.label}] ${s.url}`));

    const m3u8Url = sources2.sources?.[0]?.url;
    if (!m3u8Url) { console.log('No URL found'); return; }

    console.log('\n=== Testing bysevideo.net M3U8 ===');

    // Test 1: Direct fetch
    try {
        const r = await fetch(m3u8Url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://bysebuho.com/',
                'Origin': 'https://bysebuho.com',
            }
        });
        console.log(`Direct fetch: ${r.status}`);
        if (r.ok) {
            const text = await r.text();
            console.log('Content:', text.substring(0, 300));
        }
    } catch (e) {
        console.log('Direct fetch error:', e.message);
    }

    // Test 2: Without Referer
    try {
        const r = await fetch(m3u8Url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        console.log(`\nWithout Referer: ${r.status}`);
        if (r.ok) {
            const text = await r.text();
            console.log('Content:', text.substring(0, 200));
        }
    } catch (e) {
        console.log('Without Referer error:', e.message);
    }

    // Test 3: Check CORS headers
    try {
        const r = await fetch(m3u8Url, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://anisflix.vercel.app',
                'Access-Control-Request-Method': 'GET',
            }
        });
        console.log(`\nCORS preflight: ${r.status}`);
        console.log('CORS headers:', {
            'access-control-allow-origin': r.headers.get('access-control-allow-origin'),
            'access-control-allow-methods': r.headers.get('access-control-allow-methods'),
        });
    } catch (e) {
        console.log('CORS preflight error:', e.message);
    }
}

test().catch(console.error);
