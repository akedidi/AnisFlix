
import puppeteer from 'puppeteer';

const url = "https://vsembed.ru/embed/movie?tmdb=198471";

async function inspect() {
    console.log(`Launching Stealth Puppeteer for ${url}...`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();

        // rigorous headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://vidsrc.to/'
        });

        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Pass webdriver check
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        console.log("Navigating...");
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        console.log(`Status: ${response.status()}`);

        // Wait for something?
        try {
            await page.waitForSelector('iframe', { timeout: 5000 });
            console.log("Found iframe!");
        } catch (e) {
            console.log("No iframe found in 5s");
        }

        const content = await page.content();
        console.log("--- HTML Content Preview ---");
        console.log(content.substring(0, 2000));

        await page.screenshot({ path: 'vsembed_stealth.png' });

    } catch (e) {
        console.error("Puppeteer Error:", e);
    } finally {
        await browser.close();
    }
}

inspect();
