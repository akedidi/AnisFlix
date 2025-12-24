
// Add as needed the orbit proxy and proxy-uira.live I saw in another issue
const PROXY_DOMAINS = [
    'hls1.vid1.site',
    'orbitproxy.cc',
    'hls3.vid1.site',
    'hls2.vid1.site',
    'proxy-m3u8.uira.live',
    'streamta.site',
    'streamtape.com',
    'streamtape.to',
    'streamtape.net'
];

// defaultt user agent i think adding the user agent in the url it self wil mess things up
const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// We will at first Check if url needs proxying
export function needsProxy(url) {
    try {
        const urlObj = new URL(url);
        return PROXY_DOMAINS.some((domain) => urlObj.hostname.includes(domain));
    } catch {
        return false;
    }
}

export function extractOriginalUrl(proxyUrl) {
    try {
        const url = new URL(proxyUrl);

        // right now only for hls1.vid1.site/proxy/ and hls3.vid1.site/proxy/ because they are the ones that has not been working...
        if (
            (url.hostname === 'hls1.vid1.site' ||
                url.hostname === 'hls3.vid1.site') &&
            url.pathname.startsWith('/proxy/')
        ) {
            const encodedUrl = url.pathname.replace('/proxy/', '');
            return decodeURIComponent(encodedUrl);
        }

        if (url.searchParams.has('url')) {
            return decodeURIComponent(url.searchParams.get('url'));
        }

        return proxyUrl; // we will Return as-is if no proxy pattern found
    } catch {
        return proxyUrl;
    }
}

export function processApiResponse(apiResponse, serverUrl) {
    if (!apiResponse.files) return apiResponse;

    const processedFiles = apiResponse.files.map((file) => {
        if (!file.file || typeof file.file !== 'string') return file;

        // Check if this is an external proxy URL that we want to replace
        if (needsProxy(file.file)) {
            const originalUrl = extractOriginalUrl(file.file);
            const urlObj = new URL(file.file);

            // Only process hls1.vid1.site, hls2.vid1.site, and hls3.vid1.site URLs
            if (
                urlObj.hostname === 'hls1.vid1.site' ||
                urlObj.hostname === 'hls2.vid1.site' ||
                urlObj.hostname === 'hls3.vid1.site' ||
                urlObj.hostname === 'streamta.site' ||
                urlObj.hostname.includes('streamtape') ||
                urlObj.hostname.includes('tape')
            ) {
                // Determine origin based on hostname
                let m3u8Origin;
                if (urlObj.hostname === 'streamta.site' || urlObj.hostname.includes('streamtape') || urlObj.hostname.includes('tape')) {
                    // For Streamtape, the origin/referer is usually the page itself or streamtape.com
                    // But we can try using the hostname itself
                    m3u8Origin = `https://${urlObj.hostname}`;
                } else {
                    m3u8Origin = new URL(originalUrl).origin;
                }
                console.log(
                    `[HLS Proxy Replacement] Original URL: ${originalUrl}`
                );
                console.log(
                    `[HLS Proxy Replacement] M3U8 Origin: ${m3u8Origin}`
                );

                const proxyHeaders = {
                    Referer: m3u8Origin,
                    Origin: m3u8Origin
                };

                // ADAPTATION for AnisFlix: Use the existing API route structure
                // Assuming movix-proxy handles path='proxy/hls'
                const localProxyUrl = `${serverUrl}/api/movix-proxy?path=proxy/hls&link=${encodeURIComponent(
                    originalUrl
                )}&headers=${encodeURIComponent(JSON.stringify(proxyHeaders))}`;

                console.log(
                    `[HLS Proxy Replacement] ${file.file} -> ${localProxyUrl}`
                );
                console.log(
                    `[HLS Proxy Headers] ${JSON.stringify(proxyHeaders)}`
                );

                return {
                    ...file,
                    file: localProxyUrl,
                    type: 'hls',
                    headers: proxyHeaders
                };
            }
        }

        // For non-proxy URLs, also fix the referer if it's pointing to the wrong domain
        if (file.file && file.file.includes('.m3u8') && file.headers) {
            try {
                const m3u8Origin = new URL(file.file).origin;

                // If the current referer doesn't match the M3U8's origin, fix it
                if (
                    file.headers.Referer &&
                    !file.headers.Referer.includes(new URL(file.file).hostname)
                ) {
                    console.log(
                        `[Direct M3U8] Fixing referer for: ${file.file}`
                    );
                    console.log(
                        `[Direct M3U8] Old referer: ${file.headers.Referer} -> New referer: ${m3u8Origin}`
                    );

                    return {
                        ...file,
                        headers: {
                            ...file.headers,
                            Referer: m3u8Origin,
                            Origin: m3u8Origin
                        }
                    };
                }
            } catch (error) {
                // If URL parsing fails, keep the original file
                console.log(
                    `[Direct M3U8] URL parsing failed for: ${file.file}`
                );
            }
        }

        return file; // Return unchanged if no proxy needed
    });

    return {
        ...apiResponse,
        files: processedFiles
    };
}
