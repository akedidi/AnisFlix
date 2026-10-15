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
    
    // Zoom toggle: false = aspect fit (default), true = aspect fill (crop to cover)
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
                // VLC Player for MKV / MovieBox progressive MP4
                VLCVideoViewWrapper(
                    player: vlcPlayer,
                    isZoomedToFill: isZoomedToFill,
                    onDrawableReady: { view in
                        playerVM.attachVLCDrawable(view)
                    },
                    onDrawableDetached: { view in
                        playerVM.detachVLCDrawable(view)
                    }
                )
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
                // simultaneousGesture so pinch works together with the tap handlers
                .simultaneousGesture(
                    MagnificationGesture()
                        .onEnded { value in
                            // Pinch out → fill/crop, pinch in → fit with letterbox
                            if value > 1.05 {
                                isZoomedToFill = true
                            } else if value < 0.95 {
                                isZoomedToFill = false
                            }
                        }
                )
            }
        }
        .onChange(of: isZoomedToFill) { fill in
            playerVM.vlcZoomToFill = fill
        }
        .onAppear {
            playerVM.vlcZoomToFill = isZoomedToFill
        }
    }
}

// MARK: - VLC Video View Wrapper (UIViewRepresentable)
struct VLCVideoViewWrapper: UIViewRepresentable {
    let player: VLCMediaPlayer
    var isZoomedToFill: Bool = false
    let onDrawableReady: (UIView) -> Void
    let onDrawableDetached: (UIView) -> Void
    
    func makeUIView(context: Context) -> UIView {
        let view = VLCRenderView()
        view.backgroundColor = .black
        view.clipsToBounds = true
        view.player = player
        view.isZoomedToFill = isZoomedToFill
        view.onDrawableReady = onDrawableReady
        view.onDrawableDetached = onDrawableDetached
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        guard let renderView = uiView as? VLCRenderView else { return }
        renderView.onDrawableReady = onDrawableReady
        renderView.onDrawableDetached = onDrawableDetached
        if renderView.player !== player {
            print("🎬 [VLCVideoViewWrapper] updateUIView - Updating player instance on view")
            renderView.player = player
        }
        renderView.isZoomedToFill = isZoomedToFill
        renderView.attachDrawableIfReady()
        renderView.applyVideoScaling()
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: ()) {
        (uiView as? VLCRenderView)?.detachDrawable()
    }
}

// Custom UIView that sets VLC drawable when added to window
class VLCRenderView: UIView {
    weak var player: VLCMediaPlayer? {
        didSet {
            guard oldValue !== player else { return }
            if oldValue?.drawable as? UIView === self {
                oldValue?.drawable = nil
            }
            attachDrawableIfReady()
            applyVideoScaling()
        }
    }
    var onDrawableReady: ((UIView) -> Void)?
    var onDrawableDetached: ((UIView) -> Void)?
    /// UIView.contentMode is ignored by MobileVLCKit — use scaleFactor instead.
    var isZoomedToFill: Bool = false {
        didSet {
            guard oldValue != isZoomedToFill else { return }
            applyVideoScaling()
        }
    }
    
    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            print("🎬 [VLCRenderView] didMoveToWindow - window attached, bounds: \(bounds)")
            DispatchQueue.main.async { [weak self] in
                self?.attachDrawableIfReady()
                self?.applyVideoScaling()
            }
        } else {
            detachDrawable()
        }
    }
    
    func attachDrawableIfReady() {
        guard window != nil, bounds.width > 0, bounds.height > 0, player != nil else { return }
        onDrawableReady?(self)
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        attachDrawableIfReady()
        applyVideoScaling()
    }

    /// Aspect-fit (`scaleFactor = 0`) or aspect-fill (cover + crop via scaleFactor).
    func applyVideoScaling() {
        guard let player else { return }
        guard bounds.width > 1, bounds.height > 1 else { return }

        let videoSize = player.videoSize
        guard videoSize.width > 1, videoSize.height > 1 else {
            // Video size unknown yet — let VLC fit the drawable.
            if player.scaleFactor != 0 {
                player.scaleFactor = 0
            }
            return
        }

        // Clear any forced aspect from older fill hacks.
        if player.videoAspectRatio != nil {
            player.videoAspectRatio = nil
        }

        if isZoomedToFill {
            let scale = max(bounds.width / videoSize.width, bounds.height / videoSize.height)
            let target = Float(scale)
            if abs(player.scaleFactor - target) > 0.001 {
                player.scaleFactor = target
                print("🔍 [VLCRenderView] zoom fill scaleFactor=\(target) view=\(bounds.size) video=\(videoSize)")
            }
        } else if player.scaleFactor != 0 {
            player.scaleFactor = 0
            print("🔍 [VLCRenderView] zoom fit (scaleFactor=0)")
        }
    }

    func detachDrawable() {
        onDrawableDetached?(self)
    }
}
