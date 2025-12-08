package com.anisflix.services;

import android.content.Context;
import android.content.SharedPreferences;
import com.anisflix.utils.Constants;
import java.util.HashMap;
import java.util.Map;

/**
 * Continue Watching Manager - Track playback progress
 * Similar to iOS WatchProgressManager
 */
public class ContinueWatchingManager {
    
    private static ContinueWatchingManager instance;
    private final SharedPreferences prefs;
    
    private ContinueWatchingManager(Context context) {
        prefs = context.getSharedPreferences("continue_watching", Context.MODE_PRIVATE);
    }
    
    public static synchronized ContinueWatchingManager getInstance(Context context) {
        if (instance == null) {
            instance = new ContinueWatchingManager(context.getApplicationContext());
        }
        return instance;
    }
    
    /**
     * Save progress for a media item
     * @param mediaId TMDB ID
     * @param season Season number (null for movies)
     * @param episode Episode number (null for movies)
     * @param position Playback position in milliseconds
     * @param duration Total duration in milliseconds
     */
    public void saveProgress(int mediaId, Integer season, Integer episode, long position, long duration) {
        String key = buildKey(mediaId, season, episode);
        
        // Don't save if position is less than threshold
        if (position < Constants.CONTINUE_WATCHING_THRESHOLD) {
            return;
        }
        
        // Don't save if watched > 95%
        if (duration > 0 && ((float) position / duration) > 0.95f) {
            // Considered watched, remove from continue watching
            prefs.edit().remove(key).apply();
            return;
        }
        
        prefs.edit()
                .putLong(key + "_position", position)
                .putLong(key + "_duration", duration)
                .putLong(key + "_timestamp", System.currentTimeMillis())
                .apply();
    }
    
    /**
     * Get saved progress
     */
    public long getProgress(int mediaId, Integer season, Integer episode) {
        String key = buildKey(mediaId, season, episode);
        return prefs.getLong(key + "_position", 0);
    }
    
    /**
     * Get all continue watching items
     */
    public Map<String, ContinueWatchingItem> getAllContinueWatching() {
        Map<String, ContinueWatchingItem> items = new HashMap<>();
        Map<String, ?> all = prefs.getAll();
        
        for (String key : all.keySet()) {
            if (key.endsWith("_position")) {
                String baseKey = key.replace("_position", "");
                long position = prefs.getLong(key, 0);
                long duration = prefs.getLong(baseKey + "_duration", 0);
                long timestamp = prefs.getLong(baseKey + "_timestamp", 0);
                
                if (position > 0) {
                    items.put(baseKey, new ContinueWatchingItem(baseKey, position, duration, timestamp));
                }
            }
        }
        
        return items;
    }
    
    /**
     * Clear progress for an item
     */
    public void clearProgress(int mediaId, Integer season, Integer episode) {
        String key = buildKey(mediaId, season, episode);
        prefs.edit()
                .remove(key + "_position")
                .remove(key + "_duration")
                .remove(key + "_timestamp")
                .apply();
    }
    
    private String buildKey(int mediaId, Integer season, Integer episode) {
        StringBuilder sb = new StringBuilder();
        sb.append("media_").append(mediaId);
        if (season != null) {
            sb.append("_s").append(season);
        }
        if (episode != null) {
            sb.append("_e").append(episode);
        }
        return sb.toString();
    }
    
    public static class ContinueWatchingItem {
        public final String key;
        public final long position;
        public final long duration;
        public final long timestamp;
        
        public ContinueWatchingItem(String key, long position, long duration, long timestamp) {
            this.key = key;
            this.position = position;
            this.duration = duration;
            this.timestamp = timestamp;
        }
        
        public float getProgress() {
            if (duration == 0) return 0f;
            return (float) position / duration;
        }
    }
}
