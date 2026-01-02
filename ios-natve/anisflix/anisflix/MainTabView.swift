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
    
    // Count of downloads in progress or waiting
    var activeDownloadsCount: Int {
        downloadManager.downloads.filter { $0.state == .downloading || $0.state == .queued || $0.state == .waiting }.count
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            
             // Content Views
            TabView(selection: $selectedTab) {
                // Onglet 1: Accueil
                NavigationStack(path: $homePath) {
                    HomeView()
                }
                .tag(0)
                 .toolbar(.hidden, for: .tabBar) // Hide native tab bar
                
                // Onglet 2: Explorer (Films & Séries)
                NavigationStack(path: $explorePath) {
                    ExploreView()
                }
                .tag(1)
                 .toolbar(.hidden, for: .tabBar)
                
                // Onglet 3: TV Direct
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
             CustomTabBar(
                 selectedTab: $selectedTab,
                 theme: theme,
                 activeDownloadsCount: activeDownloadsCount,
                 onTabDoubleTap: { tabIndex in
                     // Pop to root for the tapped tab
                     switch tabIndex {
                     case 0: homePath = NavigationPath()
                     case 1: explorePath = NavigationPath()
                     case 2: tvPath = NavigationPath()
                     case 3: downloadsPath = NavigationPath()
                     case 4: morePath = NavigationPath()
                     default: break
                     }
                 }
             )
        }
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}

