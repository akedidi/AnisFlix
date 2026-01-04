//
//  MiniPlayerView.swift
//  anisflix
//
//  Created by AI Assistant on 03/01/2026.
//

import SwiftUI
import Combine

struct MiniPlayerView: View {
    @ObservedObject var playerManager = GlobalPlayerManager.shared
    @ObservedObject var castManager = CastManager.shared
    
    // Ticker to force UI refresh every second for progress updates
    @State private var ticker: Int = 0
    
    // Compute progress for the thin bar
    var progress: Double {
        // Use ticker to force recalculation
        _ = ticker
        
        if castManager.isConnected {
            let current = castManager.getApproximateStreamPosition()
            let total = castManager.currentDuration
            return total > 0 ? (current / total) : 0
        } else {
            let current = playerManager.playerVM.currentTime
            let total = playerManager.playerVM.duration
            return total > 0 ? (current / total) : 0
        }
    }
    
    var title: String {
        if castManager.isConnected {
            return castManager.currentTitle ?? "Casting..."
        }
        return playerManager.currentTitle
    }
    
    var subtitle: String {
        if castManager.isConnected {
            return castManager.deviceName ?? "Chromecast"
        }
        return "Lecture en cours"
    }
    
    var isPlaying: Bool {
        if castManager.isConnected {
            return castManager.isPlaying || castManager.isBuffering
        }
        return playerManager.playerVM.isPlaying
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Progress Bar (Thin line at top)
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                    
                    Rectangle()
                        .fill(AppTheme.primaryRed)
                        .frame(width: geometry.size.width * CGFloat(progress))
                }
            }
            .frame(height: 2)
            
            HStack(spacing: 12) {
                // Artwork
                if let artworkUrl = playerManager.currentPosterUrl, let url = URL(string: artworkUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Rectangle().fill(Color.gray.opacity(0.3))
                        }
                    }
                    .frame(width: 36, height: 48)
                    .clipped()
                    .cornerRadius(4)
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 36, height: 48)
                        .overlay(Image(systemName: "film").foregroundColor(.gray))
                        .cornerRadius(4)
                }
                
                // Title & Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Controls
                HStack(spacing: 20) {
                    // Chromecast Button (always handy)
                    CastButton()
                        .frame(width: 30, height: 30)
                    
                    // Play/Pause
                    Button {
                        if castManager.isConnected {
                            if castManager.isPlaying || castManager.isBuffering {
                                castManager.pause()
                            } else {
                                castManager.play()
                            }
                        } else {
                            playerManager.playerVM.togglePlayPause()
                        }
                    } label: {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                    }
                    
                    // Close - Only for non-cast (local playback)
                    if !castManager.isConnected {
                        Button {
                            playerManager.close()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding(.trailing, 8)
            }
            .padding(8)
            .background(Color(UIColor.systemGray6).opacity(0.95))
            .onTapGesture {
                // Expand to full player (local) or show cast control sheet
                if castManager.isConnected {
                    playerManager.showCastControlSheet = true
                } else {
                    withAnimation {
                        playerManager.isMinimised = false
                        playerManager.isPresented = true
                    }
                }
            }
        }
        .background(Color.black) // Fallback background
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            ticker += 1
        }
    }
}
