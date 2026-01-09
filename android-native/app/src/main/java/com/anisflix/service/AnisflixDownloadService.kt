package com.anisflix.service

import android.app.Notification
import androidx.annotation.OptIn
import androidx.media3.common.util.NotificationUtil
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadManager
import androidx.media3.exoplayer.offline.DownloadNotificationHelper
import androidx.media3.exoplayer.offline.DownloadService
import androidx.media3.exoplayer.scheduler.PlatformScheduler
import androidx.media3.exoplayer.scheduler.Scheduler
import com.anisflix.R
import com.anisflix.utils.DownloadUtil
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@UnstableApi
@AndroidEntryPoint
class AnisflixDownloadService : DownloadService(
    DownloadUtil.DOWNLOAD_NOTIFICATION_ID,
    DEFAULT_FOREGROUND_NOTIFICATION_UPDATE_INTERVAL,
    DownloadUtil.DOWNLOAD_NOTIFICATION_CHANNEL_ID,
    R.string.download_channel_name, // Will need to add string resource
    R.string.download_channel_description // Will need to add string resource
) {

    @Inject
    lateinit var downloadManagerInstance: DownloadManager

    private lateinit var notificationHelper: DownloadNotificationHelper

    override fun onCreate() {
        super.onCreate()
        notificationHelper = DownloadNotificationHelper(this, DownloadUtil.DOWNLOAD_NOTIFICATION_CHANNEL_ID)
    }

    override fun getDownloadManager(): DownloadManager {
        return downloadManagerInstance
    }

    override fun getScheduler(): Scheduler? {
        return PlatformScheduler(this, JOB_ID)
    }

    override fun getForegroundNotification(
        downloads: MutableList<Download>,
        notMetRequirements: Int
    ): Notification {
        return notificationHelper.buildProgressNotification(
            this,
            R.drawable.ic_launcher_foreground, // Placeholder icon
            null,
            null,
            downloads,
            notMetRequirements
        )
    }

    companion object {
        private const val JOB_ID = 1
    }
}
