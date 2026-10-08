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
    let onDrawableReady: (UIView) -> Void
    let onDrawableDetached: (UIView) -> Void
    
    func makeUIView(context: Context) -> UIView {
        let view = VLCRenderView()
        view.backgroundColor = .black
        view.player = player
        view.onDrawableReady = onDrawableReady
        view.onDrawableDetached = onDrawableDetached
        view.contentMode = isZoomedToFill ? .scaleAspectFill : .scaleAspectFit
        view.clipsToBounds = true
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        // Update content mode based on zoom state
        let targetMode: UIView.ContentMode = isZoomedToFill ? .scaleAspectFill : .scaleAspectFit
        if uiView.contentMode != targetMode {
            uiView.contentMode = targetMode
        }
        
        // Also update the player property on the view in case it changed
        if let renderView = uiView as? VLCRenderView {
            renderView.onDrawableReady = onDrawableReady
            renderView.onDrawableDetached = onDrawableDetached
            if renderView.player !== player {
                print("🎬 [VLCVideoViewWrapper] updateUIView - Updating player instance on view")
                renderView.player = player
            }
            renderView.attachDrawableIfReady()
        }
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
        }
    }
    var onDrawableReady: ((UIView) -> Void)?
    var onDrawableDetached: ((UIView) -> Void)?
    
    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            print("🎬 [VLCRenderView] didMoveToWindow - window attached, bounds: \(bounds)")
            DispatchQueue.main.async { [weak self] in
                self?.attachDrawableIfReady()
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
    }

    func detachDrawable() {
        onDrawableDetached?(self)
    }
}
