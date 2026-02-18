
import { createDecipheriv } from 'crypto';

// Test with fresh data from the API
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
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': `https://bysebuho.com/e/${id}`,
            'Origin': 'https://bysebuho.com',
        }
    });
    const data = await resp.json();
    const pb = data.playback;

    // Decrypt both payloads
    const kp1 = b64urlDecode(pb.key_parts[0]);
    const kp2 = b64urlDecode(pb.key_parts[1]);
    const key1 = Buffer.concat([kp1, kp2]);
    const iv1 = b64urlDecode(pb.iv);
    const payload1 = b64urlDecode(pb.payload);

    const edge1 = b64urlDecode(pb.decrypt_keys.edge_1);
    const edge2 = b64urlDecode(pb.decrypt_keys.edge_2);
    const key2 = Buffer.concat([edge1, edge2]);
    const iv2 = b64urlDecode(pb.iv2);
    const payload2 = b64urlDecode(pb.payload2);

    const sources1 = JSON.parse(decrypt(key1, iv1, payload1));
    const sources2 = JSON.parse(decrypt(key2, iv2, payload2));

    console.log('=== Sources from payload (sprintcdn) ===');
    sources1.sources?.forEach(s => console.log(`[${s.label}] ${s.url}`));

    console.log('\n=== Sources from payload2 (bysevideo.net) ===');
    sources2.sources?.forEach(s => console.log(`[${s.label}] ${s.url}`));

    // Test accessibility of both
    console.log('\n=== Testing M3U8 accessibility ===');
    const allSources = [
        ...(sources1.sources || []),
        ...(sources2.sources || [])
    ];

    for (const src of allSources) {
        try {
            const r = await fetch(src.url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': 'https://bysebuho.com/'
                }
            });
            console.log(`[${r.status}] ${src.label || src.quality}: ${src.url.substring(0, 80)}...`);
        } catch (e) {
            console.log(`[ERR] ${src.label}: ${e.message}`);
        }
    }
}

test().catch(console.error);
