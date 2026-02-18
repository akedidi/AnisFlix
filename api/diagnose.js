import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
    try {
        console.log('Running diagnostics...');

        // 1. Check executable path
        const executablePath = await chromium.executablePath();
        console.log(`Executable Path: ${executablePath}`);

        // 2. Launch Browser
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true
        });

        const version = await browser.version();
        console.log(`Browser Version: ${version}`);

        await browser.close();

        res.status(200).json({
            status: 'OK',
            version,
            executablePath,
            chromiumArgs: chromium.args
        });

    } catch (error) {
        console.error('Diagnostic failed:', error);
        res.status(500).json({
            status: 'ERROR',
            message: error.message,
            stack: error.stack,
            details: error.toString()
        });
    }
}
