import axios from 'axios';

async function debugVidmoly() {
    const url = 'http://vidmoly.me/embed-c6be5tm78jdb.html';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://vidmoly.to/'
    };

    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, { headers });
        const html = response.data;

        console.log('Status:', response.status);
        console.log('HTML Length:', html.length);

        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
        console.log('Simple Regex Match:', fileMatch ? fileMatch[1] : 'NONE');

        if (html.includes('startLoading')) {
            console.log('Detected Click-to-Play gating.');
            const tokenMatch = html.match(/url\s*\+=\s*['"]\?g=([^'"]+)['"]/);
            if (tokenMatch) {
                const token = tokenMatch[1];
                console.log(`Extracted token: ${token}`);
                const newUrl = `${url}?g=${token}`;
                console.log(`Refetching: ${newUrl}`);

                const response2 = await axios.get(newUrl, { headers });
                const html2 = response2.data;
                console.log('Status 2:', response2.status);
                console.log('HTML 2 Length:', html2.length);

                const fileMatch2 = html2.match(/file\s*:\s*["']([^"']+)["']/i);
                console.log('Simple Regex Match (2):', fileMatch2 ? fileMatch2[1] : 'NONE');

                const sourcesMatch2 = html2.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i);
                console.log('Sources Regex Match (2):', sourcesMatch2 ? sourcesMatch2[1] : 'NONE');

                if (html2.includes('eval(function(p,a,c,k,e,d)')) {
                    console.log('PACKED JS DETECTED in 2nd request!');
                }
            } else {
                console.log('Could not extract token.');
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugVidmoly();
