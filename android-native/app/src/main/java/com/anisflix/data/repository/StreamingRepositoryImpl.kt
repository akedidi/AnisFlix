package com.anisflix.data.repository

import com.anisflix.data.mapper.toDomain
import com.anisflix.data.remote.api.MovixProxyApi
import com.anisflix.data.remote.dto.FStreamResponse
import com.anisflix.data.remote.dto.FStreamTVResponse
import com.anisflix.data.remote.dto.MovieBoxResponse
import com.anisflix.data.remote.dto.MovixTmdbResponse
import com.anisflix.data.remote.dto.MovixTmdbSeriesResponse
import com.anisflix.domain.model.StreamingSource
import com.anisflix.domain.repository.StreamingRepository
import com.google.gson.Gson
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import javax.inject.Inject

class StreamingRepositoryImpl @Inject constructor(
    private val api: MovixProxyApi,
    private val gson: Gson // Inject Gson to parse ResponseBody manually if needed, or use Typed API
) : StreamingRepository {

    // Helper to request and parse
    private suspend inline fun <reified T> fetch(path: String): T? {
        return try {
            val response = api.getProxyResponse(path = path)
            if (response.isSuccessful && response.body() != null) {
                gson.fromJson(response.body()!!.charStream(), T::class.java)
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    override suspend fun getMovieSources(movieId: Int): Result<List<StreamingSource>> = coroutineScope {
        try {
            val tmdbDeferred = async { fetchTmdbSources(movieId) }
            val fstreamDeferred = async { fetchFStreamSources(movieId) }
            val movieBoxDeferred = async { fetchMovieBoxSources(movieId) }
            // Add other providers (Vixsrc, Universal, etc.) as needed

            val sources = mutableListOf<StreamingSource>()
            
            val tmdb = tmdbDeferred.await()
            val fstream = fstreamDeferred.await()
            val movieBox = movieBoxDeferred.await()

            sources.addAll(tmdb)
            sources.addAll(movieBox) // Priority 2
            sources.addAll(fstream)

            // Filtering logic
            val allowed = sources.filter {
                val p = it.provider
                p == "vidmoly" || p == "vidzy" || p == "moviebox" || p == "fstream" // etc
            }
            
            Result.success(allowed)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getSeriesSources(seriesId: Int, season: Int, episode: Int): Result<List<StreamingSource>> = coroutineScope {
        try {
            val tmdbDeferred = async { fetchTmdbSeriesSources(seriesId, season, episode) }
            val fstreamDeferred = async { fetchFStreamSeriesSources(seriesId, season, episode) }
            val movieBoxDeferred = async { fetchMovieBoxSeriesSources(seriesId, season, episode) }

            val sources = mutableListOf<StreamingSource>()
            
            val tmdb = tmdbDeferred.await()
            val fstream = fstreamDeferred.await()
            val movieBox = movieBoxDeferred.await()

            sources.addAll(tmdb)
            sources.addAll(movieBox)
            sources.addAll(fstream)

             val allowed = sources.filter {
                val p = it.provider
                p == "vidmoly" || p == "vidzy" || p == "moviebox" || p == "fstream" 
            }
            
            Result.success(allowed)
        } catch (e: Exception) {
             Result.failure(e)
        }
    }

    override suspend fun getNextEpisodeSources(provider: String, seriesId: Int, season: Int, episode: Int): Result<List<StreamingSource>> {
        // Targeted fetch logic
        return when (provider.lowercase()) {
            "moviebox" -> Result.success(fetchMovieBoxSeriesSources(seriesId, season, episode))
            "fstream" -> Result.success(fetchFStreamSeriesSources(seriesId, season, episode))
            else -> getSeriesSources(seriesId, season, episode) // Fallback to full
        }
    }

    // --- Fetchers ---

    private suspend fun fetchTmdbSources(movieId: Int): List<StreamingSource> {
        val dto = fetch<MovixTmdbResponse>("tmdb/movie/$movieId")
        return dto?.player_links?.map { it.toDomain("tmdb") } ?: emptyList()
    }

    private suspend fun fetchFStreamSources(movieId: Int): List<StreamingSource> {
        val dto = fetch<FStreamResponse>("fstream/movie/$movieId")
        val sources = mutableListOf<StreamingSource>()
        dto?.players?.forEach { (lang, list) ->
            list.forEach { sources.add(it.toDomain(lang)) }
        }
        return sources
    }

    private suspend fun fetchMovieBoxSources(movieId: Int): List<StreamingSource> {
        // path=moviebox&tmdbId=...&type=movie
        val dto = fetch<MovieBoxResponse>("moviebox&tmdbId=$movieId&type=movie")
        return dto?.streams?.map { it.toDomain() } ?: emptyList()
    }

    private suspend fun fetchTmdbSeriesSources(seriesId: Int, season: Int, episode: Int): List<StreamingSource> {
        val dto = fetch<MovixTmdbSeriesResponse>("tmdb/tv/$seriesId?season=$season&episode=$episode")
        val links = dto?.current_episode?.player_links ?: dto?.player_links ?: emptyList()
        return links.map { it.toDomain("tmdb") }
    }

    private suspend fun fetchFStreamSeriesSources(seriesId: Int, season: Int, episode: Int): List<StreamingSource> {
         // path=fstream/tv/$seriesId/season/$season
         val dto = fetch<FStreamTVResponse>("fstream/tv/$seriesId/season/$season")
         // Extract episode
         val sources = mutableListOf<StreamingSource>()
         dto?.episodes?.get(episode.toString())?.languages?.forEach { (lang, list) ->
              list.forEach { sources.add(it.toDomain(lang)) }
         }
         return sources
    }

    private suspend fun fetchMovieBoxSeriesSources(seriesId: Int, season: Int, episode: Int): List<StreamingSource> {
         val dto = fetch<MovieBoxResponse>("moviebox&tmdbId=$seriesId&type=tv&season=$season&episode=$episode")
         return dto?.streams?.map { it.toDomain() } ?: emptyList()
    }
}
