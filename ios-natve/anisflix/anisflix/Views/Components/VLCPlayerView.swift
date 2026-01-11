
//
//  VLCPlayerView.swift
//  anisflix
//
//  Created by AI Assistant on 10/01/2026.
//  VLC-based player for MKV and other formats.
//  Configuration: "Magic Triad" (ios2 + Soft Decode + User-Agent)
//

import SwiftUI
import Combine
import MobileVLCKit
import AVKit // For AirPlay

// MARK: - VLC Player ViewModel
class VLCPlayerViewModel: NSObject, ObservableObject, VLCMediaPlayerDelegate {
    static let shared = VLCPlayerViewModel() // ✅ TRUE SINGLETON
    
    let id = UUID() // Track lifecycle (Should trigger only once now)
    
    @Published var isPlaying = false
    @Published var isBuffering = true
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var progress: Double = 0
    @Published var error: String?
    
    // Seek Protection
    @Published var isSeeking = false
    
    // Make mediaPlayer mutable and Published to trigger UI updates on re-creation
    @Published var mediaPlayer = VLCMediaPlayer()
    var url: URL?
    
    // Tracks
    @Published var subtitleTracks: [Int: String] = [:]
    @Published var currentSubtitleIndex: Int = -1
    @Published var audioTracks: [Int: String] = [:]
    @Published var currentAudioIndex: Int = -1
    
    // Scrobbling Data
    var mediaId: Int?
    var season: Int?
    var episode: Int?

    private override init() { // Private Init
        super.init()
        print("🦄 [VLCPlayerVM] SINGLETON INIT \(id.uuidString.prefix(8))")
        setupPlayerInstance()
    }
    
    private func setupPlayerInstance() {
        mediaPlayer = VLCMediaPlayer()
        mediaPlayer.delegate = self
    }
    
    func setup(url: URL) {
        // Stop currently playing media
        if mediaPlayer.isPlaying {
            mediaPlayer.stop()
        }
        
        // ♻️ HARD RESET: Create a fresh player instance to clear VideoToolbox corruption
        print("♻️ [VLCPlayerVM] Refreshing Player Instance")
        setupPlayerInstance()
        
        self.url = url
        print("🎬 [VLCPlayerVM] Setup Shared Instance: \(url)")
        
        let media = VLCMedia(url: url)
        media.addOptions([
            "network-caching": 5000, // Boost buffer
            "avcodec-hw": "any", // Hardware Decoding
            "http-user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
        ])
        
        mediaPlayer.media = media
        isBuffering = true
        
        // Reset state
        currentTime = 0
        duration = 0
        progress = 0
        isPlaying = false
        isSeeking = false
    }
    
    func play() { mediaPlayer.play() }
    func pause() { mediaPlayer.pause() }
    func stop() { mediaPlayer.stop() }
    
    // MARK: - Delegate (Use MainActor to prevent Threads Crash)
    func mediaPlayerStateChanged(_ aNotification: Notification) {
        // Ensure UI updates are on Main Thread
        DispatchQueue.main.async {
            let state = self.mediaPlayer.state
            switch state {
            case .playing:
                self.isPlaying = true
                self.isBuffering = false
                self.updateTracks()
            case .buffering:
                self.isBuffering = true
            case .ended, .stopped, .error:
                self.isPlaying = false
                self.isBuffering = false
            case .paused:
                self.isPlaying = false
            default: break
            }
        }
    }
    
    func mediaPlayerTimeChanged(_ aNotification: Notification) {
        // Use Weak Self to avoid retain cycles
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // IGNORE updates during seek
            if self.isSeeking { return }
            
            let t = Double(self.mediaPlayer.time.intValue) / 1000.0
            let d = Double(self.mediaPlayer.media?.length.intValue ?? 0) / 1000.0
            
            // Debug Log & Periodic Auto-Save
            if Int(t) % 5 == 0 { 
                 // print("⏱️ [VLC] Time: \(Int(t))s / \(Int(d))s") // Reduced noise
                 
                 // Auto-Save Progress every 5 seconds (Safety Net)
                 if let mid = self.mediaId, d > 0 {
                     WatchProgressManager.shared.saveProgress(mediaId: mid, season: self.season, episode: self.episode, currentTime: t, duration: d)
                 }
            }
            
            self.currentTime = t
            if d > 0 {
                self.duration = d
                self.progress = t / d
            }
            if self.isBuffering && t > 0 {
                self.isBuffering = false
                self.isPlaying = true
            }
        }
    }
    
    func updateTracks() {
        if let names = mediaPlayer.videoSubTitlesNames as? [String],
           let indexes = mediaPlayer.videoSubTitlesIndexes as? [Int] {
            subtitleTracks = Dictionary(uniqueKeysWithValues: zip(indexes, names))
            currentSubtitleIndex = Int(mediaPlayer.currentVideoSubTitleIndex)
        }
        if let names = mediaPlayer.audioTrackNames as? [String],
           let indexes = mediaPlayer.audioTrackIndexes as? [Int] {
            audioTracks = Dictionary(uniqueKeysWithValues: zip(indexes, names))
            currentAudioIndex = Int(mediaPlayer.currentAudioTrackIndex)
        }
    }
    
    func setAudio(_ index: Int) {
        mediaPlayer.currentAudioTrackIndex = Int32(index)
        currentAudioIndex = index // Force UI Update
    }
    
    func setSubtitle(_ index: Int) {
        mediaPlayer.currentVideoSubTitleIndex = Int32(index)
        currentSubtitleIndex = index // Force UI Update
    }
    
    // PAUSE -> SEEK -> PLAY (Fixes Double Audio)
    func seek(to time: Double) {
        guard duration > 0 else { return }
        
        print("⏩ [VLCPlayerVM] Seeking to \(time)s")
        isSeeking = true
        
        // Pause to flush buffer and stop audio
        mediaPlayer.pause()
        mediaPlayer.position = Float(time / duration)
        
        // Wait for seek to apply, then play
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.mediaPlayer.play()
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                 self.isSeeking = false
            }
        }
    }
    
    func skipForward() { seek(to: currentTime + 10) }
    func skipBackward() { seek(to: currentTime - 10) }
    func togglePlayPause() { isPlaying ? mediaPlayer.pause() : mediaPlayer.play() }
}

// MARK: - VLC Video View
struct VLCVideoView: UIViewRepresentable {
    let player: VLCMediaPlayer
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        
        // SYNC DRAWABLE ATTACHMENT
        // MUST be on Main Thread (makeUIView is always Main Thread)
        print("📺 [VLCVideoView] Attaching drawable (SYNC)")
        player.drawable = view
        
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        // Ensure drawable maintains connection
        if player.drawable as? UIView != uiView {
             print("⚠️ [VLCVideoView] Restoring drawable connection")
             player.drawable = uiView
        }
    }
    
    static func dismantleUIView(_ uiView: UIView, coordinator: ()) {
        print("🗑️ [VLCVideoView] Dismantling Video View")
        
        let player = VLCPlayerViewModel.shared.mediaPlayer
        
        // 1. Detach Drawable FIRST to stop rendering
        if player.drawable as? UIView == uiView {
            player.drawable = nil
        }
        
        // 2. Stop Player
        if player.isPlaying {
            player.stop()
        }
    }
}

// MARK: - AirPlay View
struct VLCAirPlayView: UIViewRepresentable {
    func makeUIView(context: Context) -> AVRoutePickerView {
        let view = AVRoutePickerView()
        view.activeTintColor = .red
        view.tintColor = .white
        view.prioritizesVideoDevices = true
        return view
    }
    func updateUIView(_ uiView: AVRoutePickerView, context: Context) {}
}

// MARK: - VLC Player View
struct VLCPlayerView: View {
    @ObservedObject private var viewModel = VLCPlayerViewModel.shared // ✅ USE SINGLETON
    @Environment(\.dismiss) private var dismiss
    
    let url: URL
    let title: String?
    let mediaId: Int?
    let season: Int?
    let episode: Int?
    
    init(url: URL, title: String? = nil, posterUrl: URL? = nil, mediaId: Int? = nil, season: Int? = nil, episode: Int? = nil) {
        self.url = url
        self.title = title
        self.mediaId = mediaId
        self.season = season
        self.episode = episode
    }
    
    @State private var showControls = true
    @State private var isDragging = false
    @State private var dragProgress: Double = 0
    @State private var dragOffset: CGSize = .zero
    @State private var isFillMode = false
    @State private var hasResumed = false
    
    func saveProgress() {
        guard let mid = mediaId else { return }
        if viewModel.duration > 0 && viewModel.currentTime > 5 {
            let p = viewModel.currentTime / viewModel.duration
            if p < 0.95 {
                 print("💾 [VLCView] Force Save: \(Int(viewModel.currentTime))s")
                WatchProgressManager.shared.saveProgress(mediaId: mid, season: season, episode: episode, currentTime: viewModel.currentTime, duration: viewModel.duration)
            }
        }
    }
    
    func attemptResume() {
        guard !hasResumed, let mid = mediaId else { return }
        
        // Wait for duration to be known!
        guard viewModel.duration > 0 else {
             print("⏳ [VLCView] Resume deferred (Unknown duration)")
             return
        }
        
        let saved = WatchProgressManager.shared.getSavedTime(mediaId: mid, season: season, episode: episode)
        if let t = saved, t > 10 {
            print("🔄 [VLCView] Resuming at \(t)s (Duration: \(viewModel.duration))")
            viewModel.seek(to: t)
            hasResumed = true
        } else {
             hasResumed = true
        }
    }
    
    func closePlayer() {
        saveProgress()
        viewModel.stop()
        if isFillMode { ScreenRotator.rotate(to: .portrait) }
        dismiss()
    }

    var body: some View {
        ZStack {
            // 1. VIDEO LAYER
            VLCVideoView(player: viewModel.mediaPlayer)
                .edgesIgnoringSafeArea(.all)
                
            // 2. INTERACTION LAYER (Tap & Drag)
            // This transparent layer ensures we catch taps even if VLC view swallows them
            Color.clear
                .contentShape(Rectangle())
                .edgesIgnoringSafeArea(.all)
                .onTapGesture {
                    withAnimation { showControls.toggle() }
                }
                .gesture(
                    DragGesture()
                        .onChanged { gesture in
                            if gesture.translation.height > 0 {
                                self.dragOffset = gesture.translation
                            }
                        }
                        .onEnded { gesture in
                            if gesture.translation.height > 100 {
                                closePlayer()
                            } else {
                                withAnimation { self.dragOffset = .zero }
                            }
                        }
                )
            
            // 2. BUFFERING OVERLAY
            if viewModel.isBuffering && !isDragging {
                ZStack {
                    Color.black.opacity(0.4)
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(1.5)
                }
                .edgesIgnoringSafeArea(.all)
            }
            
            // 3. CONTROLS OVERLAY
            if showControls {
                VStack(spacing: 0) {
                    // --- TOP BAR ---
                    HStack {
                        Button(action: { closePlayer() }) {
                            Image(systemName: "xmark")
                                .font(.title3.bold())
                                .foregroundColor(.white)
                                .padding()
                                .background(Circle().fill(Color.black.opacity(0.5)))
                        }
                        
                        Text(title ?? "Media")
                            .font(.headline)
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .padding(.leading, 8)
                        
                        Spacer()
                        
                        // ROTATION TOGGLE
                        Button(action: {
                            isFillMode.toggle()
                            if isFillMode {
                                ScreenRotator.rotate(to: .landscape)
                                viewModel.mediaPlayer.scaleFactor = 0
                                viewModel.mediaPlayer.videoAspectRatio = UnsafeMutablePointer<Int8>(mutating: ("16:9" as NSString).utf8String)
                            } else {
                                ScreenRotator.rotate(to: .portrait)
                                viewModel.mediaPlayer.scaleFactor = 0
                                viewModel.mediaPlayer.videoAspectRatio = nil
                            }
                        }) {
                            Image(systemName: isFillMode ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding()
                                .background(Circle().fill(Color.black.opacity(0.5)))
                        }
                        
                        VLCAirPlayView().frame(width: 44, height: 44)
                    }
                    .padding(.horizontal)
                    .padding(.top, 40)
                    .background(LinearGradient(colors: [.black.opacity(0.8), .clear], startPoint: .top, endPoint: .bottom))
                    
                    Spacer()
                    
                    // --- CENTER CONTROLS ---
                    if !viewModel.isBuffering { // 1. Hide when buffering
                        HStack(spacing: 50) {
                            Button(action: { viewModel.skipBackward() }) {
                                Image(systemName: "gobackward.10").font(.system(size: 40)).foregroundColor(.white)
                            }
                            
                            Button(action: { viewModel.togglePlayPause() }) {
                                Image(systemName: viewModel.isPlaying ? "pause.fill" : "play.fill")
                                    .font(.system(size: 60))
                                    .foregroundColor(.white)
                            }
                            
                            Button(action: { viewModel.skipForward() }) {
                                Image(systemName: "goforward.10").font(.system(size: 40)).foregroundColor(.white)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // --- BOTTOM BAR ---
                    VStack(spacing: 10) {
                        Slider(
                            value: Binding(
                                get: { isDragging ? dragProgress : viewModel.progress },
                                set: { newValue in dragProgress = newValue }
                            ),
                            onEditingChanged: { editing in
                                isDragging = editing
                                if editing {
                                    print("🖐 [Seek] START Drag")
                                } else {
                                    let targetTime = dragProgress * viewModel.duration
                                    print("🚀 [Seek] END Drag - Target: \(Int(targetTime))s")
                                    viewModel.seek(to: targetTime)
                                }
                            }
                        )
                        // .accentColor(.red) // Deprecated
                        .tint(.red)
                        
                        HStack {
                            Text(format(isDragging ? dragProgress * viewModel.duration : viewModel.currentTime))
                                .font(.caption).foregroundColor(.white)
                            Spacer()
                            
                            Menu {
                                Button("Jeter les sous-titres") { viewModel.setSubtitle(-1) }
                                ForEach(Array(viewModel.subtitleTracks), id: \.key) { key, val in
                                    Button {
                                        viewModel.setSubtitle(key)
                                    } label: {
                                        HStack {
                                            Text(val)
                                            if key == viewModel.currentSubtitleIndex { Image(systemName: "checkmark") }
                                        }
                                    }
                                }
                            } label: {
                                Image(systemName: "captions.bubble").foregroundColor(.white).padding(8)
                            }
                            
                            Menu {
                                ForEach(Array(viewModel.audioTracks), id: \.key) { key, val in
                                    Button {
                                        viewModel.setAudio(key)
                                    } label: {
                                        HStack {
                                            Text(val)
                                            if key == viewModel.currentAudioIndex { Image(systemName: "checkmark") }
                                        }
                                    }
                                }
                            } label: {
                                Image(systemName: "waveform").foregroundColor(.white).padding(8)
                            }
                            
                            Spacer()
                            Text(format(viewModel.duration)).font(.caption).foregroundColor(.white)
                        }
                    }
                    .padding()
                    .padding(.bottom, 20)
                    .background(LinearGradient(colors: [.clear, .black.opacity(0.9)], startPoint: .top, endPoint: .bottom))
                }
                .edgesIgnoringSafeArea(.all)
                .contentShape(Rectangle()) // 2. Catch taps on empty space
                .onTapGesture { // 3. Toggle controls when tapping overlay
                    withAnimation { showControls.toggle() }
                }
                // 4. Allow Swipe to Close even when controls are open
                .gesture(
                    DragGesture()
                        .onChanged { gesture in
                            if gesture.translation.height > 0 {
                                self.dragOffset = gesture.translation
                            }
                        }
                        .onEnded { gesture in
                            if gesture.translation.height > 100 {
                                closePlayer()
                            } else {
                                withAnimation { self.dragOffset = .zero }
                            }
                        }
                )
            }
        }
        .background(Color.black.edgesIgnoringSafeArea(.all))
        .offset(y: dragOffset.height) // 5. Visual Feedback for Drag
        .onChange(of: viewModel.duration) { newDuration in
             // Try to resume if we haven't yet, now that we have duration
             if newDuration > 0 && !hasResumed {
                 attemptResume()
             }
        }
        .onAppear {
            viewModel.setup(url: url)
            viewModel.mediaId = mediaId
            viewModel.season = season
            viewModel.episode = episode
            
            // Auto Play
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                viewModel.play()
            }
        }
        .onDisappear {
            if isFillMode { ScreenRotator.rotate(to: .portrait) }
            saveProgress()
            viewModel.stop()
        }
    }
    
    func format(_ s: Double) -> String {
        let m = Int(s) / 60
        let sec = Int(s) % 60
        return String(format: "%d:%02d", m, sec)
    }
}
