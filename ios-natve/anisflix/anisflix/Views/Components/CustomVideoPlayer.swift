//
//  CustomVideoPlayer.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI
import AVKit
import Combine

struct CustomVideoPlayer: View {
    let url: URL
    let title: String
    let subtitles: [Subtitle]
    @Binding var isPresented: Bool
    @Binding var isFullscreen: Bool
    let showFullscreenButton: Bool
    
    // Progress tracking
    let mediaId: Int?
    let season: Int?
    let episode: Int?
    
    @ObservedObject var playerVM: PlayerViewModel
    @StateObject private var castManager = CastManager.shared
    @State private var showControls = true
    @State private var showSubtitlesMenu = false
    @State private var selectedSubtitle: Subtitle?
    @State private var showDeviceList = false
    
    init(url: URL, title: String, subtitles: [Subtitle] = [], isPresented: Binding<Bool>, isFullscreen: Binding<Bool>, showFullscreenButton: Bool = true, mediaId: Int? = nil, season: Int? = nil, episode: Int? = nil, playerVM: PlayerViewModel) {
        self.url = url
        self.title = title
        self.subtitles = subtitles
        self._isPresented = isPresented
        self._isFullscreen = isFullscreen
        self.showFullscreenButton = showFullscreenButton
        self.mediaId = mediaId
        self.season = season
        self.episode = episode
        self.playerVM = playerVM
    }
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            // Video Player
            if castManager.isConnected {
                // Show Cast Placeholder
                VStack(spacing: 20) {
                    Image(systemName: "tv")
                        .font(.system(size: 80))
                        .foregroundColor(.gray)
                    Text("Casting to \(castManager.deviceName ?? "Chromecast")")
                        .font(.title2)
                        .foregroundColor(.white)
                }
            } else {
                VideoPlayerView(player: playerVM.player, playerVM: playerVM)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation {
                            showControls.toggle()
                        }
                    }
            }
            
            // Subtitles Overlay
            if !castManager.isConnected, let sub = selectedSubtitle, let text = playerVM.currentSubtitleText {
                VStack {
                    Spacer()
                    Text(text)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(8)
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(8)
                        .padding(.bottom, 60)
                }
                .transition(.opacity)
            }
            
            // Controls Overlay
            if showControls {
                VStack {
                    // Top Bar
                    HStack {
                        // Close button removed as per user request
                        
                        Text(title)
                            .foregroundColor(.white)
                            .font(.headline)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        // AirPlay Button (Top Right)
                        AirPlayView()
                            .frame(width: 44, height: 44)
                    }
                    .padding()
                    .background(
                        LinearGradient(colors: [.black.opacity(0.8), .clear], startPoint: .top, endPoint: .bottom)
                    )
                    
                    Spacer()
                    
                    // Center Play/Pause
                    if playerVM.isBuffering {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                    } else {
                        Button {
                            if castManager.isConnected {
                                if castManager.mediaStatus?.playerState == .paused {
                                    CastManager.shared.loadMedia(url: url, title: title, posterUrl: nil, subtitles: subtitles, activeSubtitleUrl: selectedSubtitle?.url, startTime: playerVM.currentTime)
                                } else {
                                    // Handle pause for cast? GCKRemoteMediaClient has pause()
                                    // For simplicity, we just toggle local playerVM which is paused anyway.
                                    // We need proper Cast controls.
                                    // But for now, let's just use the local button to trigger load if needed.
                                }
                            } else {
                                playerVM.togglePlayPause()
                            }
                        } label: {
                            Image(systemName: playerVM.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.white)
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
                            
                            // Chromecast Button (Bottom Right)
                            CastButton {
                                showDeviceList = true
                            }
                                .frame(width: 44, height: 44)
                            
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
                    }
                    .padding()
                    .background(
                        LinearGradient(colors: [.clear, .black.opacity(0.8)], startPoint: .top, endPoint: .bottom)
                    )
                }
            }
        }
        .onAppear {
            // Check if we are already playing this URL (fullscreen transition)
            let isAlreadyPlaying = playerVM.currentUrl == url
            
            if !castManager.isConnected {
                playerVM.setup(url: url)
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
        }
        .onDisappear {
            playerVM.cleanup()
        }
        .sheet(isPresented: $showSubtitlesMenu) {
            SubtitleSelectionView(subtitles: subtitles, selectedSubtitle: $selectedSubtitle)
                .presentationDetents([.medium])
        }
        .onChange(of: selectedSubtitle?.id) { _ in
            if castManager.isConnected {
                castManager.setActiveTrack(url: selectedSubtitle?.url)
            } else {
                if let sub = selectedSubtitle, let url = URL(string: sub.url) {
                    playerVM.loadSubtitles(url: url)
                } else {
                    playerVM.clearSubtitles()
                }
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
        .onChange(of: url) { newUrl in
            if !castManager.isConnected {
                playerVM.setup(url: newUrl)
            }
        }
        .onChange(of: castManager.isConnected) { connected in
            if connected {
                print("📺 Cast connected! Switching to Cast mode.")
                playerVM.player.pause()
                castManager.loadMedia(url: url, title: title, posterUrl: nil, subtitles: subtitles, activeSubtitleUrl: selectedSubtitle?.url, startTime: playerVM.currentTime)
            } else {
                print("📱 Cast disconnected! Switching back to local player.")
                playerVM.setup(url: url)
                playerVM.seek(to: playerVM.currentTime) // Ideally we should get time from Cast
            }
        }
        .sheet(isPresented: $showDeviceList) {
            CastDeviceSelectionView()
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
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
}

// MARK: - Subtitle Selection View

struct SubtitleSelectionView: View {
    let subtitles: [Subtitle]
    @Binding var selectedSubtitle: Subtitle?
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            List {
                Button {
                    selectedSubtitle = nil
                    dismiss()
                } label: {
                    HStack {
                        Text("Désactivé")
                        Spacer()
                        if selectedSubtitle == nil {
                            Image(systemName: "checkmark")
                                .foregroundColor(AppTheme.primaryRed)
                        }
                    }
                }
                .foregroundColor(.primary)
                
                ForEach(subtitles, id: \.id) { sub in
                    Button {
                        selectedSubtitle = sub
                        dismiss()
                    } label: {
                        HStack {
                            Text(sub.flag)
                            Text(sub.label)
                            Spacer()
                            if selectedSubtitle?.id == sub.id {
                                Image(systemName: "checkmark")
                                    .foregroundColor(AppTheme.primaryRed)
                            }
                        }
                    }
                    .foregroundColor(.primary)
                }
            }
            .navigationTitle("Sous-titres")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Player ViewModel

// MARK: - Player ViewModel

extension Notification.Name {
    static let stopPlayback = Notification.Name("stopPlayback")
}

class PlayerViewModel: NSObject, ObservableObject {
    @Published var player = AVPlayer()
    @Published var isPlaying = false
    @Published var isBuffering = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 1
    @Published var currentSubtitleText: String?
    
    var isSeeking = false
    private var timeObserver: Any?
    private var subtitleParser: SubtitleParser?
    private var pipController: AVPictureInPictureController?
    private weak var playerLayer: AVPlayerLayer?
    private var observedItem: AVPlayerItem? // Track the item we're observing
    private(set) var currentUrl: URL? // Track current URL to prevent restart
    var isSwitchingModes = false // Track fullscreen transition
    
    override init() {
        super.init()
        
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
    
    func setup(url: URL) {
        // Notify others to stop
        NotificationCenter.default.post(name: .stopPlayback, object: self)
        
        // If same URL, just ensure playing and return
        if url == currentUrl {
            if !isPlaying {
                player.play()
                isPlaying = true
            }
            return
        }
        
        currentUrl = url
        let item = AVPlayerItem(url: url)
        player.replaceCurrentItem(with: item)
        player.play()
        isPlaying = true
        
        // Observe duration
        observedItem = item
        item.addObserver(self, forKeyPath: "duration", options: [.new, .initial], context: nil)
        
        // Observe time
        timeObserver = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] time in
            guard let self = self, !self.isSeeking else { return }
            self.currentTime = time.seconds
            self.updateSubtitle()
        }
        
        // setupPiP will be called separately with the layer
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
        
        currentUrl = nil
        player.pause()
        if let observer = timeObserver {
            player.removeTimeObserver(observer)
            timeObserver = nil
        }
        // Only remove observer if we actually added one
        if let item = observedItem {
            item.removeObserver(self, forKeyPath: "duration")
            observedItem = nil
        }
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
        if isPlaying {
            player.pause()
        } else {
            player.play()
        }
        isPlaying.toggle()
    }
    
    func seek(to time: Double) {
        player.seek(to: CMTime(seconds: time, preferredTimescale: 600))
    }
    
    func loadSubtitles(url: URL) {
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let content = String(data: data, encoding: .utf8) {
                    self.subtitleParser = SubtitleParser(content: content)
                }
            } catch {
                print("Failed to load subtitles: \(error)")
            }
        }
    }
    
    func clearSubtitles() {
        subtitleParser = nil
        currentSubtitleText = nil
    }
    
    private func updateSubtitle() {
        guard let parser = subtitleParser else { return }
        currentSubtitleText = parser.text(for: currentTime)
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
        if keyPath == "duration", let duration = player.currentItem?.duration.seconds, !duration.isNaN {
            DispatchQueue.main.async {
                self.duration = duration
            }
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
        // Basic VTT/SRT parsing logic
        // This is a simplified parser
        let lines = content.components(separatedBy: .newlines)
        var currentStart: Double = 0
        var currentEnd: Double = 0
        var currentText = ""
        
        // Regex for timestamps: 00:00:01.000 --> 00:00:04.000
        let timeRegex = try! NSRegularExpression(pattern: "(\\d{2}:\\d{2}:\\d{2}[.,]\\d{3}) --> (\\d{2}:\\d{2}:\\d{2}[.,]\\d{3})")
        
        for line in lines {
            if let match = timeRegex.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)) {
                if !currentText.isEmpty {
                    entries.append(Entry(startTime: currentStart, endTime: currentEnd, text: currentText.trimmingCharacters(in: .whitespacesAndNewlines)))
                    currentText = ""
                }
                
                let startStr = (line as NSString).substring(with: match.range(at: 1))
                let endStr = (line as NSString).substring(with: match.range(at: 2))
                
                currentStart = parseTime(startStr)
                currentEnd = parseTime(endStr)
            } else if !line.isEmpty && !line.trimmingCharacters(in: .whitespaces).allSatisfy({ $0.isNumber }) && line != "WEBVTT" {
                currentText += line + "\n"
            }
        }
    }
    
    func text(for time: Double) -> String? {
        return entries.first { time >= $0.startTime && time <= $0.endTime }?.text
    }
    
    private func parseTime(_ timeStr: String) -> Double {
        let parts = timeStr.replacingOccurrences(of: ",", with: ".").components(separatedBy: ":")
        guard parts.count == 3 else { return 0 }
        
        let h = Double(parts[0]) ?? 0
        let m = Double(parts[1]) ?? 0
        let s = Double(parts[2]) ?? 0
        
        return h * 3600 + m * 60 + s
    }
}

// MARK: - UIKit Wrappers

struct VideoPlayerView: UIViewRepresentable {
    let player: AVPlayer
    @ObservedObject var playerVM: PlayerViewModel
    
    func makeCoordinator() -> Coordinator {
        Coordinator(playerVM: playerVM)
    }
    
    func makeUIView(context: Context) -> PlayerView {
        print("🎥 VideoPlayerView.makeUIView called")
        let view = PlayerView()
        view.player = player
        
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

#if canImport(GoogleCast)
import GoogleCast

struct HiddenCastButton: UIViewRepresentable {
    func makeUIView(context: Context) -> GCKUICastButton {
        let button = GCKUICastButton(frame: .zero)
        // We don't hide it completely, just make it tiny/invisible so it's "in the hierarchy"
        button.alpha = 0.01
        return button
    }
    
    func updateUIView(_ uiView: GCKUICastButton, context: Context) {}
}

struct CastButton: View {
    @ObservedObject var castManager = CastManager.shared
    var onTap: () -> Void
    
    var body: some View {
        ZStack {
            // Hidden standard button to trigger permissions and SDK behaviors
            HiddenCastButton()
                .frame(width: 1, height: 1)
                .opacity(0)
            
            Button {
                print("🔘 Cast button tapped. Restarting discovery...")
                castManager.restartDiscovery()
                onTap()
            } label: {
                Image("Chromecast")
                    .resizable()
                    .renderingMode(.template)
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 30, height: 30)
                    .foregroundColor(castManager.isConnected ? .blue : .white)
                    .padding(8)
            }
        }
    }
}
#else
struct CastButton: View {
    var body: some View {
        Button {
            print("⚠️ Google Cast SDK not installed")
        } label: {
            Image("Chromecast")
                .resizable()
                .renderingMode(.template)
                .aspectRatio(contentMode: .fit)
                .frame(width: 30, height: 30) // Adjusted size (approx -15% from 36)
                .foregroundColor(.white)
                .padding(8)
        }
    }
}
#endif

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
            .gesture(
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
