
// Test if bysevideo.net CDN is accessible from this machine (simulating Vercel)
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
    const resp = await fetch(`https://bysebuho.com/api/videos/${id}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': `https://bysebuho.com/e/${id}`,
            'Origin': 'https://bysebuho.com',
        }
    });
    const data = await resp.json();
    const pb = data.playback;

    // Decrypt payload2 (bysevideo.net) - uses edge1+edge2 key
    const edge1 = b64urlDecode(pb.decrypt_keys.edge_1);
    const edge2 = b64urlDecode(pb.decrypt_keys.edge_2);
    const key2 = Buffer.concat([edge1, edge2]);
    const iv2 = b64urlDecode(pb.iv2);
    const payload2 = b64urlDecode(pb.payload2);
    const sources2 = JSON.parse(decrypt(key2, iv2, payload2));

    console.log('=== payload2 sources (bysevideo.net) ===');
    sources2.sources?.forEach(s => {
        console.log(`[${s.label}] ${s.url}`);
        // Check if ASN is in the URL
        const asnMatch = s.url.match(/asn=([^&]*)/);
        if (asnMatch) console.log(`  ASN: "${asnMatch[1]}"`);
        else console.log('  No ASN parameter (good!)');
    });

    const m3u8Url = sources2.sources?.[0]?.url;
    if (!m3u8Url) { console.log('No URL'); return; }

    // Test accessibility
    console.log('\n=== Testing bysevideo.net accessibility ===');

    // Try with different DNS resolvers / approaches
    const testHeaders = [
        { label: 'With Referer', headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://bysebuho.com/', 'Origin': 'https://bysebuho.com' } },
        { label: 'No Referer', headers: { 'User-Agent': 'Mozilla/5.0' } },
        { label: 'HLS.js UA', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HLS.js)' } },
    ];

    for (const { label, headers } of testHeaders) {
        try {
            const r = await fetch(m3u8Url, { headers, signal: AbortSignal.timeout(5000) });
            console.log(`[${label}] Status: ${r.status}`);
            if (r.ok) {
                const text = await r.text();
                console.log(`Content: ${text.substring(0, 200)}`);
            }
        } catch (e) {
            console.log(`[${label}] Error: ${e.message}`);
        }
    }
}

test().catch(console.error);
