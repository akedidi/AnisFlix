package com.anisflix.ui.navigation

sealed class Screen(val route: String) {
    // Root Tabs
    object Home : Screen("home")
    object Explore : Screen("explore")
    object TVChannels : Screen("tv_channels")
    object Downloads : Screen("downloads")
    object More : Screen("more")
    object Settings : Screen("settings")

    // Detail Routes
    object MovieDetail : Screen("movie/{movieId}") {
        fun createRoute(movieId: Int) = "movie/$movieId"
    }

    object SeriesDetail : Screen("series/{seriesId}") {
        fun createRoute(seriesId: Int) = "series/$seriesId"
    }

    // Listing Routes
    object LatestMovies : Screen("latest_movies")
    object LatestSeries : Screen("latest_series")
    object PopularMovies : Screen("popular_movies")
    object PopularSeries : Screen("popular_series")
    
    // Player
    object Player : Screen("player/{mediaId}/{isMovie}") {
        fun createRoute(mediaId: Int, isMovie: Boolean) = "player/$mediaId/$isMovie"
    }
}

// Bottom Navigation Items
sealed class BottomNavItem(val route: String, val title: String, val icon: Int) {
    // Icons will be added later
}
