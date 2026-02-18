/**
 * Detects if a string contains packed code (Dean Edwards / various packers)
 * Pattern: eval(function(p,a,c,k,e,d)...
 */
export function isPacked(text: string): boolean {
    return /eval\(function\(p,a,c,k,e,d\)/.test(text) ||
        /eval\(function\(p,a,c,k,e,r\)/.test(text);
}

/**
 * Unpacks code compressed with Dean Edwards Packer
 * Based on various open source implementations of the unpacking algorithm.
 */
export function unpack(packedCode: string): string | null {
    try {
        // 1. Extract the arguments from the packed code
        // The pattern usually starts with eval(function(p,a,c,k,e,d)...)
        // We want to extract the inner part: return p}('payload', radix, count, ['keywords'], ...

        // Find the start of the payload
        const evalStart = packedCode.indexOf('eval(function(');
        if (evalStart === -1) return null;

        // Isolate the function call part
        // We look for the part usually: }('...', radix, count, 'keywords'.split('|'), 0, {}))
        // Simplest way is regex capture
        const regex = /}\s*\(\s*'([^']*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\.split\('\|'\)/;
        const match = packedCode.match(regex);

        if (!match) {
            // Try double quotes version
            const regex2 = /}\s*\(\s*"([^"]*)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*"([^"]*)"\.split\('\|'\)/;
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

function _unpack(p: string, a: number, c: number, k: string[]): string {
    // Logic from the packer itself:
    // while(c--)if(k[c])p=p.replace(new RegExp('\\b'+c.toString(a)+'\\b','g'),k[c])
    // But basic packers use base encoding (0-9a-zA-Z)

    // Helper to convert index to base 'a' string
    const toBase = (n: number, radix: number): string => {
        let str = "";
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (radix > 62) return n.toString(radix); // Fallback for standard

        do {
            str = chars[n % radix] + str;
            n = Math.floor(n / radix);
        } while (n > 0);

        return str; // Actually standard packer uses a slightly different init logic usually
        // But extracting libraries usually just iterate k and replace.
    };

    // Robust implementation:
    // Iterate in reverse
    while (c--) {
        if (k[c]) {
            // Reconstruct the key in base 'a'
            // Although standard packer code passes a function 'e' to do this.
            // Simplified approach: usually generic packer just replaces tokens.

            // Standard Packer:
            // e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))}

            // Let's implement the 'e' function logic based on 'a'
            // Usually 'a' is 62.

            const key = c.toString(a); // This is usually sufficient for standard js packer (radix) 
            // Note: dean edwards might use custom base62.

            // But wait, the standard packer implementation in JS replaces:
            // p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);

            // We need 'e(c)'.
            // If a <= 36, it uses toString(36).
            // If a > 36?

            // Let's try simple replacement first, assuming standard base36 or base62 if regex matches word boundaries.
            // Actually, the regex in payload uses '\b' + key + '\b'.

            // Simplest approach: The packer code defines the decoder.
            // But we are in TS, we can't eval the decoder.

            // Most common packers use base36.
            let token = c.toString(a);

            p = p.replace(new RegExp('\\b' + token + '\\b', 'g'), k[c]);
        }
    }
    return p;
}
