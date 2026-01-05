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
    
    // Count of downloads in progress or waiting
    var activeDownloadsCount: Int {
        downloadManager.downloads.filter { $0.state == .downloading || $0.state == .queued || $0.state == .waiting }.count
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Onglet 1: Accueil
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Label(theme.t("nav.home"), systemImage: selectedTab == 0 ? "house.fill" : "house")
            }
            .tag(0)
            
            // Onglet 2: Explorer (Films & Séries)
            NavigationStack {
                ExploreView()
            }
            .tabItem {
                Label("Explorer", systemImage: "magnifyingglass")
            }
            .tag(1)
            
            // Onglet 3: TV Direct
            NavigationStack {
                TVChannelsView()
            }
            .tabItem {
                Label(theme.t("nav.tvChannels"), systemImage: selectedTab == 2 ? "tv.fill" : "tv")
            }
            .tag(2)
            
            // Onglet 4: Téléchargements
            NavigationStack {
                DownloadsView()
            }
            .tabItem {
                Label(theme.t("nav.downloads"), systemImage: selectedTab == 3 ? "arrow.down.circle.fill" : "arrow.down.circle")
            }
            .badge(activeDownloadsCount > 0 ? activeDownloadsCount : 0)
            .tag(3)
            
            // Onglet 5: Favoris
            NavigationStack {
                FavoritesView()
            }
            .tabItem {
                Label(theme.t("nav.favorites"), systemImage: selectedTab == 4 ? "heart.fill" : "heart")
            }
            .tag(4)
            
            // Onglet 6: Paramètres
            NavigationStack {
                SettingsView()
            }
            .tabItem {
                Label(theme.t("nav.settings"), systemImage: selectedTab == 5 ? "gearshape.fill" : "gearshape")
            }
            .tag(5)
        }
        .tint(AppTheme.primaryRed)
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
