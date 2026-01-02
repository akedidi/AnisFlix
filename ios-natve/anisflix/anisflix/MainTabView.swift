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
            .overlay(
                // Camembert overlay using UIKit introspection
                TabBarCamembertOverlay(progress: downloadManager.globalProgress)
            )
        }
        .onAppear {
            configureTabBarAppearance()
        }
    }
    
    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundEffect = UIBlurEffect(style: .dark)
        appearance.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        
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

// UIKit-based overlay to get exact tab item position
struct TabBarCamembertOverlay: UIViewRepresentable {
    let progress: Double
    
    func makeUIView(context: Context) -> CamembertOverlayView {
        return CamembertOverlayView(progress: progress)
    }
    
    func updateUIView(_ uiView: CamembertOverlayView, context: Context) {
        uiView.progress = progress
    }
}

class CamembertOverlayView: UIView {
    var progress: Double {
        didSet {
            setNeedsDisplay()
        }
    }
    
    private let shapeLayer = CAShapeLayer()
    
    init(progress: Double) {
        self.progress = progress
        super.init(frame: .zero)
        backgroundColor = .clear
        isUserInteractionEnabled = false
        
        shapeLayer.fillColor = UIColor.clear.cgColor
        shapeLayer.strokeColor = UIColor(AppTheme.primaryRed).cgColor
        shapeLayer.lineWidth = 2.5
        shapeLayer.lineCap = .round
        layer.addSublayer(shapeLayer)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        updateCamembertPosition()
    }
    
    private func updateCamembertPosition() {
        guard progress > 0.01 && progress < 0.99 else {
            shapeLayer.isHidden = true
            return
        }
        
        shapeLayer.isHidden = false
        
        // Find the UITabBar in the view hierarchy
        guard let tabBar = findTabBar(in: window) else { return }
        
        // Get the Downloads tab item (index 3)
        let downloadTabIndex = 3
        guard downloadTabIndex < tabBar.items?.count ?? 0 else { return }
        
        // Find the tab bar button for Downloads
        let tabBarButtons = tabBar.subviews.filter { String(describing: type(of: $0)) == "UITabBarButton" }
        guard downloadTabIndex < tabBarButtons.count else { return }
        
        let downloadButton = tabBarButtons[downloadTabIndex]
        
        // Get the center of the download button in our coordinate system
        let buttonCenter = downloadButton.convert(CGPoint(x: downloadButton.bounds.midX, y: downloadButton.bounds.midY), to: self)
        
        // Create circle path
        let radius: CGFloat = 13 // Half of 26
        let circlePath = UIBezierPath(
            arcCenter: buttonCenter,
            radius: radius,
            startAngle: -.pi / 2,
            endAngle: -.pi / 2 + (2 * .pi * progress),
            clockwise: true
        )
        
        shapeLayer.path = circlePath.cgPath
        shapeLayer.frame = bounds
    }
    
    private func findTabBar(in view: UIView?) -> UITabBar? {
        guard let view = view else { return nil }
        
        if let tabBar = view as? UITabBar {
            return tabBar
        }
        
        for subview in view.subviews {
            if let tabBar = findTabBar(in: subview) {
                return tabBar
            }
        }
        
        return nil
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
