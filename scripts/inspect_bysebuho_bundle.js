
import fs from 'fs';

async function inspect() {
    try {
        console.log('🔍 Fetching index.js to find video bundle...');
        // 1. Fetch index.js (using the one I know exists or fetching fresh)
        // I will use the one I downloaded or fetch fresh to be sure
        const indexUrl = 'https://bysebuho.com/assets/index-XM1mlhAd.js'; // This might change, better to find it from HTML if we want robuustness, but for now use what we know or fetch HTML first.

        // Let's fetch HTML first to get current index.js hash
        const htmlResp = await fetch('https://bysebuho.com/e/4m0a4it8eu6q', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = await htmlResp.text();
        const scriptMatch = html.match(/src="\/assets\/index-([^"]+)\.js"/);
        if (!scriptMatch) {
            console.error('❌ Could not find index.js in HTML');
            return;
        }
        const indexScript = `https://bysebuho.com/assets/index-${scriptMatch[1]}.js`;
        console.log(`✅ Found index script: ${indexScript}`);

        const indexResp = await fetch(indexScript);
        const indexCode = await indexResp.text();

        // 2. Find videoPagesBundle
        // Look for: import("./videoPagesBundle-DMt_MVdw.js")
        const bundleMatch = indexCode.match(/import\s*\(\"\.\/(videoPagesBundle-[^\"]+\.js)\"\)/);
        if (!bundleMatch) {
            console.error('❌ Could not find videoPagesBundle import in index.js');
            // Try fallback search
            const fallbackMatch = indexCode.match(/videoPagesBundle-[a-zA-Z0-9_-]+\.js/);
            if (fallbackMatch) {
                console.log(`⚠️ Found bundle name via fallback: ${fallbackMatch[0]}`);
            } else {
                return;
            }
        }

        const bundleName = bundleMatch ? bundleMatch[1] : indexCode.match(/videoPagesBundle-[a-zA-Z0-9_-]+\.js/)[0];
        const bundleUrl = `https://bysebuho.com/assets/${bundleName}`;
        console.log(`✅ Found video bundle: ${bundleUrl}`);

        // 3. Fetch Bundle
        const bundleResp = await fetch(bundleUrl);
        const bundleCode = await bundleResp.text();

        console.log(`📄 Bundle size: ${bundleCode.length} bytes`);
        fs.writeFileSync('bysebuho_video_bundle.js', bundleCode);
        console.log('💾 Saved to bysebuho_video_bundle.js');

        // 4. Search for operations
        // Look for objects with "operation" property
        // regex: operation\s*:\s*["']([^"']+)["']
        const operations = [];
        const opRegex = /operation\s*:\s*["']([^"']+)["']/g;
        let match;
        while ((match = opRegex.exec(bundleCode)) !== null) {
            operations.push(match[1]);
        }

        console.log('🔎 Found API Operations:', operations);

    } catch (e) {
        console.error('Error:', e);
    }
}

inspect();
