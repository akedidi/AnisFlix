package com.anisflix.data.remote.api

import com.anisflix.data.remote.dto.*
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface TMDBApi {
    @GET("movie/popular")
    suspend fun getPopularMovies(
        @Query("api_key") apiKey: String,
        @Query("language") language: String,
        @Query("page") page: Int = 1
    ): TMDBResponse<TMDBMovieDTO>

    @GET("movie/now_playing")
    suspend fun getLatestMovies(
        @Query("api_key") apiKey: String,
        @Query("language") language: String,
        @Query("page") page: Int = 1
    ): TMDBResponse<TMDBMovieDTO>

    @GET("tv/popular")
    suspend fun getPopularSeries(
        @Query("api_key") apiKey: String,
        @Query("language") language: String,
        @Query("page") page: Int = 1
    ): TMDBResponse<TMDBSeriesDTO>

    @GET("tv/on_the_air")
    suspend fun getLatestSeries(
        @Query("api_key") apiKey: String,
        @Query("language") language: String,
        @Query("page") page: Int = 1
    ): TMDBResponse<TMDBSeriesDTO>

    @GET("movie/{movie_id}")
    suspend fun getMovieDetails(
        @Path("movie_id") movieId: Int,
        @Query("api_key") apiKey: String,
        @Query("language") language: String
    ): TMDBMovieDetailDTO

    @GET("tv/{series_id}")
    suspend fun getSeriesDetails(
        @Path("series_id") seriesId: Int,
        @Query("api_key") apiKey: String,
        @Query("language") language: String
    ): TMDBSeriesDetailDTO

    // Discover (By Genre / Provider)
    @GET("discover/movie")
    suspend fun discoverMovies(
        @Query("api_key") apiKey: String,
        @Query("language") language: String,
        @Query("with_genres") withGenres: String? = null,
        @Query("with_watch_providers") withWatchProviders: String? = null,
        @Query("watch_region") watchRegion: String = "FR",
        @Query("page") page: Int = 1,
        @Query("sort_by") sortBy: String = "popularity.desc"
    ): TMDBResponse<TMDBMovieDTO>

    @GET("discover/tv")
    suspend fun discoverSeries(
        @Query("api_key") apiKey: String,
        @Query("language") language: String,
        @Query("with_genres") withGenres: String? = null,
        @Query("with_watch_providers") withWatchProviders: String? = null,
        @Query("watch_region") watchRegion: String = "FR",
        @Query("page") page: Int = 1,
        @Query("sort_by") sortBy: String = "popularity.desc"
    ): TMDBResponse<TMDBSeriesDTO>
}
