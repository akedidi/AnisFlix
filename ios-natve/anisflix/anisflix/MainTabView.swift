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
    
    // Helper to pop a specific tab to root with native animation
    private func popToRoot(tabIndex: Int) {
        print("🔄 [TabView] Pop to root for tab \(tabIndex)")
        
        // Find the UINavigationController in the SwiftUI view hierarchy
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first,
              let rootViewController = window.rootViewController else {
            print("❌ Could not find root view controller")
            return
        }
        
        // Find all navigation controllers
        func findNavigationController(in viewController: UIViewController) -> UINavigationController? {
            if let navController = viewController as? UINavigationController {
                return navController
            }
            
            for child in viewController.children {
                if let found = findNavigationController(in: child) {
                    return found
                }
            }
            
            if let presented = viewController.presentedViewController {
                return findNavigationController(in: presented)
            }
            
            return nil
        }
        
        if let navController = findNavigationController(in: rootViewController) {
            print("✅ Found UINavigationController, popping to root with animation")
            navController.popToRootViewController(animated: true)
        } else {
            print("⚠️ UINavigationController not found, falling back to ID reset")
            // Fallback to ID reset if UINavigationController not found
            switch tabIndex {
            case 0: homeStackID = UUID()
            case 1: exploreStackID = UUID()
            case 2: tvStackID = UUID()
            case 3: downloadsStackID = UUID()
            case 4: moreStackID = UUID()
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
                }
                .id(homeStackID) // Reset stack when ID changes
                .tag(0)
                 .toolbar(.hidden, for: .tabBar) // Hide native tab bar
                
                // Onglet 2: Explorer
                NavigationStack(path: $explorePath) {
                    ExploreView()
                }
                .id(exploreStackID)
                .tag(1)
                 .toolbar(.hidden, for: .tabBar)
                
                // Onglet 3: TV Channels
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
                 onTabDoubleTap: { tabIndex in
                     // Pop to root when tapping the already-selected tab
                     popToRoot(tabIndex: tabIndex)
                 }
             )
        }
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
