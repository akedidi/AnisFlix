package com.anisflix.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "watch_progress")
data class WatchProgressEntity(
    @PrimaryKey
    val mediaId: Int, // TMDB ID
    val mediaType: String, // "movie" or "tv"
    val title: String,
    val posterPath: String?,
    val backdropPath: String?,
    
    // Progress
    val progress: Float, // 0.0 to 1.0
    val currentTime: Long,
    val duration: Long,
    val lastWatched: Long, // Timestamp
    
    // Series Specific
    val seasonNumber: Int? = null,
    val episodeNumber: Int? = null,
    val hasNextEpisode: Boolean = false
)
