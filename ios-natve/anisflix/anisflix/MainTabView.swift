//
//  MainTabView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

// Navigation routes for typed navigation
enum NavigationRoute: Hashable {
    case movieDetail(movieId: Int)
    case seriesDetail(seriesId: Int)
    case providerList(providerId: Int, providerName: String)
    case downloadedMediaPlayer(itemId: String)
}

struct MainTabView: View {
    @Binding var selectedTab: Int
    @ObservedObject var theme = AppTheme.shared
    @ObservedObject var downloadManager = DownloadManager.shared
    @StateObject var castManager = CastManager.shared
    @ObservedObject var tabBarManager = TabBarManager.shared
    @StateObject var playerManager = GlobalPlayerManager.shared
    @State private var isFullscreen = false // Track fullscreen state for global player
    
    // Navigation from player
    @State private var navigateToMovieId: Int? = nil
    @State private var navigateToSeriesId: Int? = nil
    @State private var showMovieDetail = false
    @State private var showSeriesDetail = false
    
    // Navigation paths for each tab to enable pop-to-root
    @State private var homePath = NavigationPath()
    @State private var explorePath = NavigationPath()
    @State private var tvPath = NavigationPath()
    @State private var downloadsPath = NavigationPath()
    @State private var morePath = NavigationPath()
    

    
    // Count of downloads in progress or waiting
    var activeDownloadsCount: Int {
        downloadManager.downloads.filter { $0.state == .downloading || $0.state == .queued || $0.state == .waiting }.count
    }
    
    // Helper to pop a specific tab to root with proper SwiftUI NavigationPath clearing
    private func popToRoot(tabIndex: Int) {
        print("🔄 [TabView] Pop to root for tab \(tabIndex)")
        
        // Simply reset the navigation path for the specific tab
        // This is the clean, non-destructive way to pop to root in SwiftUI
        // Using withAnimation as in previous working version 048beb6
        withAnimation {
            switch tabIndex {
            case 0: homePath = NavigationPath()
            case 1: explorePath = NavigationPath()
            case 2: tvPath = NavigationPath()
            case 3: downloadsPath = NavigationPath()
            case 4: morePath = NavigationPath()
            default: break
            }
        }
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            
             // Content Views
            TabView(selection: $selectedTab) {
                // Onglet 1: Home
                NavigationStack(path: $homePath) {
                    HomeView()
                        .navigationDestination(for: NavigationRoute.self) { route in
                            switch route {
                            case .movieDetail(let movieId):
                                MovieDetailView(movieId: movieId)
                            case .seriesDetail(let seriesId):
                                SeriesDetailView(seriesId: seriesId)
                            case .providerList(let providerId, let providerName):
                                ProviderMediaListView(providerId: providerId, providerName: providerName)
                            case .downloadedMediaPlayer(let itemId):
                                if let item = DownloadManager.shared.downloads.first(where: { $0.id == itemId }) {
                                    DownloadedMediaDetailView(item: item)
                                } else {
                                    Text("Download not found")
                                }
                            }
                        }
                }
                .tag(0)
                 .toolbar(.hidden, for: .tabBar) // Hide native tab bar
                
                // Onglet 2: Explorer
                NavigationStack(path: $explorePath) {
                    ExploreView()
                }
                .tag(1)
                 .toolbar(.hidden, for: .tabBar)
                
                // Onglet 3: TV Channels
                NavigationStack(path: $tvPath) {
                    TVChannelsView()
                }
                .tag(2)
                 .toolbar(.hidden, for: .tabBar)
                
                // Onglet 4: Téléchargements
                NavigationStack(path: $downloadsPath) {
                    DownloadsView()
                }
                .tag(3)
                 .toolbar(.hidden, for: .tabBar)
                
                // Onglet 5: Plus (Menu)
                NavigationStack(path: $morePath) {
                    MoreView()
                }
                .tag(4)
                 .toolbar(.hidden, for: .tabBar)
            }
             .ignoresSafeArea() // Allow content to extend behind the floating bar
            
            // Custom Floating Tab Bar
             if !tabBarManager.isHidden {
             CustomTabBar(
                     selectedTab: $selectedTab,
                     theme: theme,
                     activeDownloadsCount: activeDownloadsCount,
                     onTabDoubleTap: { tabIndex in
                         // Pop to root when tapping the already-selected tab
                         popToRoot(tabIndex: tabIndex)
                     }
                 )
                 .offset(y: tabBarManager.isHidden ? 200 : 0)
                 .animation(.easeInOut(duration: 0.3), value: tabBarManager.isHidden)
                 .transition(.move(edge: .bottom))
             }
             
             // GLOBAL MINI PLAYER (Above Tab Bar)
             // Show when: local player is minimized AND we are NOT casting (CastMiniPlayerView handles casting)
             if playerManager.isPresented && playerManager.isMinimised && !castManager.isConnected {
                 MiniPlayerView()
                     .padding(.bottom, tabBarManager.isHidden ? 20 : 80) // Match CastMiniPlayerView positioning
                     .transition(.move(edge: .bottom))
                     .zIndex(100) // Ensure it's above content but below full player overlay
             }
             
             // GLOBAL FULL PLAYER OVERLAY
             // Keep player in hierarchy to prevent onDisappear cleanup
             // Use zIndex and frame positioning to hide/show while keeping AVPlayerLayer rendering
             // IMPORTANT: Do NOT show this view when Casting to prevent local audio playing in background
             if playerManager.isPresented && !castManager.isConnected {
                 CustomVideoPlayer(
                    url: playerManager.currentMediaUrl ?? URL(string: "about:blank")!,
                    title: playerManager.currentTitle,
                    posterUrl: playerManager.currentPosterUrl,
                    subtitles: playerManager.currentSubtitles,
                    isPresented: $playerManager.isPresented,
                    isFullscreen: $isFullscreen,
                    isLive: playerManager.isLive,
                    mediaId: playerManager.mediaId,
                    season: playerManager.season,
                    episode: playerManager.episode,
                    playerVM: playerManager.playerVM
                 )
                 // When minimized: keep visible but VERY small and behind everything
                 // When expanded: full size and on top
                 .frame(
                    width: playerManager.isMinimised ? 1 : nil,
                    height: playerManager.isMinimised ? 1 : nil
                 )
                 .zIndex(playerManager.isMinimised ? -100 : 200)
                 .allowsHitTesting(!playerManager.isMinimised)
                 .animation(.easeOut(duration: 0.35), value: playerManager.isMinimised)
             }
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToDetail)) { notification in
            guard let userInfo = notification.userInfo,
                  let mediaId = userInfo["mediaId"] as? Int,
                  let isMovie = userInfo["isMovie"] as? Bool else {
                print("❌ [MainTabView] Invalid navigateToDetail notification")
                return
            }
            
            print("📺 [MainTabView] Navigating to detail for mediaId: \(mediaId), isMovie: \(isMovie)")
            
            // Use NavigationPath for push controller navigation
            // First switch to Home tab, then push the detail view
            selectedTab = 0
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                if isMovie {
                    homePath.append(NavigationRoute.movieDetail(movieId: mediaId))
                } else {
                    homePath.append(NavigationRoute.seriesDetail(seriesId: mediaId))
                }
            }
        }
        .sheet(isPresented: $playerManager.showCastControlSheet) {
            CastControlSheet()
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
