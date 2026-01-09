package com.anisflix.data.repository

import com.anisflix.data.local.dao.WatchProgressDao
import com.anisflix.data.local.entity.WatchProgressEntity
import com.anisflix.domain.repository.WatchProgressRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class WatchProgressRepositoryImpl @Inject constructor(
    private val dao: WatchProgressDao
) : WatchProgressRepository {

    override fun getWatchProgress(): Flow<List<WatchProgressEntity>> {
        return dao.getAllProgress()
    }

    override suspend fun getProgress(mediaId: Int): WatchProgressEntity? {
        return dao.getProgress(mediaId)
    }

    override suspend fun saveProgress(progress: WatchProgressEntity) {
        dao.saveProgress(progress)
    }

    override suspend fun deleteProgress(mediaId: Int) {
        dao.deleteProgress(mediaId)
    }
}
