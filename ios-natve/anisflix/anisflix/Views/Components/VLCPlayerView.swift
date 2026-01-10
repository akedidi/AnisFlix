
//
//  VLCPlayerView.swift
//  anisflix
//
//  Created by AI Assistant on 10/01/2026.
//  VLC-based player for MKV and other formats not supported by AVPlayer
//

import SwiftUI
import Combine
import MobileVLCKit

// MARK: - VLC Player ViewModel
class VLCPlayerViewModel: NSObject, ObservableObject, VLCMediaPlayerDelegate {
    @Published var isPlaying = false
    @Published var isBuffering = true
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var progress: Double = 0
    @Published var error: String?
    
    let mediaPlayer = VLCMediaPlayer()
    private var url: URL?
    var currentTitle: String?
    var posterUrl: URL?
    
    override init() {
        super.init()
        mediaPlayer.delegate = self
    }
    
    func setup(url: URL, title: String? = nil, posterUrl: URL? = nil) {
        self.url = url
        self.currentTitle = title
        self.posterUrl = posterUrl
        
        print("🎬 [VLCPlayer] Setting up with URL: \(url)")
        
        let media = VLCMedia(url: url)
        
        // Set network caching for better streaming
        media.addOptions([
            "network-caching": 3000,
            "http-user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
        ])
        
        mediaPlayer.media = media
        isBuffering = true
        error = nil
    }
    
    func play() {
        print("▶️ [VLCPlayer] Play")
        mediaPlayer.play()
        isPlaying = true
    }
    
    func pause() {
        print("⏸️ [VLCPlayer] Pause")
        mediaPlayer.pause()
        isPlaying = false
    }
    
    func togglePlayPause() {
        if isPlaying {
            pause()
        } else {
            play()
        }
    }
    
    func stop() {
        print("⏹️ [VLCPlayer] Stop")
        mediaPlayer.stop()
        isPlaying = false
    }
    
    func seek(to time: Double) {
        guard duration > 0 else { return }
        let position = Float(time / duration)
        mediaPlayer.position = position
        print("⏩ [VLCPlayer] Seek to \(time)s (\(Int(position * 100))%)")
    }
    
    func skipForward(seconds: Int32 = 10) {
        mediaPlayer.jumpForward(seconds)
    }
    
    func skipBackward(seconds: Int32 = 10) {
        mediaPlayer.jumpBackward(seconds)
    }
    
    // MARK: - VLCMediaPlayerDelegate
    
    func mediaPlayerStateChanged(_ aNotification: Notification) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let state = self.mediaPlayer.state
            print("📺 [VLCPlayer] State changed: \(state.rawValue)")
            
            switch state {
            case .playing:
                self.isPlaying = true
                self.isBuffering = false
            case .paused:
                self.isPlaying = false
                self.isBuffering = false
            case .buffering:
                self.isBuffering = true
            case .ended:
                self.isPlaying = false
                self.isBuffering = false
            case .error:
                self.isPlaying = false
                self.isBuffering = false
                self.error = "Playback error"
                print("❌ [VLCPlayer] Playback error")
            case .stopped:
                self.isPlaying = false
            default:
                break
            }
        }
    }
    
    func mediaPlayerTimeChanged(_ aNotification: Notification) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let time = Double(self.mediaPlayer.time.intValue) / 1000.0
            let length = Double(self.mediaPlayer.media?.length.intValue ?? 0) / 1000.0
            
            self.currentTime = time
            self.duration = length
            self.progress = length > 0 ? time / length : 0
            
            // If time is progressing, video is playing - disable buffering
            if time > 0 {
                self.isBuffering = false
                self.isPlaying = true
            }
        }
    }
}

// MARK: - VLC Video View (UIViewRepresentable)
struct VLCVideoView: UIViewRepresentable {
    let player: VLCMediaPlayer
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .black
        player.drawable = view
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        // Player drawable is set once in makeUIView
    }
}

// MARK: - VLC Player View (Full UI)
struct VLCPlayerView: View {
    @StateObject private var viewModel = VLCPlayerViewModel()
    @Environment(\.dismiss) private var dismiss
    
    let url: URL
    let title: String?
    let posterUrl: URL?
    
    @State private var showControls = true
    @State private var hideControlsTask: Task<Void, Never>?
    
    init(url: URL, title: String? = nil, posterUrl: URL? = nil) {
        self.url = url
        self.title = title
        self.posterUrl = posterUrl
    }
    
    var body: some View {
        ZStack {
            // Video View
            VLCVideoView(player: viewModel.mediaPlayer)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation {
                        showControls.toggle()
                    }
                    scheduleHideControls()
                }
            
            // Buffering Indicator
            if viewModel.isBuffering {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)
            }
            
            // Error Message
            if let error = viewModel.error {
                VStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.largeTitle)
                        .foregroundColor(.red)
                    Text(error)
                        .foregroundColor(.white)
                }
            }
            
            // Controls Overlay
            if showControls {
                VStack {
                    // Top Bar
                    HStack {
                        Button(action: {
                            viewModel.stop()
                            dismiss()
                        }) {
                            Image(systemName: "xmark")
                                .font(.title2)
                                .foregroundColor(.white)
                                .padding()
                        }
                        
                        Spacer()
                        
                        if let title = title {
                            Text(title)
                                .font(.headline)
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }
                        
                        Spacer()
                        
                        // Placeholder for symmetry
                        Color.clear
                            .frame(width: 44, height: 44)
                    }
                    .padding(.horizontal)
                    .background(LinearGradient(colors: [.black.opacity(0.7), .clear], startPoint: .top, endPoint: .bottom))
                    
                    Spacer()
                    
                    // Center Controls
                    HStack(spacing: 60) {
                        Button(action: { viewModel.skipBackward(seconds: 10) }) {
                            Image(systemName: "gobackward.10")
                                .font(.system(size: 36))
                                .foregroundColor(.white)
                        }
                        
                        Button(action: { viewModel.togglePlayPause() }) {
                            Image(systemName: viewModel.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.white)
                        }
                        
                        Button(action: { viewModel.skipForward(seconds: 10) }) {
                            Image(systemName: "goforward.10")
                                .font(.system(size: 36))
                                .foregroundColor(.white)
                        }
                    }
                    
                    Spacer()
                    
                    // Bottom Bar - Progress
                    VStack(spacing: 8) {
                        // Progress Slider
                        Slider(value: Binding(
                            get: { viewModel.progress },
                            set: { newValue in
                                let newTime = newValue * viewModel.duration
                                viewModel.seek(to: newTime)
                            }
                        ), in: 0...1)
                        .accentColor(.red)
                        
                        // Time Labels
                        HStack {
                            Text(formatTime(viewModel.currentTime))
                                .font(.caption)
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            Text(formatTime(viewModel.duration))
                                .font(.caption)
                                .foregroundColor(.white)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 30)
                    .background(LinearGradient(colors: [.clear, .black.opacity(0.7)], startPoint: .top, endPoint: .bottom))
                }
            }
        }
        .background(Color.black)
        .onAppear {
            viewModel.setup(url: url, title: title, posterUrl: posterUrl)
            viewModel.play()
            scheduleHideControls()
        }
        .onDisappear {
            viewModel.stop()
        }
        .statusBar(hidden: true)
        .preferredColorScheme(.dark)
    }
    
    private func scheduleHideControls() {
        hideControlsTask?.cancel()
        hideControlsTask = Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if !Task.isCancelled {
                await MainActor.run {
                    withAnimation {
                        showControls = false
                    }
                }
            }
        }
    }
    
    private func formatTime(_ seconds: Double) -> String {
        guard seconds.isFinite && seconds >= 0 else { return "0:00" }
        let totalSeconds = Int(seconds)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let secs = totalSeconds % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%d:%02d", minutes, secs)
        }
    }
}

#Preview {
    VLCPlayerView(url: URL(string: "https://example.com/video.mkv")!, title: "Test Video")
}
