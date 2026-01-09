package com.anisflix.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.anisflix.ui.components.HomeSection
import com.anisflix.ui.navigation.Screen
import com.anisflix.ui.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    navController: NavController,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        if (state.isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
            ) {
                // Header Gradient / Spacer for Status Bar
                Spacer(modifier = Modifier.statusBarsPadding().height(20.dp))

                // Error Message
                state.error?.let { error ->
                    Text(
                        text = "Error: $error",
                        color = Color.Red,
                        modifier = Modifier.padding(16.dp)
                    )
                }

                // Continue Watching (Using Media Models mapped from WatchProgress - placeholder mapping needed or separate component)
                // For now, listing Sections
                
                // Note: state.continueWatching gives WatchProgressEntity. Need to map to Media for HomeSection OR create ContinueWatchingSection
                // skipping for this exact moment to ensure clean build, will add ContinueWatchingSection next.

                HomeSection(
                    title = "Films Populaires",
                    items = state.popularMovies,
                    onItemClick = { media ->
                        navController.navigate(Screen.MovieDetail.createRoute(media.id))
                    }
                )

                HomeSection(
                    title = "Séries Populaires",
                    items = state.popularSeries,
                    onItemClick = { media ->
                        navController.navigate(Screen.SeriesDetail.createRoute(media.id))
                    }
                )

                HomeSection(
                    title = "Derniers Films",
                    items = state.latestMovies,
                    onItemClick = { media ->
                        navController.navigate(Screen.MovieDetail.createRoute(media.id))
                    }
                )

                HomeSection(
                    title = "Dernières Séries",
                    items = state.latestSeries,
                    onItemClick = { media ->
                        navController.navigate(Screen.SeriesDetail.createRoute(media.id))
                    }
                )
                
                // Bottom Spacer
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}
