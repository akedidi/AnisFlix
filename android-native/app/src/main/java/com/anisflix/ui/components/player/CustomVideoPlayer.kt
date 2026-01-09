package com.anisflix.ui.components.player

import android.content.pm.ActivityInfo
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.material3.Text
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.filled.Tv
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import com.anisflix.ui.viewmodel.GlobalPlayerManager
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun CustomVideoPlayer(
    playerManager: GlobalPlayerManager,
    modifier: Modifier = Modifier,
    onNext: ((com.anisflix.domain.model.Media) -> Unit)? = null
) {
    val state by playerManager.playerState.collectAsState()
    
    // Logic to ensure player is valid
    if (!state.isPresented || state.isMinimized) return
    
    val context = LocalContext.current
    var areControlsVisible by remember { mutableStateOf(false) }
    var isSettingsVisible by remember { mutableStateOf(false) }
    var isFullscreen by remember { mutableStateOf(false) }
    
    // Player State tracking for UI updates (Position)
    var currentTime by remember { mutableLongStateOf(0L) }
    var duration by remember { mutableLongStateOf(0L) }
    
    // Auto-hide controls timer
    LaunchedEffect(areControlsVisible, state.isPlaying) {
        if (areControlsVisible && state.isPlaying) {
            delay(4000)
            areControlsVisible = false
        }
    }
    
    // Sync UI with Player progress
    LaunchedEffect(Unit) {
        while(true) {
            currentTime = playerManager.getCurrentPosition()
            val dur = playerManager.getDuration()
            if (dur > 0) duration = dur
            delay(1000)
        }
    }
    
    // Handle specific orientation cleanup on dispose
    DisposableEffect(Unit) {
        onDispose {
            // Revert to portrait if needed? Or let user handle it manually?
            // Usually best to revert to user preference or portrait.
            // val activity = context as? android.app.Activity
            // activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { 
                        areControlsVisible = !areControlsVisible 
                    },
                    onDoubleTap = { offset ->
                        val width = size.width
                        val seekAmount = 10000L
                        val player = playerManager.getPlayer()
                        
                        if (offset.x < width / 2) {
                            // Rewind
                            val newPos = (player.currentPosition - seekAmount).coerceAtLeast(0)
                            player.seekTo(newPos)
                        } else {
                            // Forward
                            val newPos = (player.currentPosition + seekAmount).coerceAtMost(player.duration)
                            player.seekTo(newPos)
                        }
                    }
                )
            }
    ) {
        // ExoPlayer View (No Controls)
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = playerManager.getPlayer()
                    useController = false // We use our own overlay
                    // keepScreenOn = true // handled by Activity usually or set here
                }
            },
            update = { view ->
                view.player = playerManager.getPlayer()
            },
            modifier = Modifier.fillMaxSize()
        )
        
        // Custom Controls Overlay
        AnimatedVisibility(
            visible = areControlsVisible,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            PlayerControls(
                isVisible = true,
                isPlaying = state.isPlaying,
                isBuffering = state.isBuffering,
                title = state.currentTitle,
                currentTime = currentTime,
                duration = duration,
                onPauseToggle = { playerManager.togglePlayPause() },
                onSeek = { pos -> playerManager.getPlayer().seekTo(pos); currentTime = pos },
                onBack = { playerManager.minimize() },
                onFullscreenToggle = {
                    isFullscreen = !isFullscreen
                    val activity = context as? android.app.Activity
                    if (isFullscreen) {
                        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                    } else {
                        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                    }
                },
                isFullscreen = isFullscreen,
                onSettings = { areControlsVisible = false; isSettingsVisible = true }
            )
        }
        
                }
            }
        }
        
        // Next Episode Overlay
        if (state.nextMedia != null && duration > 0 && currentTime > duration - 10000) { // Show in last 10s
             Box(
                 modifier = Modifier
                     .fillMaxSize()
                     .padding(bottom = 100.dp, end = 24.dp), // Position bottom right above controls
                 contentAlignment = Alignment.BottomEnd
             ) {
                 androidx.compose.material3.Button(
                     onClick = { 
                         state.nextMedia?.let { onNext?.invoke(it) }
                     },
                     colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = androidx.compose.ui.graphics.Color.White),
                     modifier = Modifier.padding(16.dp)
                 ) {
                     androidx.compose.material3.Text("Prochain Épisode >", color = androidx.compose.ui.graphics.Color.Black)
                 }
             }
        }

        // Settings Sheet Overlay
        AnimatedVisibility(
            visible = isSettingsVisible,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable { isSettingsVisible = false }, // Click outside to dismiss
                contentAlignment = Alignment.Center
            ) {
                 // Prevent click propagation to background
                Box(modifier = Modifier.clickable(enabled = false) {}) {
                    SubtitleSettingsSheet(
                        playerManager = playerManager,
                        onDismiss = { isSettingsVisible = false }
                    )
                }
            }
        }
    }
}
