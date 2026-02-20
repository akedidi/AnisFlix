
import { VSEmbedExtractor } from '../api/_services/universalvo/extractors/VSEmbedExtractor.js';

(async () => {
    try {
        const url = "https://vsembed.ru/embed/movie?tmdb=198471";
        const extractor = new VSEmbedExtractor();
        const result = await extractor.extract(url);
        console.log("Extraction Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Test Failed:", e);
    }
})();
