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
            MainTabView()
                .preferredColorScheme(theme.isDarkMode ? .dark : .light)
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        print("🔄 Handling background session events for: \(identifier)")
        DownloadManager.shared.backgroundCompletionHandler = completionHandler
    }
}
