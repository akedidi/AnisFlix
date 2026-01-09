package com.anisflix.ui.viewmodel

import android.app.Application
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import com.anisflix.domain.model.Media
import com.anisflix.domain.model.StreamingSource
import com.anisflix.domain.model.Subtitle
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

data class PlayerState(
    val isPresented: Boolean = false,
    val isMinimized: Boolean = false,
    val isPlaying: Boolean = false,
    val currentMedia: Media? = null,
    val currentTitle: String = "",
    val currentPosterUrl: String? = null,
    val currentSource: StreamingSource? = null,
    val subtitles: List<Subtitle> = emptyList(),
    val selectedSubtitle: Subtitle? = null,
    val subtitleOffset: Float = 0f, // in seconds
    val subtitleSize: Float = 16f, // in sp
    val currentTime: Long = 0L,
    val duration: Long = 0L,
    val isBuffering: Boolean = false,
    val isCasting: Boolean = false,
    val nextMedia: Media? = null
)

@Singleton
class GlobalPlayerManager @Inject constructor(
    private val application: Application,
    private val dataSourceFactory: androidx.media3.datasource.DataSource.Factory
) {
    // ... (existing code)

    fun play(
        media: Media,
        source: StreamingSource,
        title: String,
        posterUrl: String?,
        subtitles: List<Subtitle> = emptyList(),
        startTime: Long = 0L,
        nextMedia: Media? = null
    ) {
        val player = getPlayer()

        // Update State
        _playerState.update {
            it.copy(
                isPresented = true,
                isMinimized = false,
                currentMedia = media,
                currentTitle = title,
                currentPosterUrl = posterUrl,
                currentSource = source,
                subtitles = subtitles,
                selectedSubtitle = null, // Reset selection
                subtitleOffset = 0f, // Reset offset
                nextMedia = nextMedia
            )
        }
        
        // Metadata for Notification/Lock Screen
        val mediaMetadata = MediaMetadata.Builder()
            .setTitle(title)
            .setDisplayTitle(title)
            // .setArtworkUri(if (posterUrl != null) Uri.parse(posterUrl) else null) // Async loading needed for bitmap usually
            .build()

        val mediaItem = MediaItem.Builder()
            .setUri(source.url)
            .setMediaMetadata(mediaMetadata)
            .build()
            
        // Setup Subtitles (Side-loading)
        // Note: Real implementation would add MediaItem.SubtitleConfiguration here
        // or usage of MergingMediaSource.
        // For Phase 5 simplified: we just store them in state.
        
        player.setMediaItem(mediaItem)
        player.prepare()
        if (startTime > 0) {
            player.seekTo(startTime)
        }
        
        // If casting, load remotely instead of playing locally
        if (_playerState.value.isCasting) {
             // Logic to load on cast if already connected
             // Ideally we trigger load on active session
        } else {
            player.play()
        }
    }
    
    fun setSubtitle(subtitle: Subtitle?) {
        _playerState.update { it.copy(selectedSubtitle = subtitle) }
        // TODO: Apply to ExoPlayer (Side-loading logic or track selection)
    }
    
    fun setSubtitleOffset(offset: Float) {
        _playerState.update { it.copy(subtitleOffset = offset) }
        // TODO: Apply offset logic (ExoPlayer doesn't support runtime offset natively easily for all formats, often handled by custom renderer or transcode)
    }
    
    fun setSubtitleSize(size: Float) {
        _playerState.update { it.copy(subtitleSize = size) }
        // This updates UI state, which CustomVideoPlayer's SubtitleView (if used) should observe
    }
    
    fun getCurrentPosition(): Long {
        return if (_playerState.value.isCasting) {
            castHelper.getCurrentPosition()
        } else {
            exoPlayer?.currentPosition ?: 0L
        }
    }

    fun getDuration(): Long {
        return if (_playerState.value.isCasting) {
             castHelper.getDuration()
        } else {
            exoPlayer?.duration ?: 0L
        }
    }

    fun minimize() {
        _playerState.update { it.copy(isMinimized = true) }
    }
    
    fun minimizeForPiP() {
        // PiP logic
    }

    fun restore() {
        _playerState.update { it.copy(isMinimized = false, isPresented = true) }
    }

    fun close() {
        exoPlayer?.pause()
        exoPlayer?.stop()
        exoPlayer?.clearMediaItems()
        _playerState.update { 
            it.copy(
                isPresented = false, 
                isMinimized = false,
                isPlaying = false,
                currentMedia = null
            ) 
        }
    }
    
    fun seekTo(position: Long) {
        if (_playerState.value.isCasting) {
             castHelper.seekTo(position)
        } else {
            exoPlayer?.seekTo(position)
        }
    }
    
    fun togglePlayPause() {
        if (_playerState.value.isCasting) {
            castHelper.togglePlayPause()
        } else {
            exoPlayer?.let { player ->
                if (player.isPlaying) {
                    player.pause()
                } else {
                    player.play()
                }
            }
        }
    }

    fun release() {
        castHelper.unregister() // Unregister Cast listener
        mediaSession?.release()
        mediaSession = null
        exoPlayer?.release()
        exoPlayer = null
    }
}
