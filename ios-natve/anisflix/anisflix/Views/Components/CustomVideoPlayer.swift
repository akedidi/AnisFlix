//
//  CustomVideoPlayer.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI
import AVKit
import Combine
import MediaPlayer
import MobileVLCKit
#if canImport(GoogleCast)
import GoogleCast
#endif

struct CustomVideoPlayer: View {
    let url: URL
    let title: String
    let posterUrl: String?
    let localPosterPath: String? // Local poster file path for offline artwork
    let subtitles: [Subtitle]
    @Binding var isPresented: Bool
    @Binding var isFullscreen: Bool
    let showFullscreenButton: Bool
    let isLive: Bool
    
    // Progress tracking
    let mediaId: Int?
    let season: Int?
    let episode: Int?
    
    @ObservedObject var playerVM: PlayerViewModel
    @ObservedObject private var globalManager = GlobalPlayerManager.shared
    @StateObject private var castManager = CastManager.shared
    @State private var showControls = true
    @State private var showSubtitlesMenu = false
    @State private var selectedSubtitle: Subtitle?
    @State private var subtitleOffset: Double = 0
    @AppStorage("subtitleFontSize") private var subtitleFontSize: Double = 100
    @State private var castReloadDebounceTask: Task<Void, Never>?
    @State private var showSeekBackwardAnimation = false
    @State private var showSeekForwardAnimation = false
    
    init(url: URL, title: String, posterUrl: String? = nil, localPosterPath: String? = nil, subtitles: [Subtitle] = [], isPresented: Binding<Bool>, isFullscreen: Binding<Bool>, showFullscreenButton: Bool = true, isLive: Bool = false, mediaId: Int? = nil, season: Int? = nil, episode: Int? = nil, playerVM: PlayerViewModel) {
        self.url = url
        self.title = title
        self.posterUrl = posterUrl
        self.localPosterPath = localPosterPath
        self.subtitles = subtitles
        self._isPresented = isPresented
        self._isFullscreen = isFullscreen
        self.showFullscreenButton = showFullscreenButton
        self.isLive = isLive
        self.mediaId = mediaId
        self.season = season
         self.episode = episode
         self.playerVM = playerVM
         
         // Pass IDs to ViewModel for scrobbling
         self.playerVM.mediaId = mediaId
         self.playerVM.season = season
         self.playerVM.episode = episode
     }
    
    var body: some View {
        ZStack {
            
            // Force Hide TabBar when in Fullscreen
            TabBarHider(shouldHide: isFullscreen)
                .frame(width: 0, height: 0)
            

            
            ZStack {
            // Full black background - especially important in fullscreen
            Color.black
                .ignoresSafeArea(.all, edges: .all)
            
            // Video Player
            PlayerContentView(
                castManager: castManager,
                showControls: $showControls,
                isFullscreen: $isFullscreen,
                playerVM: playerVM,
                onDoubleTapBack: {
                    print("⏪ Double tab left: Rewind 10s")
                    withAnimation {
                        showSeekBackwardAnimation = true
                    }
                    
                    let newTime = max(0, playerVM.currentTime - 10)
                    playerVM.seek(to: newTime)
                    
                    Task {
                        try? await Task.sleep(nanoseconds: 600_000_000) // 0.6s
                        await MainActor.run {
                            withAnimation { showSeekBackwardAnimation = false }
                        }
                    }
                },
                onDoubleTapForward: {
                    print("⏩ Double tab right: Forward 10s")
                    withAnimation {
                        showSeekForwardAnimation = true
                    }
                    
                    let newTime = min(playerVM.duration, playerVM.currentTime + 10)
                    playerVM.seek(to: newTime)
                    
                    Task {
                        try? await Task.sleep(nanoseconds: 600_000_000) // 0.6s
                        await MainActor.run {
                            withAnimation { showSeekForwardAnimation = false }
                        }
                    }
                },
                onSingleTap: {
                    withAnimation {
                        showControls.toggle()
                    }
                }
            )
            
             // Seek Animations Overlays
            if showSeekBackwardAnimation {
                HStack {
                    VStack {
                        Image(systemName: "gobackward.10")
                            .font(.system(size: 50))
                            .foregroundColor(.white)
                        Text("-10s")
                            .font(.headline)
                            .foregroundColor(.white)
                    }
                    .padding(30)
                    .background(Circle().fill(Color.black.opacity(0.6)))
                    Spacer()
                }
                .transition(.opacity)
            }
            
            if showSeekForwardAnimation {
                HStack {
                    Spacer()
                    VStack {
                        Image(systemName: "goforward.10")
                            .font(.system(size: 50))
                            .foregroundColor(.white)
                        Text("+10s")
                            .font(.headline)
                            .foregroundColor(.white)
                    }
                    .padding(30)
                    .background(Circle().fill(Color.black.opacity(0.6)))
                }
                .transition(.opacity)
            }
            
            // Loading Overlay for Next Episode
            if globalManager.isLoadingNextEpisode {
                ZStack {
                    Color.black.opacity(0.8)
                        .ignoresSafeArea()
                    VStack(spacing: 16) {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                        Text("Chargement de l'épisode suivant...")
                            .foregroundColor(.white)
                            .font(.headline)
                    }
                }
                .transition(.opacity)
                .zIndex(100)
            }
            
            // Subtitles Overlay
            if !castManager.isConnected, let sub = selectedSubtitle, let text = playerVM.currentSubtitleText {
                VStack {
                    Spacer()
                    Text(parseHtmlTags(text))
                        .font(.system(size: 16 * subtitleFontSize / 100))
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(8)
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(8)
                        .padding(.bottom, isFullscreen ? 0 : 60)
                }
                .transition(.opacity)
            }
            
            // Next Episode Overlay (Netflix Style)
            if globalManager.showNextEpisodePrompt {
                NextEpisodeOverlay(
                    nextEpisodeTitle: globalManager.nextEpisodeTitle,
                    timeLeft: globalManager.nextEpisodeCountdown,
                    onCancel: {
                        globalManager.cancelNextEpisode()
                    },
                    onPlayNow: {
                        globalManager.playNextEpisode()
                    }
                )
                .zIndex(100)
            }
            
            // Controls Overlay - Only when NOT casting
            if showControls && !castManager.isConnected {
                VStack(spacing: 0) {
                    // Top Bar
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .center) {
                            // Minimize Button - Only show when NOT in fullscreen
                            /* Removed as per user request
                            if !isFullscreen {
                                Button {
                                    GlobalPlayerManager.shared.toggleMinimise()
                                } label: {
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 22, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(8)
                                        .background(Circle().fill(Color.black.opacity(0.4)))
                                }
                            }
                            */
                            
                            // Title - Always in the same row as AirPlay
                            if isFullscreen {
                                Text(title)
                                    .foregroundColor(.white)
                                    .font(.headline)
                                    .lineLimit(1)
                                    .multilineTextAlignment(.leading)
                            } else {
                                // Not fullscreen: tappable for navigation
                                Button {
                                    // Navigate to detail page and minimize player
                                    if let mediaId = mediaId {
                                        GlobalPlayerManager.shared.toggleMinimise()
                                        // Post notification to navigate to detail
                                        NotificationCenter.default.post(
                                            name: .navigateToDetail,
                                            object: nil,
                                            userInfo: [
                                                "mediaId": mediaId,
                                                "isMovie": (season == nil && episode == nil)
                                            ]
                                        )
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(title)
                                            .foregroundColor(.white)
                                            .font(.headline)
                                            .lineLimit(1)
                                            .multilineTextAlignment(.leading)
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                }
                            }
                            
                            Spacer()
                            
                            // AirPlay Button (Top Right)
                            AirPlayView()
                                .frame(width: 44, height: 44)
                        }
                    }
                    .padding()
                    .background(
                        LinearGradient(colors: [.black.opacity(0.8), .clear], startPoint: .top, endPoint: .bottom)
                    )
                    
                    Spacer()
                    
                    // Center Controls (Rewind | Play/Pause | Forward)
                    if playerVM.isBuffering {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                    } else {
                        HStack(spacing: 50) {
                            // -10s Button
                            Button {
                                let newTime = max(0, playerVM.currentTime - 10)
                                if castManager.isConnected {
                                    castManager.seek(to: newTime)
                                } else {
                                    playerVM.seek(to: newTime)
                                }
                            } label: {
                                Image(systemName: "gobackward.10")
                                    .font(.system(size: 35))
                                    .foregroundColor(.white)
                            }
                            
                            // Play/Pause Button
                            Button {
                                if castManager.isConnected {
                                    if castManager.mediaStatus?.playerState == .paused || castManager.mediaStatus?.playerState == .idle {
                                        castManager.play()
                                    } else {
                                        castManager.pause()
                                    }
                                } else {
                                    playerVM.togglePlayPause()
                                }
                            } label: {
                                Image(systemName: (castManager.isConnected ? (castManager.mediaStatus?.playerState == .playing || castManager.mediaStatus?.playerState == .buffering) : playerVM.isPlaying) ? "pause.fill" : "play.fill")
                                    .font(.system(size: 60))
                                    .foregroundColor(.white)
                            }
                            
                            // +10s Button
                            Button {
                                let newTime = min(playerVM.duration, playerVM.currentTime + 10)
                                if castManager.isConnected {
                                    castManager.seek(to: newTime)
                                } else {
                                    playerVM.seek(to: newTime)
                                }
                            } label: {
                                Image(systemName: "goforward.10")
                                    .font(.system(size: 35))
                                    .foregroundColor(.white)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // Bottom Bar
                    VStack(spacing: 12) {
                        // Progress Bar
                        // Custom Progress Bar with Tap-to-Seek
                        CustomProgressBar(
                            value: $playerVM.currentTime,
                            total: playerVM.duration
                        ) { editing in
                            playerVM.isSeeking = editing
                            if !editing {
                                if castManager.isConnected {
                                    castManager.seek(to: playerVM.currentTime)
                                } else {
                                    playerVM.seek(to: playerVM.currentTime)
                                }
                            }
                        }
                        .padding(.horizontal, 4)
                        
                        HStack {
                            Text(formatTime(playerVM.currentTime))
                                .font(.caption)
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            // Subtitles Button
                            if !subtitles.isEmpty {
                                Button {
                                    showSubtitlesMenu = true
                                } label: {
                                    Image(systemName: "captions.bubble")
                                        .foregroundColor(selectedSubtitle != nil ? AppTheme.primaryRed : .white)
                                        .padding(8)
                                }
                            }
                            
                            // Chromecast Button (Bottom Right) - Hidden for Vixsrc sources (incompatible with Cast)
                            if globalManager.currentProvider?.lowercased() != "vixsrc" {
                                CastButton()
                                    .frame(width: 44, height: 44)
                            }
                            
                            // PiP Button
                            Button {
                                playerVM.togglePiP()
                            } label: {
                                Image(systemName: "pip.enter")
                                    .foregroundColor(.white)
                                    .padding(8)
                            }
                            
                            // Fullscreen Button
                            if showFullscreenButton {
                                Button {
                                    playerVM.isSwitchingModes = true
                                    withAnimation {
                                        isFullscreen.toggle()
                                    }
                                } label: {
                                    Image(systemName: isFullscreen ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                                        .foregroundColor(.white)
                                        .padding(8)
                                }
                            }
                            
                            Text(formatTime(playerVM.duration))
                                .font(.caption)
                                .foregroundColor(.white)
                        }
                            .padding()
                            .background(
                                LinearGradient(colors: [.clear, .black.opacity(0.8)], startPoint: .top, endPoint: .bottom)
                            )
                        }
                    }
                }
            }
        }
        .gesture(
            DragGesture(minimumDistance: 50)
                .onEnded { value in
                    // Swipe down to minimize
                    if value.translation.height > 100 {
                        GlobalPlayerManager.shared.toggleMinimise()
                    }
                }
        )
        .persistentSystemOverlays(isFullscreen ? .hidden : .automatic)
        .onAppear {
            // Check if we are already playing this URL (fullscreen transition)
            let isAlreadyPlaying = playerVM.currentUrl == url
            
            if castManager.isConnected {
                // If connected, check if we need to switch media on Cast
                if castManager.currentMediaUrl != url {
                    print("📺 Switching Cast media to: \(title)")
                    
                    // Determine start time: use saved progress if available, otherwise player's current time
                    var castStartTime = playerVM.currentTime
                    if let mid = mediaId {
                        let progress = WatchProgressManager.shared.getProgress(mediaId: mid, season: season, episode: episode)
                        if progress > 0 && progress < 0.95 {
                            if let savedTime = WatchProgressManager.shared.getSavedTime(mediaId: mid, season: season, episode: episode) {
                                print("⏩ Cast will resume from saved progress: \(Int(savedTime))s")
                                castStartTime = savedTime
                            }
                        }
                    }
                    
                    castManager.loadMedia(url: url, title: title, posterUrl: posterUrl.flatMap { URL(string: $0) }, subtitles: subtitles, activeSubtitleUrl: selectedSubtitle?.url, startTime: castStartTime, isLive: isLive, subtitleOffset: subtitleOffset, mediaId: mediaId, season: season, episode: episode)
                }
            } else {
                playerVM.setup(url: url, title: title, posterUrl: posterUrl, localPosterPath: localPosterPath)
            }
            
            // Auto-resume from saved progress ONLY if not already playing
            if !isAlreadyPlaying, let mid = mediaId {
                let progress = WatchProgressManager.shared.getProgress(mediaId: mid, season: season, episode: episode)
                if progress > 0 && progress < 0.95 { // Don't resume if almost finished
                    if let savedTime = WatchProgressManager.shared.getSavedTime(mediaId: mid, season: season, episode: episode) {
                        print("⏩ Auto-resuming from \(Int(savedTime))s (progress: \(Int(progress * 100))%)")
                        
                        // Seek after a short delay to ensure player is ready
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                            playerVM.seek(to: savedTime)
                        }
                    }
                }
            }
            // Orientation is now handled by onChange(of: isFullscreen), not here
            // This prevents view reconstruction from resetting orientation
        }
        .onDisappear {
            print("📺 [CustomVideoPlayer] onDisappear called - isFullscreen=\(isFullscreen)")
            
            // Force reset Home Indicator
            HomeIndicatorState.shared.shouldHide = false
            
            // Stop scrobble when leaving player
            if let mid = mediaId {
               let currentProgress = playerVM.duration > 0 ? (playerVM.currentTime / playerVM.duration) * 100 : 0
                Task {
                    try? await TraktManager.shared.scrobble(
                        tmdbId: mid,
                        type: (season != nil && episode != nil) ? .episode : .movie,
                        progress: currentProgress,
                        action: .stop,
                        season: season,
                        episode: episode
                    )
                }
            }

            // Only cleanup if:
            // 1. Not in fullscreen mode
            // 2. This view still owns the player (currentUrl matches)
            // This prevents cleanup from stopping playback when switching channels via .id()
            if !isFullscreen && playerVM.currentUrl == url {
                print("📺 [CustomVideoPlayer] Not in fullscreen and URL matches, cleaning up")
                playerVM.cleanup()
                ScreenRotator.rotate(to: .portrait)
            } else {
                print("📺 [CustomVideoPlayer] Skipping cleanup - fullscreen=\(isFullscreen), urlMatch=\(playerVM.currentUrl == url)")
            }
        }
        .onChange(of: isFullscreen) { fullscreen in
            print("📺 [CustomVideoPlayer] onChange(of: isFullscreen) triggered. fullscreen=\(fullscreen), isSwitchingModes=\(playerVM.isSwitchingModes)")
            
            // Manage Custom TabBar Visibility
            if fullscreen {
                TabBarManager.shared.hide()
            } else {
                TabBarManager.shared.show()
            }
            
            // Set switching flag to prevent orientation notification from reverting our change
            playerVM.isSwitchingModes = true
            print("📺 [CustomVideoPlayer] Set isSwitchingModes = true")
            
            withAnimation {
                showControls = true
            }
            
            // Force Home Indicator Update
            print("🏠 [CustomVideoPlayer] Setting HomeIndicatorState.shouldHide = \(fullscreen)")
            HomeIndicatorState.shared.shouldHide = fullscreen
            
            // Add a small delay to let SwiftUI settle before forcing rotation
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                print("📺 [CustomVideoPlayer] After 0.1s delay, calling ScreenRotator.rotate(to: \(fullscreen ? "landscape" : "portrait"))")
                if fullscreen {
                    ScreenRotator.rotate(to: .landscape)
                } else {
                    ScreenRotator.rotate(to: .portrait)
                }
            }
            
            // Keep the flag active for longer to allow system orientation to fully settle
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                print("📺 [CustomVideoPlayer] After 2.0s delay, setting isSwitchingModes = false")
                playerVM.isSwitchingModes = false
            }
        }
        .sheet(isPresented: $showSubtitlesMenu) {
            SubtitleSelectionView(subtitles: subtitles, selectedSubtitle: $selectedSubtitle, subtitleOffset: $subtitleOffset, subtitleFontSize: $subtitleFontSize)
                .presentationDetents([.medium])
        }
        .onChange(of: selectedSubtitle?.id) { _ in
            if castManager.isConnected {
                // Reload media to apply subtitle selection (and offset if any)
                // Note: setActiveTrack doesn't support offset change easily if we use proxy.
                // We might need to reload if offset changed too.
                // For now, let's assume setActiveTrack is enough if offset didn't change,
                // BUT our proxy URL includes offset. So if we just switch track, it might use old offset?
                // Actually, tracks are loaded with a specific URL. If we change offset, we need new URLs.
                // So changing subtitle might need reload if we want to ensure offset is applied?
                // But here we just change selection.
                // Let's just reload to be safe and consistent.
                castManager.loadMedia(url: url, title: title, posterUrl: posterUrl.flatMap { URL(string: $0) }, subtitles: subtitles, activeSubtitleUrl: selectedSubtitle?.url, startTime: castManager.getApproximateStreamPosition(), isLive: isLive, subtitleOffset: subtitleOffset, mediaId: mediaId, season: season, episode: episode)
            } else {
                if let sub = selectedSubtitle, let url = URL(string: sub.url) {
                    playerVM.loadSubtitles(url: url)
                } else {
                    playerVM.clearSubtitles()
                }
            }
        }
        .onChange(of: subtitleOffset) { newOffset in
            print("⏱️ Subtitle offset changed: \(newOffset)s")
            playerVM.subtitleOffset = newOffset
            
            if castManager.isConnected {
                // Debounce the reload to avoid spamming the Chromecast while adjusting
                // Cancel previous request
                // Cancel previous request
                
                // We use a Task for debounce in SwiftUI view since we can't easily use performSelector on struct
                // But actually, let's use a State holding a Task
                castReloadDebounceTask?.cancel()
                castReloadDebounceTask = Task {
                    try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
                    if !Task.isCancelled {
                        await MainActor.run {
                            print("📺 Reloading Cast media with new subtitle offset (debounced)...")
                            castManager.loadMedia(url: url, title: title, posterUrl: posterUrl.flatMap { URL(string: $0) }, subtitles: subtitles, activeSubtitleUrl: selectedSubtitle?.url, startTime: castManager.getApproximateStreamPosition(), isLive: isLive, subtitleOffset: newOffset, mediaId: mediaId, season: season, episode: episode)
                        }
                    }
                }
            }
        }
        .onChange(of: subtitleFontSize) { newSize in
            print("🔤 Subtitle font size changed: \(Int(newSize))%")
            
            if castManager.isConnected {
                // Send font size update to Chromecast
                castManager.sendSubtitleFontSize(newSize)
            }
        }
        .onChange(of: playerVM.currentTime) { time in
            // Save progress periodically (e.g., every 5 seconds is handled by the throttle or check)
            // But here we can just call save.
            if let mid = mediaId, Int(time) % 5 == 0 {
                WatchProgressManager.shared.saveProgress(
                    mediaId: mid,
                    season: season,
                    episode: episode,
                    currentTime: time,
                    duration: playerVM.duration
                )
            }
        }
        .onChange(of: isPresented) { presented in
            if !presented, let mid = mediaId {
                WatchProgressManager.shared.saveProgress(
                    mediaId: mid,
                    season: season,
                    episode: episode,
                    currentTime: playerVM.currentTime,
                    duration: playerVM.duration
                )
            }
        }
        .onChange(of: title) { newTitle in
            playerVM.updateMetadata(title: newTitle, posterUrl: posterUrl)
        }
        .onChange(of: posterUrl) { newPosterUrl in
            playerVM.updateMetadata(title: title, posterUrl: newPosterUrl)
        }
        .onChange(of: url) { newUrl in
            // CRITIQUE : Empêcher la Vue d'écraser le titre avec une valeur périmée si le Manager a déjà fait le setup
            if playerVM.currentUrl == newUrl {
                print("📺 [CustomVideoPlayer] Skipping setup from View update: PlayerVM already has this URL. (Prevents stale title overwrite)")
                return
            }
            
            if castManager.isConnected {
                print("📺 URL changed while casting. Loading new media...")
                castManager.loadMedia(url: newUrl, title: title, posterUrl: posterUrl.flatMap { URL(string: $0) }, subtitles: subtitles, activeSubtitleUrl: selectedSubtitle?.url, startTime: 0, isLive: isLive, subtitleOffset: subtitleOffset, mediaId: mediaId, season: season, episode: episode)
            } else {
                playerVM.setup(url: newUrl, title: title, posterUrl: posterUrl, localPosterPath: localPosterPath)
            }
        }
        .onChange(of: castManager.isConnected) { connected in
            if connected {
                print("📺 Cast connected! Switching to Cast mode.")
                
                // Exit fullscreen if active
                if isFullscreen {
                    playerVM.isSwitchingModes = true
                    withAnimation {
                        isFullscreen = false
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        playerVM.isSwitchingModes = false
                    }
                }
                
                playerVM.player.pause()
                castManager.loadMedia(url: url, title: title, posterUrl: posterUrl.flatMap { URL(string: $0) }, subtitles: subtitles, activeSubtitleUrl: selectedSubtitle?.url, startTime: playerVM.currentTime, isLive: isLive, subtitleOffset: subtitleOffset, mediaId: mediaId, season: season, episode: episode)
            } else {
                print("📱 Cast disconnected! Switching back to local player.")
                playerVM.setup(url: url, title: title, posterUrl: posterUrl, localPosterPath: localPosterPath)
                playerVM.seek(to: playerVM.currentTime) // Ideally we should get time from Cast
            }
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            if castManager.isConnected {
                let time = castManager.getApproximateStreamPosition()
                if !playerVM.isSeeking {
                    playerVM.currentTime = time
                }
                
                if let duration = castManager.mediaStatus?.mediaInformation?.streamDuration, duration > 0 {
                    playerVM.duration = duration
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIDevice.orientationDidChangeNotification)) { _ in
            let orientation = UIDevice.current.orientation
            print("📱 [CustomVideoPlayer] orientationDidChangeNotification received. Device orientation: \(orientation.rawValue), isLandscape=\(orientation.isLandscape), isPortrait=\(orientation.isPortrait), isSwitchingModes=\(playerVM.isSwitchingModes), isFullscreen=\(isFullscreen)")
            
            guard !playerVM.isSwitchingModes else {
                print("📱 [CustomVideoPlayer] isSwitchingModes=true, IGNORING orientation change")
                return
            }
            
            if orientation.isLandscape {
                if !isFullscreen {
                    print("📱 [CustomVideoPlayer] Device is landscape and not fullscreen -> setting isFullscreen=true")
                    playerVM.isSwitchingModes = true
                    withAnimation {
                        isFullscreen = true
                    }
                    // Reset switching flag after animation
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        playerVM.isSwitchingModes = false
                    }
                }
            } else if orientation.isPortrait {
                if isFullscreen {
                    print("📱 [CustomVideoPlayer] Device is portrait and fullscreen -> setting isFullscreen=false")
                    playerVM.isSwitchingModes = true
                    withAnimation {
                        isFullscreen = false
                    }
                    // Reset switching flag after animation
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        playerVM.isSwitchingModes = false
                    }
                }
            }
        }

    }
    
    func formatTime(_ seconds: Double) -> String {
        guard !seconds.isNaN && !seconds.isInfinite else { return "00:00" }
        let totalSeconds = Int(seconds)
        let h = totalSeconds / 3600
        let m = (totalSeconds % 3600) / 60
        let s = totalSeconds % 60
        
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        } else {
            return String(format: "%02d:%02d", m, s)
        }
    }
    
    /// Parse HTML tags (bold, italic, underline) into AttributedString
    /// Note: For performance, we just strip tags rather than using slow NSAttributedString HTML parsing
    func parseHtmlTags(_ text: String) -> AttributedString {
        var processedText = text
        
        // Strip common HTML tags
        processedText = processedText.replacingOccurrences(of: "<b>", with: "", options: .caseInsensitive)
        processedText = processedText.replacingOccurrences(of: "</b>", with: "", options: .caseInsensitive)
        processedText = processedText.replacingOccurrences(of: "<i>", with: "", options: .caseInsensitive)
        processedText = processedText.replacingOccurrences(of: "</i>", with: "", options: .caseInsensitive)
        processedText = processedText.replacingOccurrences(of: "<u>", with: "", options: .caseInsensitive)
        processedText = processedText.replacingOccurrences(of: "</u>", with: "", options: .caseInsensitive)
        // Font tags
        processedText = processedText.replacingOccurrences(of: "<font[^>]*>", with: "", options: .regularExpression)
        processedText = processedText.replacingOccurrences(of: "</font>", with: "", options: .caseInsensitive)
        
        return AttributedString(processedText)
    }
}

// MARK: - Player ViewModel

// MARK: - Player ViewModel

// MARK: - Player ViewModel

extension Notification.Name {
    static let stopPlayback = Notification.Name("stopPlayback")
    static let navigateToDetail = Notification.Name("navigateToDetail")
}

class PlayerViewModel: NSObject, ObservableObject, VLCMediaPlayerDelegate {
    @Published var player = AVPlayer()
    @Published var isPlaying = false {
        didSet {
            // Trigger Trakt scrobble on state change
            if isPlaying {
                scrobble(action: .start)
            } else {
                scrobble(action: .pause)
            }
        }
    }
    @Published var isBuffering = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 1
    @Published var currentSubtitleText: String?
    @Published var subtitleOffset: Double = 0
    
    var isSeeking = false
    private var timeObserver: Any?
    private var subtitleParser: SubtitleParser?
    private var pipController: AVPictureInPictureController?
    private weak var playerLayer: AVPlayerLayer?
    
    // Expose PiP state for GlobalPlayerManager
    var isPiPActive: Bool {
        return pipController?.isPictureInPictureActive ?? false
    }
    private var observedItem: AVPlayerItem? // Track the item we're observing
    private(set) var currentUrl: URL? // Track current URL to prevent restart
    private var currentTitle: String? // Track current content title for Now Playing Info
    private var currentArtwork: MPMediaItemArtwork? // Track downloaded artwork
    var isSwitchingModes = false // Track fullscreen transition
    
    // Metadata for Scrobbling
    var mediaId: Int?
    var season: Int?
    var episode: Int?
    var progress: Double = 0
    
    // VLC Player for MKV support - Re-integration
    @Published var useVLC = false
    @Published var vlcPlayer: VLCMediaPlayer?
    private var vlcTimeObserver: Timer?
    
    private var resourceLoaderDelegate: VideoResourceLoaderDelegate?
    private var artworkTask: Task<Void, Never>?
    
    // Setup parameters for reloading (AirPlay Subtitles)
    struct SetupParams {
        let url: URL
        let title: String?
        let posterUrl: String?
        let localPosterPath: String?
        let customHeaders: [String: String]?
        let useVLC: Bool
        let subtitleUrl: URL?
    }
    private var lastSetupParams: SetupParams?
    private var externalSubtitleUrl: URL?
    
    override init() {
        super.init()
        
        // Start Local Proxy for AirPlay compatibility
        // This handles Header Injection & Subtitles for AirPlay
        LocalStreamingServer.shared.start()

        
        // Configure player for background playback
        player.audiovisualBackgroundPlaybackPolicy = .continuesIfPossible
        player.preventsDisplaySleepDuringVideoPlayback = true
        
        // Configure Audio Session immediately
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: [.allowAirPlay, .allowBluetooth])
            try AVAudioSession.sharedInstance().setActive(true)
            print("✅ Audio session configured for background playback")
        } catch {
            print("❌ Failed to configure audio session: \(error)")
        }
        
        // Listen for stop playback notification
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleStopPlayback(_:)),
            name: .stopPlayback,
            object: nil
        )
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func handleStopPlayback(_ notification: Notification) {
        // If the notification comes from another player (not self), pause
        if let sender = notification.object as? PlayerViewModel, sender !== self {
            if isPlaying {
                print("⏸️ Pausing playback because another player started")
                player.pause()
                isPlaying = false
            }
        }
    }
    
    func updateMetadata(title: String, posterUrl: String?, localPosterPath: String? = nil) {
        print("📝 Updating metadata: \(title)")
        currentTitle = title
        
        // Update artwork with priority: local file → remote URL
        artworkTask?.cancel()
        currentArtwork = nil
        
        // Priority 1: Local file
        if let localPath = localPosterPath {
            loadArtworkFromLocalFile(at: localPath)
        }
        // Priority 2: Remote URL
        else if let posterUrl = posterUrl {
            artworkTask = Task {
                await downloadArtwork(from: posterUrl)
            }
        }
        
        updateNowPlayingInfo(title: title)
    }
    
    // Trakt Scrobbling Helper
    func scrobble(action: TraktAction) {
        guard let mid = mediaId else { return }
        
        let playbackProgress = duration > 0 ? (currentTime / duration) * 100 : 0
        
        // Don't scrobble if progress is 0 (except start)
        if action != .start && playbackProgress <= 0 { return }
        
        let type: TraktMediaType = (season != nil && episode != nil) ? .episode : .movie
        
        print("🎬 [PlayerViewModel] Scrobbling \(action) for \(type) ID: \(mid)")
        
        Task {
            try? await TraktManager.shared.scrobble(
                tmdbId: mid, 
                type: type,
                progress: playbackProgress, 
                action: action, 
                season: season,
                episode: episode
            )
        }
    }
    
    func setup(url: URL, title: String? = nil, posterUrl: String? = nil, localPosterPath: String? = nil, customHeaders: [String: String]? = nil, useVLCPlayer: Bool = false, subtitleUrl: URL? = nil) {
        // Store params for reloading (e.g. when subtitles change)
        lastSetupParams = SetupParams(
            url: url,
            title: title,
            posterUrl: posterUrl,
            localPosterPath: localPosterPath,
            customHeaders: customHeaders,
            useVLC: useVLCPlayer,
            subtitleUrl: subtitleUrl
        )
        
        self.externalSubtitleUrl = subtitleUrl
        
        // Notify others to stop
        NotificationCenter.default.post(name: .stopPlayback, object: self)
        
        // Cleanup previous VLC player if switching modes
        if useVLC && !useVLCPlayer {
            cleanupVLC()
        }
        
        // Set VLC mode
        self.useVLC = useVLCPlayer
        
        // Store the title if provided
        if let title = title {
            print("📺 [PlayerVM] setup() called with title: '\(title)' (VLC: \(useVLCPlayer), Subtitle: \(subtitleUrl?.lastPathComponent ?? "none"))")
            currentTitle = title
            
            // Force clean update with new title using reset: true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                print("📺 [PlayerVM] Forcing Clean NowPlaying update for: '\(title)'")
                self.updateNowPlayingInfo(title: title, reset: true)
            }
        } else {
             print("⚠️ [PlayerVM] setup() called WITHOUT title!")
        }
        
        // Artwork Loading with Priority
        // Cancel previous artwork download
        artworkTask?.cancel()
        currentArtwork = nil
        
        // Priority 1: Load from local file (offline-compatible)
        if let localPath = localPosterPath {
            loadArtworkFromLocalFile(at: localPath)
        }
        // Priority 2: Download from URL (online only)
        else if let posterUrl = posterUrl {
            artworkTask = Task {
                await downloadArtwork(from: posterUrl)
            }
        }
        
        // If same URL AND same subtitle state, just ensure playing and return
        if url == currentUrl && subtitleUrl == externalSubtitleUrl {
            if !isPlaying {
                if useVLC, let vlc = vlcPlayer {
                    vlc.play()
                } else {
                    player.play()
                }
                isPlaying = true
            }
            return
        }
        
        currentUrl = url
        
        // ═══════════════════════════════════════════════════════════════════
        // VLC PLAYER BRANCH (for MKV and other formats not supported by AVPlayer)
        // ═══════════════════════════════════════════════════════════════════
        if useVLCPlayer {
            print("🎬 [PlayerVM] Using VLC player for: \(url)")
            setupVLCPlayer(url: url, customHeaders: customHeaders)
            return
        }
        
        var finalUrl = url
        
        // Prepare headers (including auto-detection for Vidzy)
        var effectiveHeaders = customHeaders ?? [:]
        
        
        // Add Referer header for Vidzy URLs to fix playback (Direct & Proxy)
        let urlString = url.absoluteString.lowercased()
        if urlString.contains("vidzy") {
            effectiveHeaders["Referer"] = "https://vidzy.org/"
            print("🎬 [CustomVideoPlayer] Added Vidzy Referer header")
        } else if urlString.contains("luluvid") {
             effectiveHeaders["Referer"] = "https://luluvid.com/"
             print("🎬 [CustomVideoPlayer] Added LuluVid Referer header")
        }
        
        // SMART PROXY LOGIC:
        // 1. MP4 (MovieBox) with Headers -> Proxy (AVPlayer User-Agent override)
        // 2. AirPlay Active -> ALWAYS Proxy if Headers/Subs needed (TV needs them via proxy)
        // 3. Local + Headers/Subs -> Direct URL (AVURLAsset handles headers/subs)
        // 4. Plain MP4 (Vixsrc) -> Direct URL
        
        let isHLS = url.pathExtension.lowercased() == "m3u8" || url.absoluteString.lowercased().contains(".m3u8")
        let isAirPlayActive = player.isExternalPlaybackActive
        let hasCustomHeaders = !effectiveHeaders.isEmpty
        let hasSubtitles = (subtitleUrl != nil)
        
        // Condition:
        // - AirPlay AND (Headers OR Subs) -> Proxy (TV needs it)
        // - Local AND (Headers OR Subs) ->
        //    - If HLS: Direct (AVURLAsset works)
        //    - If MP4: Proxy (AVPlayer User-Agent override need proxy)
        
        var needsProxy = false
        
        if isAirPlayActive {
            // AirPlay: Must use proxy if we have headers or subtitles
            needsProxy = hasCustomHeaders || hasSubtitles
        } else {
            // Local Playback
            if isHLS {
                // HLS: AVURLAsset handles headers -> Direct
                needsProxy = false
            } else {
                 // MP4/Direct: AVPlayer handles headers mostly, but if we need to force UA or complex headers -> Proxy might be safer
                 // But Vixsrc fails with Proxy (-11848).
                 // MovieBox likely needs Proxy for UA.
                 // Let's rely on hasCustomHeaders for MP4 proxying, assuming Vixsrc has none.
                 needsProxy = hasCustomHeaders || hasSubtitles
            }
        }
        
        // Vixsrc fix: Vixsrc is MP4 but might have empty headers. It should NOT use proxy.
        // MovieBox has custom headers. It SHOULD use proxy (if UA override needed).
        
        if !useVLCPlayer && needsProxy {
            // Check if we have a valid Local Server URL (LAN IP)
            if let serverUrl = LocalStreamingServer.shared.serverUrl {
                var components = URLComponents()
                components.scheme = serverUrl.scheme
                components.host = serverUrl.host
                components.port = serverUrl.port
                components.path = "/manifest" // Default to manifest proxy which handles HLS & MP4 wrapping
                
                var queryItems = [URLQueryItem(name: "url", value: url.absoluteString)]
                
                // Add Subtitles if present
                if let sub = subtitleUrl {
                    queryItems.append(URLQueryItem(name: "subs", value: sub.absoluteString))
                }
                
                // Add Referer if present (critical for Vidzy/LuluVid)
                if let referer = effectiveHeaders["Referer"] {
                    queryItems.append(URLQueryItem(name: "referer", value: referer))
                }
                
                // Add Origin if present
                if let origin = effectiveHeaders["Origin"] {
                    queryItems.append(URLQueryItem(name: "origin", value: origin))
                }
                
                // Add User-Agent if present (NEW - Critical for MovieBox)
                if let ua = effectiveHeaders["User-Agent"] {
                    queryItems.append(URLQueryItem(name: "user_agent", value: ua))
                }
                
                components.queryItems = queryItems
                
                if let proxyUrl = components.url {
                    print("🚀 [PlayerVM] Using Local Proxy for AirPlay compatibility")
                    print("   - Reason: Headers: \(hasCustomHeaders), Subs: \(hasSubtitles)")
                    print("   - Original: \(url)")
                    print("   - Proxy: \(proxyUrl)")
                    finalUrl = proxyUrl
                }
            } else {
                print("⚠️ [PlayerVM] Local Server not running or no LAN IP - AirPlay might fail for protected streams")
            }
        } else {
             print("▶️ [PlayerVM] Using Direct URL (No special headers/subs needed)")
        }

        
        // Legacy ResourceLoader logic (VidMoly, Vidzy, AirPlay) removed in favor of Local Proxy
        var useResourceLoader = false

        
        print("🎬 Setting up player with URL: \(url)")
        if let title = currentTitle {
            print("📺 Content title: \(title)")
        }
        if posterUrl != nil {
            print("🖼️ Poster URL provided, downloading artwork...")
        }
        
        // RE-ACTIVATE AUDIO SESSION (Crucial for Lock Screen)
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: [.allowAirPlay, .allowBluetooth])
            try AVAudioSession.sharedInstance().setActive(true)
            print("✅ Audio session re-activated in setup")
        } catch {
            print("❌ Failed to re-activate audio session: \(error)")
        }
        
        // Always use AVURLAsset with browser-like User-Agent
        var headers: [String: String] = [
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        ]
        
        // Merge effective headers (including Vidzy Referer if applicable)
        if !effectiveHeaders.isEmpty {
            headers.merge(effectiveHeaders) { (_, new) in new }
            print("🎬 [CustomVideoPlayer] Added effective headers: \(effectiveHeaders.keys)")
        }
        
        let asset = AVURLAsset(url: finalUrl, options: ["AVURLAssetHTTPHeaderFieldsKey": headers])
        
        if useResourceLoader {
            // Pass subtitleUrl to delegate for injection
            self.resourceLoaderDelegate = VideoResourceLoaderDelegate(subtitleUrl: subtitleUrl)
            asset.resourceLoader.setDelegate(self.resourceLoaderDelegate, queue: .main)
        } else {
            self.resourceLoaderDelegate = nil
        }
        
        let item = AVPlayerItem(asset: asset)
        
        // Add observers for debugging - REMOVED due to build issues
        // We rely on the fact that ResourceLoader is now working
        
        // Initialize remote commands
        setupRemoteCommands()
        
        player.replaceCurrentItem(with: item)
        player.play()
        isPlaying = true
        
        // Update Now Playing Info with proper title
        updateNowPlayingInfo(title: currentTitle ?? url.lastPathComponent)
        
        // Initialize buffering state
        isBuffering = true
        
        // Clear previous observers if any
        if let oldItem = observedItem {
            oldItem.removeObserver(self, forKeyPath: "duration")
            oldItem.removeObserver(self, forKeyPath: "status")
            oldItem.removeObserver(self, forKeyPath: "playbackLikelyToKeepUp")
            oldItem.removeObserver(self, forKeyPath: "playbackBufferEmpty")
            oldItem.removeObserver(self, forKeyPath: "playbackBufferFull")
        }
        
        // Observe item properties
        observedItem = item
        item.addObserver(self, forKeyPath: "duration", options: [.new, .initial], context: nil)
        item.addObserver(self, forKeyPath: "status", options: [.new, .initial], context: nil)
        item.addObserver(self, forKeyPath: "playbackLikelyToKeepUp", options: [.new, .initial], context: nil)
        item.addObserver(self, forKeyPath: "playbackBufferEmpty", options: [.new, .initial], context: nil)
        item.addObserver(self, forKeyPath: "playbackBufferFull", options: [.new, .initial], context: nil)
        
        // Observe time
        timeObserver = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] time in
            guard let self = self, !self.isSeeking else { return }
            self.currentTime = time.seconds
            self.updateSubtitle()
            
            // Sync isPlaying state with actual player rate
            // This fixes the issue where UI shows "Play" button while video is playing
            if !self.useVLC {
                let isActuallyPlaying = self.player.rate > 0 && self.player.error == nil
                if self.isPlaying != isActuallyPlaying {
                    // Only update if mismatch (and not buffering/seeking logic overriding it)
                    // We check rate to be sure.
                    // Note: buffering might pause player (rate 0) but we still consider it "playing" intents.
                    // But if rate > 0, we MUST be isPlaying = true.
                    if isActuallyPlaying {
                         self.isPlaying = true
                    }
                }
            }
            
            // Sync Now Playing Info periodically (every 5 seconds) for lock screen progress
            if Int(time.seconds) % 5 == 0 {
                self.updateNowPlayingInfo()
            }
        }
        
        // setupPiP will be called separately with the layer
    }
    
    func setupRemoteCommands() {
        // Tell the system we want to receive remote control events
        UIApplication.shared.beginReceivingRemoteControlEvents()
        
        let commandCenter = MPRemoteCommandCenter.shared()
        
        // Clear existing commands first to avoid duplicates
        commandCenter.playCommand.removeTarget(nil)
        commandCenter.pauseCommand.removeTarget(nil)
        commandCenter.skipBackwardCommand.removeTarget(nil)
        commandCenter.skipForwardCommand.removeTarget(nil)
        
        // Play Command
        commandCenter.playCommand.isEnabled = true
        commandCenter.playCommand.addTarget { [weak self] event in
            print("🎧 [REMOTE] Play command received from headphones")
            guard let self = self else { return .commandFailed }
            self.player.play()
            self.isPlaying = true
            self.updateNowPlayingInfo() // Update state to Playing
            print("🎧 [REMOTE] Play command executed - isPlaying: true")
            return .success
        }
        
        // Pause Command
        commandCenter.pauseCommand.isEnabled = true
        commandCenter.pauseCommand.addTarget { [weak self] event in
            print("🎧 [REMOTE] Pause command received from headphones")
            guard let self = self else { return .commandFailed }
            self.player.pause()
            self.isPlaying = false
            self.updateNowPlayingInfo() // Update state to Paused
            print("🎧 [REMOTE] Pause command executed - isPlaying: false")
            return .success
        }
        
        // Toggle Play/Pause Command (used by lock screen main button)
        commandCenter.togglePlayPauseCommand.isEnabled = true
        commandCenter.togglePlayPauseCommand.removeTarget(nil)
        commandCenter.togglePlayPauseCommand.addTarget { [weak self] event in
            print("🎧 [REMOTE] Toggle Play/Pause command received")
            guard let self = self else { return .commandFailed }
            if self.isPlaying {
                self.player.pause()
                self.isPlaying = false
            } else {
                self.player.play()
                self.isPlaying = true
            }
            self.updateNowPlayingInfo()
            return .success
        }
        
        // Skip Backward 10s
        commandCenter.skipBackwardCommand.isEnabled = true
        commandCenter.skipBackwardCommand.preferredIntervals = [10]
        commandCenter.skipBackwardCommand.addTarget { [weak self] event in
            print("🎧 [REMOTE] Skip Backward 10s")
            guard let self = self else { return .commandFailed }
            self.seek(to: max(0, self.currentTime - 10))
            self.updateNowPlayingInfo()
            return .success
        }
        
        // Skip Forward 10s
        commandCenter.skipForwardCommand.isEnabled = true
        commandCenter.skipForwardCommand.preferredIntervals = [10]
        commandCenter.skipForwardCommand.addTarget { [weak self] event in
            print("🎧 [REMOTE] Skip Forward 10s")
            guard let self = self else { return .commandFailed }
            self.seek(to: min(self.duration, self.currentTime + 10))
            self.updateNowPlayingInfo()
            return .success
        }
        
        // Scrubbing (Slider on lock screen)
        commandCenter.changePlaybackPositionCommand.isEnabled = true
        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self = self, let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self.seek(to: event.positionTime)
            self.updateNowPlayingInfo()
            return .success
        }
    }
    
    func updateNowPlayingInfo(title: String? = nil, reset: Bool = false) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            var nowPlayingInfo: [String: Any]
            
            if reset {
                print("♻️ [PlayerVM] Resetting NowPlayingInfo from scratch")
                nowPlayingInfo = [String: Any]()
            } else {
                nowPlayingInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [String: Any]()
            }
            
            // Always set title from currentTitle if available
            let titleToUse = title ?? self.currentTitle ?? self.currentUrl?.lastPathComponent ?? "Unknown"
            
            print("🎵 [PlayerVM] Updating NowPlayingInfo - Title: '\(titleToUse)' (Requested: '\(title ?? "nil")', Current: '\(self.currentTitle ?? "nil")')")
            
            nowPlayingInfo[MPMediaItemPropertyTitle] = titleToUse
            
            if self.duration > 0 {
                nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = self.duration
            }
            
            nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = self.currentTime
            nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = self.isPlaying ? 1.0 : 0.0
            
            // Use downloaded artwork if available, otherwise use app icon
            // IMPORTANT: Always replace artwork to prevent showing stale logo from previous channel
            if let artwork = self.currentArtwork {
                nowPlayingInfo[MPMediaItemPropertyArtwork] = artwork
            } else {
                // Clear existing artwork if reset, or if we want to ensure no stale artwork
                if reset {
                     nowPlayingInfo[MPMediaItemPropertyArtwork] = nil
                }
                
                // Load default icon
                if let image = UIImage(named: "AppIcon") ?? UIImage(systemName: "film") {
                     let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in return image }
                     nowPlayingInfo[MPMediaItemPropertyArtwork] = artwork
                }
            }
            
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
        }
    }

    
    private func loadArtworkFromLocalFile(at localPath: String) {
        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let fileURL = documentsURL.appendingPathComponent(localPath)
        
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            print("❌ Local artwork file not found: \(fileURL.path)")
            return
        }
        
        do {
            let data = try Data(contentsOf: fileURL)
            guard let image = UIImage(data: data) else {
                print("❌ Failed to create image from local file")
                return
            }
            
            let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in return image }
            self.currentArtwork = artwork
            print("✅ Artwork loaded from local file: \(localPath)")
            
            self.updateNowPlayingInfo()
        } catch {
            print("❌ Failed to load local artwork: \(error)")
        }
    }
    
    private func downloadArtwork(from urlString: String) async {
        guard let url = URL(string: urlString) else {
            print("❌ Invalid poster URL: \(urlString)")
            return
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            
            if Task.isCancelled { return }
            
            guard let image = UIImage(data: data) else {
                print("❌ Failed to create image from data")
                return
            }
            
            // Create artwork on main thread
            await MainActor.run {
                let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in return image }
                self.currentArtwork = artwork
                print("✅ Artwork downloaded and set: \(urlString)")
                
                // Force update of Now Playing Info with the new artwork
                self.updateNowPlayingInfo()
            }
        } catch {
            print("❌ Failed to download artwork: \(error)")
        }
    }
    
    func setupPiPWithLayer(_ layer: AVPlayerLayer) {
        print("🎬 setupPiPWithLayer called")
        self.playerLayer = layer
        
        // Audio session is already configured in init()
        
        // Setup PiP if supported
        print("🔍 Checking PiP support...")
        if AVPictureInPictureController.isPictureInPictureSupported() {
            print("✅ PiP is supported on this device")
            do {
                pipController = try AVPictureInPictureController(playerLayer: layer)
                pipController?.canStartPictureInPictureAutomaticallyFromInline = true
                print("✅ PiP controller created successfully")
                print("   - isPictureInPicturePossible: \(pipController?.isPictureInPicturePossible ?? false)")
            } catch {
                print("❌ Failed to create PiP controller: \(error)")
            }
        } else {
            print("⚠️ PiP not supported on this device")
        }
    }
    
    
    func cleanup() {
        // Don't cleanup if we are just switching modes (e.g. fullscreen)
        if isSwitchingModes {
            isSwitchingModes = false
            return
        }
        
        // Don't cleanup if PiP is active
        if let pipController = pipController, pipController.isPictureInPictureActive {
            print("📺 PlayerViewModel: PiP is active, skipping cleanup/pause")
            return
        }
        
        currentUrl = nil
        player.pause()
        if let observer = timeObserver {
            player.removeTimeObserver(observer)
            timeObserver = nil
        }
        // Only remove observer if we actually added one
        if let item = observedItem {
            item.removeObserver(self, forKeyPath: "duration")
            item.removeObserver(self, forKeyPath: "status")
            item.removeObserver(self, forKeyPath: "playbackLikelyToKeepUp")
            item.removeObserver(self, forKeyPath: "playbackBufferEmpty")
            item.removeObserver(self, forKeyPath: "playbackBufferFull")
            observedItem = nil
        }
        resourceLoaderDelegate = nil
        artworkTask?.cancel()
        
        // Clear Now Playing Info
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        
        // Remove Remote Commands
        let commandCenter = MPRemoteCommandCenter.shared()
        commandCenter.playCommand.removeTarget(nil)
        commandCenter.pauseCommand.removeTarget(nil)
        commandCenter.skipBackwardCommand.removeTarget(nil)
        commandCenter.skipForwardCommand.removeTarget(nil)
        commandCenter.changePlaybackPositionCommand.removeTarget(nil)
        
        // Stop receiving remote control events
        UIApplication.shared.endReceivingRemoteControlEvents()
    }
    
    func reset() {
        cleanup()
        currentUrl = nil
        currentTime = 0
        duration = 1
        isPlaying = false
        isBuffering = false
        currentSubtitleText = nil
        player.replaceCurrentItem(with: nil)
    }
    
    func togglePlayPause() {
        if useVLC, let vlc = vlcPlayer {
            if isPlaying {
                vlc.pause()
                isPlaying = false
            } else {
                vlc.play()
                isPlaying = true
            }
        } else {
            if isPlaying {
                player.pause()
                isPlaying = false
            } else {
                player.play()
                isPlaying = true
            }
        }
        
        // Update Now Playing Info to sync with system
        updateNowPlayingInfo()
        print("🎧 [TOGGLE] Play/Pause toggled - isPlaying: \(isPlaying)")
    }
    
    func seek(to time: Double) {
        if useVLC, let vlc = vlcPlayer {
            guard duration > 0 else { return }
            let position = Float(time / duration)
            vlc.position = position
        } else {
            player.seek(to: CMTime(seconds: time, preferredTimescale: 600))
        }
    }
    
    // MARK: - VLC Player Methods
    
    private func setupVLCPlayer(url: URL, customHeaders: [String: String]?) {
        print("🎬 [PlayerVM] setupVLCPlayer called with URL: \(url)")
        
        // Cleanup any existing VLC player
        cleanupVLC()
        
        print("🎬 [PlayerVM] Creating new VLC player...")
        // Create new VLC player
        // Create new VLC player
        let vlc = VLCMediaPlayer()
        
        // Enable Debug Logging for troubleshooting
        vlc.libraryInstance.debugLogging = true
        vlc.libraryInstance.debugLoggingLevel = 3 // Verbose
        
        let media = VLCMedia(url: url)
        print("🎬 [PlayerVM] VLCMedia created for: \(url.absoluteString)")
        
        // Set network caching and user agent
        var options: [String: Any] = [
            "network-caching": 3000,
            "http-user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
        ]
        
        // Add custom headers if provided
        if let headers = customHeaders {
            for (key, value) in headers {
                options["http-\(key.lowercased())"] = value
            }
        }
        
        media.addOptions(options)
        
        vlc.media = media
        vlc.delegate = self // Set delegate to receive state/time updates
        
        self.vlcPlayer = vlc
        print("🎬 [PlayerVM] vlcPlayer set, useVLC=\(useVLC), vlcPlayer is nil: \(vlcPlayer == nil)")
        
        // Set initial state
        isBuffering = true
        isPlaying = false 
        
        // Fallback Force Playback (Safety Net)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self, let player = self.vlcPlayer else { return }
            // Only force play if drawable is attached to avoid "nil view" errors
            if (player.state == .stopped || player.state == .ended) && player.drawable != nil {
                print("⚠️ [PlayerVM] Fallback: Forcing VLC play() (Drawable is set)")
                player.play()
            }
        }
        
        // Setup time observer for VLC
        vlcTimeObserver = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            guard let self = self, let vlc = self.vlcPlayer else { return }
            
            let time = Double(vlc.time.intValue) / 1000.0
            let length = Double(vlc.media?.length.intValue ?? 0) / 1000.0
            
            DispatchQueue.main.async {
                if !self.isSeeking {
                    self.currentTime = time
                }
                if length > 0 {
                    self.duration = length
                }
                
                // Update buffering state
                if time > 0 {
                    self.isBuffering = false
                }
                
                // Update playing state based on VLC state
                let state = vlc.state
                let wasPlaying = self.isPlaying
                let nowPlaying = (state == .playing || state == .buffering)
                
                if wasPlaying != nowPlaying {
                    print("🎬 [PlayerVM] VLC state changed: \(state.rawValue), isPlaying: \(nowPlaying)")
                    self.isPlaying = nowPlaying
                }
                
                // Update subtitles
                self.updateSubtitle()
                
                // Sync Now Playing Info periodically
                if Int(time) % 5 == 0 && time > 0 {
                    self.updateNowPlayingInfo()
                }
            }
        }
        
        // Initialize remote commands
        setupRemoteCommands()
        
        // NOTE: Playback is NOT started here. It is started by VLCRenderView in PlayerContentView
        // when the drawable is assigned. This prevents black screen issues.
        
        // Update Now Playing Info
        updateNowPlayingInfo(title: currentTitle ?? url.lastPathComponent)
        
        print("✅ [PlayerVM] VLC player setup complete - Waiting for View to attach drawable")
    }
    
    private func cleanupVLC() {
        vlcTimeObserver?.invalidate()
        vlcTimeObserver = nil
        vlcPlayer?.stop()
        vlcPlayer = nil
        useVLC = false
        print("🧹 [PlayerVM] VLC player cleaned up")
    }
    
    /// Public method to stop VLC playback
    func stopVLC() {
        print("⏹️ [PlayerVM] stopVLC called")
        cleanupVLC()
    }
    
    // MARK: - VLCMediaPlayerDelegate
    
    func mediaPlayerStateChanged(_ aNotification: Notification!) {
        guard let vlc = vlcPlayer else { return }
        
        switch vlc.state {
        case .playing:
            print("▶️ [PlayerVM-Delegate] VLC Playing")
            DispatchQueue.main.async {
                self.isPlaying = true
                self.isBuffering = false
            }
        case .paused:
             print("⏸️ [PlayerVM-Delegate] VLC Paused")
             DispatchQueue.main.async {
                 self.isPlaying = false
                 self.isBuffering = false
             }
        case .stopped:
             print("⏹️ [PlayerVM-Delegate] VLC Stopped")
             DispatchQueue.main.async {
                 self.isPlaying = false
                 self.isBuffering = false
             }
        case .buffering:
             print("⏳ [PlayerVM-Delegate] VLC Buffering")
             DispatchQueue.main.async {
                 self.isBuffering = true
             }
        case .error:
             print("❌ [PlayerVM-Delegate] VLC Error")
             DispatchQueue.main.async {
                 self.isBuffering = false
                 self.isPlaying = false
             }
        case .ended:
             print("🏁 [PlayerVM-Delegate] VLC Ended")
             DispatchQueue.main.async {
                 self.isPlaying = false
             }
        default:
            break
        }
    }
    
    func mediaPlayerTimeChanged(_ aNotification: Notification!) {
        guard let vlc = vlcPlayer else { return }
        // Let the Timer handle UI updates to avoid too frequent updates,
        // but this delegate method confirms playback is actually progressing.
        // We can use this to double-check buffering state.
        if isBuffering {
             DispatchQueue.main.async {
                 self.isBuffering = false
             }
        }
    }
    

    
    func loadSubtitles(url: URL) {
        // 1. Reload player if needed to support AirPlay injection
        // Check if we need to reload (only if not VLC, and URL is different)
        if !useVLC && externalSubtitleUrl != url {
            print("🔄 [PlayerVM] New subtitle loaded: \(url.lastPathComponent) - Reloading player for AirPlay support...")
            
            // Reload using stored params + new subtitle URL
            if let params = lastSetupParams {
                let savedTime = currentTime
                
                // Call setup within a task to ensure clean reload? No, main thread is fine.
                // We just call setup directly. CustomVideoPlayer logic for setup handles replacement.
                setup(
                    url: params.url,
                    title: params.title,
                    posterUrl: params.posterUrl,
                    localPosterPath: params.localPosterPath,
                    customHeaders: params.customHeaders,
                    useVLCPlayer: params.useVLC,
                    subtitleUrl: url
                )
                
                // Restore position after a short delay (once item is ready)
                // We use observeValue for "status" .readyToPlay, but since setup() clears observers,
                // we rely on the new item's observer.
                // However, we need to pass the start time or seek immediately.
                // Simple seek after replace works if AVPlayer handles it.
                // Better: wait for status ready.
                
                // Let's store a pendingSeekTime in PlayerViewModel?
                // Or just seek asynchronously.
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    if savedTime > 0 {
                        print("⏩ [PlayerVM] Restoring playback position: \(savedTime)s")
                        self.seek(to: savedTime)
                    }
                }
            }
        }
        
        // 2. Load for local overlay (Original Logic)
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                
                // Try UTF-8 first
                if let content = String(data: data, encoding: .utf8) {
                    print("✅ Loaded subtitle (UTF-8) from \(url.lastPathComponent)")
                    self.subtitleParser = SubtitleParser(content: content)
                    // Trigger initial update
                    await MainActor.run { self.updateSubtitle() }
                } 
                // Fallback to Windows-1252 (Latin-1)
                else if let content = String(data: data, encoding: .windowsCP1252) {
                    print("⚠️ Loaded subtitle (Windows-1252) from \(url.lastPathComponent)")
                    self.subtitleParser = SubtitleParser(content: content)
                    await MainActor.run { self.updateSubtitle() }
                }
                // Fallback to ISO Latin 1
                else if let content = String(data: data, encoding: .isoLatin1) {
                     print("⚠️ Loaded subtitle (ISO-Latin-1) from \(url.lastPathComponent)")
                     self.subtitleParser = SubtitleParser(content: content)
                     await MainActor.run { self.updateSubtitle() }
                } else {
                    print("❌ Failed to decode subtitle content (unknown encoding)")
                }
            } catch {
                print("❌ Failed to load subtitles: \(error)")
            }
        }
    }
    
    func clearSubtitles() {
        subtitleParser = nil
        currentSubtitleText = nil
    }
    
    private func updateSubtitle() {
        guard let parser = subtitleParser else { return }
        currentSubtitleText = parser.text(for: currentTime - subtitleOffset)
    }
    
    func togglePiP() {
        guard let pip = pipController else {
            print("⚠️ PiP controller not available")
            return
        }
        if pip.isPictureInPictureActive {
            print("🔽 Stopping PiP")
            pip.stopPictureInPicture()
        } else {
            print("🔼 Starting PiP")
            pip.startPictureInPicture()
        }
    }
    
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        guard let item = object as? AVPlayerItem else { return }
        
        switch keyPath {
        case "duration":
            let duration = item.duration.seconds
            if !duration.isNaN {
                DispatchQueue.main.async {
                    self.duration = duration
                }
            }
            
        case "status":
            if item.status == .readyToPlay {
                DispatchQueue.main.async {
                    // Start playing if not already
                    if !self.isPlaying {
                        self.player.play()
                        self.isPlaying = true
                    }
                    self.isBuffering = false
                }
            } else if item.status == .failed {
                print("❌ [PlayerViewModel] AVPlayerItem failed: \(String(describing: item.error))")
                DispatchQueue.main.async {
                    self.isBuffering = false
                }
            }
            
        case "playbackBufferEmpty":
            if item.isPlaybackBufferEmpty {
                print("⏳ [PlayerViewModel] Buffer empty, showing spinner")
                DispatchQueue.main.async {
                    self.isBuffering = true
                }
            }
            
        case "playbackLikelyToKeepUp", "playbackBufferFull":
            if item.isPlaybackLikelyToKeepUp || item.isPlaybackBufferFull {
                print("▶️ [PlayerViewModel] Buffer likely to keep up, hiding spinner")
                DispatchQueue.main.async {
                    self.isBuffering = false
                    // Resume playback if it was paused due to buffer
                    if self.player.rate == 0 && self.isPlaying {
                        self.player.play()
                    }
                }
            }
            
        default:
            super.observeValue(forKeyPath: keyPath, of: object, change: change, context: context)
        }
    }
}

// MARK: - Simple Subtitle Parser (SRT/VTT)

class SubtitleParser {
    struct Entry {
        let startTime: Double
        let endTime: Double
        let text: String
    }
    
    private var entries: [Entry] = []
    
    init(content: String) {
        // Normalize line endings
        let normalizedContent = content.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
        let lines = normalizedContent.components(separatedBy: .newlines)
        
        var currentStart: Double = 0
        var currentEnd: Double = 0
        var currentText = ""
        var isParsingText = false
        
        // Supported Formats:
        // 00:00:01,000 --> 00:00:04,000 (SRT standard)
        // 00:00:01.000 --> 00:00:04.000 (VTT standard)
        // 0:00:01.00 --> 0:00:04.00 (Shortened)
        
        // Regex to capture start and end timestamps.
        // Group 1: Start Time
        // Group 2: End Time
        // Matches H:MM:SS,mmm or MM:SS,mmm or HH:MM:SS.mmm etc.
        let pattern = "((?:\\d{1,2}:)?\\d{1,2}:\\d{1,2}[.,]\\d{1,3})\\s*-->\\s*((?:\\d{1,2}:)?\\d{1,2}:\\d{1,2}[.,]\\d{1,3})"
        let timeRegex = try? NSRegularExpression(pattern: pattern)

        for line in lines {
            let trimLine = line.trimmingCharacters(in: .whitespaces)
            if trimLine.isEmpty {
                if isParsingText && !currentText.isEmpty {
                    // End of an entry
                    entries.append(Entry(startTime: currentStart, endTime: currentEnd, text: currentText.trimmingCharacters(in: .whitespacesAndNewlines)))
                    currentText = ""
                    isParsingText = false
                }
                continue
            }
            
            if trimLine == "WEBVTT" { continue }
            
            // Check for timestamp line
            if let regex = timeRegex, let match = regex.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)) {
                
                // If we were parsing text (unexpectedly), save previous block
                 if isParsingText && !currentText.isEmpty {
                    entries.append(Entry(startTime: currentStart, endTime: currentEnd, text: currentText.trimmingCharacters(in: .whitespacesAndNewlines)))
                    currentText = ""
                }
                
                let startStr = (line as NSString).substring(with: match.range(at: 1))
                let endStr = (line as NSString).substring(with: match.range(at: 2))
                
                currentStart = parseTime(startStr)
                currentEnd = parseTime(endStr)
                isParsingText = true
                continue
            }
            
            // If it's a number line (index), ignore it
            if !isParsingText && trimLine.allSatisfy({ $0.isNumber }) {
                continue
            }
            
            // Otherwise, it is text content
            if isParsingText {
                currentText += line + "\n"
            }
        }
        
        // Append last entry if file ends without empty line
        if isParsingText && !currentText.isEmpty {
             entries.append(Entry(startTime: currentStart, endTime: currentEnd, text: currentText.trimmingCharacters(in: .whitespacesAndNewlines)))
        }
        
        print("📝 SubtitleParser: Parsed \(entries.count) entries")
    }
    
    func text(for time: Double) -> String? {
        // Binary search could be better, but linear is fine for normal use
        return entries.first { time >= $0.startTime && time <= $0.endTime }?.text
    }
    
    private func parseTime(_ timeStr: String) -> Double {
        let parts = timeStr.replacingOccurrences(of: ",", with: ".").components(separatedBy: ":")
        
        var h: Double = 0
        var m: Double = 0
        var s: Double = 0
        
        if parts.count == 3 {
             h = Double(parts[0]) ?? 0
             m = Double(parts[1]) ?? 0
             s = Double(parts[2]) ?? 0
        } else if parts.count == 2 {
             m = Double(parts[0]) ?? 0
             s = Double(parts[1]) ?? 0
        }
        
        return h * 3600 + m * 60 + s
    }
}

// MARK: - UIKit Wrappers

struct VideoPlayerView: UIViewRepresentable {
    let player: AVPlayer
    @ObservedObject var playerVM: PlayerViewModel
    var isZoomedToFill: Bool = false // Controls video gravity
    
    func makeCoordinator() -> Coordinator {
        Coordinator(playerVM: playerVM)
    }
    
    func makeUIView(context: Context) -> PlayerView {
        print("🎥 VideoPlayerView.makeUIView called")
        let view = PlayerView()
        view.player = player
        view.playerLayer.videoGravity = isZoomedToFill ? .resizeAspectFill : .resizeAspect
        
        print("🔧 Setting up PiP with layer...")
        // Setup PiP with the actual layer being displayed
        DispatchQueue.main.async {
            print("⏰ DispatchQueue.main.async executing for PiP setup")
            context.coordinator.setupPiP(with: view.playerLayer)
        }
        
        print("✅ VideoPlayerView.makeUIView completed")
        return view
    }
    
    func updateUIView(_ uiView: PlayerView, context: Context) {
        uiView.player = player
        // Update video gravity based on zoom state
        let targetGravity: AVLayerVideoGravity = isZoomedToFill ? .resizeAspectFill : .resizeAspect
        if uiView.playerLayer.videoGravity != targetGravity {
            uiView.playerLayer.videoGravity = targetGravity
        }
    }
    
    class Coordinator {
        let playerVM: PlayerViewModel
        var pipConfigured = false
        
        init(playerVM: PlayerViewModel) {
            self.playerVM = playerVM
        }
        
        func setupPiP(with layer: AVPlayerLayer) {
            print("📍 Coordinator.setupPiP called, pipConfigured: \(pipConfigured)")
            guard !pipConfigured else {
                print("⚠️ PiP already configured, skipping")
                return
            }
            print("🚀 Calling playerVM.setupPiPWithLayer...")
            playerVM.setupPiPWithLayer(layer)
            pipConfigured = true
            print("✅ Coordinator.setupPiP completed")
        }
    }
}

class PlayerView: UIView {
    var player: AVPlayer? {
        get { return playerLayer.player }
        set { playerLayer.player = newValue }
    }
    
    var playerLayer: AVPlayerLayer {
        return layer as! AVPlayerLayer
    }
    
    override class var layerClass: AnyClass {
        return AVPlayerLayer.self
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        playerLayer.videoGravity = .resizeAspect
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // Allow becoming first responder to handle remote commands
    override var canBecomeFirstResponder: Bool {
        return true
    }
    
    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            print("🔑 PlayerView didMoveToWindow: Taking First Responder")
            becomeFirstResponder()
        }
    }
}

struct AirPlayView: UIViewRepresentable {
    func makeUIView(context: Context) -> AVRoutePickerView {
        let view = AVRoutePickerView()
        view.activeTintColor = .red
        view.tintColor = .white
        view.prioritizesVideoDevices = true
        return view
    }
    
    func updateUIView(_ uiView: AVRoutePickerView, context: Context) {}
}

// CastButton moved to Views/Components/CastButton.swift

struct CustomProgressBar: View {
    @Binding var value: Double
    var total: Double
    var onEditingChanged: (Bool) -> Void
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background Track
                Rectangle()
                    .fill(Color.white.opacity(0.3))
                    .frame(height: 4)
                    .cornerRadius(2)
                
                // Progress Track
                Rectangle()
                    .fill(AppTheme.primaryRed)
                    .frame(width: max(0, min(geometry.size.width, geometry.size.width * (total > 0 ? CGFloat(value / total) : 0))), height: 4)
                    .cornerRadius(2)
                
                // Thumb
                Circle()
                    .fill(AppTheme.primaryRed)
                    .frame(width: 16, height: 16)
                    .scaleEffect(1.2) // Make it slightly larger for better visibility
                    .offset(x: max(0, min(geometry.size.width - 16, geometry.size.width * (total > 0 ? CGFloat(value / total) : 0) - 8)))
            }
            .frame(height: 20) // Touch target height
            .contentShape(Rectangle()) // Ensure the whole area is tappable
            .highPriorityGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        onEditingChanged(true)
                        let percent = min(max(0, value.location.x / geometry.size.width), 1)
                        self.value = percent * total
                    }
                    .onEnded { _ in
                        onEditingChanged(false)
                    }
            )
        }
        .frame(height: 20)
    }
}
