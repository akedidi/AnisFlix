
import { BysebuhoExtractor } from './api/_services/universalvo/extractors/BysebuhoExtractor.js';
import { FSVidExtractor } from './api/_services/universalvo/extractors/FSVidExtractor.js';

async function test() {
    console.log('🧪 Testing Extractors...');

    const bysebuhoUrl = 'https://bysebuho.com/e/08yulfkjcvd2';
    // const fsvidUrl = '...'; 

    try {
        console.log('\n--- Testing Bysebuho ---');
        const extractor = new BysebuhoExtractor();
        const result = await extractor.extract(bysebuhoUrl);
        console.log('✅ Result:', result);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

test();
