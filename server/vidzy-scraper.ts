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

export async function getVidzyM3u8Link(url: string): Promise<string | null> {
    try {
        console.log(`Récupération du HTML depuis Vidzy : ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const htmlContent = await response.text();

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
