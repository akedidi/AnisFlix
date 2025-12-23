import axios from 'axios';
import { strings } from '../strings.js';
import { ErrorObject } from './ErrorObject.js';

// Use process.env directly instead of dotenv
const apiKey = process.env.TMDB_API_KEY || "68e094699525b18a70bab2f86b1fa706"; // Fallback to key found in other files if env is missing

/**
 * Fetches movie information from TMDB API using the movie ID
 * @param {string|number} tmdb_id - The TMDB ID of the movie
 * @returns {Promise<Object|ErrorObject>} Object containing movie information or Error if any part of the request fails
 */
export async function getMovieFromTmdb(tmdb_id) {
    try {
        const url = `https://api.themoviedb.org/3/movie/${tmdb_id}?api_key=${apiKey}`;
        const response = await axios.get(url, { validateStatus: status => status < 500 });
        if (response.status !== 200) {
            return new ErrorObject(
                strings.INVALID_MOVIE_ID,
                'user',
                404,
                strings.INVALID_MOVIE_ID_HINT,
                true,
                false
            );
        }
        const data = response.data;

        let secondData = await axios.get(
            `https://api.themoviedb.org/3/movie/${tmdb_id}/external_ids?api_key=${apiKey}`,
            { validateStatus: status => status < 500 }
        );
        if (secondData.status !== 200) {
            return new ErrorObject(
                strings.INVALID_MOVIE_ID,
                'user',
                404,
                strings.INVALID_MOVIE_ID_HINT,
                true,
                false
            );
        }
        const externalIds = secondData.data;

        return {
            type: 'movie',
            title: data.original_title,
            name: data.original_title,
            releaseYear: Number(data.release_date.split('-')[0]),
            tmdb: tmdb_id,
            imdb: externalIds.imdb_id
        };
    } catch (e) {
        return new ErrorObject(
            'An error occurred' + e,
            'backend',
            500,
            undefined,
            true,
            true
        );
    }
}

/**
 * Fetches TV show episode information from TMDB API
 * @param {string|number} tmdb_id - The TMDB ID of the TV show
 * @param {string|number} season - Season number
 * @param {string|number} episode - Episode number
 * @returns {Promise<Object|ErrorObject>} Object containing episode information or Error if any part of the request fails
 */
export async function getTvFromTmdb(tmdb_id, season, episode) {
    try {
        const url = `https://api.themoviedb.org/3/tv/${tmdb_id}/season/${season}/episode/${episode}?api_key=${apiKey}&append_to_response=external_ids`;
        const response = await axios.get(url, { validateStatus: status => status < 500 });
        if (response.status !== 200) {
            return new ErrorObject(
                strings.INVALID_TV_ID,
                'user',
                404,
                strings.INVALID_TV_ID_HINT,
                true,
                false
            );
        }
        const data = response.data;

        let secondData = await axios.get(
            `https://api.themoviedb.org/3/tv/${tmdb_id}?api_key=${apiKey}`,
            { validateStatus: status => status < 500 }
        );
        if (secondData.status !== 200) {
            return new ErrorObject(
                strings.INVALID_TV_ID,
                'user',
                404,
                strings.INVALID_TV_ID_HINT,
                true,
                false
            );
        }
        const showData = secondData.data;
        let title = showData.name;

        let thirdData = await axios.get(
            `https://api.themoviedb.org/3/tv/${tmdb_id}/external_ids?api_key=${apiKey}`,
            { validateStatus: status => status < 500 }
        );
        if (thirdData.status !== 200) {
            return new ErrorObject(
                strings.INVALID_TV_ID,
                'user',
                404,
                strings.INVALID_TV_ID_HINT,
                true,
                false
            );
        }
        const externalIds = thirdData.data;

        return {
            type: 'tv',
            name: title,
            releaseYear: data.air_date ? data.air_date.split('-')[0] : '0000',
            tmdb: tmdb_id,
            imdb: externalIds.imdb_id,
            season: season,
            episode: episode,
            episodeName: data.name
        };
    } catch (e) {
        return new ErrorObject(
            'An error occurred' + e,
            'backend',
            500,
            undefined,
            true,
            true
        );
    }
}
