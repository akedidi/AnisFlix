
// Test: Does the CDN actually check ASN, or is there another issue?
// Let's test with a fresh token from Vercel's perspective by simulating what Vercel does

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
    // Get fresh token
    const resp = await fetch(`https://bysebuho.com/api/videos/${id}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': `https://bysebuho.com/e/${id}`,
            'Origin': 'https://bysebuho.com',
        }
    });
    const data = await resp.json();
    const pb = data.playback;

    // Decrypt payload1 (sprintcdn)
    const kp1 = b64urlDecode(pb.key_parts[0]);
    const kp2 = b64urlDecode(pb.key_parts[1]);
    const key1 = Buffer.concat([kp1, kp2]);
    const iv1 = b64urlDecode(pb.iv);
    const payload1 = b64urlDecode(pb.payload);
    const sources1 = JSON.parse(decrypt(key1, iv1, payload1));
    const m3u8Url = sources1.sources?.[0]?.url;

    console.log('M3U8 URL:', m3u8Url);
    console.log('ASN in URL:', m3u8Url.match(/asn=([^&]*)/)?.[1] || 'NOT FOUND');

    // Test 1: Direct fetch with Referer (local machine, ASN 3215)
    console.log('\n=== Test 1: Direct fetch (local, ASN 3215) ===');
    const r1 = await fetch(m3u8Url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://bysebuho.com/' }
    });
    console.log(`Status: ${r1.status}`);

    // Test 2: Fetch without Referer
    console.log('\n=== Test 2: Without Referer ===');
    const r2 = await fetch(m3u8Url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log(`Status: ${r2.status}`);

    // Test 3: Modify URL to remove asn parameter
    const urlWithoutAsn = m3u8Url.replace(/&asn=[^&]*/, '').replace(/\?asn=[^&]*&/, '?');
    console.log('\n=== Test 3: URL without ASN param ===');
    console.log('URL:', urlWithoutAsn.substring(0, 100));
    const r3 = await fetch(urlWithoutAsn, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://bysebuho.com/' }
    });
    console.log(`Status: ${r3.status}`);

    // Test 4: Fetch with a different ASN value
    const urlWithFakeAsn = m3u8Url.replace(/asn=([^&]*)/, 'asn=14618'); // AWS ASN
    console.log('\n=== Test 4: URL with AWS ASN (14618) ===');
    const r4 = await fetch(urlWithFakeAsn, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://bysebuho.com/' }
    });
    console.log(`Status: ${r4.status}`);

    // Test 5: Fetch with empty ASN (like Vercel generates)
    const urlWithEmptyAsn = m3u8Url.replace(/asn=([^&]*)/, 'asn=');
    console.log('\n=== Test 5: URL with empty ASN (like Vercel) ===');
    const r5 = await fetch(urlWithEmptyAsn, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://bysebuho.com/' }
    });
    console.log(`Status: ${r5.status}`);
}

test().catch(console.error);
