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
    
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                // Onglet 1: Accueil
                NavigationStack { HomeView() }
                    .tag(0)
                
                // Onglet 2: Explorer
                NavigationStack { ExploreView() }
                    .tag(1)
                
                // Onglet 3: TV Direct
                NavigationStack { TVChannelsView() }
                    .tag(2)
                
                // Onglet 4: Téléchargements
                NavigationStack { DownloadsView() }
                    .tag(3)
                
                // Onglet 5: Favoris
                NavigationStack { FavoritesView() }
                    .tag(4)
                
                // Onglet 6: Paramètres
                NavigationStack { SettingsView() }
                    .tag(5)
            }
            .toolbar(.hidden, for: .tabBar) // Hide native bar (iOS 16+)
             // Fallack for older iOS if needed, but assuming strict iOS 16+ for new features
            
            // Custom Tab Bar Overlay
            CustomTabBar(selectedTab: $selectedTab, theme: theme, downloadProgress: downloadManager.globalProgress)
        }
        .ignoresSafeArea(.keyboard) // Prevent keyboard pushing tab bar up oddly
    }
    
    // Removed configureTabBarAppearance as native bar is hidden
}

struct CustomTabBar: View {
    @Binding var selectedTab: Int
    var theme: AppTheme
    var downloadProgress: Double // 0.0 to 1.0
    
    var body: some View {
        HStack(spacing: 0) {
            TabBarButton(index: 0, icon: "house", selectedIcon: "house.fill", title: theme.t("nav.home"), selectedTab: $selectedTab, theme: theme)
            
            TabBarButton(index: 1, icon: "magnifyingglass", selectedIcon: "magnifyingglass", title: "Explorer", selectedTab: $selectedTab, theme: theme)
            
            TabBarButton(index: 2, icon: "tv", selectedIcon: "tv.fill", title: theme.t("nav.tvChannels"), selectedTab: $selectedTab, theme: theme)
            
            // Dynamic Downloads Button
            DownloadTabBarButton(index: 3, progress: downloadProgress, selectedTab: $selectedTab, theme: theme)
            
            TabBarButton(index: 4, icon: "heart", selectedIcon: "heart.fill", title: theme.t("nav.favorites"), selectedTab: $selectedTab, theme: theme)
            
            TabBarButton(index: 5, icon: "gearshape", selectedIcon: "gearshape.fill", title: theme.t("nav.settings"), selectedTab: $selectedTab, theme: theme)
        }
        .padding(.vertical, 8)
        .padding(.bottom, 20) // Safe Area approximation or use safeAreaInset in ZStack
        .background(
            Color(UIColor(AppTheme.backgroundBlack.opacity(0.98)))
                .ignoresSafeArea()
                .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: -2)
        )
    }
}

struct TabBarButton: View {
    let index: Int
    let icon: String
    let selectedIcon: String
    let title: String
    @Binding var selectedTab: Int
    var theme: AppTheme
    
    var isSelected: Bool { selectedTab == index }
    
    var body: some View {
        Button {
            selectedTab = index
        } label: {
            VStack(spacing: 4) {
                Image(systemName: isSelected ? selectedIcon : icon)
                    .font(.system(size: 20)) // Standard tab size
                Text(title)
                    .font(.system(size: 10))
            }
            .foregroundColor(isSelected ? AppTheme.primaryRed : .gray)
            .frame(maxWidth: .infinity)
        }
    }
}

struct DownloadTabBarButton: View {
    let index: Int
    let progress: Double
    @Binding var selectedTab: Int
    var theme: AppTheme
    
    var isSelected: Bool { selectedTab == index }
    
    var body: some View {
        Button {
            selectedTab = index
        } label: {
            VStack(spacing: 4) {
                ZStack {
                    // Base Icon
                    Image(systemName: isSelected ? "arrow.down.circle.fill" : "arrow.down.circle")
                        .font(.system(size: 20))
                    
                    // Progress Pie / Ring
                    if progress > 0 && progress < 1.0 {
                         Circle()
                            .trim(from: 0, to: progress)
                            .stroke(AppTheme.primaryRed, lineWidth: 2)
                            .rotationEffect(.degrees(-90))
                            .frame(width: 22, height: 22)
                    }
                }
                .frame(width: 24, height: 24)
                
                Text(theme.t("nav.downloads"))
                    .font(.system(size: 10))
            }
            .foregroundColor(isSelected ? AppTheme.primaryRed : .gray)
            .frame(maxWidth: .infinity)
        }
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
