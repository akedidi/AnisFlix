package com.anisflix.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.anisflix.domain.model.Media
import com.anisflix.ui.components.TvMediaCard
import com.anisflix.ui.navigation.Screen
import com.anisflix.ui.viewmodel.HomeViewModel

@Composable
fun TvHomeScreen(
    navController: NavController,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black) // Cinematic background
    ) {
        if (state.isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
        } else {
            LazyColumn(
                contentPadding = PaddingValues(bottom = 50.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    Spacer(modifier = Modifier.height(30.dp))
                }
                
                // Popular Movies
                item {
                    TvSection(
                        title = "Films Populaires",
                        items = state.popularMovies,
                        onItemClick = { navController.navigate(Screen.MovieDetail.createRoute(it.id)) }
                    )
                }

                // Popular Series
                item {
                    TvSection(
                        title = "Séries Populaires",
                        items = state.popularSeries,
                        onItemClick = { navController.navigate(Screen.SeriesDetail.createRoute(it.id)) }
                    )
                }
                
                // Latest Movies
                item {
                    TvSection(
                        title = "Derniers Films",
                        items = state.latestMovies,
                        onItemClick = { navController.navigate(Screen.MovieDetail.createRoute(it.id)) }
                    )
                }
                
                // Latest Series
                item {
                    TvSection(
                        title = "Dernières Séries",
                        items = state.latestSeries,
                        onItemClick = { navController.navigate(Screen.SeriesDetail.createRoute(it.id)) }
                    )
                }
            }
        }
    }
}

@Composable
fun TvSection(
    title: String,
    items: List<Media>,
    onItemClick: (Media) -> Unit
) {
    if (items.isEmpty()) return

    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 30.dp)) {
        Text(
            text = title,
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 50.dp, bottom = 10.dp) // Left padding to align with sidebar offset approx
        )
        
        LazyRow(
            contentPadding = PaddingValues(horizontal = 50.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            items(items) { media ->
                TvMediaCard(media = media, onClick = { onItemClick(media) })
            }
        }
    }
}
