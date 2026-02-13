//
//  GlobalPlayerManager.swift
//  anisflix
//
//  Created by AI Assistant on 03/01/2026.
//

import SwiftUI
import Combine
import AVFoundation
import MobileVLCKit

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
    @Published var totalEpisodesInSeason: Int?
    @Published var seriesTitle: String?
    @Published var isLive: Bool = false
    
    // VLC Player Sheet (for MKV/4KHDHub sources)
    @Published var showVLCSheet = false
    @Published var vlcURL: URL?
    @Published var vlcTitle: String?
    @Published var vlcPosterUrl: URL?
    @Published var isVLCMinimized = false // For VLC mini-player
    
    // Server URL for Cast (used for downloaded videos where local file can't be cast)
    private var currentServerUrl: URL?
    
    // Cast Manager reference
    private let castManager = CastManager.shared
    private var cancellables = Set<AnyCancellable>()
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
    
    // Cast control sheet trigger
    @Published var showCastControlSheet = false
    
    private init() {
        // Sync with CastManager state - auto-minimize when cast starts
        castManager.$isConnected
            .dropFirst() // Skip initial value
            .sink { [weak self] isConnected in
                guard let self = self else { return }
                if isConnected && self.isPresented {
                    // Check if this is a session resume (background recovery)
                    if self.castManager.isResumingSession {
                        print("📺 [GlobalPlayerManager] Cast session RESUMED. Skipping auto-load to prevent overwriting playback position.")
                        // We do NOT want to push local state; we want to sync FROM Cast (which handled by CastManager recovery)
                        
                        // Just ensure UI updates
                        DispatchQueue.main.async {
                            self.isMinimised = true
                            self.showCastControlSheet = true
                        }
                        return
                    }
                    
                    // Cast just connected while player is active (Intentional user action)
                    // Transfer current media to Cast with current position
                    if let url = self.currentMediaUrl {
                        let currentPosition = self.playerVM.currentTime
                        print("📺 [GlobalPlayerManager] Cast connected (fresh), transferring playback at \(Int(currentPosition))s")
                        
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
    
    // MARK: - VLC Playback Management
    // (Method removed - reverting to local view model)
    
    // Force stop ALL players (AVPlayer + VLC) to prevent double audio
    func stopAllPlayback() {
        print("🛑 [GlobalPlayerManager] STOP ALL PLAYBACK TRIGGERED")
        
        // 1. Stop AVPlayer
        if playerVM.isPlaying {
            print("   - Stopping AVPlayer")
            playerVM.player.pause()
            playerVM.isPlaying = false
        }
        
        // 2. Stop VLC Player
        // VLC managed locally by View now - no shared instance to stop
        
        // 3. Reset states
        isMinimised = false
        showVLCSheet = false
    }

    // Start playback (replaces current media)
    // serverUrl: Optional URL for Chromecast (used for downloaded videos where local file can't be cast)
    func play(url: URL, title: String, posterUrl: String?, subtitles: [Subtitle], mediaId: Int?, season: Int?, episode: Int?, isLive: Bool, serverUrl: URL? = nil, headers: [String: String]? = nil, provider: String? = nil, language: String? = nil, quality: String? = nil, origin: String? = nil, isFromDownload: Bool = false, localPosterPath: String? = nil) {
        
        // 0. STOP EVERYTHING FIRST
        stopAllPlayback()
        
        // 1. Set Metadata
        print("🎬 [GlobalPlayerManager] Play requested. Title: '\(title)', URL: \(url)")
        self.currentMediaUrl = url
        self.currentTitle = title
        self.currentPosterUrl = posterUrl
        self.currentSubtitles = subtitles
        self.mediaId = mediaId
        self.season = season
        self.episode = episode
        self.isLive = isLive
        self.currentServerUrl = serverUrl // Store server URL for Cast (downloaded videos)
        self.currentProvider = provider
        self.currentLanguage = language
        self.currentQuality = quality
        self.currentOrigin = origin
        self.isPlayingFromDownload = isFromDownload
        
        // Reset Next Episode State
        self.resetNextEpisodeState()
        
        // Start monitoring for next episode if applicable
        if !isLive, let _ = mediaId, let _ = season, let _ = episode {
             self.startNextEpisodeMonitoring()
        }
        
        // 2. Setup PlayerVM
        playerVM.mediaId = mediaId
        playerVM.season = season
        playerVM.episode = episode
        
        // 3. Determine start time from saved progress
        var startTime: TimeInterval = 0
        if let mid = mediaId, !isLive {
            let progress = WatchProgressManager.shared.getProgress(mediaId: mid, season: season, episode: episode)
            if progress > 0 {
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
            castManager.loadMedia(url: castUrl, title: title, posterUrl: posterUrl.flatMap { URL(string: $0) }, subtitles: subtitles, activeSubtitleUrl: nil, startTime: startTime, isLive: isLive, subtitleOffset: 0, mediaId: mediaId, season: season, episode: episode, totalEpisodesInSeason: self.totalEpisodesInSeason, seriesTitle: self.seriesTitle)
        } else {
             // Detect if we need VLC (MKV/4KHDHub sources)
             print("🔍 [GlobalPlayerManager] Checking for VLC: provider='\(provider ?? "nil")', extension='\(url.pathExtension)'")
             let useVLC = provider?.lowercased() == "4khdhub" || 
                          provider?.lowercased() == "fourkhdhub" ||
                          url.pathExtension.lowercased() == "mkv"
             
             print("🎬 [GlobalPlayerManager] useVLC decision: \(useVLC)")
             
             if useVLC {
                  // Use standalone VLCPlayerView for MKV files (proven to work)
                  print("✅ [GlobalPlayerManager] MKV/4KHDHub source detected, using standalone VLCPlayerView")
                  
                  // Stop AVPlayer if running
                  if playerVM.isPlaying {
                      playerVM.player.pause()
                      playerVM.isPlaying = false
                  }
                  
                  self.vlcURL = url
                  self.vlcTitle = title
                  self.vlcPosterUrl = posterUrl.flatMap { URL(string: $0) }
                  self.showVLCSheet = true
                  return // Don't show standard player
             } else {
             }
             
             // 5. Select Default Subtitle for Local/AirPlay Setup
             var defaultSubtitleUrl: URL? = nil
             if !subtitles.isEmpty {
                 // Try to match current language preference if possible
                 let pref = self.currentLanguage?.lowercased() ?? "vf"
                 if let match = subtitles.first(where: { $0.code.lowercased().contains(pref) || $0.label.lowercased().contains(pref) }) {
                     print("📝 [GlobalPlayerManager] Auto-selected default subtitle: \(match.label)")
                     defaultSubtitleUrl = URL(string: match.url)
                 } else {
                     // Fallback to first one
                     print("📝 [GlobalPlayerManager] Fallback to first subtitle: \(subtitles[0].label)")
                     defaultSubtitleUrl = URL(string: subtitles[0].url)
                 }
             }
             
             playerVM.setup(url: url, title: title, posterUrl: posterUrl, localPosterPath: localPosterPath, customHeaders: headers, useVLCPlayer: false, subtitleUrl: defaultSubtitleUrl)
             
             // Seek to saved position after a short delay
             if startTime > 0 {
                 DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                     self?.playerVM.seek(to: startTime)
                 }
             }
             
             // Start playback
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
        
        // Normal close - stop playback (both AVPlayer and VLC)
        if playerVM.useVLC {
            playerVM.stopVLC()
        } else {
            playerVM.player.pause()
        }
        isPresented = false
        isMinimised = false
        currentMediaUrl = nil
    }
    
    /// Restore player from PiP mode
    func restoreFromPiP() {
        isPresented = true
        isMinimised = false
    }
    
    // MARK: - Next Episode Logic
    
    @Published var nextEpisode: (number: Int, season: Int)?
    @Published var nextEpisodeTitle: String = ""
    @Published var showNextEpisodePrompt: Bool = false
    @Published var nextEpisodeCountdown: Int = 5
    @Published var isLoadingNextEpisode: Bool = false
    private var nextEpisodeTimer: Timer?
    private var nextEpisodeCancellable: AnyCancellable?
    private var castCancellable: AnyCancellable?
    private var hasCheckedForNextEpisode = false
    private var userCancelledAutoPlay = false
    
    // Current Playback Metadata for matching
    @Published var currentProvider: String?
    private var currentLanguage: String? // VF, VOSTFR, VO
    private var currentQuality: String? // HD, 360p, 480p, 1080p, etc.
    private var currentOrigin: String? // Scraper origin: "fstream", "moviebox", "vixsrc", etc.
    private var isPlayingFromDownload: Bool = false // Playback mode: true = downloaded, false = streaming
    
    func resetNextEpisodeState() {
        nextEpisode = nil
        nextEpisodeTitle = ""
        showNextEpisodePrompt = false
        nextEpisodeCountdown = 10
        nextEpisodeTimer?.invalidate()
        nextEpisodeTimer = nil
        
        nextEpisodeCancellable?.cancel()
        nextEpisodeCancellable = nil
        
        castCancellable?.cancel()
        castCancellable = nil
        
        hasCheckedForNextEpisode = false
        userCancelledAutoPlay = false
    }
    
    func startNextEpisodeMonitoring() {
        // Only for Series
        guard mediaId != nil, season != nil, episode != nil else { return }
        
        // 1. Monitor LOCAL Player progress
        nextEpisodeCancellable = playerVM.$currentTime
            .combineLatest(playerVM.$duration)
            .receive(on: RunLoop.main)
            .sink { [weak self] time, duration in
                guard let self = self else { return }
                
                // IGNORE LOCAL UPDATES if casting (CastManager takes precedence)
                if CastManager.shared.isConnected { return }
                
                // Only process if valid duration
                guard duration > 0 else { return }
                
                self.handleProgressUpdate(time: time, duration: duration)
            }
            
        // 2. Monitor CAST Player progress
        print("📡 [Monitor] Starting CAST monitoring...")
        castCancellable = CastManager.shared.$currentTime
            .receive(on: RunLoop.main)
            .sink { [weak self] time in
                guard let self = self else { return }
                
                // ONLY process if casting
                guard CastManager.shared.isConnected else { return }
                
                // IGNORE updates if Cast is still playing PREVIOUS media (ghost state)
                guard CastManager.shared.isPlayingCurrentMedia else { return }
                
                // IGNORE if explicitly loading new media (spinner active)
                // This prevents "briefly jumping to end" issues during transition
                guard !CastManager.shared.isLoadingMedia else { return }
                
                let duration = CastManager.shared.currentDuration
                
                // Debug log for Cast specific issues
                if Int(time) % 5 == 0 {
                    // print("📡 [Monitor] Cast Tick: \(Int(time))/\(Int(duration))")
                }
                
                guard duration > 0 else { return }
                
                self.handleProgressUpdate(time: time, duration: duration)
            }
    }
    
    // Extracted logic to handle updates from either source
    private func handleProgressUpdate(time: Double, duration: Double) {
        
        // Glitch Protection:
        // Sometimes Cast reports duration=time momentarily, or duration=buffered.
        // If we are at the very beginning (< 2 mins), NEVER trigger end detection.
        // Assuming episodes are > 5 mins.
        if time < 120 && duration > 300 { return }
        // Absolute safety for short videos
        if time < 60 { return }
        
        let timeLeft = duration - time
        
        // Only log every ~5 seconds to avoid spam
        if Int(time) % 5 == 0 && time > 0 && timeLeft <= 25 {
            print("📊 [Monitor] time=\(Int(time))s, timeLeft=\(Int(timeLeft))s, isLoading=\(self.isLoadingNextEpisode), cancelled=\(self.userCancelledAutoPlay), checked=\(self.hasCheckedForNextEpisode), nextEp=\(self.nextEpisode != nil)")
        }
        
        // Stop monitoring if already loading next episode
        if self.isLoadingNextEpisode {
            return
        }
        
        // Window Logic: Last 20 seconds (increased from 10)
        let promptWindow: Double = 20.0
        
        if timeLeft <= promptWindow {
            // Respect user cancellation
            if self.userCancelledAutoPlay {
                if Int(time) % 5 == 0 { print("⚠️ [Monitor] BLOCKED: userCancelledAutoPlay=true") }
                return
            }
            
            // 1. Fetch Data if needed (ensure we fetch before the window fully hits if possible, but here we trigger on window entry)
            if !self.hasCheckedForNextEpisode {
                print("📡 [Monitor] Triggering prepareNextEpisode (first time in \(Int(promptWindow))s window)")
                self.hasCheckedForNextEpisode = true
                Task {
                    await self.prepareNextEpisode()
                }
            }
            
            // 2. Show Prompt & Sync Timer (only if we have next episode data)
            if self.nextEpisode != nil {
                if !self.showNextEpisodePrompt {
                    print("📺 [Monitor] Showing next episode prompt")
                    self.showNextEpisodePrompt = true
                }
                // Sync countdown to actual video time
                self.nextEpisodeCountdown = max(0, Int(ceil(timeLeft)))
            }
            
            // 3. Auto-play at end (use nextEpisode != nil for robustness)
            // Use 1.0s buffer. For Cast, sometimes streams end or buffer, so 1s is safe.
            if timeLeft <= 1.0 && self.nextEpisode != nil {
                print("⏭️ [GlobalPlayerManager] Time finished (<=1s), auto-playing next episode")
                self.playNextEpisode()
            }
            
        } else {
            // Outside Window (e.g. sought back) - Hide Prompt
            self.userCancelledAutoPlay = false // Reset cancellation if they seek back
            
            if self.showNextEpisodePrompt {
                self.showNextEpisodePrompt = false
            }
            
            // If we seek back significantly, should we reset hasCheckedForNextEpisode?
            // Maybe not, to avoid re-fetching the SAME next episode info.
        }
    }
    
    @MainActor
    func prepareNextEpisode() async {
        guard let mid = mediaId, let s = season, let e = episode else { return }
        
        // 1. Check if next episode exists
        if let next = await StreamingService.shared.fetchNextEpisodeDetails(seriesId: mid, currentSeason: s, currentEpisode: e) {
            self.nextEpisode = (number: next.episode, season: next.season)
            
            // Fetch Series Name for formatted title
            var seriesName = ""
            if let seriesDetails = try? await TMDBService.shared.fetchSeriesDetails(seriesId: mid) {
                seriesName = seriesDetails.name
            }
            
            // Format: "Series Name - SxEx - Episode Name"
            // Placeholder init
            var episodeTitle = "Episode \(next.episode)"
            
            // Try to look up Downloaded title if available
            if let downloaded = DownloadManager.shared.getDownload(mediaId: mid, season: next.season, episode: next.episode) {
                // Downloaded title usually is just episode name or full name? 
                // DownloadItem.title is usually just episode title (see DownloadedMediaDetailView logic)
                episodeTitle = downloaded.title
            } else {
                // Fetch real title from TMDB
                 if let details = try? await TMDBService.shared.fetchSeasonDetails(seriesId: mid, seasonNumber: next.season) {
                    let episodes = details.episodes
                    if let ep = episodes.first(where: { $0.episodeNumber == next.episode }) {
                         episodeTitle = ep.name
                    }
                 }
            }
            
            self.nextEpisodeTitle = "\(seriesName) - S\(next.season)E\(next.episode) - \(episodeTitle)"
            
            // 2. Ready to show (StartNextEpisodeMonitoring will pick this up on next tick)
            // We don't need manual timer anymore
        } else {
            // NO NEXT EPISODE: This is the last episode of the series
            print("🚫 [GlobalPlayerManager] No next episode available - this is the last episode")
            self.nextEpisode = nil
            self.nextEpisodeTitle = ""
            self.showNextEpisodePrompt = false // Ensure prompt is hidden
        }
    }
    
    func startCountdown() {
        // Deprecated: Countdown is now synced with player progress in startNextEpisodeMonitoring
    }
    
    func cancelNextEpisode() {
        showNextEpisodePrompt = false
        nextEpisodeTimer?.invalidate()
        userCancelledAutoPlay = true
    }
    
    func playNextEpisode() {
        guard let next = nextEpisode, let seriesId = mediaId else { return }
        
        // Prevent re-entry if already loading
        if isLoadingNextEpisode { return }
        isLoadingNextEpisode = true
        
        cancelNextEpisode() // Hide UI
        isMinimised = false // Ensure fullscreen
        
        // Start Background Task to keep app alive during transition (e.g. while locked with screen off)
        self.backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in
            self?.endBackgroundTask()
        }
        
        // Load it
        Task {
            await loadAndPlayEpisode(seriesId: seriesId, season: next.season, episode: next.number)
            self.endBackgroundTask()
        }
    }
    
    private func endBackgroundTask() {
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
    }
    
    @MainActor
    private func loadAndPlayEpisode(seriesId: Int, season: Int, episode: Int) async {
        // isLoadingNextEpisode is handled by caller (playNextEpisode)
        
        defer {
            self.isLoadingNextEpisode = false
        }
        
        // 1. Display current playback mode and state
        print("═══════════════════════════════════════════════════════")
        print("⏭️ [NextEpisode] Loading S\(season)E\(episode) for series \(seriesId)")
        print("⏭️ [NextEpisode] Current state:")
        print("   - currentProvider: \(self.currentProvider ?? "nil")")
        print("   - currentLanguage: \(self.currentLanguage ?? "nil")")
        print("   - currentQuality: \(self.currentQuality ?? "nil")")
        print("   - currentOrigin: \(self.currentOrigin ?? "nil") ← CRITICAL FOR TARGETED FETCH")
        print("   - isPlayingFromDownload: \(self.isPlayingFromDownload) ← PLAYBACK MODE")
        print("═══════════════════════════════════════════════════════")
        
        // 2. MODE-BASED LOGIC: Download mode vs Streaming mode
        if self.isPlayingFromDownload {
            // ═══════════════════════════════════════════════════════
            // DOWNLOAD MODE: Only check downloads, no streaming
            // ═══════════════════════════════════════════════════════
            print("📂 [NextEpisode] MODE: DOWNLOAD - Checking for downloaded episode only...")
            
            // 1. Get all completed downloads for this episode matching the current language
            let candidates = DownloadManager.shared.downloads.filter { item in
                return item.mediaId == seriesId &&
                       item.season == season &&
                       item.episode == episode &&
                       item.state == .completed &&
                       (self.currentLanguage == nil || item.language.lowercased().contains(self.currentLanguage!.lowercased()))
            }
            
            if candidates.isEmpty {
                 print("❌ [NextEpisode] No downloaded episode found for language \(self.currentLanguage ?? "any"). Stopping auto-play.")
                 return
            }
            
            // 2. Prioritize SAME PROVIDER if exists
            var selectedDownload: DownloadItem? = nil
            
            if let currentProvider = self.currentProvider {
                // Try to find a download with the same provider
                // Note: 'provider' might be nil for old downloads, so they won't match, which is expected behavior
                if let match = candidates.first(where: { $0.provider == currentProvider }) {
                    print("✅ [NextEpisode] Found exact match (Language + Provider: \(currentProvider))")
                    selectedDownload = match
                }
            }
            
            // 3. Fallback: Take the first one if no provider match
            if selectedDownload == nil {
                print("⚠️ [NextEpisode] No exact provider match (or provider not set). Using first available candidate.")
                selectedDownload = candidates.first
            }
            
            if let downloaded = selectedDownload,
               let localUrl = downloaded.localVideoUrl {
                
                print("✅ [NextEpisode] Playing downloaded episode: \(downloaded.title)")
                print("   - Download language: \(downloaded.language)")
                print("   - Download provider: \(downloaded.provider ?? "unknown")")
                print("   - Local URL: \(localUrl.lastPathComponent)")
                
                self.play(
                    url: localUrl,
                    title: self.nextEpisodeTitle.isEmpty ? downloaded.title : self.nextEpisodeTitle,
                    posterUrl: self.currentPosterUrl,
                    subtitles: [],
                    mediaId: seriesId,
                    season: season,
                    episode: episode,
                    isLive: false,
                    serverUrl: nil,
                    provider: downloaded.provider ?? self.currentProvider, // Update provider if known
                    language: downloaded.language,
                    quality: downloaded.quality,
                    origin: self.currentOrigin, 
                    isFromDownload: true, // Stay in download mode
                    localPosterPath: downloaded.localPosterPath
                )
                return
            } else {
                print("❌ [NextEpisode] Download found but local URL is missing. Stopping.")
                return
            }
        }
        
        // ═══════════════════════════════════════════════════════
        // STREAMING MODE: Go directly to streaming fetch (skip download check)
        // ═══════════════════════════════════════════════════════
        print("🌐 [NextEpisode] MODE: STREAMING - Fetching sources from origin: \(self.currentOrigin ?? "nil")...")
        
        // 2. Fetch Metadata FIRST (to ensure we have title for all providers)
        print("═══════════════════════════════════════════════════════")
        print("⏭️ [NextEpisode] Loading S\(season)E\(episode) for series \(seriesId)")
        print("⏭️ [NextEpisode] MATCHING CRITERIA:")
        print("   - Previous Provider: \(self.currentProvider ?? "nil")")
        print("   - Previous Language: \(self.currentLanguage ?? "nil")")
        print("   - Previous Quality: \(self.currentQuality ?? "nil")")
        print("═══════════════════════════════════════════════════════")
        
        do {
            print("📡 [NextEpisode] Fetching metadata first...")
            async let seriesDetailsTask = TMDBService.shared.fetchSeriesDetails(seriesId: seriesId)
            async let seasonDetailsTask = TMDBService.shared.fetchSeasonDetails(seriesId: seriesId, seasonNumber: season)
            
            let (seriesDetails, seasonDetails) = try await (seriesDetailsTask, seasonDetailsTask)
            
            // Construct TmdbSeriesInfo to pass to StreamingService
            // This prevents double-fetching and race conditions
            var seasonsInfo: [StreamingService.TmdbSeasonInfo] = []
            if let seasons = seriesDetails.seasons {
                seasonsInfo = seasons.map { StreamingService.TmdbSeasonInfo(seasonNumber: $0.seasonNumber, episodeCount: $0.episodeCount) }
            }
            // NOTE: genreIds might be missing in full detail response if mapped differently, assume empty or extract if available
            // TMDBService.Series usually has genres: [Genre] where Genre has id.
            let genreIds = seriesDetails.genres.map { $0.id }
            
            let tmdbInfo = StreamingService.TmdbSeriesInfo(
                title: seriesDetails.name,
                seasons: seasonsInfo,
                genreIds: genreIds
            )
            
            print("📡 [NextEpisode] Metadata complete. Fetching sources with pre-filled info...")
            
            print("📡 [NextEpisode] Metadata complete. Fetching sources with pre-filled info...")
            
            // OPTIMIZATION: Try targeted fetch first based on current ORIGIN (scraper source)
            var sources: [StreamingSource] = []
            
            if let origin = self.currentOrigin, !origin.isEmpty {
                print("✅ [NextEpisode] Checking for targeted ORIGIN: '\(origin)'")
                print("🎯 [NextEpisode] Attempting TARGETED fetch for origin: \(origin)")
                sources = (try? await StreamingService.shared.fetchNextEpisodeSources(
                    targetProvider: origin, // Use origin (fstream, moviebox, etc.) not provider (vidzy, vidmoly, etc.)
                    seriesId: seriesId,
                    season: season,
                    episode: episode,
                    tmdbInfo: tmdbInfo
                )) ?? []
                
                if !sources.isEmpty {
                    print("✅ [NextEpisode] Targeted fetch SUCCESS! Found \(sources.count) sources from \(origin)")
                } else {
                    print("❌ [NextEpisode] Targeted fetch yielded 0 sources for \(origin)")
                }
            } else {
                 print("⚠️ [NextEpisode] Current origin is nil or empty. Skipping targeted fetch.")
            }
            
            // Fallback to full fetch if targeted fetch failed or found nothing
            if sources.isEmpty {
                print("⚠️ [NextEpisode] Falling back to FULL fetch (Targeted fetch failed or skipped)...")
                sources = try await StreamingService.shared.fetchSeriesSources(
                    seriesId: seriesId,
                    season: season,
                    episode: episode,
                    tmdbInfo: tmdbInfo
                )
            }
            
            print("📡 [NextEpisode] Sources fetch complete!")
            print("   - Sources found: \(sources.count)")
            
            // Log sources by language
            let vfSources = sources.filter { $0.language.lowercased().contains("vf") || $0.language.lowercased().contains("french") }
            let vostfrSources = sources.filter { $0.language.lowercased().contains("vostfr") }
            let voSources = sources.filter {
                let lang = $0.language.lowercased()
                return !lang.contains("vf") && !lang.contains("french") && !lang.contains("vostfr")
            }
            print("   - VF sources: \(vfSources.count)")
            print("   - VOSTFR sources: \(vostfrSources.count)")
            print("   - VO sources: \(voSources.count)")
            
            // 3. Construct Correct Title
            let seriesName = seriesDetails.name
            var episodeName = "Episode \(episode)"
            
            if let ep = seasonDetails.episodes.first(where: { $0.episodeNumber == episode }) {
                episodeName = ep.name
            }
            
            let fullTitle = "\(seriesName) - S\(season)E\(episode) - \(episodeName)"
            print("🎬 [NextEpisode] Title: \(fullTitle)")
            
            // 4. Match Source
            print("🔍 [NextEpisode] Finding matching source...")
            let bestSource = StreamingService.shared.findMatchingSource(
                sources: sources,
                previousProvider: self.currentProvider ?? "",
                previousLanguage: self.currentLanguage ?? "",
                previousQuality: self.currentQuality ?? ""
            )
            
            guard let source = bestSource else {
                print("❌ [NextEpisode] No sources found for next episode!")
                return
            }
            
            print("═══════════════════════════════════════════════════════")
            print("✅ [NextEpisode] SELECTED SOURCE:")
            print("   - Provider: \(source.provider)")
            print("   - Language: \(source.language)")
            print("   - Quality: \(source.quality)")
            print("   - URL: \(source.url.prefix(80))...")
            print("═══════════════════════════════════════════════════════")
            
            // 5. Extract (if needed)
            print("⛏️ [NextEpisode] Extracting direct link...")
            let playableSource = await StreamingService.shared.extractDirectLink(for: source)
            print("✅ [NextEpisode] Extraction complete: \(playableSource.url.prefix(80))...")
            
            // 6. Fetch Subtitles (if enabled/needed)
            var subtitles: [Subtitle] = []
            if let externalIds = seriesDetails.externalIds, let imdbId = externalIds.imdbId {
                print("📝 [NextEpisode] Fetching subtitles for IMDB: \(imdbId)...")
                subtitles = await StreamingService.shared.getSubtitles(imdbId: imdbId, season: season, episode: episode)
                print("📝 [NextEpisode] Found \(subtitles.count) subtitles")
            }
            
            // 7. PLAY (Use prepared full title)
            // 7. PLAY (Use prepared full title)
            print("▶️ [NextEpisode] Starting playback with origin=\(source.origin ?? "nil"), provider=\(source.provider), language=\(source.language), quality=\(source.quality)")
            self.play(
                url: URL(string: playableSource.url)!,
                title: fullTitle,
                posterUrl: self.currentPosterUrl,
                subtitles: subtitles,
                mediaId: seriesId,
                season: season,
                episode: episode,
                isLive: false,
                serverUrl: nil,
                headers: playableSource.headers,
                provider: source.provider,
                language: source.language,
                quality: source.quality,
                origin: source.origin, // KEY: Pass origin (fstream, moviebox, etc.) for targeted next-episode fetch
                isFromDownload: false // STREAMING MODE: Stay in streaming mode for next episode
            )
            
        } catch {
            print("❌ [GlobalPlayerManager] Failed to load next episode: \(error)")
        }
    }
}

