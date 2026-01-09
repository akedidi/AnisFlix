package com.anisflix.utils

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadCursor
import androidx.media3.exoplayer.offline.DownloadManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
@OptIn(UnstableApi::class)
class DownloadTracker @Inject constructor(
    @ApplicationContext private val context: Context,
    private val downloadManager: DownloadManager
) {

    val downloads: Flow<List<Download>> = callbackFlow {
        val listener = object : DownloadManager.Listener {
            override fun onDownloadChanged(
                downloadManager: DownloadManager,
                download: Download,
                finalException: Exception?
            ) {
                trySend(getAllDownloads())
            }

            override fun onDownloadRemoved(downloadManager: DownloadManager, download: Download) {
                trySend(getAllDownloads())
            }
        }

        downloadManager.addListener(listener)
        trySend(getAllDownloads()) // Initial emission

        awaitClose {
            downloadManager.removeListener(listener)
        }
    }

    private fun getAllDownloads(): List<Download> {
        val cursor: DownloadCursor = downloadManager.downloadIndex.getDownloads()
        val downloads = ArrayList<Download>()
        while (cursor.moveToNext()) {
            downloads.add(cursor.download)
        }
        cursor.close()
        return downloads
    }
    
    fun isDownloaded(url: String): Boolean {
         val cursor = downloadManager.downloadIndex.getDownloads()
         while (cursor.moveToNext()) {
             if (cursor.download.request.uri.toString() == url && cursor.download.state == Download.STATE_COMPLETED) {
                 cursor.close()
                 return true
             }
         }
         cursor.close()
         return false
    }
}
