const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Désobfusque le code JavaScript "packed" trouvé sur la page.
 */
function deobfuscate(packedCode) {
    const matches = packedCode.match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]*return p\}\('(.*)',(\d+),(\d+),'(.*)'\.split\('\|'\)\)\)/);

    if (!matches) {
        throw new Error("Le format du code obfusqué n'a pas pu être reconnu.");
    }

    let p = matches[1];
    const a = parseInt(matches[2], 10);
    const c = parseInt(matches[3], 10);
    const k = matches[4].split('|');

    const getIdentifier = (index) => {
        return index.toString(a);
    };

    for (let i = c - 1; i >= 0; i--) {
        if (k[i]) {
            const regex = new RegExp('\\b' + getIdentifier(i) + '\\b', 'g');
            p = p.replace(regex, k[i]);
        }
    }

    return p;
}

async function getVidzyM3u8Link(url) {
    try {
        console.log(`Récupération du HTML depuis Vidzy : ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const htmlContent = response.data;
        const $ = cheerio.load(htmlContent);
        
        // Cherche le script contenant le code obfusqué
        const scriptTags = $('script');
        let deobfuscatedCode = null;
        
        scriptTags.each((i, script) => {
            const scriptContent = $(script).html();
            if (scriptContent && scriptContent.includes('eval(function(p,a,c,k,e,d)')) {
                try {
                    deobfuscatedCode = deobfuscate(scriptContent);
                    console.log('Code désobfusqué avec succès');
                } catch (error) {
                    console.error('Erreur lors du désobfuscage:', error);
                }
                return false; // Arrête la boucle
            }
        });
        
        if (!deobfuscatedCode) {
            throw new Error('Aucun code obfusqué trouvé sur la page');
        }
        
        // Extrait le lien m3u8 du code désobfusqué
        const m3u8Match = deobfuscatedCode.match(/['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/);
        
        if (m3u8Match) {
            const m3u8Url = m3u8Match[1];
            console.log(`Lien m3u8 extrait: ${m3u8Url}`);
            return m3u8Url;
        } else {
            throw new Error('Aucun lien m3u8 trouvé dans le code désobfusqué');
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'extraction Vidzy:', error);
        return null;
    }
}

module.exports = { getVidzyM3u8Link };
