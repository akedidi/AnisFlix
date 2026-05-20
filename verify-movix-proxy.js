import handler from './api/movix-proxy/index.js';

async function runTest() {
    console.log('--- Testing Movix Proxy Import ---');

    // Mock Request and Response
    const req = {
        method: 'GET',
        query: {
            path: 'universalvo',
            tmdbId: '1223601',
            type: 'movie'
        },
        url: '/api/movix-proxy?path=universalvo&tmdbId=1223601&type=movie',
        headers: {
            host: 'localhost:3000'
        },
        get: function (header) {
            return this.headers[header.toLowerCase()];
        }
    };

    const res = {
        statusCode: 200,
        headers: {},
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            console.log(`Response Status: ${this.statusCode}`);
            if (this.statusCode === 500) {
                console.error('Error:', JSON.stringify(data, null, 2));
            } else {
                console.log('Success (files found):', data.files ? data.files.length : 0);
            }
            return this;
        },
        setHeader: function (key, value) {
            this.headers[key] = value;
        },
        end: function (data) {
            console.log('Response ended:', data);
        }
    };

    try {
        await handler(req, res);
    } catch (err) {
        console.error('CRITICAL: Handler execution failed:', err);
    }
}

runTest();
