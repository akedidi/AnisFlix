package com.anisflix.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import com.anisflix.R;

/**
 * Background download worker using WorkManager
 */
public class DownloadWorker extends Worker {
    
    private static final String CHANNEL_ID = "download_channel";
    private static final int NOTIFICATION_ID = 1;
    
    public DownloadWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }
    
    @NonNull
    @Override
    public Result doWork() {
        String url = getInputData().getString("url");
        String title = getInputData().getString("title");
        
        if (url == null || title == null) {
            return Result.failure();
        }
        
        createNotificationChannel();
        showNotification(title, "Downloading...");
        
        try {
            // TODO: Implement actual download logic
            // Download file from URL
            // Save to local storage
            // Update progress
            
            showNotification(title, "Download complete");
            return Result.success();
        } catch (Exception e) {
            showNotification(title, "Download failed");
            return Result.failure();
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Downloads",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getApplicationContext()
                    .getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private void showNotification(String title, String content) {
        Notification notification = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(content)
                .setSmallIcon(R.drawable.ic_download)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
        
        NotificationManager manager = getApplicationContext()
                .getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, notification);
        }
    }
}
