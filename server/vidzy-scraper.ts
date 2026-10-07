import axios from 'axios';

/**
 * Désobfusque le code JavaScript "packed" trouvé sur la page.
 * @param {string} packedCode - Le bloc de code entier commençant par "eval(...)".
 * @returns {string} Le code désobfusqué.
 */
function deobfuscate(packedCode: string): string {
    // Extrait les arguments de la fonction eval()
    // Utilise [\s\S] au lieu du flag 's' pour la compatibilité
    const matches = packedCode.match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]*return p\}\('(.*)',(\d+),(\d+),'(.*)'\.split\('\|'\)\)\)/);

    if (!matches) {
        throw new Error("Le format du code obfusqué n'a pas pu être reconnu.");
    }

    let p = matches[1];
    const a = parseInt(matches[2], 10); // radix
    const c = parseInt(matches[3], 10); // count
    const k = matches[4].split('|');    // dictionary

    // La fonction de remplacement des identifiants corrigée
    const getIdentifier = (index: number): string => {
        return index.toString(a);
    };

    // Boucle de remplacement
    for (let i = c - 1; i >= 0; i--) {
        if (k[i]) {
            // Crée une expression régulière pour trouver le mot-clé (ex: \b1a\b)
            const regex = new RegExp('\\b' + getIdentifier(i) + '\\b', 'g');
            p = p.replace(regex, k[i]);
        }
    }

    return p;
}

function isRealVideoUrl(value: string | null | undefined): value is string {
    if (!value || !/^https?:\/\//i.test(value)) return false;
    const lower = value.toLowerCase();
    if (lower.includes('/troll/') || lower.includes('fake')) return false;
    return /\.(?:m3u8|mp4|mkv)(?:$|[?#])/i.test(value);
}

function decodeHostnameBoundPayload(encoded: string, hostname: string, calibration: number): string {
    let hostnameHash = 0;
    for (const character of hostname) {
        hostnameHash = (hostnameHash + character.charCodeAt(0)) & 255;
    }

    const reversed = Buffer.from(encoded, 'base64').toString('binary').split('').reverse().join('');
    let decoded = '';
    for (let index = 0; index < reversed.length; index++) {
        const key = (0x3d + index * 89 + hostnameHash + calibration) & 255;
        decoded += String.fromCharCode(reversed.charCodeAt(index) ^ key);
    }
    return decoded;
}

function extractHostnameBoundVideoUrl(html: string, hostname: string): string | null {
    const iifeRegex = /\(\s*(function\s*\(\s*s\s*\)\s*\{[\s\S]{20,4000}?\})\s*\)\s*\(\s*["']([^"']+)["']\s*\)/g;
    let match: RegExpExecArray | null;

    while ((match = iifeRegex.exec(html)) !== null) {
        const [, fnCode, encoded] = match;
        if (!fnCode.includes('atob') || !fnCode.includes('charCodeAt')) continue;

        const calibrations: number[] = [];
        const addCalibration = (value: number) => {
            if (Number.isInteger(value) && value >= 0 && value <= 255 && !calibrations.includes(value)) {
                calibrations.push(value);
            }
        };
        const widthRegex = /calc\(\s*1in\s*\+\s*(\d+)px\s*\)/gi;
        let widthMatch: RegExpExecArray | null;
        while ((widthMatch = widthRegex.exec(fnCode)) !== null) {
            addCalibration(96 + Number(widthMatch[1]));
        }
        const guardRegex = /BC\s*!==?\s*(0x[\da-f]+|\d+)/gi;
        let guardMatch: RegExpExecArray | null;
        while ((guardMatch = guardRegex.exec(fnCode)) !== null) {
            addCalibration(Number(guardMatch[1]));
        }
        addCalibration(0);

        // The calibration is a single byte. Brute-forcing it is cheap and
        // protects the server route from another CSS-width-only Vidzy change.
        if (fnCode.includes('+BC')) {
            for (let value = 0; value <= 255; value++) addCalibration(value);
        }

        for (const calibration of calibrations) {
            const candidate = decodeHostnameBoundPayload(encoded, hostname, calibration);
            if (isRealVideoUrl(candidate)) return candidate;
        }
    }
    return null;
}

export async function getVidzyM3u8Link(url: string): Promise<string | null> {
    try {
        console.log(`Récupération du HTML depuis Vidzy : ${url}`);
        const response = await axios.get(url, {
            family: 4,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000,
            responseType: 'text'
        });

        const htmlContent = typeof response.data === 'string' ? response.data : String(response.data || '');

        // Current Vidzy pages no longer use Dean Edwards' packed JavaScript.
        // They hide the URL in a hostname- and browser-width-bound XOR IIFE.
        const hostnameBoundUrl = extractHostnameBoundVideoUrl(htmlContent, new URL(url).hostname);
        if (hostnameBoundUrl) {
            console.log("Lien vidéo Vidzy extrait depuis l'IIFE liée au navigateur.");
            return hostnameBoundUrl;
        }

        // 1. Trouve le bloc de script obfusqué
        // Utilise [\s\S] au lieu du flag 's' pour la compatibilité
        const packedScriptRegex = /<script type='text\/javascript'>\s*(eval\(function\(p,a,c,k,e,d\){[\s\S]*?}\([\s\S]*?\))\s*<\/script>/;
        const scriptMatch = htmlContent.match(packedScriptRegex);

        if (!scriptMatch || !scriptMatch[1]) {
            throw new Error("Impossible de trouver le bloc de script obfusqué.");
        }

        console.log("Script obfusqué trouvé. Désobfuscation...");
        // 2. Désobfusque le contenu du script
        const deobfuscatedCode = deobfuscate(scriptMatch[1]);
        
        // 3. Extrait l'URL m3u8 du code résultant
        const m3u8Regex = /src:"(https?:\/\/[^"]+\.m3u8[^"]*)"/;
        const m3u8Match = deobfuscatedCode.match(m3u8Regex);

        if (m3u8Match && m3u8Match[1]) {
            console.log("Lien m3u8 extrait avec succès !");
            return m3u8Match[1];
        } else {
            // Affiche le code désobfusqué en cas d'échec pour aider au débogage
            console.log("Code désobfusqué :", deobfuscatedCode);
            throw new Error("Impossible d'extraire le lien m3u8 du code désobfusqué.");
        }

    } catch (error) {
        console.error("Erreur lors du scraping Vidzy :", (error as Error).message);
        return null;
    }
}
