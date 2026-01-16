const hostUrl = 'https://localhost:3000/api/movix-proxy?path=cinepro-proxy';
const basePath = 'https://f3.megacdn.co:2228/v3-hls-playback/token/playlist.m3u8';
const headers = { 'User-Agent': 'Test' };

function rewriteLine(line) {
    try {
        const absoluteUrl = new URL(line, basePath).href;
        // Logic should now ALWAYS return internal proxy
        return `${hostUrl}&url=${encodeURIComponent(absoluteUrl)}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
    } catch (e) { return line; }
}

const lines = [
    '#EXTM3U',
    '#EXT-X-STREAM-INF:BANDWIDTH=2962000,RESOLUTION=1920x1080',
    '1080/index.m3u8', // Variant
    '#EXTINF:10.000,',
    'segment-01.ts', // Segment (Was external, should now be internal)
    'https://other-cdn.com/segment.ts'
];

console.log("🚀 Testing URL Rewriting Logic (Internal Streaming)\n");

lines.forEach(line => {
    if (line.startsWith('#')) return;
    const rewritten = rewriteLine(line);
    console.log(`Original: ${line}`);
    console.log(`Rewritten: ${rewritten}`);

    if (rewritten.includes('movix-proxy')) {
        console.log("✅ Correctly routed to Internal Proxy");
    } else {
        console.log("❌ ERROR: Should be internal");
    }
    console.log('---');
});
