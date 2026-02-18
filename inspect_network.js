
import puppeteer from 'puppeteer';

async function inspectNetwork() {
    console.log('🕵️‍♂️ Inspecting Bysebuho Network...');
    const url = 'https://bysebuho.com/e/08yulfkjcvd2';

    const browser = await puppeteer.launch({ headless: true }); // Headless true for localized test
    const page = await browser.newPage();

    page.on('request', req => {
        if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
            console.log(`📡 API/XHR: ${req.url()}`);
        }
        if (req.url().includes('.m3u8')) {
            console.log(`🎯 M3U8 FOUND: ${req.url()}`);
        }
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        console.log('✅ Page loaded');
    } catch (e) {
        console.error('❌ Error loading page:', e);
    } finally {
        await browser.close();
    }
}

inspectNetwork();
