package com.anisflix.ui.screens.downloads

import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.Downloading
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.offline.Download
import androidx.navigation.NavController
import com.anisflix.ui.viewmodel.DownloadsViewModel

@OptIn(UnstableApi::class)
@Composable
fun DownloadsScreen(
    navController: NavController,
    viewModel: DownloadsViewModel = hiltViewModel()
) {
    val downloads by viewModel.downloads.collectAsState()

    Scaffold(
        containerColor = Color.Black,
        topBar = {
             Text(
                 text = "Téléchargements",
                 style = MaterialTheme.typography.headlineMedium,
                 color = Color.White,
                 modifier = Modifier.padding(16.dp)
             )
        }
    ) { innerPadding ->
        if (downloads.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Aucun téléchargement",
                    color = Color.Gray
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(downloads) { download ->
                    DownloadItem(
                        download = download,
                        onClick = {
                            // TODO: Play Download
                            // We need to parse metadata to get title/poster
                        },
                        onDelete = { viewModel.removeDownload(download) }
                    )
                }
            }
        }
    }
}

@OptIn(UnstableApi::class)
@Composable
fun DownloadItem(
    download: Download,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val stateString = when(download.state) {
        Download.STATE_COMPLETED -> "Terminé"
        Download.STATE_DOWNLOADING -> "Téléchargement... ${download.percentDownloaded.toInt()}%"
        Download.STATE_FAILED -> "Échec"
        Download.STATE_QUEUED -> "En attente"
        else -> "Inconnu"
    }

    val icon = if (download.state == Download.STATE_COMPLETED) Icons.Default.DownloadDone else Icons.Default.Downloading

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color.DarkGray.copy(alpha = 0.3f))
            .clickable(onClick = onClick) // Handles Focus on TV
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            // We use Uri path or ID as title fallback for now
            val title = try {
                val data = download.request.data
                if (data.isNotEmpty()) String(data, java.nio.charset.StandardCharsets.UTF_8) else download.request.id
            } catch (e: Exception) {
                download.request.id
            }
            
            Text(
                text = title,
                color = Color.White,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1
            )
            Text(
                text = stateString,
                color = Color.Gray,
                style = MaterialTheme.typography.bodySmall
            )
        }
        
        // Delete Action
        IconButton(onClick = onDelete) {
            Icon(
                Icons.Default.Delete,
                contentDescription = "Supprimer",
                tint = Color.Red.copy(alpha = 0.8f)
            )
        }
    }
}
