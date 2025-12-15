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
    
    // Init removed, appearance configuration moved to onAppear

    
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
                Label("Explorer", systemImage: selectedTab == 1 ? "magnifyingglass" : "magnifyingglass")
            }
            .tag(1)
            
            // Onglet 3: TV Direct
            NavigationStack {
                TVChannelsView()
            }
            .tabItem {
                Label(theme.t("nav.tvChannels"), systemImage: selectedTab == 2 ? "radio.fill" : "radio")
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
        .tint(AppTheme.primaryRed) // Couleur des icônes sélectionnées
        .onAppear {
            configureTabBarAppearance()
        }
    }
    
    private func configureTabBarAppearance() {
        // Style de la TabBar - sobre et élégant
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(AppTheme.backgroundBlack.opacity(0.98))
        
        // Style des items
        let itemAppearance = UITabBarItemAppearance()
        
        // État normal (non sélectionné)
        itemAppearance.normal.iconColor = UIColor.systemGray
        itemAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor.systemGray,
            .font: UIFont.systemFont(ofSize: 10)
        ]
        
        // État sélectionné
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
        
        // Force unselected color (Legacy fallback)
        UITabBar.appearance().unselectedItemTintColor = UIColor.systemGray
        // Also try to set tintColor to the selected color to ensure contrast
        UITabBar.appearance().tintColor = UIColor(AppTheme.primaryRed)
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
