package com.anisflix.ui.screens.details

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.anisflix.domain.model.StreamingSource
import com.anisflix.ui.components.HomeSection // Reusing HomeSection for "Similar"
import com.anisflix.ui.components.MediaCard
import com.anisflix.ui.navigation.Screen
import com.anisflix.ui.theme.RedPrimary
import com.anisflix.ui.viewmodel.MovieDetailViewModel

@Composable
fun MovieDetailScreen(
    navController: NavController,
    viewModel: MovieDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    if (state.isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = RedPrimary)
        }
        return
    }

    val movie = state.movie ?: return

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // Parallax Header (Backdrop)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(movie.getBackdropUrl())
                        .crossfade(true)
                        .build(),
                    contentDescription = "Backdrop",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                
                // Gradient Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, MaterialTheme.colorScheme.background),
                                startY = 100f
                            )
                        )
                )

                // Back Button
                IconButton(
                    onClick = { navController.popBackStack() },
                    modifier = Modifier
                        .padding(top = 40.dp, start = 16.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.5f))
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
            }

            // Title & Info
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Text(
                    text = movie.title,
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Year
                    Text(text = movie.releaseDate.take(4), color = Color.Gray, fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(12.dp))
                    
                    // Rating
                    Icon(Icons.Default.Star, contentDescription = null, tint = Color.Yellow, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = movie.voteAverage.toString(), color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.height(16.dp))

                // Overview
                Text(
                    text = movie.overview,
                    color = Color.Gray,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Language Tabs
                Row(modifier = Modifier.fillMaxWidth()) {
                    listOf("VF", "VOSTFR", "VO").forEach { lang ->
                        val isSelected = state.selectedLanguage == lang
                        Box(
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) RedPrimary else Color.DarkGray)
                                .clickable { viewModel.selectLanguage(lang) }
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(text = lang, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Sources List
                if (state.isLoadingSources) {
                    CircularProgressIndicator(modifier = Modifier.size(30.dp), color = RedPrimary)
                } else if (state.filteredSources.isEmpty()) {
                    Text("Aucune source disponible pour ${state.selectedLanguage}", color = Color.Gray)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                val context = LocalContext.current
                            state.filteredSources.take(5).forEachIndexed { index, source -> 
                                SourceItem(
                                    source = source, 
                                    index = index + 1,
                                    onClick = { viewModel.playMovie(source) },
                                    onDownload = {
                                        // Start Download
                                        com.anisflix.utils.DownloadUtil.startDownload(
                                            context,
                                            id = "movie_${movie.id}", // Unique ID for movie (TODO: handle overwrite or multi-version)
                                            url = source.url,
                                            title = movie.title
                                        )
                                    }
                                )
                            }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            // Similar Movies
            if (state.similarMovies.isNotEmpty()) {
                HomeSection(
                    title = "Titres Similaires",
                    items = state.similarMovies,
                    onItemClick = { navController.navigate(Screen.MovieDetail.createRoute(it.id)) }
                )
            }
            
            // Bottom Padding for Player Overlay
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun SourceItem(
    source: StreamingSource, 
    index: Int, 
    onClick: () -> Unit,
    onDownload: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color.DarkGray)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = RedPrimary)
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "${source.provider.replaceFirstChar { it.uppercase() }} #$index",
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = source.language + " • " + source.quality.uppercase(),
                color = Color.Gray,
                fontSize = 12.sp
            )
        }
        
        IconButton(onClick = onDownload) {
            Icon(
                Icons.Default.Download,
                contentDescription = "Download",
                tint = Color.White
            )
        }
    }
}
