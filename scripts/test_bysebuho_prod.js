
import { createDecipheriv } from 'crypto';

const VERCEL_BASE = 'https://anisflix.vercel.app';
const VIDEO_ID = '4m0a4it8eu6q';

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
    console.log('=== Step 1: Test /api/proxy?action=bysebuho-extract on Vercel ===');
    const extractUrl = `${VERCEL_BASE}/api/proxy?action=bysebuho-extract&code=${VIDEO_ID}`;
    console.log('URL:', extractUrl);

    const extractResp = await fetch(extractUrl);
    console.log('Status:', extractResp.status);

    if (!extractResp.ok) {
        const text = await extractResp.text();
        console.log('Error:', text);
        return;
    }

    const { playback: pb } = await extractResp.json();
    console.log('✅ Got playback data');
    console.log('Has key_parts:', !!pb?.key_parts);
    console.log('Has decrypt_keys:', !!pb?.decrypt_keys);
    console.log('Has payload2:', !!pb?.payload2);

    // Step 2: Decrypt payload2 (bysevideo.net)
    console.log('\n=== Step 2: Decrypt payload2 (bysevideo.net) ===');
    let m3u8Url = null;
    try {
        const edge1 = b64urlDecode(pb.decrypt_keys.edge_1);
        const edge2 = b64urlDecode(pb.decrypt_keys.edge_2);
        const key2 = Buffer.concat([edge1, edge2]);
        const iv2 = b64urlDecode(pb.iv2);
        const payload2 = b64urlDecode(pb.payload2);
        const sources2 = JSON.parse(decrypt(key2, iv2, payload2));
        const hls2 = (sources2.sources || []).filter(s => s.url?.includes('.m3u8'));
        if (hls2.length > 0) {
            m3u8Url = (hls2.find(s => s.quality === 'h') || hls2[0]).url;
            console.log('✅ payload2 M3U8:', m3u8Url);
        }
    } catch (e) {
        console.log('❌ payload2 failed:', e.message);
    }

    // Step 3: Decrypt payload1 (sprintcdn) as fallback
    if (!m3u8Url) {
        console.log('\n=== Step 3: Decrypt payload1 (sprintcdn) ===');
        const kp1 = b64urlDecode(pb.key_parts[0]);
        const kp2 = b64urlDecode(pb.key_parts[1]);
        const key1 = Buffer.concat([kp1, kp2]);
        const iv1 = b64urlDecode(pb.iv);
        const payload1 = b64urlDecode(pb.payload);
        const sources1 = JSON.parse(decrypt(key1, iv1, payload1));
        const hls1 = (sources1.sources || []).filter(s => s.url?.includes('.m3u8'));
        m3u8Url = (hls1.find(s => s.quality === 'h') || hls1[0])?.url;
        console.log('payload1 M3U8:', m3u8Url);
        console.log('ASN in URL:', m3u8Url?.match(/asn=([^&]*)/)?.[1] ?? 'NOT FOUND');
    }

    if (!m3u8Url) { console.log('❌ No M3U8 found'); return; }

    // Step 4: Test M3U8 via Vercel proxy
    console.log('\n=== Step 4: Test M3U8 via Vercel proxy ===');
    const proxyM3u8 = `${VERCEL_BASE}/api/proxy?url=${encodeURIComponent(m3u8Url)}&referer=${encodeURIComponent('https://bysebuho.com/')}`;
    console.log('Proxy URL:', proxyM3u8.substring(0, 120) + '...');

    const m3u8Resp = await fetch(proxyM3u8);
    console.log('Status:', m3u8Resp.status);
    if (m3u8Resp.ok) {
        const text = await m3u8Resp.text();
        console.log('✅ M3U8 content (first 400 chars):');
        console.log(text.substring(0, 400));
    } else {
        const err = await m3u8Resp.text();
        console.log('❌ Error:', err.substring(0, 200));
    }
}

test().catch(console.error);
