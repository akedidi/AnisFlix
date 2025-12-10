package com.anisflix.utils;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Helper class for SharedPreferences operations
 */
public class PreferencesManager {
    
    private static PreferencesManager instance;
    private final SharedPreferences prefs;
    
    private PreferencesManager(Context context) {
        prefs = context.getSharedPreferences(Constants.PREFS_NAME, Context.MODE_PRIVATE);
    }
    
    public static synchronized PreferencesManager getInstance(Context context) {
        if (instance == null) {
            instance = new PreferencesManager(context.getApplicationContext());
        }
        return instance;
    }
    
    // Theme
    public void setTheme(String theme) {
        prefs.edit().putString(Constants.PREF_THEME, theme).apply();
    }
    
    public String getTheme() {
        return prefs.getString(Constants.PREF_THEME, Constants.THEME_DARK);
    }
    
    // Language
    public void setLanguage(String language) {
        prefs.edit().putString(Constants.PREF_LANGUAGE, language).apply();
    }
    
    public String getLanguage() {
        return prefs.getString(Constants.PREF_LANGUAGE, Constants.LANGUAGE_FRENCH);
    }
    
    // Streaming Language (VF/VOSTFR/VO)
    public void setStreamingLanguage(String lang) {
        prefs.edit().putString(Constants.PREF_SELECTED_STREAM_LANG, lang).apply();
    }
    
    public String getStreamingLanguage() {
        return prefs.getString(Constants.PREF_SELECTED_STREAM_LANG, Constants.LANG_VF);
    }
    
    // Continue Watching Position
    public void savePlaybackPosition(int mediaId, long position) {
        prefs.edit().putLong("playback_" + mediaId, position).apply();
    }
    
    public long getPlaybackPosition(int mediaId) {
        return prefs.getLong("playback_" + mediaId, 0);
    }
    
    // Clear all data
    public void clearAll() {
        prefs.edit().clear().apply();
    }
}
