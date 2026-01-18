
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// MOCK: Because we are running locally, we need to handle the Puppeteer launch slightly differently
// if we want to use the local Chrome install vs @sparticuz/chromium which is for Lambda.
// However, the user might have standard puppeteer installed. 
// Let's try to use standard puppeteer if available, or fall back to core + executable path.

const TMDB_ID = '1242898'; // Predator: Badlands
const TYPE = 'movie'; // movie
const TITLE = 'Predator: Badlands';
const YEAR = '2025';
const ORIGINAL_TITLE = 'Predator: Badlands';

const BASE_URL = 'https://afterdark.mom/api/sources';

async function run() {
    console.log("🚀 Starting AfterDark Local Test...");

    // Construct URL Params
    const params = new URLSearchParams();
    params.append('tmdbId', TMDB_ID);
    if (TITLE) params.append('title', TITLE);
    if (TYPE === 'movie') {
        if (YEAR) params.append('year', YEAR);
        if (ORIGINAL_TITLE) params.append('originalTitle', ORIGINAL_TITLE);
    }
    const targetUrl = `${BASE_URL}/${TYPE === 'movie' ? 'movies' : 'shows'}?${params.toString()}`;

    console.log(`🎯 Target URL: ${targetUrl}`);

    let browser = null;
    try {
        console.log("🎭 Launching Puppeteer...");

        // Try to find a local Chrome/Chromium
        // We will try using standard puppeteer launch first if installed, or fallback
        const launchOptions = {
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        };

        // Try to locate Chrome on macOS
        const possiblePaths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/usr/bin/chromium'
        ];

        const fs = require('fs');
        let executablePath = possiblePaths.find(p => fs.existsSync(p));

        if (executablePath) {
            console.log(`💻 Found local Chrome at: ${executablePath}`);
            launchOptions.executablePath = executablePath;
        } else {
            console.log("⚠️ Could not find local Chrome, hoping puppeteer-core finds it or fails.");
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        // Set Headers mirroring production
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://afterdark.mom/',
            'Origin': 'https://afterdark.mom',
            'Accept': '*/*'
        });

        console.log("Requesting page...");
        const response = await page.goto(targetUrl, {
            waitUntil: 'networkidle2', // Wait for content
            timeout: 30000
        });

        const status = response.status();
        console.log(`📡 Response Status: ${status}`);

        const body = await response.text();
        console.log(`📄 Body Preview: ${body.substring(0, 200)}...`);

        try {
            const json = JSON.parse(body);
            if (Array.isArray(json)) {
                console.log(`✅ Success! Found ${json.length} sources.`);
                console.log(JSON.stringify(json, null, 2));
            } else {
                console.log("⚠️ Response is not an array (unexpected format).");
            }
        } catch (e) {
            console.log("❌ Failed to parse JSON response.");
        }

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    } finally {
        if (browser) await browser.close();
    }
}

run();
