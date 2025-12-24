package com.anisflix.cast;

import android.content.Context;
import com.google.android.gms.cast.MediaInfo;
import com.google.android.gms.cast.MediaMetadata;
import com.google.android.gms.cast.MediaTrack;
import com.google.android.gms.cast.framework.CastContext;
import com.google.android.gms.cast.framework.CastSession;
import com.google.android.gms.cast.framework.SessionManager;
import com.google.android.gms.cast.framework.media.RemoteMediaClient;
import com.google.android.gms.common.images.WebImage;
import android.net. Uri;
import java.util.ArrayList;
import java.util.List;

/**
 * Enhanced Cast Helper for Google Cast operations
 * Supports progression sync, seek, play/pause, and subtitles
 */
public class CastHelper {
    
    private static CastHelper instance;
    private final CastContext castContext;
    private final SessionManager sessionManager;
    
    private CastHelper(Context context) {
        castContext = CastContext.getSharedInstance(context);
        sessionManager = castContext.getSessionManager();
    }
    
    public static synchronized CastHelper getInstance(Context context) {
        if (instance == null) {
            instance = new CastHelper(context.getApplicationContext());
        }
        return instance;
    }
    
    public boolean isCastConnected() {
        CastSession session = sessionManager.getCurrentCastSession();
        return session != null && session.isConnected();
    }
    
    /**
     * Cast media with subtitle support
     */
    public void castMediaWithSubtitles(String url, String title, String posterUrl, String subtitleUrl, String subtitleLanguage) {
        if (!isCastConnected()) {
            return;
        }
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session == null) return;
        
        MediaMetadata metadata = new MediaMetadata(MediaMetadata.MEDIA_TYPE_MOVIE);
        metadata.putString(MediaMetadata.KEY_TITLE, title);
        
        if (posterUrl != null) {
            metadata.addImage(new WebImage(Uri.parse(posterUrl)));
        }
        
        MediaInfo.Builder mediaInfoBuilder = new MediaInfo.Builder(url)
                .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
                .setContentType("application/x-mpegURL") // HLS
                .setMetadata(metadata)
                // CRITICAL: Set HLS segment format to TS for remote control support
                .setHlsSegmentFormat(MediaInfo.HLS_SEGMENT_FORMAT_TS)
                .setHlsVideoSegmentFormat(MediaInfo.HLS_VIDEO_SEGMENT_FORMAT_MPEG2_TS);
        
        // Add subtitle track if available
        if (subtitleUrl != null && !subtitleUrl.isEmpty()) {
            MediaTrack subtitleTrack = new MediaTrack.Builder(1, MediaTrack.TYPE_TEXT)
                    .setName(subtitleLanguage != null ? subtitleLanguage : "Subtitles")
                    .setSubtype(MediaTrack.SUBTYPE_SUBTITLES)
                    .setContentId(subtitleUrl)
                    .setLanguage(subtitleLanguage != null ? subtitleLanguage : "fr")
                    .build();
            
            List<MediaTrack> tracks = new ArrayList<>();
            tracks.add(subtitleTrack);
            mediaInfoBuilder.setMediaTracks(tracks);
        }
        
        MediaInfo mediaInfo = mediaInfoBuilder.build();
        
        try {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null) {
                remoteMediaClient.load(mediaInfo);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    /**
     * Cast media without subtitles
     */
    public void castMedia(String url, String title, String posterUrl) {
        castMediaWithSubtitles(url, title, posterUrl, null, null);
    }
    
    /**
     * Seek to position (in milliseconds)
     */
    public void seekTo(long positionMs) {
        if (!isCastConnected()) return;
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session != null) {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null && remoteMediaClient.hasMediaSession()) {
                remoteMediaClient.seek(positionMs);
            }
        }
    }
    
    /**
     * Play
     */
    public void play() {
        if (!isCastConnected()) return;
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session != null) {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null && remoteMediaClient.hasMediaSession()) {
                remoteMediaClient.play();
            }
        }
    }
    
    /**
     * Pause
     */
    public void pause() {
        if (!isCastConnected()) return;
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session != null) {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null && remoteMediaClient.hasMediaSession()) {
                remoteMediaClient.pause();
            }
        }
    }
    
    /**
     * Stop casting
     */
    public void stop() {
        if (!isCastConnected()) return;
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session != null) {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null && remoteMediaClient.hasMediaSession()) {
                remoteMediaClient.stop();
            }
        }
    }
    
    /**
     * Get current playback position (in milliseconds)
     */
    public long getCurrentPosition() {
        if (!isCastConnected()) return 0;
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session != null) {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null && remoteMediaClient.hasMediaSession()) {
                return remoteMediaClient.getApproximateStreamPosition();
            }
        }
        return 0;
    }
    
    /**
     * Get media duration (in milliseconds)
     */
    public long getDuration() {
        if (!isCastConnected()) return 0;
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session != null) {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null && remoteMediaClient.hasMediaSession()) {
                return remoteMediaClient.getStreamDuration();
            }
        }
        return 0;
    }
    
    /**
     * Check if currently playing
     */
    public boolean isPlaying() {
        if (!isCastConnected()) return false;
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session != null) {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null && remoteMediaClient.hasMediaSession()) {
                return remoteMediaClient.isPlaying();
            }
        }
        return false;
    }
    
    /**
     * Enable/disable subtitle track
     */
    public void setSubtitleEnabled(boolean enabled) {
        if (!isCastConnected()) return;
        
        CastSession session = sessionManager.getCurrentCastSession();
        if (session != null) {
            RemoteMediaClient remoteMediaClient = session.getRemoteMediaClient();
            if (remoteMediaClient != null && remoteMediaClient.hasMediaSession()) {
                if (enabled) {
                    // Enable subtitle track 1
                    long[] trackIds = {1};
                    remoteMediaClient.setActiveMediaTracks(trackIds);
                } else {
                    // Disable all tracks
                    long[] trackIds = {};
                    remoteMediaClient.setActiveMediaTracks(trackIds);
                }
            }
        }
    }
    
    public CastSession getCurrentSession() {
        return sessionManager.getCurrentCastSession();
    }
    
    public RemoteMediaClient getRemoteMediaClient() {
        CastSession session = getCurrentSession();
        return session != null ? session.getRemoteMediaClient() : null;
    }
}
