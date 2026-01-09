package com.anisflix.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.anisflix.data.local.entity.WatchProgressEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface WatchProgressDao {
    
    @Query("SELECT * FROM watch_progress ORDER BY lastWatched DESC")
    fun getAllProgress(): Flow<List<WatchProgressEntity>>
    
    @Query("SELECT * FROM watch_progress WHERE mediaId = :mediaId")
    suspend fun getProgress(mediaId: Int): WatchProgressEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveProgress(progress: WatchProgressEntity)
    
    @Query("DELETE FROM watch_progress WHERE mediaId = :mediaId")
    suspend fun deleteProgress(mediaId: Int)
}
