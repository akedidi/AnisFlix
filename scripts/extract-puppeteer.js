import puppeteer from 'puppeteer';

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set consistent User-Agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    const imdbId = 'tt0499549';
    const baseUrl = `https://multiembed.mov/?video_id=${imdbId}`;

    console.log(`Navigating to ${baseUrl}`);

    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Click the play button logic if needed, or wait for load_sources
        // Multiembed usually has a click-to-play overlay
        try {
            const playBtn = await page.waitForSelector('.play-btn', { timeout: 5000 });
            if (playBtn) {
                console.log('Clicking play button...');
                await playBtn.click();
            }
        } catch (e) { console.log('No play button found or timeout, proceeding...'); }

        // Wait for streamingnow response or iframe
        // Actually, we can just look for the list items with vipstream
        console.log('Waiting for sources list...');
        await page.waitForSelector('li[data-server]', { timeout: 10000 });

        const sources = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('li[data-server]'));
            return items.map(li => ({
                name: li.textContent.trim(),
                server: li.getAttribute('data-server'),
                id: li.getAttribute('data-id'),
                class: li.className
            })).filter(s => s.name.toLowerCase().includes('vipstream'));
        });

        console.log(`Found ${sources.length} VIP sources.`);

        for (const source of sources) {
            console.log(`\n--- Processing ${source.name} ---`);
            // Click the source to load it into the iframe
            // We need to find the element again handle handle click
            await page.evaluate((serverId) => {
                const el = document.querySelector(`li[data-server="${serverId}"]`);
                if (el) el.click();
            }, source.server);

            // Wait for iframe update
            await new Promise(r => setTimeout(r, 2000));

            // Get iframe src
            const iframeSrc = await page.evaluate(() => {
                const iframe = document.querySelector('iframe.source-frame.show') || document.querySelector('iframe.source-frame');
                return iframe ? iframe.src : null;
            });

            if (iframeSrc) {
                console.log(`Iframe URL: ${iframeSrc}`);

                // Navigate a new page to the iframe src to handle hunter/decoding
                const iframePage = await browser.newPage();
                await iframePage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
                await iframePage.goto(iframeSrc, { waitUntil: 'domcontentloaded' });

                // Extract possible video URL from window or content
                const content = await iframePage.content();

                // Check for file: "..." regex
                const fileMatch = content.match(/file\s*:\s*"([^"]+)"/);
                if (fileMatch) {
                    console.log(`>> Video URL (Direct): ${fileMatch[1]}`);
                } else {
                    // Try hunter?
                    const hunterMatch = content.match(/\(\s*function\s*\([^\)]*\)\s*\{[\s\S]*?\}\s*\(\s*(.*?)\s*\)\s*\)/);
                    if (hunterMatch) {
                        console.log('>> Hunter pack detected. Attempting decode...');
                        // We can evaluate decoding in browser context!
                        // Need to reconstruct the decoder function script? 
                        // Or just see if the page decoded it and put it in JWPlayer config?
                        const config = await iframePage.evaluate(() => {
                            // checks for common player setups
                            if (window.jwplayer && window.jwplayer().getConfig) return window.jwplayer().getConfig().file;
                            return null;
                        });
                        if (config) console.log(`>> Video URL (JW): ${config}`);
                    }
                }

                await iframePage.close();
            } else {
                console.log('No iframe found after click.');
            }
        }

    } catch (e) {
        console.error('Puppeteer block:', e.message);
    } finally {
        await browser.close();
    }
})();
