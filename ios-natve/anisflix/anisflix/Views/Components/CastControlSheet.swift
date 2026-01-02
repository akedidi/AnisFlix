//
//  CastControlSheet.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import SwiftUI

struct CastControlSheet: View {
    @ObservedObject var castManager = CastManager.shared
    @Environment(\.dismiss) var dismiss
    
    // Local state for scrubbing interaction
    @State private var isSeeking = false
    @State private var seekPosition: Double = 0
    
    // Subtitle Sheet State
    @State private var showSubtitleSheet = false
    @State private var selectedSubtitle: Subtitle?
    @State private var subtitleOffset: Double = 0
    @AppStorage("subtitleFontSize") private var subtitleFontSize: Double = 100
    
    // Helper to extract subtitles from tracks since we don't have the original 'subtitles' array here easily
    // We will rely on CastManager or pass them if possible. 
    // Ideally CastManager should expose current tracks.
    
    var body: some View {
        ZStack {
            // Background Blur
            Color.black.edgesIgnoringSafeArea(.all)
            
            if let artwork = castManager.currentArtwork {
                Image(uiImage: artwork)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .blur(radius: 50)
                    .opacity(0.4)
                    .edgesIgnoringSafeArea(.all)
            }
            
            VStack(spacing: 24) {
                // Handle/Close Indicator
                Capsule()
                    .fill(Color.white.opacity(0.3))
                    .frame(width: 40, height: 4)
                    .padding(.top, 10)
                
                Spacer()
                
                // Artwork
                if let artwork = castManager.currentArtwork {
                    Image(uiImage: artwork)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .cornerRadius(12)
                        .shadow(radius: 20)
                        .padding(.horizontal, 40)
                        .frame(maxHeight: 400)
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .aspectRatio(2/3, contentMode: .fit)
                        .overlay(Image(systemName: "film").font(.system(size: 60)).foregroundColor(.gray))
                        .cornerRadius(12)
                        .padding(.horizontal, 40)
                        .frame(maxHeight: 400)
                }
                
                // Title
                VStack(spacing: 8) {
                    Text(castManager.mediaStatus?.mediaInformation?.metadata?.string(forKey: kGCKMetadataKeyTitle) ?? "Unknown Title")
                        .font(.title2)
                        .bold()
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                    
                    Text("Casting to \(castManager.deviceName ?? "Chromecast")")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .padding(.horizontal)
                
                Spacer()
                
                // Controls
                VStack(spacing: 20) {
                    
                    // Progress Bar
                    VStack(spacing: 8) {
                        Slider(
                            value: Binding(
                                get: { isSeeking ? seekPosition : castManager.getApproximateStreamPosition() },
                                set: { newValue in
                                    isSeeking = true
                                    seekPosition = newValue
                                }
                            ),
                            in: 0...(castManager.mediaStatus?.mediaInformation?.streamDuration ?? 1),
                            onEditingChanged: { editing in
                                isSeeking = editing
                                if !editing {
                                    castManager.seek(to: seekPosition)
                                }
                            }
                        )
                        .accentColor(AppTheme.primaryRed)
                        
                        HStack {
                            Text(formatTime(isSeeking ? seekPosition : castManager.getApproximateStreamPosition()))
                            Spacer()
                            Text(formatTime(castManager.mediaStatus?.mediaInformation?.streamDuration ?? 0))
                        }
                        .font(.caption)
                        .foregroundColor(.gray)
                    }
                    .padding(.horizontal)
                    
                    // Main Buttons
                    HStack(spacing: 40) {
                        Button {
                            castManager.seek(to: max(0, castManager.getApproximateStreamPosition() - 10))
                        } label: {
                            Image(systemName: "gobackward.10")
                                .font(.system(size: 30))
                                .foregroundColor(.white)
                        }
                        
                        Button {
                             if let status = castManager.mediaStatus {
                                 if status.playerState == .playing || status.playerState == .buffering {
                                     castManager.pause()
                                 } else {
                                     castManager.play()
                                 }
                             }
                        } label: {
                            Image(systemName: (castManager.mediaStatus?.playerState == .playing || castManager.mediaStatus?.playerState == .buffering) ? "pause.circle.fill" : "play.circle.fill")
                                .font(.system(size: 70))
                                .foregroundColor(.white)
                        }
                        
                        Button {
                            castManager.seek(to: castManager.getApproximateStreamPosition() + 10)
                        } label: {
                            Image(systemName: "goforward.10")
                                .font(.system(size: 30))
                                .foregroundColor(.white)
                        }
                    }
                    
                    // Secondary Controls (Subtitles / Stop)
                    HStack(spacing: 20) {
                        Button {
                            // Stop Casting
                            castManager.disconnect()
                            dismiss()
                        } label: {
                            VStack {
                                Image(systemName: "stop.circle")
                                    .font(.title2)
                                Text("Stop Casting")
                                    .font(.caption)
                            }
                            .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        Button {
                           // Open Subtitles - We need to pass subtitles somehow.
                           // Since CastManager doesn't expose raw Subtitle objects directly in this scope easily without storing them,
                           // we might need to store them in CastManager when loading.
                           // For now, let's assume valid mock or current tracks.
                           // TODO: Enhace CastManager to store current subtitles list.
                        } label: {
                             VStack {
                                Image(systemName: "captions.bubble")
                                    .font(.title2)
                                Text("Audio & Subtitles")
                                    .font(.caption)
                            }
                            .foregroundColor(.gray) // Disabled for this iteration until `subtitles` are available globally
                        }
                        .disabled(true)
                    }
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                }
                .padding(.bottom, 40)
            }
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            // Refresh UI every second for progress bar
            // CastManager updates internally but we need View refresh
            // The Slider binding reading `getApproximateStreamPosition()` handles this implicitly on redraw
        }
    }
    
    func formatTime(_ seconds: Double) -> String {
        guard !seconds.isNaN && !seconds.isInfinite else { return "00:00" }
        let totalSeconds = Int(seconds)
        let h = totalSeconds / 3600
        let m = (totalSeconds % 3600) / 60
        let s = totalSeconds % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%02d:%02d", m, s)
    }
}
