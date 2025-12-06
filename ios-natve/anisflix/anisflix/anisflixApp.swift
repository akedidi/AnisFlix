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
    
    @State private var showSplash = true

    var body: some Scene {
        WindowGroup {
            ZStack {
                if showSplash {
                    LaunchScreenView()
                        .transition(.opacity)
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                                withAnimation {
                                    showSplash = false
                                }
                            }
                        }
                } else {
                    MainTabView()
                        .preferredColorScheme(theme.isDarkMode ? .dark : .light)
                }
            }
        }
    }
}

struct LaunchScreenView: View {
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            VStack {
                Image("AppIcon") // Tente d'utiliser l'icône de l'app
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 120, height: 120)
                    .cornerRadius(20)
                
                Text("AnisFlix")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.red)
                    .padding(.top, 20)
            }
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        print("🔄 Handling background session events for: \(identifier)")
        DownloadManager.shared.backgroundCompletionHandler = completionHandler
    }
}
