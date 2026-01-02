//
//  PlayerContentView.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import SwiftUI
import AVKit

struct PlayerContentView: View {
    @ObservedObject var castManager = CastManager.shared
    @Binding var showControls: Bool
    @Binding var isFullscreen: Bool
    @ObservedObject var playerVM: PlayerViewModel
    
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
            } else {
                VideoPlayerView(player: playerVM.player, playerVM: playerVM)
                    .background(Color.black)
                    .ignoresSafeArea(.all, edges: .all)
            }
            
            // Gesture Overlay
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
            }
        }
    }
}
