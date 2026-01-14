import axios from 'axios';

async function checkConnectivity() {
    const urls = [
        'https://api.movix.blog/api/search?title=test',
        'https://api.movix.blog/anime/search/test'
    ];

    console.log('--- Checking Movix Connectivity ---');

    for (const url of urls) {
        try {
            console.log(`\nTesting: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://movix.site/',
                    'Origin': 'https://movix.site'
                },
                timeout: 10000,
                validateStatus: null // accept all
            });

            console.log(`Status: ${response.status} ${response.statusText}`);
            if (response.status === 502) {
                if (typeof response.data === 'string') {
                    console.log('Body Preview:', response.data.substring(0, 100));
                    console.log('Is Nginx Error?', response.data.includes('nginx'));
                } else {
                    console.log('Body data type:', typeof response.data);
                }
            }
        } catch (error) {
            console.error('Connection Failed:', error.message);
            if (error.code) console.error('Error Code:', error.code);
        }
    }
}

checkConnectivity();
