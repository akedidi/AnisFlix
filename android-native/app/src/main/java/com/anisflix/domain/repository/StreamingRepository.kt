package com.anisflix.domain.repository

import com.anisflix.domain.model.StreamingSource

interface StreamingRepository {
    suspend fun getMovieSources(movieId: Int): Result<List<StreamingSource>>
    suspend fun getSeriesSources(seriesId: Int, season: Int, episode: Int): Result<List<StreamingSource>>
    suspend fun getNextEpisodeSources(provider: String, seriesId: Int, season: Int, episode: Int): Result<List<StreamingSource>>
}
