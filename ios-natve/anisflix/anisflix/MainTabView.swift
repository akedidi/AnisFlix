//
//  MainTabView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct MainTabView: View {
    @Binding var selectedTab: Int
    @ObservedObject var theme = AppTheme.shared
    @ObservedObject var downloadManager = DownloadManager.shared
    @StateObject var castManager = CastManager.shared
    
    // Navigation paths for each tab to enable pop-to-root
    @State private var homePath = NavigationPath()
    @State private var explorePath = NavigationPath()
    @State private var tvPath = NavigationPath()
    @State private var downloadsPath = NavigationPath()
    @State private var favoritesPath = NavigationPath()
    @State private var settingsPath = NavigationPath()
    
    // Count of downloads in progress or waiting
    var activeDownloadsCount: Int {
        downloadManager.downloads.filter { $0.state == .downloading || $0.state == .queued || $0.state == .waiting }.count
    }
    
    // Helper to pop navigation stack to root when tapping already-selected tab
    private func popToRoot(tabIndex: Int) {
        print("🔄 [TabView] Pop to root for tab \(tabIndex)")
        
        // Clear NavigationPath synchronously with animation (SwiftUI approach)
        withAnimation {
            switch tabIndex {
            case 0: homePath = NavigationPath()
            case 1: explorePath = NavigationPath()
            case 2: tvPath = NavigationPath()
            case 3: downloadsPath = NavigationPath()
            case 4: favoritesPath = NavigationPath()
            case 5: settingsPath = NavigationPath()
            default: break
            }
        }
        print("✅ Cleared NavigationPath for tab \(tabIndex)")
        
        // Post notification for tab to handle (allows views to dismiss themselves)
        NotificationCenter.default.post(name: NSNotification.Name("PopToRootTab\(tabIndex)"), object: nil)
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                // Onglet 1: Accueil
                NavigationStack(path: $homePath) {
                    HomeView()
                        .navigationDestination(for: NavigationDestination.self) { destination in
                            switch destination {
                            case .movieDetail(let media):
                                MovieDetailView(movieId: media.id)
                            case .seriesDetail(let media):
                                SeriesDetailView(seriesId: media.id)
                            case .providerList(let providerId, let providerName):
                                ProviderMediaListView(providerId: providerId, providerName: providerName)
                            case .downloadedMediaPlayer(let item):
                                DownloadedMediaDetailView(item: item)
                            }
                        }
                }
                .tabItem {
                    Label(theme.t("nav.home"), systemImage: selectedTab == 0 ? "house.fill" : "house")
                }
                .tag(0)
                .toolbar(.hidden, for: .tabBar)
                
                // Onglet 2: Explorer (Films & Séries)
                NavigationStack(path: $explorePath) {
                    ExploreView()
                        .navigationDestination(for: NavigationDestination.self) { destination in
                            switch destination {
                            case .movieDetail(let media):
                                MovieDetailView(movieId: media.id)
                            case .seriesDetail(let media):
                                SeriesDetailView(seriesId: media.id)
                            case .providerList(let providerId, let providerName):
                                ProviderMediaListView(providerId: providerId, providerName: providerName)

                            case .downloadedMediaPlayer(let item):
                                DownloadedMediaDetailView(item: item)
                            }
                        }
                }
                .tabItem {
                    Label("Explorer", systemImage: "magnifyingglass")
                }
                .tag(1)
                .toolbar(.hidden, for: .tabBar)
                
                // Onglet 3: TV Direct
                NavigationStack(path: $tvPath) {
                    TVChannelsView()
                        .navigationDestination(for: NavigationDestination.self) { destination in
                            switch destination {
                            case .movieDetail(let media):
                                MovieDetailView(movieId: media.id)
                            case .seriesDetail(let media):
                                SeriesDetailView(seriesId: media.id)
                            case .providerList(let providerId, let providerName):
                                ProviderMediaListView(providerId: providerId, providerName: providerName)
                            case .downloadedMediaPlayer(let item):
                                DownloadedMediaDetailView(item: item)
                            }
                        }
                }
                .tabItem {
                    Label(theme.t("nav.tvChannels"), systemImage: selectedTab == 2 ? "tv.fill" : "tv")
                }
                .tag(2)
                .toolbar(.hidden, for: .tabBar)
                
                // Onglet 4: Téléchargements
                NavigationStack(path: $downloadsPath) {
                    DownloadsView()
                        .navigationDestination(for: NavigationDestination.self) { destination in
                            switch destination {
                            case .movieDetail(let media):
                                MovieDetailView(movieId: media.id)
                            case .seriesDetail(let media):
                                SeriesDetailView(seriesId: media.id)
                            case .providerList(let providerId, let providerName):
                                ProviderMediaListView(providerId: providerId, providerName: providerName)
                            case .downloadedMediaPlayer(let item):
                                DownloadedMediaDetailView(item: item)
                            }
                        }
                }
                .tabItem {
                    Label(theme.t("nav.downloads"), systemImage: selectedTab == 3 ? "arrow.down.circle.fill" : "arrow.down.circle")
                }
                .badge(activeDownloadsCount > 0 ? activeDownloadsCount : 0)
                .tag(3)
                .toolbar(.hidden, for: .tabBar)
                
                // Onglet 5: Favoris
                NavigationStack(path: $favoritesPath) {
                    FavoritesView()
                        .navigationDestination(for: NavigationDestination.self) { destination in
                            switch destination {
                            case .movieDetail(let media):
                                MovieDetailView(movieId: media.id)
                            case .seriesDetail(let media):
                                SeriesDetailView(seriesId: media.id)
                            case .providerList(let providerId, let providerName):
                                ProviderMediaListView(providerId: providerId, providerName: providerName)
                            case .downloadedMediaPlayer(let item):
                                DownloadedMediaDetailView(item: item)
                            }
                        }
                }
                .tabItem {
                    Label(theme.t("nav.favorites"), systemImage: selectedTab == 4 ? "heart.fill" : "heart")
                }
                .tag(4)
                .toolbar(.hidden, for: .tabBar)
                
                // Onglet 6: Paramètres
                NavigationStack(path: $settingsPath) {
                    SettingsView()
                        .navigationDestination(for: NavigationDestination.self) { destination in
                            switch destination {
                            case .movieDetail(let media):
                                MovieDetailView(movieId: media.id)
                            case .seriesDetail(let media):
                                SeriesDetailView(seriesId: media.id)
                            case .providerList(let providerId, let providerName):
                                ProviderMediaListView(providerId: providerId, providerName: providerName)
                            case .downloadedMediaPlayer(let item):
                                DownloadedMediaDetailView(item: item)
                            }
                        }
                }
                .tabItem {
                    Label(theme.t("nav.settings"), systemImage: selectedTab == 5 ? "gearshape.fill" : "gearshape")
                }
                .tag(5)
                .toolbar(.hidden, for: .tabBar)
            }
            .tint(AppTheme.primaryRed)
            .ignoresSafeArea(.container, edges: .bottom) // Allow content to extend behind floating tab bar
            
            // Custom Floating Tab Bar with dark blur
            CustomTabBar(
                selectedTab: $selectedTab,
                theme: theme,
                activeDownloadsCount: activeDownloadsCount,
                onTabDoubleTap: { tabIndex in
                    popToRoot(tabIndex: tabIndex)
                }
            )
        }
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
