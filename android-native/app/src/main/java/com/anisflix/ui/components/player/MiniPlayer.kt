package com.anisflix.ui.components.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.anisflix.ui.theme.RedPrimary
import com.anisflix.ui.viewmodel.GlobalPlayerManager

@Composable
fun MiniPlayer(
    playerManager: GlobalPlayerManager,
    modifier: Modifier = Modifier
) {
    val state by playerManager.playerState.collectAsState()

    if (!state.isPresented || !state.isMinimized) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Black) // Or dark gray
            .clickable { playerManager.restore() }
    ) {
        // Progress Bar (Thin line at top)
        // Note: Real progress requires observing player position flow which we haven't implemented fully yet
        // Using a placeholder progress or assuming state has it updated (need to hook up ticker in VM)
        LinearProgressIndicator(
            progress = { 0.5f }, // Placeholder
            modifier = Modifier
                .fillMaxWidth()
                .height(2.dp),
            color = RedPrimary,
            trackColor = Color.Gray.copy(alpha = 0.3f),
        )

        Row(
            modifier = Modifier
                .padding(8.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Artwork
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(state.currentPosterUrl)
                    .crossfade(true)
                    .build(),
                contentDescription = "Poster",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(width = 36.dp, height = 48.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color.DarkGray)
            )

            Spacer(modifier = Modifier.width(12.dp))

            // Title & Subtitle
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = state.currentTitle,
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "Lecture en cours", // Or "Casting..."
                    color = Color.Gray,
                    fontSize = 12.sp,
                    maxLines = 1
                )
            }

            // Controls
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Play/Pause
                IconButton(onClick = { playerManager.togglePlayPause() }) {
                    // Need a specific pause icon not in default Icons.Filled maybe?
                    // Using Text or check available icons. Material Icons usually have Pause.
                    // Assuming Icons.Filled.Pause exists or using resource
                    // For now, simple text toggle logic visualization:
                    if (state.isPlaying) {
                        // Pause Icon
                         Text("⏸", color = Color.White, fontSize = 20.sp)
                    } else {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Play",
                            tint = Color.White
                        )
                    }
                }

                // Close
                IconButton(onClick = { playerManager.close() }) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.Gray,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
