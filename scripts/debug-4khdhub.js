
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { FourKHDHubScraper } from '../api/_services/fourkhdhub/index.js';

async function test() {
    const scraper = new FourKHDHubScraper();

    console.log("--- DEBUG START ---");

    // Test 1: Predator (Movie)
    console.log("\nTesting Movie: Predator: Badlands (2025)");

    const baseUrl = await scraper.getBaseUrl();
    const searchUrl = `${baseUrl}/?s=Predator%20Badlands%202025`;
    console.log(`Manual Fetch: ${searchUrl}`);

    // 1. Search
    const searchRes = await axios.get(searchUrl, { headers: { 'User-Agent': scraper.userAgent } });
    const $s = cheerio.load(searchRes.data);
    let link = $s('.movie-card').first().attr('href');

    console.log(`Manual Link (Original): ${link}`);

    if (link) {
        if (link.startsWith('/')) {
            link = `${baseUrl}${link}`;
        }
        console.log(`Manual Link (Resolved): ${link}`);

        // 2. Page
        const pageRes = await axios.get(link, { headers: { 'User-Agent': scraper.userAgent } });
        console.log(`Page HTML Length: ${pageRes.data.length}`);

        fs.writeFileSync('debug_page.html', pageRes.data);
        console.log("Dumped debug_page.html");

        const $p = cheerio.load(pageRes.data);
        const downloadItems = $p('.download-item');
        console.log(`.download-item count: ${downloadItems.length}`);

        downloadItems.each((i, el) => {
            const text = $p(el).text().replace(/\s+/g, ' ').trim();
            console.log(`Item ${i}: ${text.substring(0, 100)}...`);
        });

        // Log all links to see if HubCloud is hidden or renamed
        let hubCloudCount = 0;
        $p('a').each((i, el) => {
            const href = $p(el).attr('href');
            const text = $p(el).text();
            if (text.includes('HubCloud') || (href && href.includes('hubcloud'))) {
                console.log("Found HubCloud link:", href);
                hubCloudCount++;
            }
        });
        console.log(`Total HubCloud links found manually: ${hubCloudCount}`);
    }

    // Also run the scraper's standard method
    const movieStreams = await scraper.getStreams(0, 'movie', null, null, { title: 'Predator Badlands', year: '2025' });
    console.log("Movie Streams via Scraper:", JSON.stringify(movieStreams, null, 2));

    console.log("-------------------");
}

test();
