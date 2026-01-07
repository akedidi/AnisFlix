//
//  GlobalPlayerManager.swift
//  anisflix
//
//  Created by AI Assistant on 03/01/2026.
//

import SwiftUI
import Combine
import AVFoundation

class GlobalPlayerManager: ObservableObject {
    static let shared = GlobalPlayerManager()
    
    // Underlying Player ViewModel (reused globally)
    @Published var playerVM = PlayerViewModel()
    
    // Global State
    @Published var isPresented = false // Whether the full player is visible
    @Published var isMinimised = false // Whether the player is currently minimised (in the bar)
    
    // Active Media Metadata
    @Published var currentMediaUrl: URL?
    @Published var currentTitle: String = ""
    @Published var currentPosterUrl: String?
    @Published var currentSubtitles: [Subtitle] = []
    
    // Tracking context for navigation restoration
    @Published var mediaId: Int?
    @Published var season: Int?
    @Published var episode: Int?
    @Published var isLive: Bool = false
    
    // Server URL for Cast (used for downloaded videos where local file can't be cast)
    private var currentServerUrl: URL?
    
    // Cast Manager reference
    private let castManager = CastManager.shared
    private var cancellables = Set<AnyCancellable>()
    
    // Cast control sheet trigger
    @Published var showCastControlSheet = false
    
    private init() {
        // Sync with CastManager state - auto-minimize when cast starts
        castManager.$isConnected
            .dropFirst() // Skip initial value
            .sink { [weak self] isConnected in
                guard let self = self else { return }
                if isConnected && self.isPresented {
                    // Cast just connected while player is active
                    // Transfer current media to Cast with current position
                    if let url = self.currentMediaUrl {
                        let currentPosition = self.playerVM.currentTime
                        print("📺 [GlobalPlayerManager] Cast connected, transferring playback at \(Int(currentPosition))s")
                        
                        // Load media to Cast with current position
                        // For downloaded videos, use serverUrl; otherwise use the media URL
                        let castUrl = self.currentServerUrl ?? url
                        self.castManager.loadMedia(
                            url: castUrl,
                            title: self.currentTitle,
                            posterUrl: self.currentPosterUrl.flatMap { URL(string: $0) },
                            subtitles: self.currentSubtitles,
                            activeSubtitleUrl: nil,
                            startTime: currentPosition,
                            duration: self.playerVM.duration, // Pass local duration for immediate Cast UI
                            isLive: self.isLive,
                            subtitleOffset: 0,
                            mediaId: self.mediaId,
                            season: self.season,
                            episode: self.episode
                        )
                        
                        // Pause local player
                        self.playerVM.player.pause()
                    }
                    
                    // Auto-minimize and show cast control sheet if in fullscreen
                    // Delay slightly to allow mediaStatus to be received from Cast receiver
                    if !self.isMinimised {
                        print("📺 [GlobalPlayerManager] Auto-minimizing and scheduling control sheet display")
                        DispatchQueue.main.async {
                            self.isMinimised = true
                        }
                        
                        // Wait for receiver to load media and send back mediaStatus
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            print("📺 [GlobalPlayerManager] Showing cast control sheet (delayed)")
                            self.showCastControlSheet = true
                        }
                    }
                } else if !isConnected && self.isPresented && self.currentMediaUrl != nil {
                    // Cast just disconnected while we have active media
                    // Resume local playback from Cast position
                    let castPosition = self.castManager.getApproximateStreamPosition()
                    print("📺 [GlobalPlayerManager] Cast disconnected, resuming local playback at \(Int(castPosition))s")
                    
                    DispatchQueue.main.async {
                        // Seek to cast position and resume playback
                        if castPosition > 0 {
                            self.playerVM.seek(to: castPosition)
                        }
                        self.playerVM.player.play()
                        self.playerVM.isPlaying = true
                    }
                }
            }
            .store(in: &cancellables)
    }
    
    // Start playback (replaces current media)
    // serverUrl: Optional URL for Chromecast (used for downloaded videos where local file can't be cast)
    func play(url: URL, title: String, posterUrl: String?, subtitles: [Subtitle], mediaId: Int?, season: Int?, episode: Int?, isLive: Bool, serverUrl: URL? = nil, headers: [String: String]? = nil) {
        
        // 1. Set Metadata
        self.currentMediaUrl = url
        self.currentTitle = title
        self.currentPosterUrl = posterUrl
        self.currentSubtitles = subtitles
        self.mediaId = mediaId
        self.season = season
        self.episode = episode
        self.isLive = isLive
        self.currentServerUrl = serverUrl // Store server URL for Cast (downloaded videos)
        
        // 2. Setup PlayerVM
        playerVM.mediaId = mediaId
        playerVM.season = season
        playerVM.episode = episode
        
        // 3. Determine start time from saved progress
        var startTime: TimeInterval = 0
        if let mid = mediaId, !isLive {
            let progress = WatchProgressManager.shared.getProgress(mediaId: mid, season: season, episode: episode)
            if progress > 0 && progress < 0.95 {
                if let savedTime = WatchProgressManager.shared.getSavedTime(mediaId: mid, season: season, episode: episode) {
                    print("⏩ [GlobalPlayerManager] Resuming from saved progress: \(Int(savedTime))s")
                    startTime = savedTime
                }
            }
        }
        
        if castManager.isConnected {
            // For Cast, use serverUrl if provided (downloaded videos), otherwise use url (streaming)
            let castUrl = serverUrl ?? url
            // Note: CastManager currently doesn't support custom headers. 
            // If MovieBox needs headers on Cast, we might need to update CastManager too.
            // But usually Cast loads from URL directly. If URL is signed/proxy, it might work.
            // If headers are needed for authentication, Cast might fail. 
            // For now, focusing on local playback as per user request ("partie video").
            castManager.loadMedia(url: castUrl, title: title, posterUrl: posterUrl.flatMap { URL(string: $0) }, subtitles: subtitles, activeSubtitleUrl: nil, startTime: startTime, isLive: isLive, subtitleOffset: 0, mediaId: mediaId, season: season, episode: episode)
        } else {
             playerVM.setup(url: url, title: title, posterUrl: posterUrl, customHeaders: headers)
             // Seek to saved position after a short delay
             if startTime > 0 {
                 DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                     self?.playerVM.seek(to: startTime)
                 }
             }
             playerVM.player.play()
             playerVM.isPlaying = true
        }

        // 4. Show player
        self.isPresented = true
        self.isMinimised = true // Start minimized (banner visible)
        
        // If casting, staying minimized and show control sheet
        if castManager.isConnected {
            print("📺 [GlobalPlayerManager] Casting active, opening control sheet directly")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.showCastControlSheet = true
            }
        } else {
            // Animate to full screen after a brief moment if local playback
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation(.easeOut(duration: 0.35)) {
                    self.isMinimised = false // Expand to full screen
                }
            }
        }
    }
    
    func toggleMinimise() {
        // Switch between mini and full player
        // IMPORTANT: Do NOT pause playback when minimizing
        withAnimation {
             isMinimised.toggle()
        }
    }
    
    /// Minimize and hide the banner completely (for PiP navigation)
    /// Playback continues in PiP mode
    func minimizeForPiP() {
        withAnimation {
            isMinimised = true
            // Hide the banner completely when PiP is active
            // User can navigate freely
        }
    }
    
    /// Check if PiP is currently active
    var isPiPActive: Bool {
        return playerVM.isPiPActive
    }
    
    func close() {
        // If PiP is active, don't pause - just hide the UI
        if playerVM.isPiPActive {
            print("📺 [GlobalPlayerManager] PiP active, hiding UI but keeping playback")
            isPresented = false
            isMinimised = false
            // Don't pause - PiP will continue
            return
        }
        
        // Normal close - stop playback
        playerVM.player.pause()
        isPresented = false
        isMinimised = false
        currentMediaUrl = nil
    }
    
    /// Restore player from PiP mode
    func restoreFromPiP() {
        isPresented = true
        isMinimised = false
    }
}
