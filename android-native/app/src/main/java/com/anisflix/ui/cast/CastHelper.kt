package com.anisflix.ui.cast

import android.content.Context
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadOptions
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManager
import com.google.android.gms.cast.framework.SessionManagerListener
import com.anisflix.domain.model.Media
import com.anisflix.domain.model.StreamingSource

class CastHelper(
    private val context: Context,
    private val onSessionStarted: (CastSession) -> Unit,
    private val onSessionEnding: (CastSession) -> Unit,
    private val onSessionEnded: () -> Unit
) {
    private val sessionManager: SessionManager? by lazy {
        try {
            CastContext.getSharedInstance(context).sessionManager
        } catch (e: Exception) {
            null // Handle case where Cast is not available (e.g. no Play Services)
        }
    }

    private val sessionManagerListener = object : SessionManagerListener<CastSession> {
        override fun onSessionStarting(session: CastSession) {}

        override fun onSessionStarted(session: CastSession, sessionId: String) {
            onSessionStarted(session)
        }

        override fun onSessionStartFailed(session: CastSession, error: Int) {}

        override fun onSessionEnding(session: CastSession) {
            onSessionEnding(session)
        }

        override fun onSessionEnded(session: CastSession, error: Int) {
            onSessionEnded()
        }

        override fun onSessionResuming(session: CastSession, sessionId: String) {}

        override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {
            onSessionStarted(session)
        }

        override fun onSessionResumeFailed(session: CastSession, error: Int) {}

        override fun onSessionSuspended(session: CastSession, reason: Int) {}
    }

    fun register() {
        sessionManager?.addSessionManagerListener(sessionManagerListener, CastSession::class.java)
    }

    fun unregister() {
        sessionManager?.removeSessionManagerListener(sessionManagerListener, CastSession::class.java)
    }
    
    fun loadMedia(session: CastSession, media: Media, source: StreamingSource, startPosition: Long) {
        val movieMetadata = MediaMetadata(MediaMetadata.MEDIA_TYPE_MOVIE)
        movieMetadata.putString(MediaMetadata.KEY_TITLE, media.title)
        
        // Handle poster if available
        if (media.posterDetailUrl != null) {
            movieMetadata.addImage(com.google.android.gms.common.images.WebImage(android.net.Uri.parse(media.posterDetailUrl)))
        }

        val mediaInfo = MediaInfo.Builder(source.url)
            .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
            .setContentType("video/mp4") // Or detect from URL
            .setMetadata(movieMetadata)
            .build()

        val loadOptions = MediaLoadOptions.Builder()
            .setPlayPosition(startPosition)
            .setAutoplay(true)
            .build()
            
        val remoteMediaClient = session.remoteMediaClient
        remoteMediaClient?.load(mediaInfo, loadOptions)
    }
    
    fun seekTo(position: Long) {
        sessionManager?.currentCastSession?.remoteMediaClient?.seek(position)
    }

    fun togglePlayPause() {
        val remoteMediaClient = sessionManager?.currentCastSession?.remoteMediaClient
        if (remoteMediaClient?.isPlaying == true) {
            remoteMediaClient.pause()
        } else {
            remoteMediaClient?.play()
        }
    }
    
    fun getCurrentPosition(): Long {
        return sessionManager?.currentCastSession?.remoteMediaClient?.approximateStreamPosition ?: 0L
    }

    fun getDuration(): Long {
        return sessionManager?.currentCastSession?.remoteMediaClient?.streamDuration ?: 0L
    }
}
