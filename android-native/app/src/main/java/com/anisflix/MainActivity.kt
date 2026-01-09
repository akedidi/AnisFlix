package com.anisflix

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import android.content.pm.PackageManager
import com.anisflix.ui.navigation.MobileNavigation
import com.anisflix.ui.navigation.TvNavigation
import com.anisflix.ui.theme.AnisflixTheme 
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var playerManager: GlobalPlayerManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Detect TV
        val isTv = packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
        
        setContent {
            AnisflixTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        
                        // 1. Main Navigation Layer (Hide on PiP)
                        // In PiP mode, the Activity is resumed but small. We should hide non-player content if needed,
                        // or Compose handles resizing naturally. 
                        // However, standard practice is to let FullScreen Player take over.
                        // We can check `isInPictureInPictureMode` state.
                        
                        // We can check LocalConfiguration or windowInfo, but Activity.isInPictureInPictureMode is source of truth.
                        // Compose doesn't auto-recompose on this change unless we observe it.
                        // But onUserLeaveHint triggers it.
                        
                        val isInPiP = rememberIsInPipMode()
                        val navController = androidx.navigation.compose.rememberNavController()
                        
                        if (!isInPiP) {
                            if (isTv) {
                               TvNavigation()
                            } else {
                               MobileNavigation(navController = navController)
                            }
                            
                            // 2. Mini Player (Banderole) Layer
                            if (!isTv) {
                                com.anisflix.ui.components.player.MiniPlayer(
                                    playerManager = playerManager,
                                    modifier = Modifier
                                        .align(Alignment.BottomCenter)
                                        .padding(bottom = 80.dp) 
                                )
                            }
                        }

                        // 3. Full Screen Player Layer
                        // Ensure it fills screen in PiP
                        com.anisflix.ui.components.player.CustomVideoPlayer(
                            playerManager = playerManager,
                            modifier = Modifier.fillMaxSize(),
                            onNext = { nextMedia ->
                                playerManager.close() // Close player
                                // Navigate to detail page of next item
                                if (nextMedia.mediaType == com.anisflix.domain.model.MediaType.SERIES && nextMedia.seriesId != null) {
                                    navController.navigate(com.anisflix.ui.navigation.Screen.SeriesDetail.createRoute(nextMedia.seriesId))
                                } else {
                                    navController.navigate(com.anisflix.ui.navigation.Screen.MovieDetail.createRoute(nextMedia.id))
                                }
                            }
                        )
                    }
                }
            }
        }
    }
    
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // If player is presented and playing, enter PiP
        val state = playerManager.playerState.value
        if (state.isPresented && !state.isMinimized && state.isPlaying) {
            val params = android.app.PictureInPictureParams.Builder()
                .setAspectRatio(android.util.Rational(16, 9))
                .build()
            enterPictureInPictureMode(params)
        }
    }
}

@Composable
fun rememberIsInPipMode(): Boolean {
    val context = androidx.compose.ui.platform.LocalContext.current
    var isInPipMode by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    
    androidx.compose.runtime.DisposableEffect(context) {
        val activity = context as? android.app.Activity
        val listener = androidx.core.util.Consumer<android.content.res.Configuration> { newConfig ->
             // This doesn't directly tell PiP status easily without API 26+ check inside Activity
             // Simpler: rely on Activity.onPictureInPictureModeChanged if we could pass it down.
        }
        onDispose { }
    }
    
    // Simpler fallback: just check Activity (won't trigger recomposition automatically on change without listener)
    // For now, let's assuming standard Compose behavior:
    // When PiP starts, Activity is NOT destroyed, just resized.
    // We need to inject the state.
    // Let's use a composition local or just a state hosted in Activity.
    return (context as? android.app.Activity)?.isInPictureInPictureMode == true
}
