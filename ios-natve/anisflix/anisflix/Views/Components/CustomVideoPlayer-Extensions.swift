//
//  CustomVideoPlayer-Extensions.swift
//  anisflix
//
//  Created by AI Assistant on 14/02/2026.
//

import SwiftUI
import AVKit
import MobileVLCKit
#if canImport(GoogleCast)
import GoogleCast
#endif

// MARK: - Subviews Extension to fix Compiler Timeout
extension CustomVideoPlayer {
    
    private var seekBackwardOverlay: some View {
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
    
    private var seekForwardOverlay: some View {
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
    
    private var loadingOverlay: some View {
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
    
    private func subtitlesOverlay(text: String) -> some View {
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
    
    private var nextEpisodeOverlay: some View {
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
    
    private var controlsOverlay: some View {
        VStack(spacing: 0) {
            // Top Bar
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .center) {
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
