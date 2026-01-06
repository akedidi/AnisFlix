const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// MovieBox API configuration
const MIRROR_HOSTS = [
    "h5.aoneroom.com",
    "movieboxapp.in",
    "moviebox.pk",
    "moviebox.ph",
    "moviebox.id",
    "v.moviebox.ph",
    "netnaija.video"
];

// Use different hosts for different endpoints - some mirrors work better for downloads
const SELECTED_HOST = process.env.MOVIEBOX_API_HOST || "h5.aoneroom.com";
const HOST_URL = `https://${SELECTED_HOST}`;

// Alternative hosts for download endpoint
const DOWNLOAD_MIRRORS = [
    "moviebox.pk",
    "moviebox.ph",
    "moviebox.id",
    "v.moviebox.ph",
    "h5.aoneroom.com"
];

// Updated headers based on mobile app traffic analysis from PCAP + region bypass
const DEFAULT_HEADERS = {
    'X-Client-Info': '{"timezone":"Africa/Nairobi"}',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json',
    'User-Agent': 'okhttp/4.12.0', // Mobile app user agent from PCAP
    'Referer': HOST_URL,
    'Host': SELECTED_HOST,
    'Connection': 'keep-alive',
    // Add IP spoofing headers to bypass region restrictions
    'X-Forwarded-For': '1.1.1.1',
    'CF-Connecting-IP': '1.1.1.1',
    'X-Real-IP': '1.1.1.1'
};

// Subject types
const SubjectType = {
    ALL: 0,
    MOVIES: 1,
    TV_SERIES: 2,
    MUSIC: 6
};

// Session management - using axios cookie jar for proper session handling
const jar = new CookieJar();
const axiosInstance = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 30000
}));

let movieboxAppInfo = null;
let cookiesInitialized = false;

// Helper functions
function processApiResponse(response) {
    if (response.data && response.data.data) {
        return response.data.data;
    }
    return response.data || response;
}

async function ensureCookiesAreAssigned() {
    if (!cookiesInitialized) {
        try {
            console.log('Initializing session cookies...');
            const response = await axiosInstance.get(`${HOST_URL}/wefeed-h5-bff/app/get-latest-app-pkgs?app_name=moviebox`, {
                headers: DEFAULT_HEADERS
            });

            movieboxAppInfo = processApiResponse(response);
            cookiesInitialized = true;
            console.log('Session cookies initialized successfully');

            // Log available cookies for debugging
            if (response.headers['set-cookie']) {
                console.log('Received cookies:', response.headers['set-cookie']);
            }

        } catch (error) {
            console.error('Failed to get app info:', error.message);
            throw error;
        }
    }
    return cookiesInitialized;
}

async function makeApiRequest(url, options = {}) {
    await ensureCookiesAreAssigned();

    const config = {
        url: url,
        headers: { ...DEFAULT_HEADERS, ...options.headers },
        withCredentials: true,
        ...options
    };

    try {
        const response = await axiosInstance(config);
        return response;
    } catch (error) {
        console.error(`Request to ${url} failed:`, error.response?.status, error.response?.statusText);
        throw error;
    }
}

async function makeApiRequestWithCookies(url, options = {}) {
    await ensureCookiesAreAssigned();

    const config = {
        url: url,
        headers: { ...DEFAULT_HEADERS, ...options.headers },
        withCredentials: true,
        ...options
    };

    try {
        const response = await axiosInstance(config);
        return response;
    } catch (error) {
        console.error(`Request with cookies to ${url} failed:`, error.response?.status, error.response?.statusText);
        throw error;
    }
}

// API Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'MovieBox API Scraper - Test Server',
        endpoints: [
            'GET /api/search/:query',
            'GET /api/info/:movieId',
            'GET /api/sources/:movieId'
        ]
    });
});

// Search movies and TV series
app.get('/api/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 24;
        const subjectType = parseInt(req.query.type) || SubjectType.ALL;

        console.log(`Searching for: ${query}`);

        const payload = {
            keyword: query,
            page,
            perPage,
            subjectType
        };

        const response = await makeApiRequestWithCookies(`${HOST_URL}/wefeed-h5-bff/web/subject/search`, {
            method: 'POST',
            data: payload
        });

        let content = processApiResponse(response);

        // Filter results by subject type if specified
        if (subjectType !== SubjectType.ALL && content.items) {
            content.items = content.items.filter(item => item.subjectType === subjectType);
        }

        // Enhance each item with easily accessible thumbnail
        if (content.items) {
            content.items.forEach(item => {
                if (item.cover && item.cover.url) {
                    item.thumbnail = item.cover.url;
                }
                if (item.stills && item.stills.url && !item.thumbnail) {
                    item.thumbnail = item.stills.url;
                }
            });
        }

        console.log(`Found ${content.items?.length || 0} results`);

        res.json({
            status: 'success',
            data: content
        });
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search content',
            error: error.message
        });
    }
});

// Get movie/series detailed information
app.get('/api/info/:movieId', async (req, res) => {
    try {
        const { movieId } = req.params;

        console.log(`Getting info for movie ID: ${movieId}`);

        const response = await makeApiRequestWithCookies(`${HOST_URL}/wefeed-h5-bff/web/subject/detail`, {
            method: 'GET',
            params: { subjectId: movieId }
        });

        const content = processApiResponse(response);

        // Add easily accessible thumbnail URLs
        if (content.subject) {
            if (content.subject.cover && content.subject.cover.url) {
                content.subject.thumbnail = content.subject.cover.url;
            }
            if (content.subject.stills && content.subject.stills.url && !content.subject.thumbnail) {
                content.subject.thumbnail = content.subject.stills.url;
            }
        }

        console.log(`Got info for: ${content.subject?.title || 'unknown'}`);

        res.json({
            status: 'success',
            data: content
        });
    } catch (error) {
        console.error('Info error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch movie/series info',
            error: error.message
        });
    }
});

// Get streaming sources/download links
app.get('/api/sources/:movieId', async (req, res) => {
    try {
        const { movieId } = req.params;
        const season = parseInt(req.query.season) || 0;
        const episode = parseInt(req.query.episode) || 0;

        console.log(`Getting sources for movie ID: ${movieId}, season: ${season}, episode: ${episode}`);

        // First get movie details
        const infoResponse = await makeApiRequestWithCookies(`${HOST_URL}/wefeed-h5-bff/web/subject/detail`, {
            method: 'GET',
            params: { subjectId: movieId }
        });

        const movieInfo = processApiResponse(infoResponse);
        const detailPath = movieInfo?.subject?.detailPath;

        if (!detailPath) {
            throw new Error('Could not get movie detail path');
        }

        const refererUrl = `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${movieId}&type=/movie/detail`;

        const params = {
            subjectId: movieId,
            se: season,
            ep: episode
        };

        const response = await makeApiRequestWithCookies(`${HOST_URL}/wefeed-h5-bff/web/subject/download`, {
            method: 'GET',
            params,
            headers: {
                'Referer': refererUrl,
                'Origin': 'https://fmoviesunblocked.net',
                'X-Forwarded-For': '1.1.1.1',
                'CF-Connecting-IP': '1.1.1.1',
                'X-Real-IP': '1.1.1.1'
            }
        });

        const content = processApiResponse(response);

        console.log(`Found ${content.downloads?.length || 0} download sources`);

        res.json({
            status: 'success',
            data: content
        });
    } catch (error) {
        console.error('Sources error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch streaming sources',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎬 MovieBox API Test Server running on http://localhost:${PORT}`);
    console.log(`\nTest endpoints:`);
    console.log(`  - Search: http://localhost:${PORT}/api/search/avatar`);
    console.log(`  - Info: http://localhost:${PORT}/api/info/{movieId}`);
    console.log(`  - Sources: http://localhost:${PORT}/api/sources/{movieId}\n`);
});

module.exports = app;
