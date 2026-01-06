//
//  CastMiniPlayerView.swift
//  anisflix
//
//  Created by AI Assistant on 05/01/2026.
//

import SwiftUI

/// A persistent mini player that appears when casting to Chromecast
struct CastMiniPlayerView: View {
    @ObservedObject private var castManager = CastManager.shared
    @ObservedObject private var localMediaManager = LocalMediaManager.shared
    @Binding var showControlSheet: Bool
    
    var body: some View {
        // Show if casting OR if local media is playing (and not casting)
        let showCast = castManager.isConnected && castManager.hasMediaLoaded
        let showLocal = !castManager.isConnected && localMediaManager.hasMedia
        
        if showCast || showLocal {
            HStack(spacing: 12) {
                // Artwork
                if let artwork = (showCast ? castManager.currentArtwork : localMediaManager.currentArtwork) {
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
                
                // Title & Device
                VStack(alignment: .leading, spacing: 2) {
                    Text((showCast ? castManager.currentTitle : localMediaManager.currentTitle) ?? "Lecture en cours...")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    Text(showCast ? "Sur \(castManager.deviceName ?? "Chromecast")" : "Sur cet iPhone")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                // Play/Pause Button
                Button {
                    if showCast {
                        if castManager.isPlaying || castManager.isBuffering {
                            castManager.pause()
                        } else {
                            castManager.play()
                        }
                    } else {
                        // Local Control via Notification
                        // We can't access player directly from here easily without coupling
                        // But we can post a notification that CustomVideoPlayer listens to
                        // Or we can just use the togglePlayPause if we had access to VM
                        // For now, let's use a notification approach or just show status
                        // Since CustomVideoPlayer is alive, we can post a notification
                         NotificationCenter.default.post(name: NSNotification.Name("TogglePlayPause"), object: nil)
                    }
                } label: {
                    Image(systemName: (showCast ? (castManager.isPlaying || castManager.isBuffering) : localMediaManager.isPlaying) ? "pause.fill" : "play.fill")
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
                if showCast {
                    showControlSheet = true
                } else {
                    // Navigate to player? Or just show controls?
                    // If we are locals, we are likely already on the page or navigated away
                    // If navigated away, we can't easily pop back without navigation path access
                    // For now, let's just allow play/pause
                }
            }
        }
    }
}
