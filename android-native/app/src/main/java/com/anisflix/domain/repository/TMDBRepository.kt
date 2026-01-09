package com.anisflix.domain.repository

import com.anisflix.domain.model.Media

interface TMDBRepository {
    suspend fun getPopularMovies(page: Int, language: String): Result<List<Media>>
    suspend fun getPopularSeries(page: Int, language: String): Result<List<Media>>
    suspend fun getLatestMovies(page: Int, language: String): Result<List<Media>>
    suspend fun getLatestSeries(page: Int, language: String): Result<List<Media>>
    
    suspend fun getMovieDetails(movieId: Int, language: String): Result<Media>
    suspend fun getSeriesDetails(seriesId: Int, language: String): Result<Media>
    
    // Discover
    suspend fun discoverMovies(page: Int, language: String, genres: String?, providers: String?): Result<List<Media>>
    suspend fun discoverSeries(page: Int, language: String, genres: String?, providers: String?): Result<List<Media>>
}
