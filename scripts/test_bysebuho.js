
import { BysebuhoExtractor } from '../api/_services/universalvo/extractors/BysebuhoExtractor.js';

async function test() {
    const extractor = new BysebuhoExtractor();
    const url = 'https://bysebuho.com/e/4m0a4it8eu6q';

    console.log(`🧪 Testing Bysebuho Extractor with: ${url}`);
    const start = Date.now();
    try {
        const result = await extractor.extract(url);
        const duration = Date.now() - start;
        console.log(`✅ Success in ${duration}ms`);
        console.log('📄 Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        const duration = Date.now() - start;
        console.error(`❌ Failed in ${duration}ms`);
        console.error('Error:', e);
    }
}

test();
