//
//  anisflixApp.swift
//  anisflix
//
//  Created by An!s Kedidi on 25/11/2025.
//

import SwiftUI
import AVFoundation

@main
struct anisflixApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var theme = AppTheme.shared
    @AppStorage("mainSelectedTab") private var selectedTab = 0
    
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
            MainTabView(selectedTab: $selectedTab)
                .preferredColorScheme(theme.isDarkMode ? .dark : .light)
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
}
