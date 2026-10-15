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
    
    // Zoom toggle: false = aspect fit, true = aspect fill (crop to cover)
    @State private var isZoomedToFill: Bool = false
    
    var onDoubleTapBack: () -> Void
    var onDoubleTapForward: () -> Void
    var onSingleTap: () -> Void
    
    var body: some View {
        ZStack {
            Color.black
                .ignoresSafeArea(.all, edges: .all)
            
            if castManager.isConnected {
                CastPlaceholderView()
            } else if playerVM.useVLC, let vlcPlayer = playerVM.vlcPlayer {
                VLCVideoViewWrapper(
                    player: vlcPlayer,
                    isZoomedToFill: isZoomedToFill,
                    onZoomChanged: { fill in
                        if isZoomedToFill != fill {
                            isZoomedToFill = fill
                        }
                    },
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
            
            if !castManager.isConnected {
                HStack(spacing: 0) {
                    Rectangle()
                        .fill(Color.black.opacity(0.001))
                        .contentShape(Rectangle())
                        .onTapGesture(count: 2) { onDoubleTapBack() }
                        .onTapGesture(count: 1) { onSingleTap() }
                    
                    Rectangle()
                        .fill(Color.black.opacity(0.001))
                        .contentShape(Rectangle())
                        .onTapGesture(count: 2) { onDoubleTapForward() }
                        .onTapGesture(count: 1) { onSingleTap() }
                }
                // highPriority so pinch wins over the tap handlers
                .highPriorityGesture(
                    MagnificationGesture()
                        .onChanged { value in
                            if value > 1.08 {
                                isZoomedToFill = true
                            } else if value < 0.92 {
                                isZoomedToFill = false
                            }
                        }
                        .onEnded { value in
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
        .onChange(of: isFullscreen) { fullscreen in
            // Movies look better edge-to-edge in landscape fullscreen.
            if fullscreen {
                isZoomedToFill = true
            }
        }
        .onAppear {
            playerVM.vlcZoomToFill = isZoomedToFill
            if isFullscreen {
                isZoomedToFill = true
            }
        }
    }
}

// MARK: - VLC Video View Wrapper

struct VLCVideoViewWrapper: UIViewRepresentable {
    let player: VLCMediaPlayer
    var isZoomedToFill: Bool = false
    var onZoomChanged: ((Bool) -> Void)?
    let onDrawableReady: (UIView) -> Void
    let onDrawableDetached: (UIView) -> Void
    
    func makeUIView(context: Context) -> UIView {
        let view = VLCRenderView()
        view.backgroundColor = .black
        view.clipsToBounds = true
        view.player = player
        view.isZoomedToFill = isZoomedToFill
        view.onZoomChanged = onZoomChanged
        view.onDrawableReady = onDrawableReady
        view.onDrawableDetached = onDrawableDetached
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        guard let renderView = uiView as? VLCRenderView else { return }
        renderView.onDrawableReady = onDrawableReady
        renderView.onDrawableDetached = onDrawableDetached
        renderView.onZoomChanged = onZoomChanged
        if renderView.player !== player {
            renderView.player = player
        }
        if renderView.isZoomedToFill != isZoomedToFill {
            renderView.isZoomedToFill = isZoomedToFill
        }
        renderView.attachDrawableIfReady()
        renderView.layoutVideoCanvas()
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: ()) {
        (uiView as? VLCRenderView)?.detachDrawable()
    }
}

/// Hosts a `videoCanvas` subview sized for aspect-fit or aspect-fill.
/// MobileVLCKit ignores UIView.contentMode and scaleFactor is unreliable on
/// the iOS Metal drawable — sizing the canvas is the reliable approach.
class VLCRenderView: UIView {
    let videoCanvas = UIView()
    
    weak var player: VLCMediaPlayer? {
        didSet {
            guard oldValue !== player else { return }
            if oldValue?.drawable as? UIView === videoCanvas {
                oldValue?.drawable = nil
            }
            attachDrawableIfReady()
            layoutVideoCanvas()
        }
    }
    var onDrawableReady: ((UIView) -> Void)?
    var onDrawableDetached: ((UIView) -> Void)?
    var onZoomChanged: ((Bool) -> Void)?
    var isZoomedToFill: Bool = false {
        didSet {
            guard oldValue != isZoomedToFill else { return }
            layoutVideoCanvas()
            onZoomChanged?(isZoomedToFill)
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }
    
    private func commonInit() {
        backgroundColor = .black
        clipsToBounds = true
        videoCanvas.backgroundColor = .black
        videoCanvas.isUserInteractionEnabled = false
        addSubview(videoCanvas)
        
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(handlePinch(_:)))
        pinch.cancelsTouchesInView = false
        addGestureRecognizer(pinch)
    }
    
    @objc private func handlePinch(_ gesture: UIPinchGestureRecognizer) {
        guard gesture.state == .changed || gesture.state == .ended else { return }
        if gesture.scale > 1.08 {
            isZoomedToFill = true
            if gesture.state == .ended { gesture.scale = 1 }
        } else if gesture.scale < 0.92 {
            isZoomedToFill = false
            if gesture.state == .ended { gesture.scale = 1 }
        }
    }
    
    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            DispatchQueue.main.async { [weak self] in
                self?.attachDrawableIfReady()
                self?.layoutVideoCanvas()
            }
        } else {
            detachDrawable()
        }
    }
    
    func attachDrawableIfReady() {
        guard window != nil, bounds.width > 0, bounds.height > 0, player != nil else { return }
        // Pass self — PlayerViewModel routes drawable to videoCanvas.
        onDrawableReady?(self)
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        attachDrawableIfReady()
        layoutVideoCanvas()
    }

    /// Size `videoCanvas` so VLC (scaleFactor 0) paints edge-to-edge inside it.
    func layoutVideoCanvas() {
        guard bounds.width > 1, bounds.height > 1 else { return }
        
        let raw = player?.videoSize ?? .zero
        let videoSize: CGSize
        if raw.width > 1, raw.height > 1 {
            videoSize = raw
        } else {
            // Assume 16:9 until the decoder reports a real size.
            videoSize = CGSize(width: 16, height: 9)
        }
        
        let fitted = AVMakeRect(aspectRatio: videoSize, insideRect: bounds)
        let canvasFrame: CGRect
        if isZoomedToFill {
            let coverScale = max(bounds.width / fitted.width, bounds.height / fitted.height)
            let w = fitted.width * coverScale
            let h = fitted.height * coverScale
            canvasFrame = CGRect(
                x: (bounds.width - w) * 0.5,
                y: (bounds.height - h) * 0.5,
                width: w,
                height: h
            )
        } else {
            canvasFrame = fitted
        }
        
        if videoCanvas.frame != canvasFrame {
            videoCanvas.frame = canvasFrame
        }
        
        // Always let VLC fill its canvas; we own fit/fill via the canvas frame.
        if let player, player.scaleFactor != 0 {
            player.scaleFactor = 0
        }
        if player?.videoAspectRatio != nil {
            player?.videoAspectRatio = nil
        }
    }
    
    /// Legacy name used by PlayerViewModel after the first decoded frame.
    func applyVideoScaling() {
        layoutVideoCanvas()
    }

    func detachDrawable() {
        onDrawableDetached?(self)
    }
}
