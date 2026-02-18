
import { FSVidExtractor } from '../api/_services/universalvo/extractors/FSVidExtractor.js';

async function test() {
    console.log("Instantiating Extractor...");
    try {
        const extractor = new FSVidExtractor();
        console.log("Extractor instantiated:", extractor.name);

        const url = "https://fsvid.lol/embed-iepyict7yj59.html";
        console.log("Extracting from:", url);

        const html = await extractor.extract(url).catch(async e => {
            console.log("Extraction failed, but fetching HTML to debug...");
            const fetch = (await import('node-fetch')).default;
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const text = await res.text();
            const evalIndex = text.indexOf('eval(function');
            if (evalIndex !== -1) {
                console.log("Packed Code Snippet:", text.substring(evalIndex, evalIndex + 500));
                console.log("End of string snippet:", text.substring(text.length - 500));
            } else {
                console.log("No eval found in raw fetch");
            }
            throw e;
        });

    } catch (e) {
        console.error("CRASH:", e);
    }
}

test();
