const axios = require('axios');

async function testVidMoly() {
    const originalUrl = "http://vidmoly.me/embed-9jzpg877fue1.html";
    console.log(`Testing URL: ${originalUrl}`);

    // Mimic the normalization in existing code
    const normalizedUrl = originalUrl.replace('vidmoly.to', 'vidmoly.net');
    console.log(`Normalized in code: ${normalizedUrl}`);

    // Try fetching the original directly to see where it goes/what it returns
    try {
        console.log("Fetching original URL...");
        const response = await axios.get(originalUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': originalUrl
            },
            maxRedirects: 5,
            validateStatus: () => true // Accept all status codes
        });

        console.log(`Status: ${response.status}`);
        console.log(`Response URL: ${response.request.res.responseUrl}`); // Final URL after redirects

        const html = response.data;
        console.log(`Content Length: ${html.length}`);
        console.log("---------------- HTML START ----------------");
        console.log(html);
        console.log("---------------- HTML END ----------------");

        // Check for Verification Page
        if (html.includes("Select number") && html.includes("vform")) {
            console.log("🔒 Verification page detected. Attempting bypass...");

            // Extract the challenge number
            // <div class="vhint">Select number <b ...>91</b> to watch.</div>
            const numberMatch = html.match(/Select number <b[^>]*>(\d+)<\/b>/);
            if (!numberMatch) throw new Error("Could not find verification number");

            const answer = numberMatch[1];
            console.log(`🔓 Challenge Answer: ${answer}`);

            // Extract form fields
            const op = html.match(/name="op" value="([^"]+)"/)?.[1];
            const file_code = html.match(/name="file_code" value="([^"]+)"/)?.[1];
            const ts = html.match(/name="ts" value="([^"]+)"/)?.[1];
            const nonce = html.match(/name="nonce" value="([^"]+)"/)?.[1];
            const ctok = html.match(/name="ctok" value="([^"]+)"/)?.[1];

            console.log(`Hidden fields: op=${op}, file_code=${file_code}, ts=${ts}, nonce=${nonce}, ctok=${ctok}`);

            // Construct POST data
            const params = new URLSearchParams();
            params.append('op', op);
            params.append('file_code', file_code);
            params.append('ts', ts);
            params.append('nonce', nonce);
            params.append('ctok', ctok);
            params.append('answer', answer);

            console.log("🚀 Submitting verification answer...");

            const postResponse = await axios.post("https://vidmoly.net/embed-9jzpg877fue1.html", params, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://vidmoly.net/embed-9jzpg877fue1.html',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const postHtml = postResponse.data;
            console.log(`✅ Bypass Response Length: ${postHtml.length}`);

            // Now check for file in the new HTML
            const fileMatch = postHtml.match(/file:"([^"]+)"/);
            if (fileMatch) {
                console.log("🎉 SUCCESS! Found m3u8:", fileMatch[1]);
            } else {
                // Try fallback
                const fallback = postHtml.match(/sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/);
                console.log("Fallback search:", fallback ? fallback[1] : "Failed");
                if (!fileMatch && !fallback) console.log("Still no file found. Dumping partial HTML:", postHtml.substring(0, 500));
            }
            return;
        }

        // Scan for patterns
        const fileMatch = html.match(/file:"([^"]+)"/);
        console.log("Pattern [file:\"...\"]: ", fileMatch ? fileMatch[1] : "Not found");

        const sourcesMatch = html.match(/sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/);
        console.log("Pattern [sources: ... file:]: ", sourcesMatch ? sourcesMatch[1] : "Not found");

        const setupMatch = html.match(/player\.setup\s*\(\s*\{[^}]*sources:\s*\[\s*\{\s*file:\s*"([^"]+)"/);
        console.log("Pattern [player.setup ...]: ", setupMatch ? setupMatch[1] : "Not found");

        // Check for packer
        if (html.includes("eval(function(p,a,c,k,e,d)")) {
            console.log("⚠️ Packer detected!");
            const packerMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{.*return p\}\('(.*)',(\d+),(\d+),'(.*)'.split\('\|'\)\)\)/);
            if (packerMatch) {
                console.log("Packer params found, might need deobfuscation.");
            }
        }

        // Dump a snippet of the HTML around "file:" or "sources" if found manually in substring
        const idx = html.indexOf("file:");
        if (idx !== -1) {
            console.log("Snippet around 'file:': ", html.substring(idx, idx + 100));
        } else {
            console.log("'file:' string not found in raw HTML.");
        }

    } catch (e) {
        console.error("Error fetching:", e.message);
    }
}

testVidMoly();
