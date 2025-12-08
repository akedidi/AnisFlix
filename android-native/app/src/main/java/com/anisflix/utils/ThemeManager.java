package com.anisflix.utils;

import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import androidx.appcompat.app.AppCompatDelegate;

/**
 * Theme manager for Dark/Light mode switching
 */
public class ThemeManager {
    
    private static ThemeManager instance;
    private final PreferencesManager prefsManager;
    
    private ThemeManager(Context context) {
        prefsManager = PreferencesManager.getInstance(context);
    }
    
    public static synchronized ThemeManager getInstance(Context context) {
        if (instance == null) {
            instance = new ThemeManager(context.getApplicationContext());
        }
        return instance;
    }
    
    public void applyTheme() {
        String theme = prefsManager.getTheme();
        int mode;
        
        switch (theme) {
            case Constants.THEME_LIGHT:
                mode = AppCompatDelegate.MODE_NIGHT_NO;
                break;
            case Constants.THEME_DARK:
                mode = AppCompatDelegate.MODE_NIGHT_YES;
                break;
            case Constants.THEME_SYSTEM:
            default:
                mode = AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
                break;
        }
        
        AppCompatDelegate.setDefaultNightMode(mode);
    }
    
    public void setTheme(String theme, Activity activity) {
        prefsManager.setTheme(theme);
        applyTheme();
        
        if (activity != null) {
            activity.recreate();
        }
    }
    
    public String getCurrentTheme() {
        return prefsManager.getTheme();
    }
    
    public boolean isDarkMode(Context context) {
        int nightModeFlags = context.getResources().getConfiguration().uiMode 
                & Configuration.UI_MODE_NIGHT_MASK;
        return nightModeFlags == Configuration.UI_MODE_NIGHT_YES;
    }
}
