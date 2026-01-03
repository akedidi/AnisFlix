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
    @ObservedObject var tabBarManager = TabBarManager.shared
    
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
        
        // Get the currently visible NavigationController  
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            print("❌ Could not find window")
            return
        }
        
        // The currently visible NavigationController is the one we want to pop
        func findVisibleNavigationController(from viewController: UIViewController?) -> UINavigationController? {
            guard let viewController = viewController else { return nil }
            
            if let navController = viewController as? UINavigationController {
                // Check if this nav controller has items in its stack
                if navController.viewControllers.count > 1 {
                    return navController
                }
                // If it has children (e.g. contained view controllers), continue searching inside them
                // But usually UINavigationController's children ARE the stack.
            }
            
            // Check presented view controller first (modal/sheet on top)
            if let presented = viewController.presentedViewController {
                if let found = findVisibleNavigationController(from: presented) {
                    return found
                }
            }
            
            // Check children
            for child in viewController.children {
                if let found = findVisibleNavigationController(from: child) {
                    return found
                }
            }
            
            return nil
        }
        
        if let navController = findVisibleNavigationController(from: window.rootViewController) {
            print("✅ Found visible NavigationController with \(navController.viewControllers.count) views in stack")
            navController.popToRootViewController(animated: true)
        } else {
            print("⚠️ No NavigationController with stack > 1 found. Trying fallback ID reset.")
            // Fallback to ID reset to ensure we go back to root anyway
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
        }
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
