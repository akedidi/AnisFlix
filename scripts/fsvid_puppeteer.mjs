import puppeteer from 'puppeteer-core';

// Tente de trouver Chrome sur Mac
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = 'https://fsvid.lol/embed-iepyict7yj59.html';

(async () => {
    let browser;
    try {
        console.log(`🚀 Launching Browser (${executablePath})...`);
        browser = await puppeteer.launch({
            executablePath,
            headless: false, // Mode visible pour voir ce qui se passe
            defaultViewport: null,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Intercept network requests to find .m3u8
        const m3u8Urls = [];
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const reqUrl = request.url();
            if (reqUrl.includes('.m3u8')) {
                console.log(`🎯 Request Found: ${reqUrl}`);
                m3u8Urls.push(reqUrl);
            }
            request.continue();
        });

        // Set Headers
        await page.setExtraHTTPHeaders({
            'Referer': 'https://french-stream.one/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        console.log(`📡 Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        console.log('⏳ Waiting 5s for player...');
        await new Promise(r => setTimeout(r, 5000));

        // Scan page content
        const m3u8FromPage = await page.evaluate(() => {
            // Check common player variable names
            const sources = [
                window.jwplayer && window.jwplayer().getPlaylistItem()?.file,
                window.player && window.player.src,
                window.videoUrl,
                window.hlsUrl,
            ];
            // Look in all script tags
            const scripts = Array.from(document.querySelectorAll('script'));
            for (const script of scripts) {
                const match = script.textContent.match(/(https:\/\/[^"']+\.m3u8[^"']*)/);
                if (match) {
                    sources.push(match[1]);
                }
            }
            return sources.filter(Boolean)[0];
        });

        if (m3u8FromPage) {
            console.log(`✅ Should be valid M3U8 from Page: ${m3u8FromPage}`);
            m3u8Urls.push(m3u8FromPage);
        }

        console.log('\n--- Extraction Results ---');
        if (m3u8Urls.length > 0) {
            console.log('✅ Found M3U8 URLs:', m3u8Urls);
        } else {
            console.error('❌ No M3U8 found.');
        }

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        if (browser) {
            // await browser.close(); // Commenté pour laisser le navigateur ouvert pour debug
            console.log('Browser left open for inspection. Press Ctrl+C to exit.');
        }
    }
})();
