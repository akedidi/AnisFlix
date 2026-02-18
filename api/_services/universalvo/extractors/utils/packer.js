
/**
 * Detects if a string contains packed code (Dean Edwards / various packers)
 * Pattern: eval(function(p,a,c,k,e,d)...
 */
export function isPacked(text) {
    return /eval\(function\(p,a,c,k,e,d\)/.test(text) ||
        /eval\(function\(p,a,c,k,e,r\)/.test(text);
}

/**
 * Unpacks code compressed with Dean Edwards Packer
 */
export function unpack(packedCode) {
    try {
        const evalStart = packedCode.indexOf('eval(function(');
        if (evalStart === -1) return null;

        // Isolate the function call part
        // Relaxed regex to handle escaped quotes in payload and keywords
        const regex = /}\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\.)*)'\.split\('\|'\)/;
        const match = packedCode.match(regex);

        if (!match) {
            // Try double quotes version
            const regex2 = /}\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*"((?:[^"\\]|\\.)*)"\.split\('\|'\)/;
            const match2 = packedCode.match(regex2);
            if (match2) return _unpack(match2[1], parseInt(match2[2]), parseInt(match2[3]), match2[4].split('|'));
            return null;
        }

        return _unpack(match[1], parseInt(match[2]), parseInt(match[3]), match[4].split('|'));

    } catch (e) {
        console.error("Unpacker error:", e);
        return null;
    }
}

function _unpack(p, a, c, k) {
    // Helper to convert index to base 'a' string if needed, but basic packer uses radix replacement logic
    const toBase = (n, radix) => {
        let str = "";
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (radix > 62) return n.toString(radix);
        do {
            str = chars[n % radix] + str;
            n = Math.floor(n / radix);
        } while (n > 0);
        return str;
    };

    while (c--) {
        if (k[c]) {
            // Standard packer uses base36 or similar.
            let token = c.toString(a);
            try {
                p = p.replace(new RegExp('\\b' + token + '\\b', 'g'), k[c]);
            } catch (e) {
                // If regex fails (e.g. invalid chars), skip or use split/join
            }
        }
    }
    return p;
}
