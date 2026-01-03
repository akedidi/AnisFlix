//
//  CastControlSheet.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import SwiftUI
import Combine

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
    
    // Ticker to force UI refresh every second
    @State private var ticker: Int = 0
    
    var body: some View {
        ZStack {
            // Background Layer
            GeometryReader { geo in
                Color.black
                
                if let artwork = castManager.currentArtwork {
                    Image(uiImage: artwork)
                        .resizable()
                        .aspectRatio(contentMode: .fill) // Fill the screen
                        .frame(width: geo.size.width, height: geo.size.height)
                        .blur(radius: 50)
                        .opacity(0.4)
                        .clipped() // FAST CUT of any overflow
                }
            }
            .ignoresSafeArea()
            
            // Main Content
            VStack(spacing: 0) {
                // Handle
                Capsule()
                    .fill(Color.white.opacity(0.3))
                    .frame(width: 40, height: 4)
                    .padding(.top, 8)
                    .padding(.bottom, 20)
                
                Spacer() // Push everything down
                
                // Artwork
                if let artwork = castManager.currentArtwork {
                    Image(uiImage: artwork)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .cornerRadius(12)
                        .shadow(radius: 20)
                        .padding(.horizontal, 60)
                        .frame(maxHeight: 300) // Restored nice height
                } else {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.3))
                        .aspectRatio(2/3, contentMode: .fit)
                        .overlay(
                            Image(systemName: "film")
                                .font(.system(size: 50))
                                .foregroundColor(.gray)
                        )
                        .padding(.horizontal, 60)
                        .frame(maxHeight: 300)
                }
                
                // Title
                VStack(spacing: 6) {
                    Text(castManager.currentTitle ?? "Unknown Title")
                        .font(.headline)
                        .bold()
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                    
                    Text("Casting to \(castManager.deviceName ?? "Chromecast")")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding(.horizontal, 30) // More padding for title
                .padding(.top, 20)
                
                // Fixed spacing instead of Spacer to keep title close to progress bar
                Color.clear.frame(height: 30)
                
                // Progress Bar
                VStack(spacing: 8) {
                    ProgressSlider(
                        value: isSeeking ? seekPosition : castManager.getApproximateStreamPosition(),
                        duration: castManager.currentDuration,
                        isSeeking: $isSeeking,
                        seekPosition: $seekPosition,
                        onSeekEnd: { time in
                            castManager.seek(to: time)
                        }
                    )
                    .frame(height: 20)
                    
                    HStack {
                        Text(formatTime(isSeeking ? seekPosition : castManager.getApproximateStreamPosition()))
                        Spacer()
                        Text(formatTime(castManager.currentDuration))
                    }
                    .font(.caption)
                    .foregroundColor(.gray)
                }
                .padding(.horizontal, 24)
                
                // Playback Controls
                HStack(spacing: 50) {
                    Button {
                        castManager.seek(to: max(0, castManager.getApproximateStreamPosition() - 10))
                    } label: {
                        Image(systemName: "gobackward.10")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                    }
                    
                    Button {
                        if castManager.isPlaying || castManager.isBuffering {
                            castManager.pause()
                        } else {
                            castManager.play()
                        }
                    } label: {
                        Image(systemName: (castManager.isPlaying || castManager.isBuffering) ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 64))
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
                .padding(.top, 30)
                
                // Bottom Controls
                HStack {
                    Button {
                        castManager.disconnect()
                        dismiss()
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: "stop.circle")
                                .font(.system(size: 22))
                            Text("Stop Casting")
                                .font(.caption2)
                        }
                        .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    Button {
                        showSubtitleSheet = true
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: "captions.bubble")
                                .font(.system(size: 22))
                            Text("Audio & Subtitles")
                                .font(.caption2)
                        }
                        .foregroundColor(castManager.currentSubtitles.isEmpty ? .gray : .white)
                    }
                    .disabled(castManager.currentSubtitles.isEmpty)
                }
                .padding(.horizontal, 40)
                .padding(.top, 20)
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, 50) // Ensure content is above home indicator
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            // Increment ticker to force UI refresh every second
            ticker += 1
        }
        // Hidden text that uses ticker to ensure Swift sees it as a dependency
        .overlay(Text("\(ticker)").opacity(0))
        .onAppear {
            // Sync active subtitle from CastManager
            selectedSubtitle = castManager.getActiveSubtitle()
        }
        .onChange(of: showSubtitleSheet) { isShowing in
            if isShowing {
                // Refresh selection when opening sheet (in case it changed externally)
                selectedSubtitle = castManager.getActiveSubtitle()
            }
        }
        .sheet(isPresented: $showSubtitleSheet) {
            SubtitleSelectionView(subtitles: castManager.currentSubtitles, selectedSubtitle: $selectedSubtitle, subtitleOffset: $subtitleOffset, subtitleFontSize: $subtitleFontSize)
                .presentationDetents([.medium])
        }
        .onChange(of: selectedSubtitle?.id) { _ in
            // Use lightweight track switching instead of full reload
            castManager.setActiveTrack(url: selectedSubtitle?.url)
        }
        .onChange(of: subtitleOffset) { newOffset in
            castManager.updateSubtitleConfig(activeUrl: selectedSubtitle?.url, offset: newOffset)
        }
        .onChange(of: subtitleFontSize) { newSize in
            castManager.sendSubtitleFontSize(newSize)
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

// Simple progress slider component
struct ProgressSlider: View {
    let value: Double
    let duration: Double
    @Binding var isSeeking: Bool
    @Binding var seekPosition: Double
    let onSeekEnd: (Double) -> Void
    
    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let safeDuration = max(duration, 1)
            let currentValue = isSeeking ? seekPosition : value
            let progress = min(max(currentValue / safeDuration, 0), 1)
            let thumbX = width * CGFloat(progress)
            
            ZStack(alignment: .leading) {
                // Track background
                Capsule()
                    .fill(Color.white.opacity(0.3))
                    .frame(height: 4)
                
                // Progress
                Capsule()
                    .fill(AppTheme.primaryRed)
                    .frame(width: thumbX, height: 4)
                
                // Thumb
                Circle()
                    .fill(Color.white)
                    .frame(width: 12, height: 12)
                    .offset(x: max(0, thumbX - 6))
            }
            .frame(height: geo.size.height)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { gesture in
                        isSeeking = true
                        let proportion = max(0, min(gesture.location.x / width, 1))
                        seekPosition = safeDuration * Double(proportion)
                    }
                    .onEnded { gesture in
                        let proportion = max(0, min(gesture.location.x / width, 1))
                        let target = safeDuration * Double(proportion)
                        onSeekEnd(target)
                        isSeeking = false
                    }
            )
        }
    }
}
