//
//  anisflixApp.swift
//  anisflix
//
//  Created by An!s Kedidi on 25/11/2025.
//

import SwiftUI
import UIKit
import AVFoundation

@main
struct anisflixApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var theme = AppTheme.shared
    @AppStorage("mainSelectedTab") private var selectedTab = 0
    @State private var isReady = false
    
    init() {
        // Configure Audio Session for Playback (AirPlay, PiP, Background)
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to configure AudioSession: \(error)")
        }
        
        // Initialize Google Cast
        CastManager.shared.initialize()
    }
    
    var body: some Scene {
        WindowGroup {
            // Note: When using CustomSceneDelegate, this WindowGroup behaves differently or might be bypassed for the main window,
            // but we keep it for valid SwiftUI App structure.
            // However, the CustomSceneDelegate below will take over the main window creation.
            RootContentView()
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    
    /// Global orientation lock. Defaults to portrait.	
    static var orientationLock = UIInterfaceOrientationMask.portrait
    
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        print("🔄 Handling background session events for: \(identifier)")
        DownloadManager.shared.backgroundCompletionHandler = completionHandler
    }
    
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        print("🔄 AppDelegate: supportedInterfaceOrientationsFor called. Lock: \(AppDelegate.orientationLock.rawValue)")
        return AppDelegate.orientationLock
    }
    
    // Connect the CustomSceneDelegate
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        config.delegateClass = CustomSceneDelegate.self
        return config
    }
}

/// Custom SceneDelegate to use our custom UIHostingController
class CustomSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        

        
        // Create our custom hosting controller with the root view
        let rootView = RootContentView()
        let hostingController = HomeIndicatorHostingController(rootView: rootView)
        
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = hostingController
        window?.makeKeyAndVisible()
    }
    

}

/// Custom UIHostingController that properly propagates home indicator preferences
class HomeIndicatorHostingController<Content: View>: UIHostingController<Content> {
    
    override init(rootView: Content) {
        super.init(rootView: rootView)
        
        // Listen for visibility changes from the shared state manager
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(updateHomeIndicator),
            name: .homeIndicatorVisibilityChanged,
            object: nil
        )
    }
    
    @MainActor required dynamic init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func updateHomeIndicator() {
        setNeedsUpdateOfHomeIndicatorAutoHidden()
        setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
        setNeedsStatusBarAppearanceUpdate()
    }
    
    override var prefersHomeIndicatorAutoHidden: Bool {
        return HomeIndicatorState.shared.shouldHide
    }
    
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge {
        return HomeIndicatorState.shared.shouldHide ? .bottom : []
    }
    
    override var prefersStatusBarHidden: Bool {
        return HomeIndicatorState.shared.shouldHide
    }
    
    /// This is the KEY method - it tells the system to ask THIS controller for home indicator preferences
    /// instead of looking at children
    override var childForHomeIndicatorAutoHidden: UIViewController? {
        return nil // Return nil so THIS controller's prefersHomeIndicatorAutoHidden is used
    }
    
    override var childForScreenEdgesDeferringSystemGestures: UIViewController? {
        return nil
    }
    
    override var childForStatusBarHidden: UIViewController? {
        return nil
    }
}

/// Wrapper view that contains the main app content
struct RootContentView: View {
    @StateObject private var theme = AppTheme.shared
    @AppStorage("mainSelectedTab") private var selectedTab = 0
    @State private var isReady = false
    
    var body: some View {
        ZStack {
            // Keep showing launch screen image until ready (matching LaunchScreen.storyboard)
            if !isReady {
                Image("LaunchSplash")
                    .resizable()
                    .frame(width: UIScreen.main.bounds.width, height: UIScreen.main.bounds.height)
                    .ignoresSafeArea()
                    .onAppear {
                        // Delay 2 seconds before showing main UI
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                            withAnimation {
                                isReady = true
                            }
                        }
                    }
            } else {
                ZStack(alignment: .bottom) {
                    MainTabView(selectedTab: $selectedTab)
                        .preferredColorScheme(theme.isDarkMode ? .dark : .light)
                        .transition(.opacity)
                    
                    // Persistent Cast Mini Player
                    CastMiniPlayerView(showControlSheet: $showCastSheet)
                        .padding(.bottom, 80) // Sit above Custom TabBar (approx 50 + safe area)
                        .transition(.move(edge: .bottom))
                }
            }
        }
        .tint(AppTheme.primaryRed) // Fix Back Button & Global Tint Color
        .sheet(isPresented: $showCastSheet) {
            CastControlSheet()
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }
    
    @State private var showCastSheet = false
}
