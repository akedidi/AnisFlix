//
//  PlayerContentView.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import SwiftUI
import AVKit
import MobileVLCKit

struct PlayerContentView: View {
    @ObservedObject var castManager = CastManager.shared
    @Binding var showControls: Bool
    @Binding var isFullscreen: Bool
    @ObservedObject var playerVM: PlayerViewModel
    
    // Zoom toggle: false = aspect fit (default), true = aspect fill (zoom to safe area)
    @State private var isZoomedToFill: Bool = false
    
    // Callbacks
    var onDoubleTapBack: () -> Void
    var onDoubleTapForward: () -> Void
    var onSingleTap: () -> Void
    
    var body: some View {
        ZStack {
            // Full black background
            Color.black
                .ignoresSafeArea(.all, edges: .all)
            
            if castManager.isConnected {
                CastPlaceholderView()
            } else if playerVM.useVLC, let vlcPlayer = playerVM.vlcPlayer {
                // VLC Player for MKV/unsupported formats
                VLCVideoViewWrapper(player: vlcPlayer, isZoomedToFill: isZoomedToFill)
                    .background(Color.black)
                    .ignoresSafeArea(.all, edges: .all)
            } else {
                VideoPlayerView(player: playerVM.player, playerVM: playerVM, isZoomedToFill: isZoomedToFill)
                    .background(Color.black)
                    .ignoresSafeArea(.all, edges: .all)
            }
            
            // Gesture Overlay (Pinch + Tap)
            if !castManager.isConnected {
                HStack(spacing: 0) {
                    // Left Side (Rewind)
                    Rectangle()
                        .fill(Color.black.opacity(0.001))
                        .contentShape(Rectangle())
                        .onTapGesture(count: 2) {
                            onDoubleTapBack()
                        }
                        .onTapGesture(count: 1) {
                            onSingleTap()
                        }
                    
                    // Right Side (Forward)
                    Rectangle()
                        .fill(Color.black.opacity(0.001))
                        .contentShape(Rectangle())
                        .onTapGesture(count: 2) {
                            onDoubleTapForward()
                        }
                        .onTapGesture(count: 1) {
                            onSingleTap()
                        }
                }
                .gesture(
                    MagnificationGesture()
                        .onEnded { value in
                            // Pinch out (zoom in) -> fill, Pinch in (zoom out) -> normal
                            if value > 1.0 {
                                isZoomedToFill = true
                            } else {
                                isZoomedToFill = false
                            }
                        }
                )
            }
        }
    }
}

// MARK: - VLC Video View Wrapper (UIViewRepresentable)
struct VLCVideoViewWrapper: UIViewRepresentable {
    let player: VLCMediaPlayer
    var isZoomedToFill: Bool = false
    
    func makeUIView(context: Context) -> UIView {
        let view = VLCRenderView()
        view.backgroundColor = .black
        view.player = player
        view.contentMode = isZoomedToFill ? .scaleAspectFill : .scaleAspectFit
        view.clipsToBounds = true
        
        // Force drawable assignment immediately if possible
        print("🎬 [VLCVideoViewWrapper] makeUIView - assigning player and drawable")
        player.drawable = view
        
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        // Ensure drawable is always set to current view
        if player.drawable as? UIView !== uiView {
            print("🎬 [VLCVideoViewWrapper] updateUIView - Reassigning drawable (was mismatch)")
            player.drawable = uiView
        }
        
        // Update content mode based on zoom state
        let targetMode: UIView.ContentMode = isZoomedToFill ? .scaleAspectFill : .scaleAspectFit
        if uiView.contentMode != targetMode {
            uiView.contentMode = targetMode
        }
        
        // Also update the player property on the view in case it changed
        if let renderView = uiView as? VLCRenderView {
            if renderView.player != player {
                print("🎬 [VLCVideoViewWrapper] updateUIView - Updating player instance on view")
                renderView.player = player
                player.drawable = renderView
            }
        }
    }
}

// Custom UIView that sets VLC drawable when added to window
class VLCRenderView: UIView {
    weak var player: VLCMediaPlayer?
    private var hasStartedPlayback = false
    
    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            print("🎬 [VLCRenderView] didMoveToWindow - window attached, bounds: \(bounds)")
            // Defer drawable assignment to next run loop to allow layer setup
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                print("🎬 [VLCRenderView] Setting drawable (deferred)")
                self.player?.drawable = self
                self.checkAndStartPlayback()
            }
        }
    }
    
    private func checkAndStartPlayback() {
        guard let player = player, !hasStartedPlayback else { return }
        
        hasStartedPlayback = true
        // Longer delay to ensure OpenGL context is created
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            print("▶️ [VLCRenderView] Attempting to start playback...")
            if player.state != .playing {
                player.play()
                print("▶️ [VLCRenderView] play() called")
            }
        }
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        if window != nil && bounds.width > 0 && bounds.height > 0 {
            if player?.drawable as? UIView !== self {
                print("🎬 [VLCRenderView] layoutSubviews - reassigning drawable")
                player?.drawable = self
            }
            // Ensure playback starts if it hasn't yet (e.g. if didMoveToWindow didn't trigger it)
            checkAndStartPlayback()
        }
    }
}


