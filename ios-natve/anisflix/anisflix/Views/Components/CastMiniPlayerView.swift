//
//  CastMiniPlayerView.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import SwiftUI
import Combine

struct CastMiniPlayerView: View {
    @ObservedObject var castManager = CastManager.shared
    @Binding var showControlSheet: Bool
    
    // Ticker to force UI refresh every second
    @State private var ticker: Int = 0
    
    var body: some View {
        // Only show when connected (even if media is loading)
        // This ensures we see "Casting..." state
        if castManager.isConnected {
            VStack(spacing: 0) {
                // Progress Bar (Thin line at top)
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                        
                        Rectangle()
                            .fill(AppTheme.primaryRed)
                            .frame(width: geometry.size.width * progressProportion)
                    }
                }
                .frame(height: 2)
                
                HStack(spacing: 12) {
                    // Artwork or Placeholder
                    if let artwork = castManager.currentArtwork {
                        Image(uiImage: artwork)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
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
                    
                    // Title & Status
                    VStack(alignment: .leading, spacing: 2) {
                        Text(castManager.currentTitle ?? "Casting")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        Text(castManager.deviceName ?? "Chromecast")
                            .font(.caption)
                            .foregroundColor(.gray)
                            .lineLimit(1)
                    }
                    
                    Spacer()
                    
                    // Play/Pause Button
                    Button {
                        if castManager.isPlaying || castManager.isBuffering {
                             castManager.pause()
                        } else {
                             castManager.play()
                        }
                    } label: {
                        Image(systemName: (castManager.isPlaying || castManager.isBuffering) ? "pause.fill" : "play.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .padding(8)
                    }
                    
                    // Stop Cast Button
                    Button {
                        castManager.disconnect()
                    } label: {
                        Image(systemName: "stop.circle.fill")
                            .font(.title2)
                            .foregroundColor(.white.opacity(0.8))
                            .padding(8)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(UIColor.systemGray6).opacity(0.95))
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .shadow(radius: 4)
            .padding(.horizontal, 8)
            .padding(.bottom, 4) // Space above tab bar handled by injection point
            .onTapGesture {
                showControlSheet = true
            }
            .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
                ticker += 1
            }
        }
    }
    
    private var progressProportion: CGFloat {
        // Use ticker to force recalculation
        _ = ticker
        let current = castManager.getApproximateStreamPosition()
        let total = castManager.currentDuration
        return total > 0 ? CGFloat(current / total) : 0
    }
}
