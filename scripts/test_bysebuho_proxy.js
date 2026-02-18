
// Test: Can our proxy fetch the Bysebuho API and return the encrypted payload?
// Then can we proxy the M3U8 with the right Referer?

const id = '4m0a4it8eu6q';

async function test() {
    // 1. Test fetching the API via our proxy
    const apiUrl = `https://bysebuho.com/api/videos/${id}`;
    const proxyApiUrl = `http://localhost:3000/api/movix-proxy?path=proxy&url=${encodeURIComponent(apiUrl)}`;

    console.log('=== Test 1: Fetch Bysebuho API via proxy ===');
    try {
        const resp = await fetch(proxyApiUrl);
        console.log(`Status: ${resp.status}`);
        if (resp.ok) {
            const data = await resp.json();
            console.log('Has playback:', !!data.playback);
            console.log('Has key_parts:', !!data.playback?.key_parts);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }

    // 2. Test fetching the M3U8 directly with Referer
    console.log('\n=== Test 2: Fetch M3U8 directly with Referer ===');
    const { createDecipheriv } = await import('crypto');

    const resp2 = await fetch(apiUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': `https://bysebuho.com/e/${id}`,
            'Origin': 'https://bysebuho.com',
        }
    });
    const data = await resp2.json();
    const pb = data.playback;

    function b64urlDecode(str) {
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        return Buffer.from(padded, 'base64');
    }

    const kp1 = b64urlDecode(pb.key_parts[0]);
    const kp2 = b64urlDecode(pb.key_parts[1]);
    const keyBuf = Buffer.concat([kp1, kp2]);
    const ivBuf = b64urlDecode(pb.iv);
    const payloadBuf = b64urlDecode(pb.payload);
    const authTag = payloadBuf.slice(-16);
    const ciphertext = payloadBuf.slice(0, -16);
    const decipher = createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
    const sources = JSON.parse(decrypted);
    const m3u8Url = sources.sources[0].url;
    console.log('M3U8:', m3u8Url);
    console.log('ASN in URL:', m3u8Url.match(/asn=([^&]*)/)?.[1]);

    // 3. Test fetching M3U8 with Referer
    console.log('\n=== Test 3: Fetch M3U8 with Referer ===');
    const m3u8Resp = await fetch(m3u8Url, {
        headers: {
            'Referer': 'https://bysebuho.com/',
            'Origin': 'https://bysebuho.com',
            'User-Agent': 'Mozilla/5.0'
        }
    });
    console.log(`M3U8 status: ${m3u8Resp.status}`);
    if (m3u8Resp.ok) {
        const text = await m3u8Resp.text();
        console.log('M3U8 content (first 200):', text.substring(0, 200));
    }

    // 4. Test via our proxy
    console.log('\n=== Test 4: Fetch M3U8 via our proxy ===');
    const proxyM3u8 = `http://localhost:3000/api/proxy?url=${encodeURIComponent(m3u8Url)}&referer=${encodeURIComponent('https://bysebuho.com/')}`;
    console.log('Proxy URL:', proxyM3u8);
}

test().catch(console.error);
