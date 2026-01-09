package com.anisflix.ui.viewmodel

import androidx.annotation.OptIn
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadManager
import com.anisflix.utils.DownloadTracker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
@OptIn(UnstableApi::class)
class DownloadsViewModel @Inject constructor(
    downloadTracker: DownloadTracker,
    private val downloadManager: DownloadManager
) : ViewModel() {

    val downloads: StateFlow<List<Download>> = downloadTracker.downloads
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun removeDownload(download: Download) {
        downloadManager.removeDownload(download.request.id)
    }
    
    fun removeAll() {
        downloadManager.removeAllDownloads()
    }
}
