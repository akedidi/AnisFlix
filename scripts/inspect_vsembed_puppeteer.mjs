
import puppeteer from 'puppeteer';

const url = "https://vsembed.ru/embed/movie?tmdb=198471";

async function inspect() {
    console.log(`Launching Puppeteer for ${url}...`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        console.log("Navigating...");
        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        console.log(`Status: ${response.status()}`);
        const content = await page.content();

        console.log("--- HTML Content Preview ---");
        console.log(content.substring(0, 2000));

        // Screenshot for debugging
        await page.screenshot({ path: 'vsembed_debug.png' });
        console.log("Saved screenshot to vsembed_debug.png");

        // Extract iframe src
        const iframeSrc = await page.evaluate(() => {
            const iframe = document.querySelector('iframe');
            return iframe ? iframe.src : null;
        });

        if (iframeSrc) {
            console.log(`\nFound Iframe Source: ${iframeSrc}`);
            // Recurse?
        }

    } catch (e) {
        console.error("Puppeteer Error:", e);
    } finally {
        await browser.close();
    }
}

inspect();
