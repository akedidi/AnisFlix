package com.anisflix.data.repository

import com.anisflix.data.mapper.toMedia
import com.anisflix.data.remote.api.TMDBApi
import com.anisflix.domain.model.Media
import com.anisflix.domain.repository.TMDBRepository
import com.anisflix.utils.Constants
import javax.inject.Inject

class TMDBRepositoryImpl @Inject constructor(
    private val api: TMDBApi
) : TMDBRepository {
    
    override suspend fun getPopularMovies(page: Int, language: String): Result<List<Media>> {
        return try {
            val response = api.getPopularMovies(Constants.TMDB_API_KEY, language, page)
            Result.success(response.results.map { it.toMedia() })
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }

    override suspend fun getPopularSeries(page: Int, language: String): Result<List<Media>> {
        return try {
            val response = api.getPopularSeries(Constants.TMDB_API_KEY, language, page)
            Result.success(response.results.map { it.toMedia() })
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }

    override suspend fun getLatestMovies(page: Int, language: String): Result<List<Media>> {
        return try {
            val response = api.getLatestMovies(Constants.TMDB_API_KEY, language, page)
            Result.success(response.results.map { it.toMedia() })
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }

    override suspend fun getLatestSeries(page: Int, language: String): Result<List<Media>> {
        return try {
            val response = api.getLatestSeries(Constants.TMDB_API_KEY, language, page)
            Result.success(response.results.map { it.toMedia() })
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }
    
    override suspend fun getMovieDetails(movieId: Int, language: String): Result<Media> {
        return try {
            val response = api.getMovieDetails(movieId, Constants.TMDB_API_KEY, language)
            Result.success(response.toMedia())
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }

    override suspend fun getSeriesDetails(seriesId: Int, language: String): Result<Media> {
        return try {
            val response = api.getSeriesDetails(seriesId, Constants.TMDB_API_KEY, language)
            Result.success(response.toMedia())
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }
    
    override suspend fun discoverMovies(page: Int, language: String, genres: String?, providers: String?): Result<List<Media>> {
        return try {
            val response = api.discoverMovies(Constants.TMDB_API_KEY, language, withGenres = genres, withWatchProviders = providers, page = page)
            Result.success(response.results.map { it.toMedia() })
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }

    override suspend fun discoverSeries(page: Int, language: String, genres: String?, providers: String?): Result<List<Media>> {
        return try {
            val response = api.discoverSeries(Constants.TMDB_API_KEY, language, withGenres = genres, withWatchProviders = providers, page = page)
            Result.success(response.results.map { it.toMedia() })
        } catch (e: Exception) {
            e.printStackTrace()
            Result.failure(e)
        }
    }
}
