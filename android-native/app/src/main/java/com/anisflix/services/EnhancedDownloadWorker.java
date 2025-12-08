package com.anisflix.services;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.work.Data;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import com.anisflix.R;
import com.anisflix.ui.main.MainActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Enhanced Download Worker with provider extraction
 */
public class EnhancedDownloadWorker extends Worker {
    
    private static final String CHANNEL_ID = "download_channel";
    private static final int NOTIFICATION_ID_BASE = 1000;
    
    public EnhancedDownloadWorker(Context context, WorkerParameters params) {
        super(context, params);
    }
    
    @Override
    public Result doWork() {
        String originalUrl = getInputData().getString("url");
        String provider = getInputData().getString("provider");
        String title = getInputData().getString("title");
        String filename = getInputData().getString("filename");
        
        if (originalUrl == null || provider == null || title == null || filename == null) {
            return Result.failure();
        }
        
        createNotificationChannel();
        int notificationId = NOTIFICATION_ID_BASE + getId().hashCode();
        
        try {
            // 1. Extract URL based on provider (like VideoPlayer)
            showNotification(notificationId, title, "Extracting stream...", 0);
            
            String extractedUrl = ProviderExtractor.getInstance().extractByProvider(originalUrl, provider);
            
            // 2. Download the file
            showNotification(notificationId, title, "Downloading...", 10);
            
            File downloadFile = downloadFile(extractedUrl, filename, (progress) -> {
                showNotification(notificationId, title, "Downloading...", progress);
            });
            
            if (downloadFile != null) {
                showNotification(notificationId, title, "Download complete", 100);
                
                // Save to database for offline playback
                // TODO: Save download info to Room DB
                
                return Result.success();
            } else {
                showNotification(notificationId, title, "Download failed", 0);
                return Result.failure();
            }
            
        } catch (Exception e) {
            showNotification(notificationId, title, "Error: " + e.getMessage(), 0);
            return Result.failure();
        }
    }
    
    private File downloadFile(String url, String filename, ProgressCallback callback) throws IOException {
        HttpURLConnection connection = null;
        InputStream input = null;
        FileOutputStream output = null;
        
        try {
            URL downloadUrl = new URL(url);
            connection = (HttpURLConnection) downloadUrl.openConnection();
            connection.connect();
            
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                return null;
            }
            
            int fileLength = connection.getContentLength();
            
            // Create download directory
            File downloadDir = new File(getApplicationContext().getExternalFilesDir(null), "Downloads");
            if (!downloadDir.exists()) {
                downloadDir.mkdirs();
            }
            
            File outputFile = new File(downloadDir, filename);
            
            input = connection.getInputStream();
            output = new FileOutputStream(outputFile);
            
            byte[] buffer = new byte[4096];
            long total = 0;
            int count;
            
            while ((count = input.read(buffer)) != -1) {
                if (isStopped()) {
                    return null;
                }
                
                total += count;
                output.write(buffer, 0, count);
                
                if (fileLength > 0) {
                    int progress = (int) ((total * 100) / fileLength);
                    callback.onProgress(progress);
                }
            }
            
            return outputFile;
            
        } finally {
            if (output != null) output.close();
            if (input != null) input.close();
            if (connection != null) connection.disconnect();
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
    
    private void showNotification(int id, String title, String content, int progress) {
        Intent intent = new Intent(getApplicationContext(), MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                getApplicationContext(), 0, intent,
                PendingIntent.FLAG_IMMUTABLE
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(content)
                .setSmallIcon(R.drawable.ic_download)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW);
        
        if (progress > 0 && progress < 100) {
            builder.setProgress(100, progress, false);
        }
        
        NotificationManager manager = getApplicationContext()
                .getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(id, builder.build());
        }
    }
    
    /**
     * Queue a download with extraction
     */
    public static void queueDownload(Context context, String url, String provider, String title, String filename) {
        Data inputData = new Data.Builder()
                .putString("url", url)
                .putString("provider", provider)
                .putString("title", title)
                .putString("filename", filename)
                .build();
        
        OneTimeWorkRequest downloadWork = new OneTimeWorkRequest.Builder(EnhancedDownloadWorker.class)
                .setInputData(inputData)
                .build();
        
        WorkManager.getInstance(context).enqueue(downloadWork);
    }
    
    interface ProgressCallback {
        void onProgress(int progress);
    }
}
