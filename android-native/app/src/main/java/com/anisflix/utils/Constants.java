package com.anisflix.utils;

/**
 * Enhanced Constants with all configuration values
 */
public class Constants {
    
    // API Keys & URLs
    public static final String TMDB_API_KEY = "f3d757824f08ea2cff45eb8f47ca3a1e";
    public static final String TMDB_BASE_URL = "https://api.themoviedb.org/3/";
    public static final String TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";
    public static final String ANISFLIX_BASE_URL = "https://anisflix.vercel.app/";
    
    // TMDB Image Sizes
    public static final String POSTER_SIZE_W185 = "w185";
    public static final String POSTER_SIZE_W342 = "w342";
    public static final String POSTER_SIZE_W500 = "w500";
    public static final String BACKDROP_SIZE_W780 = "w780";
    public static final String BACKDROP_SIZE_W1280 = "w1280";
    public static final String BACKDROP_SIZE_ORIGINAL = "original";
    
    // Languages
    public static final String LANGUAGE_FRENCH = "fr-FR";
    public static final String LANGUAGE_ENGLISH = "en-US";
    
    // Streaming Languages
    public static final String LANG_VF = "VF";
    public static final String LANG_VOSTFR = "VOSTFR";
    public static final String LANG_VO = "VO";
    
    // Streaming Providers
    public static final String PROVIDER_VIDMOLY = "vidmoly";
    public static final String PROVIDER_VIDZY = "vidzy";
    public static final String PROVIDER_VIXSRC = "vixsrc";
    
    // SharedPreferences
    public static final String PREFS_NAME = "anisflix_prefs";
    public static final String PREF_THEME = "theme";
    public static final String PREF_LANGUAGE = "language";
    public static final String PREF_SELECTED_STREAM_LANG = "selected_stream_lang";
    
    // Theme Values
    public static final String THEME_LIGHT = "light";
    public static final String THEME_DARK = "dark";
    public static final String THEME_SYSTEM = "system";
    
    // Cache & Downloads
    public static final long CACHE_SIZE = 50 * 1024 * 1024; // 50 MB
    public static final String DOWNLOAD_FOLDER = "AnisFlix/Downloads";
    
    // Continue Watching
    public static final long CONTINUE_WATCHING_THRESHOLD = 30 * 1000; // 30 seconds
    public static final long PROGRESS_SAVE_INTERVAL = 5 * 1000; // Save every 5 seconds
    
    // Search
    public static final int SEARCH_DEBOUNCE_MS = 300;
    public static final int AUTOCOMPLETE_MIN_CHARS = 2;
    public static final int AUTOCOMPLETE_MAX_RESULTS = 10;
    
    // Pagination
    public static final int ITEMS_PER_PAGE = 20;
    public static final int GRID_COLUMNS_PORTRAIT = 2;
    public static final int GRID_COLUMNS_LANDSCAPE = 4;
    public static final int TV_GRID_COLUMNS = 3;
}
