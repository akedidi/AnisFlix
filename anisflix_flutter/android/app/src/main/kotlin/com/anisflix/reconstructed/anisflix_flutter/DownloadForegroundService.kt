package com.anisflix.reconstructed.anisflix_flutter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

class DownloadForegroundService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onCreate() {
        super.onCreate()
        wakeLock = (getSystemService(POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"AnisFlix:downloads")
    }
    override fun onStartCommand(intent: Intent?,flags: Int,startId: Int): Int {
        val count=intent?.getIntExtra("count",0) ?: 0
        if(count<=0) { stopSelf(); return START_NOT_STICKY }
        if (Build.VERSION.SDK_INT >= 26) (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(NotificationChannel("downloads",intent?.getStringExtra("channelName") ?: "AnisFlix",NotificationManager.IMPORTANCE_LOW))
        if(wakeLock?.isHeld != true) wakeLock?.acquire(2*60*60*1000L)
        val progress=intent?.getDoubleExtra("progress",-1.0) ?: -1.0
        val pending=PendingIntent.getActivity(this,0,Intent(this,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val builder=if(Build.VERSION.SDK_INT>=26) Notification.Builder(this,"downloads") else Notification.Builder(this)
        val notification=builder.setSmallIcon(android.R.drawable.stat_sys_download).setContentTitle(intent?.getStringExtra("title") ?: "AnisFlix")
            .setContentText(intent?.getStringExtra("text") ?: count.toString())
            .setContentIntent(pending).setOngoing(true).setOnlyAlertOnce(true)
            .setProgress(100,if(progress<0) 0 else (progress.coerceIn(0.0,1.0)*100).toInt(),progress<0).build()
        if(Build.VERSION.SDK_INT>=29) startForeground(2402,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC) else startForeground(2402,notification)
        return START_NOT_STICKY
    }
    override fun onTimeout(startId: Int,fgsType: Int) {
        MainActivity.bridge?.invokeMethod("cancelDownloads",null)
        stopSelf()
    }
    override fun onDestroy() {
        if(wakeLock?.isHeld==true) wakeLock?.release()
        wakeLock=null
        super.onDestroy()
    }
}
