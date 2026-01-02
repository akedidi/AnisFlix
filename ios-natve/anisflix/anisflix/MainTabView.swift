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
    
    var body: some View {
        ZStack(alignment: .bottom) {
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
            // SwiftUI native blur - iOS 16+ compatible
            .toolbarBackground(.visible, for: .tabBar)
            .toolbarBackground(.ultraThinMaterial, for: .tabBar)
            
            // Camembert overlay for downloads progress
            if downloadManager.globalProgress > 0.01 && downloadManager.globalProgress < 0.99 {
                CamembertOverlay(progress: downloadManager.globalProgress)
            }
        }
        .onAppear {
            configureTabBarColors()
        }
    }
    
    // Only configure colors, not background (handled by toolbarBackground)
    private func configureTabBarColors() {
        UITabBar.appearance().unselectedItemTintColor = UIColor.systemGray
        UITabBar.appearance().tintColor = UIColor(AppTheme.primaryRed)
    }
}

// Simple SwiftUI overlay for camembert - positioned using GeometryReader
struct CamembertOverlay: View {
    let progress: Double
    
    var body: some View {
        GeometryReader { geometry in
            // Calculate position: 4th tab (index 3) out of 5 visible tabs
            // On iPhone, iOS shows max 5 tabs, 6th becomes "More"
            let tabCount: CGFloat = 5
            let tabWidth = geometry.size.width / tabCount
            let tabIndex: CGFloat = 3 // Downloads is 4th tab (0-indexed)
            let centerX = tabWidth * tabIndex + tabWidth / 2
            
            // Position at bottom, centered on the icon
            let bottomOffset: CGFloat = 55 // Approximate center of tab icon from bottom
            
            Circle()
                .trim(from: 0, to: progress)
                .stroke(AppTheme.primaryRed, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .frame(width: 28, height: 28)
                .rotationEffect(.degrees(-90))
                .position(x: centerX, y: geometry.size.height - bottomOffset)
        }
        .allowsHitTesting(false)
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
