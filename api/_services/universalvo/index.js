import { getTwoEmbed } from './providers/TwoEmbed.js';
import { getPrimewire } from './providers/PrimeWire.js';
import { ErrorObject } from './helpers/ErrorObject.js';
import { getMovieFromTmdb, getTvFromTmdb } from './helpers/tmdb.js';
import { processApiResponse } from './utils/proxyserver.js';
import { strings } from './strings.js';

const shouldDebug = process.env.NODE_ENV !== 'production'; // Use env var instead of argv

function checkIfPossibleTmdbId(id) {
    if (!id) return false;
    // Basic check: numeric string
    return /^\d+$/.test(String(id));
}

function handleErrorResponse(res, errorObject) {
    const status = errorObject.responseCode || 500;
    const jsonEncoded = errorObject.toJSON();
    return res.status(status).json(jsonEncoded);
}

export async function scrapeMedia(media) {
    if (shouldDebug) {
        console.log(`Work starts now for media...`);
    }
    // Timeout helper to prevent slow providers from blocking
    const withTimeout = (promise, timeoutMs = 9500) => {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Provider timeout')), timeoutMs)
            )
        ]);
    };

    const providers = [
        // { TwoEmbed: () => getTwoEmbed(media) }, // Disabled to reduce timeouts
        { Primewire: () => getPrimewire(media) }
    ];

    const results = await Promise.all(
        providers.map(async (provider) => {
            const providerName = Object.keys(provider)[0];

            try {
                const data = await withTimeout(provider[providerName](), 9500);
                return {
                    data: data,
                    provider: providerName
                };
            } catch (e) {
                if (shouldDebug) {
                    console.log(`[${providerName}] Failed: ${e.message}`);
                }
                return { data: null, provider: providerName };
            }
        })
    );

    const files = results
        .filter(
            ({ data }) =>
                data && !(data instanceof Error || data instanceof ErrorObject)
        )
        .flatMap(({ data, provider }) =>
            (Array.isArray(data.files) ? data.files : [data.files]).map(
                (file) => ({
                    ...file,
                    provider: provider
                })
            )
        )
        .filter(
            (file, index, self) =>
                file &&
                file.file &&
                typeof file.file === 'string' &&
                file.file.includes('https://') &&
                self.findIndex((f) => f.file === file.file) === index
        );

    // Build final result without subtitles
    let finalResult;
    // Build final result
    // Always include errors for debugging "no results" issues
    let errors = results
        .filter(
            ({ data }) =>
                data instanceof Error || data instanceof ErrorObject || data === null
        )
        .map(({ data, provider }) => {
            if (data instanceof ErrorObject) return { provider, ...data.toJSON() };
            if (data instanceof Error) return { provider, message: data.message, stack: data.stack };
            return { provider, message: 'Unknown error (null data)' };
        });

    finalResult = { files, errors };

    return finalResult;
}

export async function handleUniversalVO(req, res) {
    const { tmdbId, type, season, episode } = req.query;

    if (!tmdbId || !checkIfPossibleTmdbId(tmdbId)) {
        return handleErrorResponse(
            res,
            new ErrorObject(
                strings.INVALID_MOVIE_ID,
                'user',
                400,
                strings.INVALID_MOVIE_ID_HINT,
                true,
                false
            )
        );
    }

    let media;
    if (type === 'movie') {
        media = await getMovieFromTmdb(tmdbId);
    } else if (type === 'tv') {
        if (!season || !episode || !checkIfPossibleTmdbId(season) || !checkIfPossibleTmdbId(episode)) {
            return handleErrorResponse(
                res,
                new ErrorObject(
                    strings.INVALID_TV_ID,
                    'user',
                    400,
                    strings.INVALID_TV_ID_HINT,
                    true,
                    false
                )
            );
        }
        media = await getTvFromTmdb(tmdbId, season, episode);
    } else {
        return res.status(400).json({ error: 'Invalid or missing type' });
    }

    if (media instanceof ErrorObject) {
        return handleErrorResponse(res, media);
    }

    const output = await scrapeMedia(media);
    if (output instanceof ErrorObject) {
        return handleErrorResponse(res, output);
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'];
    const serverUrl = `${protocol}://${host}`;
    const processedOutput = processApiResponse(output, serverUrl);

    return res.status(200).json(processedOutput);
}
