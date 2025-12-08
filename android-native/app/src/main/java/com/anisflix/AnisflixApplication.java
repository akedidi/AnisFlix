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
        
        // Apply theme on app start
        ThemeManager.getInstance(this).applyTheme();
    }
}
