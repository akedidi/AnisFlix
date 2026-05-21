import { HEADERS } from './constants.js';
import { fetchText } from './utils.js';

export function unpack(code) {
  try {
    const match = code.match(
      /}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/
    );
    if (!match) return code;

    let [, , p, a, c, , kStr] = match;
    p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    a = parseInt(a, 10);
    c = parseInt(c, 10);
    const k = kStr.split('|');
    const e = (c2) =>
      (c2 < a ? '' : e(parseInt(c2 / a, 10))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
    const d = {};
    while (c--) d[e(c)] = k[c] || e(c);
    return p.replace(/\b\w+\b/g, (w) => d[w]);
  } catch (e) {
    console.error('[AnimePahe] Unpack error:', e.message);
  }
  return code;
}

export async function extractKwik(url) {
  try {
    const html = await fetchText(url, {
      headers: {
        ...HEADERS,
        Referer: url,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      useProxy: false,
    });

    const scripts = html.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
    const matches = [];

    for (const script of scripts) {
      if (!script.includes('eval(function(p,a,c,k,e,d)')) continue;
      let pos = 0;
      while (true) {
        const start = script.indexOf('eval(function(p,a,c,k,e,d)', pos);
        if (start === -1) break;
        const end = script.indexOf('.split(\'|\')', start);
        if (end === -1) break;
        const closeParen = script.indexOf('))', end);
        if (closeParen === -1) break;
        matches.push(script.substring(start, closeParen + 2));
        pos = closeParen + 2;
      }
    }

    for (const scriptContent of matches) {
      const unpacked = unpack(scriptContent);
      const urlMatch =
        unpacked.match(/source\s*=\s*['"](https?:\/\/.*?)['"]/) ||
        unpacked.match(/const\s+source\s*=\s*['"](https?:\/\/.*?)['"]/) ||
        unpacked.match(/var\s+source\s*=\s*['"](https?:\/\/.*?)['"]/) ||
        unpacked.match(/src\s*:\s*['"](https?:\/\/.*?)['"]/);
      if (urlMatch) {
        return {
          url: urlMatch[1],
          headers: {
            Referer: 'https://kwik.cx/',
            Origin: 'https://kwik.cx',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        };
      }
    }
  } catch (e) {
    console.error('[AnimePahe] Kwik extraction failed:', e.message);
  }
  return null;
}
