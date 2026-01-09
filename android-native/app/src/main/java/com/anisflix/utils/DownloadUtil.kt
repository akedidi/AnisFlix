import android.content.Context
import android.net.Uri
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.offline.DownloadRequest
import androidx.media3.exoplayer.offline.DownloadService
import com.anisflix.service.AnisflixDownloadService
import java.nio.charset.StandardCharsets

object DownloadUtil {
    const val DOWNLOAD_NOTIFICATION_CHANNEL_ID = "download_channel"
    const val DOWNLOAD_NOTIFICATION_CHANNEL_NAME = "Downloads"
    const val DOWNLOAD_NOTIFICATION_ID = 1001

    @UnstableApi
    fun startDownload(context: Context, id: String, url: String, title: String) {
        val downloadRequest = DownloadRequest.Builder(id, Uri.parse(url))
            .setData(title.toByteArray(StandardCharsets.UTF_8)) // Store title in data
            .build()
            
        DownloadService.sendAddDownload(
            context,
            AnisflixDownloadService::class.java,
            downloadRequest,
            /* foreground= */ false
        )
    }
    
    @UnstableApi
    fun removeDownload(context: Context, id: String) {
        DownloadService.sendRemoveDownload(
            context,
            AnisflixDownloadService::class.java,
            id,
            /* foreground= */ false
        )
    }
}
