
// Test: Is the token IP-bound? 
// If we fetch the API from one IP and then fetch the M3U8 from a different IP, does it fail?
// We can simulate this by fetching the M3U8 with a different User-Agent or via a proxy

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
    // Fetch API
    const resp = await fetch(`https://bysebuho.com/api/videos/${id}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': `https://bysebuho.com/e/${id}`,
            'Origin': 'https://bysebuho.com',
        }
    });
    const data = await resp.json();
    const pb = data.playback;

    const kp1 = b64urlDecode(pb.key_parts[0]);
    const kp2 = b64urlDecode(pb.key_parts[1]);
    const key1 = Buffer.concat([kp1, kp2]);
    const iv1 = b64urlDecode(pb.iv);
    const payload1 = b64urlDecode(pb.payload);
    const sources1 = JSON.parse(decrypt(key1, iv1, payload1));
    const m3u8Url = sources1.sources?.[0]?.url;

    console.log('Token:', m3u8Url.match(/t=([^&]*)/)?.[1]);
    console.log('Timestamp:', m3u8Url.match(/s=([^&]*)/)?.[1]);
    console.log('Expires in:', m3u8Url.match(/e=([^&]*)/)?.[1], 'seconds');

    // Test: Fetch M3U8 directly (same IP as API fetch)
    console.log('\n=== Test: Direct M3U8 fetch (same IP) ===');
    const r = await fetch(m3u8Url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://bysebuho.com/' }
    });
    console.log(`Status: ${r.status}`);
    if (r.ok) {
        const text = await r.text();
        console.log('Content:', text.substring(0, 300));
    }

    // Now test: what does the proxy URL look like?
    const proxyUrl = `https://anisflix.vercel.app/api/proxy?url=${encodeURIComponent(m3u8Url)}&referer=${encodeURIComponent('https://bysebuho.com/')}`;
    console.log('\nProxy URL (for Vercel):', proxyUrl.substring(0, 150));

    // Check if the token in the URL from the Vercel API call is different
    // The user showed: asn= (empty) in the Vercel-fetched token
    // But locally we get asn=3215
    // This means the token IS different based on requesting IP
    // But the CDN accepts any ASN... so why 404?

    // Maybe the CDN checks the IP of the requester against the token's IP?
    // Let's look at the token structure more carefully
    console.log('\n=== Token analysis ===');
    const token = m3u8Url.match(/t=([^&]*)/)?.[1];
    if (token) {
        try {
            // Try to decode the token (might be base64url)
            const decoded = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
            console.log('Token (hex):', decoded.substring(0, 64));
        } catch (e) {
            console.log('Token is not base64:', token.substring(0, 30));
        }
    }
}

test().catch(console.error);
