package com.anisflix;

import android.app.Application;
import com.anisflix.utils.ThemeManager;

/**
 * Application class for global initialization
 */
public class AnisflixApplication extends Application {
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Force Dark Mode
        androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES);
        
        // Apply theme on app start
        ThemeManager.getInstance(this).applyTheme();
    }
}
