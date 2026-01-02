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
            
            // Camembert overlay with precise positioning
            if downloadManager.globalProgress > 0.01 && downloadManager.globalProgress < 0.99 {
                TabBarProgressRing(
                    progress: downloadManager.globalProgress,
                    tabIndex: 3  // Downloads tab
                )
            }
        }
        .onAppear {
            configureTabBarAppearance()
        }
    }
    
    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundEffect = UIBlurEffect(style: .systemMaterialDark)
        appearance.backgroundColor = UIColor.black.withAlphaComponent(0.3)
        
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

// Progress ring that finds exact tab position
struct TabBarProgressRing: UIViewRepresentable {
    let progress: Double
    let tabIndex: Int
    
    func makeUIView(context: Context) -> ProgressRingView {
        ProgressRingView(progress: progress, tabIndex: tabIndex)
    }
    
    func updateUIView(_ uiView: ProgressRingView, context: Context) {
        uiView.progress = progress
    }
}

class ProgressRingView: UIView {
    var progress: Double {
        didSet {
            updateRing()
        }
    }
    let tabIndex: Int
    private let shapeLayer = CAShapeLayer()
    
    init(progress: Double, tabIndex: Int) {
        self.progress = progress
        self.tabIndex = tabIndex
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
    
    override func didMoveToWindow() {
        super.didMoveToWindow()
        updateRing()
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        updateRing()
    }
    
    private func updateRing() {
        guard progress > 0.01 && progress < 0.99,
              let window = window,
              let tabBar = findTabBar(in: window) else {
            shapeLayer.isHidden = true
            return
        }
        
        shapeLayer.isHidden = false
        
        // Get tab bar buttons
        let buttons = tabBar.subviews.filter { 
            String(describing: type(of: $0)).contains("UITabBarButton")
        }.sorted { 
            $0.frame.origin.x < $1.frame.origin.x 
        }
        
        guard tabIndex < buttons.count else { return }
        
        let button = buttons[tabIndex]
        
        // Convert button center to our coordinate system
        let buttonCenterInWindow = tabBar.convert(
            CGPoint(x: button.frame.midX, y: button.frame.midY),
            to: window
        )
        let centerInView = convert(buttonCenterInWindow, from: window)
        
        // Create circular path
        let radius: CGFloat = 14
        let path = UIBezierPath(
            arcCenter: centerInView,
            radius: radius,
            startAngle: -.pi / 2,
            endAngle: -.pi / 2 + (2 * .pi * progress),
            clockwise: true
        )
        
        shapeLayer.path = path.cgPath
    }
    
    private func findTabBar(in view: UIView) -> UITabBar? {
        if let tabBar = view as? UITabBar {
            return tabBar
        }
        for subview in view.subviews {
            if let found = findTabBar(in: subview) {
                return found
            }
        }
        return nil
    }
}

#Preview {
    MainTabView(selectedTab: .constant(0))
}
