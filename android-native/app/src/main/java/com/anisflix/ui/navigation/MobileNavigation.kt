package com.anisflix.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.anisflix.ui.screens.home.HomeScreen
import com.anisflix.ui.theme.RedPrimary
import com.anisflix.ui.theme.Gray

@Composable
fun MobileNavigation(navController: androidx.navigation.NavHostController = androidx.navigation.compose.rememberNavController()) {
    // NavController hoisted

    // Define tabs
    val items = listOf(
        Screen.Home,
        Screen.Explore,
        Screen.TVChannels,
        Screen.Downloads,
        Screen.More
    )

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Color.Black.copy(alpha = 0.9f),
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination

                items.forEach { screen ->
                    val isSelected = currentDestination?.hierarchy?.any { it.route == screen.route } == true
                    
                    NavigationBarItem(
                        icon = { Text(text = screen.route.take(1).uppercase()) }, // Placeholder Icons
                        label = { Text(text = screen.route.replaceFirstChar { it.uppercase() }) },
                        selected = isSelected,
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = RedPrimary,
                            selectedTextColor = RedPrimary,
                            indicatorColor = Color.Transparent, // No pill background
                            unselectedIconColor = Gray,
                            unselectedTextColor = Gray
                        ),
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) { 
                HomeScreen(navController = navController)
            }
            composable(Screen.Explore.route) { Text("Explore Screen Placeholder") }
            composable(Screen.TVChannels.route) { Text("TV Screen Placeholder") }
            composable(Screen.Downloads.route) { Text("Downloads Screen Placeholder") }
            composable(Screen.More.route) { 
               // For now, "More" just goes to Settings, or better:
               // Navigate to Settings
               com.anisflix.ui.screens.settings.SettingsScreen(navController = navController)
            }
            composable(Screen.Settings.route) {
                com.anisflix.ui.screens.settings.SettingsScreen(navController = navController)
            }
            
            // Detail Routes
            composable(Screen.MovieDetail.route) { backStackEntry ->
                 com.anisflix.ui.screens.details.MovieDetailScreen(navController = navController)
            }
            composable(Screen.SeriesDetail.route) { backStackEntry ->
                com.anisflix.ui.screens.details.SeriesDetailScreen(navController = navController)
            }
        }
    }
}
