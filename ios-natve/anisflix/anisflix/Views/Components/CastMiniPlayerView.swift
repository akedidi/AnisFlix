//
//  CastMiniPlayerView.swift
//  anisflix
//
//  Created by AI Assistant on 05/01/2026.
//

import SwiftUI

/// A persistent mini player that appears when casting to Chromecast
struct CastMiniPlayerView: View {
    @ObservedObject private var globalManager = GlobalPlayerManager.shared
    @Binding var showControlSheet: Bool
    
    var body: some View {
        // Show if there is ANY media loaded (Cast or Local)
        if globalManager.hasMedia {
            HStack(spacing: 12) {
                // Artwork
                if let artwork = globalManager.currentArtwork {
                    Image(uiImage: artwork)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 50, height: 50)
                        .cornerRadius(6)
                        .clipped()
                } else {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 50, height: 50)
                        .overlay(
                            Image(systemName: "tv")
                                .foregroundColor(.gray)
                        )
                }
                
                // Title & Device (or Local)
                VStack(alignment: .leading, spacing: 2) {
                    Text(globalManager.currentTitle ?? "Lecture en cours...")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    Text(globalManager.isCasting ? "Sur \(CastManager.shared.deviceName ?? "Chromecast")" : "Sur cet iPhone")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                // Play/Pause Button
                Button {
                    globalManager.togglePlayPause()
                } label: {
                    Image(systemName: globalManager.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black.opacity(0.85))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 16)
            .contentShape(Rectangle())
            .onTapGesture {
                if globalManager.isCasting {
                    showControlSheet = true
                } else {
                    // Local: Open Global Player
                    globalManager.isPresentingPlayer = true
                }
            }
        }
    }
}
