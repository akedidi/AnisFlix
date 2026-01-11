
import puppeteer from 'puppeteer';
// import chromium from '@sparticuz/chromium';

// Test URL that was failing (from user logs)
// Using a verified working URL from logs or generic test
const TEST_URL = 'https://hubcloud.foo/drive/ygvmlxyq1doomvw';

async function testPuppeteer() {
    console.log('🚀 Starting Puppeteer Test (Standard)...');

    try {
        const browser = await puppeteer.launch({
            headless: false, // Visible for debugging
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

        console.log(`⬇️ Navigating to: ${TEST_URL}`);
        await page.goto(TEST_URL, { waitUntil: 'networkidle2' });

        const content = await page.content();
        const title = await page.title();

        console.log(`✅ Page Title: ${title}`);
        console.log(`📄 Content Length: ${content.length}`);

        if (content.includes('403 Forbidden') || content.includes('Cloudflare')) {
            console.warn('⚠️ Cloudflare/403 detected in content!');
        } else {
            console.log('✅ Access seems successful (no 403 text found).');
            // Check for redirect URL
            const url = page.url();
            console.log(`🔗 Final URL: ${url}`);
        }

        await browser.close();

    } catch (error) {
        console.error('❌ Puppeteer Error:', error);
    }
}

testPuppeteer();
