import axios from 'axios';
import crypto from 'crypto';

console.log("� AutoEmbed Server Analysis - Identifying MegaCDN & PreMilkyWay sources\n");

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const tmdbId = '603';  // The Matrix (1999)

function decryptData(encryptedObjectB64) {
    const encryptedObject = JSON.parse(Buffer.from(encryptedObjectB64, 'base64').toString('utf8'));
    const { algorithm, key, iv, salt, iterations, encryptedData } = encryptedObject;
    const derivedKey = crypto.pbkdf2Sync(key, Buffer.from(salt, 'hex'), iterations, 32, 'sha256');
    const ivBuffer = Buffer.from(iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, derivedKey, ivBuffer);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
}

function extractDomain(url) {
    try {
        const u = new URL(url);
        return u.hostname;
    } catch {
        return 'unknown';
    }
}

function categorizeProvider(url) {
    if (!url) return 'Unknown';
    if (url.includes('megacdn') || url.includes('megaf')) return '🔵 MegaCDN';
    if (url.includes('premilkyway') || url.includes('milkyway')) return '🟣 PreMilkyWay';
    if (url.includes('vixsrc')) return '🟢 VixSrc';
    if (url.includes('kkphimplayer')) return '🟡 KKPhim';
    if (url.includes('1hd.su')) return '🟠 1HD.su';
    if (url.includes('aether.mom')) return '⚪ Aether Proxy';
    return '⚫ Other';
}

async function run() {
    const baseUrl = `https://test.autoembed.cc/api/server?id=${tmdbId}`;
    const headers = {
        'Referer': 'https://player.vidsrc.co/',
        'Origin': 'https://player.vidsrc.co/',
        'User-Agent': userAgent
    };

    console.log(`${"=".repeat(100)}`);
    console.log(`| Server | Status     | Provider          | Domain                                    | Type |`);
    console.log(`|--------|------------|-------------------|-------------------------------------------|------|`);

    const results = [];

    for (let i = 1; i <= 15; i++) {
        const serverUrl = `${baseUrl}&sr=${i}`;

        try {
            const response = await axios.get(serverUrl, { headers, timeout: 10000 });

            if (response.data && response.data.data) {
                const decrypted = decryptData(response.data.data);
                let directUrl = decrypted.url;

                if (directUrl && directUrl.includes('embed-proxy')) {
                    const urlMatch = directUrl.match(/[?&]url=([^&]+)/);
                    if (urlMatch) directUrl = decodeURIComponent(urlMatch[1]);
                }

                const domain = extractDomain(directUrl);
                const provider = categorizeProvider(directUrl);
                const type = directUrl.includes('.mp4') ? 'MP4' : 'HLS';

                results.push({ server: i, status: '✅', provider, domain, type, url: directUrl });
                console.log(`| ${String(i).padStart(6)} | ✅ Success | ${provider.padEnd(17)} | ${domain.padEnd(41)} | ${type.padEnd(4)} |`);
            } else {
                results.push({ server: i, status: '⚠️', provider: 'No data', domain: '-', type: '-' });
                console.log(`| ${String(i).padStart(6)} | ⚠️ No data | ${''.padEnd(17)} | ${'-'.padEnd(41)} | ${'-'.padEnd(4)} |`);
            }
        } catch (e) {
            const errMsg = e.response ? `${e.response.status}` : e.message.substring(0, 15);
            results.push({ server: i, status: '❌', provider: errMsg, domain: '-', type: '-' });
            console.log(`| ${String(i).padStart(6)} | ❌ ${errMsg.padEnd(8)} | ${''.padEnd(17)} | ${'-'.padEnd(41)} | ${'-'.padEnd(4)} |`);
        }
    }

    console.log(`${"=".repeat(100)}\n`);

    // Summary by provider
    console.log(`\n📊 SUMMARY BY PROVIDER:\n`);

    const megacdn = results.filter(r => r.provider.includes('MegaCDN'));
    const premilky = results.filter(r => r.provider.includes('MilkyWay'));
    const vixsrc = results.filter(r => r.provider.includes('VixSrc'));
    const kkphim = results.filter(r => r.provider.includes('KKPhim'));
    const hd1 = results.filter(r => r.provider.includes('1HD'));
    const aether = results.filter(r => r.provider.includes('Aether'));

    console.log(`🔵 MegaCDN:      Servers ${megacdn.map(r => r.server).join(', ') || 'None'}`);
    console.log(`🟣 PreMilkyWay:  Servers ${premilky.map(r => r.server).join(', ') || 'None'}`);
    console.log(`🟢 VixSrc:       Servers ${vixsrc.map(r => r.server).join(', ') || 'None'}`);
    console.log(`🟡 KKPhim:       Servers ${kkphim.map(r => r.server).join(', ') || 'None'}`);
    console.log(`� 1HD.su:       Servers ${hd1.map(r => r.server).join(', ') || 'None'}`);
    console.log(`⚪ Aether Proxy: Servers ${aether.map(r => r.server).join(', ') || 'None'}`);

    // Full URLs for working servers
    console.log(`\n\n📺 FULL URLs:\n`);
    const working = results.filter(r => r.url);
    for (const r of working) {
        console.log(`[Server ${String(r.server).padStart(2)}] ${r.provider}`);
        console.log(`   ${r.url}\n`);
    }
}

run();
