import axios from 'axios';
import crypto from 'crypto';

console.log("🚀 Verifying Backup Proxy (sirjosh.workers.dev)\n");

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const tmdbId = '603';  // The Matrix

function decryptData(encryptedObjectB64) {
    const encryptedObject = JSON.parse(Buffer.from(encryptedObjectB64, 'base64').toString('utf8'));
    const { algorithm, key, iv, salt, iterations, encryptedData } = encryptedObject;
    const derivedKey = crypto.pbkdf2Sync(key, Buffer.from(salt, 'hex'), iterations, 32, 'sha256');
    const ivBuffer = Buffer.from(iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, derivedKey, ivBuffer);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
}

async function run() {
    // 1. Get MegaCDN URL
    console.log("1️⃣  Fetching MegaCDN URL...");
    let megaUrl = null;
    try {
        const serverUrl = `https://test.autoembed.cc/api/server?id=${tmdbId}&sr=10`;
        const headers = { 'Referer': 'https://player.vidsrc.co/', 'User-Agent': userAgent };
        // Use cors.eu.org just to get the metadata (known working for text/json)
        const proxyUrl = `https://cors.eu.org/${serverUrl}`;
        const response = await axios.get(proxyUrl, { headers, timeout: 5000 });

        if (response.data && response.data.data) {
            const decrypted = decryptData(response.data.data);
            megaUrl = decrypted.url;
            if (megaUrl.includes('url=')) {
                const m = megaUrl.match(/[?&]url=([^&]+)/);
                if (m) megaUrl = decodeURIComponent(m[1]);
            }
        }
    } catch (e) {
        console.error("   ❌ Failed to get MegaCDN link:", e.message);
        return;
    }

    if (!megaUrl) {
        console.error("   ❌ Could not retrieve MegaCDN URL.");
        return;
    }
    console.log(`   ✅ URL: ${megaUrl.substring(0, 50)}...`);

    // 2. Get Variant
    console.log("\n2️⃣  Fetching Variant Playlist (Direct)...");
    let variantUrl = null;
    try {
        const master = await axios.get(megaUrl, { headers: { 'User-Agent': userAgent } });
        const lines = master.data.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('#EXT-X-STREAM-INF') && i + 1 < lines.length) {
                const next = lines[i + 1].trim();
                if (next && !next.startsWith('#')) {
                    variantUrl = next;
                    if (!variantUrl.startsWith('http')) {
                        const u = new URL(megaUrl);
                        const p = u.pathname.substring(0, u.pathname.lastIndexOf('/') + 1);
                        variantUrl = `${u.origin}${p}${variantUrl}`;
                    }
                    break;
                }
            }
        }
    } catch (e) {
        console.error("   ❌ Failed to fetch master playlist:", e.message);
        return;
    }

    if (!variantUrl) {
        console.error("   ❌ Could not find variant URL.");
        return;
    }
    console.log(`   ✅ Variant: ${variantUrl.substring(0, 50)}...`);

    // 3. Get TS Segment
    console.log("\n3️⃣  Fetching TS Segment URL (Direct)...");
    let tsUrl = null;
    try {
        const variant = await axios.get(variantUrl, { headers: { 'User-Agent': userAgent } });
        const lines = variant.data.split('\n');
        for (const line of lines) {
            if (line.trim() && !line.trim().startsWith('#')) {
                tsUrl = line.trim();
                if (!tsUrl.startsWith('http')) {
                    const u = new URL(variantUrl);
                    const p = u.pathname.substring(0, u.pathname.lastIndexOf('/') + 1);
                    tsUrl = `${u.origin}${p}${tsUrl}`;
                }
                break;
            }
        }
    } catch (e) {
        console.error("   ❌ Failed to fetch variant playlist:", e.message);
        return;
    }

    if (!tsUrl) {
        console.error("   ❌ Could not find TS URL.");
        return;
    }
    console.log(`   ✅ TS URL: ${tsUrl.substring(0, 50)}...`);

    // 4. Test Backup Proxy
    console.log("\n4️⃣  Testing Proxy: cors-get-proxy.sirjosh.workers.dev");
    const proxyBase = 'https://cors-get-proxy.sirjosh.workers.dev/?url=';
    const target = `${proxyBase}${encodeURIComponent(tsUrl)}`;

    console.log(`   👉 Fetching: ${target.substring(0, 80)}...`);

    try {
        const start = Date.now();
        const response = await axios.get(target, {
            headers: {
                'User-Agent': userAgent,
                'Origin': 'http://localhost:3000'
            },
            timeout: 10000,
            responseType: 'arraybuffer' // Get binary
        });
        const duration = Date.now() - start;

        console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
        console.log(`   ⏱️  Time: ${duration}ms`);
        console.log(`   📦 Size: ${response.data.length} bytes`);
        console.log(`   🔒 CORS: ${response.headers['access-control-allow-origin'] || 'MISSING'}`);

        if (response.status === 200 && response.data.length > 1000) {
            console.log("\n🎉 SUCCESS: Proxy working correctly for MegaCDN Segment!");
        } else {
            console.log("\n⚠️  WARNING: Response seems suspicious (small size or non-200).");
            console.log(`   📄 Body: ${response.data.toString()}`);
        }

    } catch (e) {
        if (e.response) {
            console.log(`   ❌ Error: ${e.response.status} ${e.response.statusText}`);
            console.log(`   📄 Body: ${e.response.data.toString().substring(0, 200)}`);
        } else {
            console.log(`   ❌ Error: ${e.message}`);
        }
    }
}

run();
