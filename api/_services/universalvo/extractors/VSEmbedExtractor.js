
import crypto from 'crypto';

export class VSEmbedExtractor {
    constructor() {
        this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
        this.d = 'BCEFGHIJKLMNOPQRTUVWXYZ123456789'; // Custom alphabet used in obfuscation
    }

    async extract(vsembedUrl) {
        try {
            console.log(`[VSEmbed] Starting extraction for: ${vsembedUrl}`);

            // Step 1: Fetch VSEmbed page
            const vsembedHtml = await this.fetchPage(vsembedUrl, "https://vsembed.ru/");

            // Step 2: Decrypt custom packing to get Cloudnestra URL
            let cloudnestraUrl = await this.decryptVSEmbed(vsembedHtml);

            if (!cloudnestraUrl) {
                // Fallback: check for simple iframe if decryption fails or pattern changes
                cloudnestraUrl = this.extractSimpleIframe(vsembedHtml);
                if (cloudnestraUrl) {
                    console.log(`[VSEmbed] Fallback: Found simple iframe: ${cloudnestraUrl}`);
                } else {
                    throw new Error("Could not decrypt VSEmbed source");
                }
            } else {
                console.log(`[VSEmbed] Decrypted/Selected URL: ${cloudnestraUrl}`);
            }

            // Step 3: Process Cloudnestra URL (Recursively)
            // Even if it's 25r... it might redirect or contain iframe
            return await this.processCloudnestra(cloudnestraUrl, vsembedUrl);

        } catch (error) {
            console.error(`[VSEmbed] Extraction failed: ${error.message}`);
            throw error;
        }
    }

    async processCloudnestra(url, referer) {
        console.log(`[VSEmbed] Processing URL: ${url}`);

        // 1. Fetch the page
        const html = await this.fetchPage(url, referer);

        // 2. Check for inner iframe (Recursive wrapper)
        const innerIframe = this.extractSimpleIframe(html);
        if (innerIframe) {
            console.log(`[VSEmbed] Found inner iframe: ${innerIframe}, recursing...`);
            const nextUrl = innerIframe.startsWith('//') ? `https:${innerIframe}` : innerIframe;
            return await this.processCloudnestra(nextUrl, url);
        }

        // 3. If no inner iframe, try to extract M3U8 directly
        let m3u8Template = this.extractM3u8Template(html);
        if (m3u8Template) {
            console.log(`[VSEmbed] Found M3U8 template directly: ${m3u8Template}`);
            return this.finalize(m3u8Template);
        }

        // 4. If we are at /rcp/ (or similar structure) and didn't find m3u8, try converting to /prorcp/
        // Only valid if URL looks like .../rcp/HASH
        if (url.includes('/rcp/')) {
            const hashMatch = url.match(/\/rcp\/([a-zA-Z0-9+/=]+)/);
            if (hashMatch) {
                const hash = hashMatch[1];
                // Use cloudnestra.com as base for prorcp? 
                // Or preserve domain? Usually prorcp is on cloudnestra.
                const prorcpUrl = `https://cloudnestra.com/prorcp/${hash}`;
                console.log(`[VSEmbed] Converting /rcp/ to /prorcp/: ${prorcpUrl}`);

                // Fetch prorcp URL
                const prorcpHtml = await this.fetchPage(prorcpUrl, url);
                m3u8Template = this.extractM3u8Template(prorcpHtml);
                if (m3u8Template) {
                    return this.finalize(m3u8Template);
                }
            }
        }

        // 5. Special case for obfuscated JS pages (25r... etc)
        // If HTML contains "S5(" or similar, it might be a JS redirection page.
        // We can try to extract keywords or iframe URLs from JS source.
        const jsIframe = html.match(/document\['createElement'\]\('iframe'\);.*?src.*?'(.*?)'/);
        // This is weak. 
        // Better: look for known strings.
        if (html.includes('cloudnestra.com')) {
            console.log("[VSEmbed] Found 'cloudnestra.com' in body/JS. Searching for URL...");
            const cloudMatch = html.match(/(https?:\/\/(?:www\.)?cloudnestra\.com\/[^"'\s]+)/);
            if (cloudMatch) {
                console.log(`[VSEmbed] Extracted Cloudnestra URL from JS: ${cloudMatch[1]}`);
                return await this.processCloudnestra(cloudMatch[1], url);
            }
        }

        throw new Error("Could not find M3U8 template in page");
    }

    finalize(m3u8Template) {
        // Replace {v1}, {v2} ... with a valid domain.
        // We verified 'neonhorizonworkshops.com' works.
        const finalUrl = m3u8Template.replace(/\{v\d+\}/, "neonhorizonworkshops.com");

        console.log(`[VSEmbed] Final URL: ${finalUrl}`);

        return {
            m3u8Url: finalUrl,
            type: 'hls',
            headers: {
                "User-Agent": this.userAgent,
                "Referer": "https://cloudnestra.com/",
                "Origin": "https://cloudnestra.com"
            }
        };
    }

    async fetchPage(url, referer) {
        console.log(`[VSEmbed] Fetching: ${url} (Ref: ${referer})`);
        if (!url) throw new Error("fetchPage called with empty URL");

        const response = await fetch(url, {
            headers: {
                "User-Agent": this.userAgent,
                "Referer": referer
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    }

    extractSimpleIframe(html) {
        // Simple regex fallback for iframe extraction
        const match = html.match(/src=["'](https?:\/\/(?:www\.)?cloudnestra\.com\/[^"']+)["']/);
        if (match) return match[1];

        const relMatch = html.match(/src=["'](\/\/(?:www\.)?cloudnestra\.com\/[^"']+)["']/);
        if (relMatch) return `https:${relMatch[1]}`;

        // Also generic iframe if it looks promising?
        // Let's stick to cloudnestra for now to avoid ads.

        return null;
    }

    extractM3u8Template(html) {
        // Look for file: "https://.../master.m3u8"
        // Also look for hls: "..."
        const match = html.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);
        if (match) return match[1];

        const matchList = html.match(/file:\s*["']([^"']+\.m3u8)["']/);
        if (matchList) return matchList[1];

        // Sometimes generic file extraction
        const generic = html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
        if (generic) return generic[1];

        return null;
    }

    // --- Decryption Logic ---

    async decryptVSEmbed(html) {
        // Extract payload and key
        // m=t('PAYLOAD','KEY')
        const regex = /m=t\((['"])(.*?)\1,\s*(['"])(.*?)\3\)/;
        const match = html.match(regex);

        if (!match) {
            console.log("[VSEmbed] Regex match failed for m=t(...)");
            return null;
        }

        const quote1 = match[1];
        let rawPayload = match[2];
        const quote2 = match[3];
        let rawKey = match[4];

        // Unescape JS string content safely using Function constructor
        const unescape = (str, quote) => {
            try {
                if (quote === "'") {
                    return new Function(`return '${str}';`)();
                } else {
                    return new Function(`return "${str}";`)();
                }
            } catch (e) {
                console.error("[VSEmbed] Unescape failed", e);
                let s = str.replace(/\\\\/g, '\\');
                if (quote === "'") s = s.replace(/\\'/g, "'");
                if (quote === '"') s = s.replace(/\\"/g, '"');
                return s;
            }
        };

        const payload = unescape(rawPayload, quote1);
        const key = unescape(rawKey, quote2);

        console.log(`[VSEmbed] Payload found (len: ${payload.length}), Key: ${key}`);

        // 1. Decrypt JSON
        const m = this.t(payload, key);
        if (!m || !m.l) {
            console.log("[VSEmbed] t() decryption failed or invalid structure");
            return null;
        }

        const { l: S, s: A, d: T } = m;
        const { t1: O, t2: j, d: E, t1s: L, t2s: M, ds: _ } = A;

        // 2. Generate URLs from config
        const R = new Date();
        const url1 = await this.g({ l: S, tld: O, s: L, now: R }); // Primary
        const url2 = await this.g({ l: S, tld: j, s: M, now: R }); // Secondary (often ad/trap or backup)

        console.log(`[VSEmbed] Generated URL1: ${url1}`);
        console.log(`[VSEmbed] Generated URL2: ${url2}`);

        const fixProto = (u) => u.startsWith('//') ? `https:${u}` : u;

        // Heuristic: Prefer Cloudnestra if visible
        if (url1.includes('cloudnestra')) return fixProto(url1);
        if (url2.includes('cloudnestra')) return fixProto(url2);

        // Otherwise return url1 as default
        return fixProto(url1);
    }

    t(t, r) {
        const n = r.length / 2;
        const e = r.substr(0, n);
        const i = r.substr(n);
        try {
            return JSON.parse(t.split('').map((t => {
                const r = i.indexOf(t);
                return -1 !== r ? e[r] : t
            })).join(''));
        } catch (e) {
            console.error("[VSEmbed] t() threw:", e);
            return null;
        }
    }

    async sha256(str) {
        const hash = crypto.createHash('sha256');
        hash.update(str);
        return hash.digest();
    }

    async yy(t, r, n) {
        const now = new Date();
        const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
        const i = Math.floor(e.getUTCHours() / n) * n;

        const o = `${e.getUTCFullYear()}${String(e.getUTCMonth() + 1).padStart(2, '0')}${String(e.getUTCDate()).padStart(2, '0')}${String(i).padStart(2, '0')}`;
        const a = `${t}|${o}`;
        const c = await this.sha256(a);

        const f = 15 + c[0] % 26;
        const v = 1 + c[1] % (f - 14);
        const s = f - v;

        const l = (t => {
            let r = 0, n = '', e = 0;
            for (let i = 0; i < t.length; i++)
                for (e = e << 8 | t[i], r += 8; r >= 5;) n += this.d[e >>> r - 5 & 31], r -= 5;
            return r && (n += this.d[e << 5 - r & 31]), n.toLowerCase()
        })(c);

        return `${l.slice(0, v)}.${l.slice(v, v + s)}`;
    }

    async g(t) {
        let { tld: r, s: n, offset: e = 3, now: i, l: o } = t;
        const domain = await this.yy(n, i, e);

        const path = o.replace(/\{rnd\}/g, (() => {
            return (t => {
                let r_inner = '';
                for (let n = 0; n < t; n += 1) {
                    let t = this.d[Math.floor(Math.random() * this.d.length)];
                    /^[A-Z]$/.test(t) && Math.random() < .5 && (t = t.toLowerCase()), r_inner += t
                }
                return r_inner
            })((t = 10, Math.floor(Math.random() * (24 - 10 + 1)) + 10));
        }));

        const finalUrl = `https://${domain}${r}${path}`;
        return finalUrl;
    }
}
