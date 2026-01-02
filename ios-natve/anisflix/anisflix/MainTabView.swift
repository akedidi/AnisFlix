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
    @State private var morePath = NavigationPath()
    
    // IDs to force NavigationStack reconstruction on pop-to-root
    @State private var homeStackID = UUID()
    @State private var exploreStackID = UUID()
    @State private var tvStackID = UUID()
    @State private var downloadsStackID = UUID()
    @State private var moreStackID = UUID()
    
    // Count of downloads in progress or waiting
    var activeDownloadsCount: Int {
        downloadManager.downloads.filter { $0.state == .downloading || $0.state == .queued || $0.state == .waiting }.count
    }
    
    // Helper to pop a specific tab to root
    private func popToRoot(tabIndex: Int) {
        print("🔄 [TabView] Pop to root for tab \(tabIndex)")
        
        withAnimation(.easeInOut(duration: 0.3)) {
            switch tabIndex {
            case 0: 
                print("   - Resetting homePath (count: \(homePath.count))")
                homePath = NavigationPath()
                homeStackID = UUID() // Force reconstruction
            case 1: 
                print("   - Resetting explorePath (count: \(explorePath.count))")
                explorePath = NavigationPath()
                exploreStackID = UUID()
            case 2: 
                print("   - Resetting tvPath (count: \(tvPath.count))")
                tvPath = NavigationPath()
                tvStackID = UUID()
            case 3: 
                print("   - Resetting downloadsPath (count: \(downloadsPath.count))")
                downloadsPath = NavigationPath()
                downloadsStackID = UUID()
            case 4: 
                print("   - Resetting morePath (count: \(morePath.count))")
                morePath = NavigationPath()
                moreStackID = UUID()
            default: break
            }
        }
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            
             // Content Views
            TabView(selection: $selectedTab) {
                // Onglet 1: Accueil
                NavigationStack(path: $homePath) {
                    HomeView()
                }
                .id(homeStackID) // Reset stack when ID changes
                .tag(0)
                 .toolbar(.hidden, for: .tabBar) // Hide native tab bar
                
                // Onglet 2: Explorer (Films & Séries)
                NavigationStack(path: $explorePath) {
                    ExploreView()
                }
                .id(exploreStackID)
                .tag(1)
                 .toolbar(.hidden, for: .tabBar)
                
                // Onglet 3: TV Direct
                NavigationStack(path: $tvPath) {
                    TVChannelsView()
                }
                .id(tvStackID)
                .tag(2)
                 .toolbar(.hidden, for: .tabBar)
                
                // Onglet 4: Téléchargements
                NavigationStack(path: $downloadsPath) {
                    DownloadsView()
                }
                .id(downloadsStackID)
                .tag(3)
                 .toolbar(.hidden, for: .tabBar)
                
                // Onglet 5: Plus (Menu)
                NavigationStack(path: $morePath) {
                    MoreView()
                }
                .id(moreStackID)
                .tag(4)
                 .toolbar(.hidden, for: .tabBar)
            }
             .ignoresSafeArea() // Allow content to extend behind the floating bar
            
            // Custom Floating Tab Bar
             CustomTabBar(
                 selectedTab: $selectedTab,
                 theme: theme,
                 activeDownloadsCount: activeDownloadsCount,
                 onTabTap: { tabIndex in
                     // When switching to a different tab, pop that tab to root
                     popToRoot(tabIndex: tabIndex)
                 },
                 onTabDoubleTap: { tabIndex in
                     // Pop to root for the tapped tab (same tab tapped again)
                     popToRoot(tabIndex: tabIndex)
                 }
             )
        }
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
