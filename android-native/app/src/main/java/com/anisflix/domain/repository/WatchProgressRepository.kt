package com.anisflix.domain.repository

import com.anisflix.data.local.entity.WatchProgressEntity
import kotlinx.coroutines.flow.Flow

interface WatchProgressRepository {
    fun getWatchProgress(): Flow<List<WatchProgressEntity>>
    suspend fun getProgress(mediaId: Int): WatchProgressEntity?
    suspend fun saveProgress(progress: WatchProgressEntity)
    suspend fun deleteProgress(mediaId: Int)
}
