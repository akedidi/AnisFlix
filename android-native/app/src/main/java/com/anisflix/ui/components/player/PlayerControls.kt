package com.anisflix.ui.components.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anisflix.ui.theme.RedPrimary

@Composable
fun PlayerControls(
    modifier: Modifier = Modifier,
    isVisible: Boolean,
    isPlaying: Boolean,
    isBuffering: Boolean,
    title: String,
    currentTime: Long,
    duration: Long,
    onPauseToggle: () -> Unit,
    onSeek: (Long) -> Unit,
    onBack: () -> Unit,
    onFullscreenToggle: () -> Unit,
    isFullscreen: Boolean,
    onSettings: () -> Unit
) {
    if (!isVisible) return

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.4f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) { /* Consume clicks */ }
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Black.copy(alpha = 0.7f), Color.Transparent)
                    )
                )
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

        // Center Controls
        Box(
            modifier = Modifier.align(Alignment.Center),
            contentAlignment = Alignment.Center
        ) {
            if (isBuffering) {
                CircularProgressIndicator(color = RedPrimary)
            } else {
                Row(
                   horizontalArrangement = Arrangement.spacedBy(32.dp),
                   verticalAlignment = Alignment.CenterVertically
                ) {
                    // Rewind 10s
                    IconButton(
                        onClick = { onSeek((currentTime - 10000).coerceAtLeast(0)) },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(Icons.Default.Replay10, contentDescription = "Rewind", tint = Color.White, modifier = Modifier.fillMaxSize())
                    }
                    
                    // Play/Pause
                    IconButton(
                        onClick = onPauseToggle,
                        modifier = Modifier.size(64.dp)
                    ) {
                        Icon(
                            if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isPlaying) "Pause" else "Play",
                            tint = Color.White,
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    // Forward 10s
                    IconButton(
                        onClick = { onSeek((currentTime + 10000).coerceAtMost(duration)) },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(Icons.Default.Forward10, contentDescription = "Forward", tint = Color.White, modifier = Modifier.fillMaxSize())
                    }
                }
            }
        }

        // Bottom Bar
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))
                    )
                )
                .padding(16.dp)
        ) {
            // Seekbar
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = formatTime(currentTime),
                    color = Color.White,
                    fontSize = 12.sp
                )
                
                Slider(
                    value = currentTime.toFloat(),
                    onValueChange = { onSeek(it.toLong()) },
                    valueRange = 0f..duration.toFloat().coerceAtLeast(1f),
                    colors = SliderDefaults.colors(
                        thumbColor = RedPrimary,
                        activeTrackColor = RedPrimary,
                        inactiveTrackColor = Color.Gray
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp)
                )
                
                Text(
                    text = formatTime(duration),
                    color = Color.White,
                    fontSize = 12.sp
                )
            }
            
            // Bottom Action Bar (Fullscreen, Settings, etc)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                 CastButton(modifier = Modifier.size(48.dp).padding(8.dp))
                 
                 IconButton(onClick = onSettings) {
                     Icon(
                         Icons.Default.Settings, // Or Subtitles icon
                         contentDescription = "Settings",
                         tint = Color.White
                     )
                 }
                 IconButton(onClick = onFullscreenToggle) {
                     Icon(
                         if (isFullscreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                         contentDescription = "Fullscreen",
                         tint = Color.White
                     )
                 }
            }
        }
    }
}

private fun formatTime(millis: Long): String {
    val totalSeconds = millis / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    val hours = minutes / 60
    if (hours > 0) {
        return String.format("%d:%02d:%02d", hours, minutes % 60, seconds)
    }
    return String.format("%02d:%02d", minutes, seconds)
}
