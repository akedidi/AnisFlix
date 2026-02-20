
import crypto from 'crypto';

const tokens = [
    { id: 224372, token: "LTZmMzcxZThk" },
    { id: 1368166, token: "LTU4N2VkMTUw" },
    { id: 434853, token: "LTE1MGU4NmJm" },
    { id: 840464, token: "LTJiMzk1ODJh" },
    { id: 1168190, token: "LTQwYmQ5YzRh" },
    { id: 1315303, token: "LTQwNWRhMmZh" },
    { id: 1236153, token: "MzdhNjY1ODA" }
];

function decodeToken(tok) {
    let padded = tok;
    while (padded.length % 4 !== 0) {
        padded += "=";
    }
    return Buffer.from(padded, 'base64').toString('utf8');
}

function hexToInt(hex) {
    if (hex.startsWith('-')) {
        return -parseInt(hex.slice(1), 16);
    }
    return parseInt(hex, 16);
}

const pairs = tokens.map(t => {
    const decoded = decodeToken(t.token);
    const val = hexToInt(decoded);
    return { id: t.id, token: t.token, decoded, val };
});

console.log("Decoded pairs:", pairs);

// Java String.hashCode()
function javaHashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
}

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function sha1(str) {
    return crypto.createHash('sha1').update(str).digest('hex');
}

const candidates = [
    "", "secret", "key", "salt", "fsvid", "movix", "anisflix", "app",
    "android", "ios", "api", "token", "123456", "password",
    "fsvid.lol", "movix.blog", "stream", "video", "play", "watch",
    "premium", "vod", "movie", "tv", "tmdb", "id", "hash"
];

console.log("\n--- Testing Complex Patterns ---");

for (let salt of candidates) {
    for (let salt2 of candidates) {
        // Test patterns
        // 1. PREFIX + ID + SUFFIX
        checkPattern(`javaHashCode("${salt}" + ID + "${salt2}")`, (id) => javaHashCode(salt + id + salt2));

        // 2. MD5(SALT + ID) taking first 8 chars as hex?
        // 3. SHA1 ...
    }
}

function checkPattern(name, func) {
    let consistent = true;
    for (let p of pairs) {
        let val = func(p.id.toString());
        if (typeof val === 'string') {
            // Hex string check?
            // The token decoded IS a hex string (e.g. "-6f371e8d")
            // So we compare strings
            if (val !== p.decoded) consistent = false;
        } else {
            // Integer check
            if (val !== p.val) consistent = false;
        }
        if (!consistent) break;
    }

    if (consistent) {
        console.log(`✅ MATCH FOUND: ${name}`);
    }
}

console.log("Testing MD5/SHA1 partials...");

for (let salt of candidates) {
    checkPattern(`MD5("${salt}" + ID).substring(0,8) cast to signed int`, (idStr) => {
        const hash = md5(salt + idStr);
        const sub = hash.substring(0, 8);
        return parseInt(sub, 16) | 0; // cast to signed 32-bit
    });

    checkPattern(`MD5(ID + "${salt}").substring(0,8) cast to signed int`, (idStr) => {
        const hash = md5(idStr + salt);
        const sub = hash.substring(0, 8);
        return parseInt(sub, 16) | 0;
    });

    checkPattern(`SHA1("${salt}" + ID).substring(0,8) cast to signed int`, (idStr) => {
        const hash = sha1(salt + idStr);
        const sub = hash.substring(0, 8);
        return parseInt(sub, 16) | 0;
    });
}

console.log("Done checking.");
