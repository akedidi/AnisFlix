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
            
            // Camembert overlay - simple GeometryReader approach
            if downloadManager.globalProgress > 0.01 && downloadManager.globalProgress < 0.99 {
                GeometryReader { geometry in
                    let screenWidth = geometry.size.width
                    
                    // With 6 tabs, iOS shows 5 visible + More button
                    // Downloads is the 4th tab (index 3, 0-indexed)
                    // Each visible tab gets equal width
                    let visibleTabs: CGFloat = 5
                    let tabWidth = screenWidth / visibleTabs
                    
                    // Downloads tab center: start at 3rd tab boundary + half tab width
                    let centerX = (tabWidth * 3) + (tabWidth / 2)
                    
                    // Tab bar height ~49pt, icon center ~25pt from bottom
                    let centerY = geometry.size.height - 25
                    
                    Circle()
                        .trim(from: 0, to: downloadManager.globalProgress)
                        .stroke(AppTheme.primaryRed, lineWidth: 2.5)
                        .rotationEffect(.degrees(-90))
                        .frame(width: 28, height: 28)
                        .position(x: centerX, y: centerY)
                }
                .allowsHitTesting(false)
            }
        }
        .onAppear {
            configureTabBarAppearance()
        }
    }
    
    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.black.withAlphaComponent(0.95)
        
        let itemAppearance = UITabBarItemAppearance()
        
        itemAppearance.normal.iconColor = UIColor.systemGray
        itemAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor.systemGray,
            .font: UIFont.systemFont(ofSize: 10)
        ]
        
        itemAppearance.selected.iconColor = UIColor(AppTheme.primaryRed)
        itemAppearance.selected.titleTextAttributes = [
            .foregroundColor: UIColor(AppTheme.primaryRed),
            .font: UIFont.systemFont(ofSize: 10, weight: .semibold)
        ]
        
        appearance.stackedLayoutAppearance = itemAppearance
        appearance.inlineLayoutAppearance = itemAppearance
        appearance.compactInlineLayoutAppearance = itemAppearance
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().unselectedItemTintColor = UIColor.systemGray
        UITabBar.appearance().tintColor = UIColor(AppTheme.primaryRed)
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
