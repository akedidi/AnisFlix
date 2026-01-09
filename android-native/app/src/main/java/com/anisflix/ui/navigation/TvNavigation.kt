package com.anisflix.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
// import androidx.tv.material3.NavigationDrawer // Using standard compose for now to scaffold logic or TV deps
// import androidx.tv.material3.Text 
// Using Material3 for structure, but ideally should be TV Components
import androidx.compose.material3.Text
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

// Placeholder for TV Sidebar Logic
// Since tv-material is alpha, we might simulate a drawer with Row( Sidebar, Content )
@Composable
fun TvNavigation() {
    val navController = rememberNavController()
    
    // Simple Sidebar State
    // Ideally use NavigationRail or similar
    
    Row(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // Sidebar (Simplified for now, will enhance in Polish phase)
        Column(
            modifier = Modifier
                .width(80.dp)
                .fillMaxHeight()
                .background(Color.DarkGray)
                .padding(vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Icons placeholder - Focusable
            // Home
            Text("🏠", modifier = Modifier.clickable { navController.navigate(Screen.Home.route) })
            // Explore
            Text("🔍", modifier = Modifier.clickable { navController.navigate(Screen.Explore.route) })
            // TV
            Text("📺", modifier = Modifier.clickable { navController.navigate(Screen.TVChannels.route) })
            // Downloads
            Text("⬇️", modifier = Modifier.clickable { navController.navigate(Screen.Downloads.route) })
            // Settings
            Text("⚙️", modifier = Modifier.clickable { navController.navigate(Screen.More.route) })
        }

        // Content Area
        Box(modifier = Modifier.weight(1f)) {
             NavHost(
                navController = navController,
                startDestination = Screen.Home.route
            ) {
                composable(Screen.Home.route) { 
                    com.anisflix.ui.screens.home.TvHomeScreen(navController = navController)
                }
                composable(Screen.Explore.route) { Text("TV Explore Placeholder", color = Color.White) }
                composable(Screen.TVChannels.route) { Text("TV Channels Placeholder", color = Color.White) }
                composable(Screen.Downloads.route) { Text("TV Downloads Placeholder", color = Color.White) }
                composable(Screen.More.route) { Text("TV Settings Placeholder", color = Color.White) }
                
                composable(Screen.MovieDetail.route) { 
                    com.anisflix.ui.screens.details.MovieDetailScreen(navController = navController)
                }
                composable(Screen.SeriesDetail.route) { 
                    com.anisflix.ui.screens.details.SeriesDetailScreen(navController = navController)
                }
            }
        }
    }
}
