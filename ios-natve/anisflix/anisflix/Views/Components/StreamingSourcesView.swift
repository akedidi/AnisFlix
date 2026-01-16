//
//  StreamingSourcesView.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import SwiftUI

struct StreamingSourcesView: View {
    let sources: [StreamingSource]
    let media: Media
    let season: Int?
    let episode: Int?
    let onSourceSelected: (StreamingSource) -> Void
    
    init(sources: [StreamingSource], media: Media, season: Int? = nil, episode: Int? = nil, onSourceSelected: @escaping (StreamingSource) -> Void) {
        self.sources = sources
        self.media = media
        self.season = season
        self.episode = episode
        self.onSourceSelected = onSourceSelected
    }
    
    @ObservedObject var theme = AppTheme.shared
    
    var groupedSources: [String: [StreamingSource]] {
        let grouped = Dictionary(grouping: sources, by: { $0.provider })
        // Sort sources within each group by quality (descending: 1080p > 720p > 480p > 360p)
        return grouped.mapValues { sources in
            sources.sorted { s1, s2 in
                getQualityValue(s1.quality) > getQualityValue(s2.quality)
            }
        }
    }
    
    // Extract numeric quality value for sorting
    private func getQualityValue(_ quality: String) -> Int {
        let q = quality.lowercased()
        if q.contains("4k") || q.contains("2160") { return 2160 }
        if q.contains("1080") { return 1080 }
        if q.contains("720") { return 720 }
        if q.contains("480") { return 480 }
        if q.contains("360") { return 360 }
        return 0
    }
    
    var providers: [String] {
        groupedSources.keys.sorted()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if sources.isEmpty {
                Text(theme.t("detail.noSources"))
                    .foregroundColor(theme.secondaryText)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(providers, id: \.self) { provider in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(provider)
                            .font(.headline)
                            .foregroundColor(theme.primaryText)
                            .padding(.horizontal, 4)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(groupedSources[provider] ?? []) { source in
                                    Button {
                                        onSourceSelected(source)
                                    } label: {
                                        VStack(alignment: .leading, spacing: 4) {
                                            HStack {
                                                Image(systemName: "play.circle.fill")
                                                    .foregroundColor(AppTheme.primaryRed)
                                                // Display quality with provider-specific formatting
                                                Text(displayQuality(for: source))
                                                    .font(.subheadline.bold())
                                                    .foregroundColor(theme.primaryText)
                                            }
                                            
                                            Text(source.language)
                                                .font(.caption)
                                                .foregroundColor(theme.secondaryText)
                                        }
                                        .padding(12)
                                        .background(theme.cardBackground)
                                        .cornerRadius(8)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(AppTheme.borderGray.opacity(0.3), lineWidth: 1)
                                        )
                                    }
                                    
                                    // Download Button
                                    DownloadButton(source: source, media: media, season: season, episode: episode)
                                }
                            }
                            .padding(.horizontal, 4)
                        }
                    }
                }
            }
        }
        .padding(.vertical)
    }
    
    // Helper function to format quality display based on provider
    private func displayQuality(for source: StreamingSource) -> String {
        let streamingProviders = ["vidzy", "vidmoly", "vixsrc", "primewire", "2embed", "afterdark"]
        
        if streamingProviders.contains(source.provider.lowercased()) {
            // For streaming providers, show HD as default
            return "HD"
        } else if source.provider.lowercased() == "movix" {
            // For Movix download sources, show actual quality (4K, 1080p, 360p, etc.)
            let quality = source.quality.uppercased()
            if quality.contains("4K") || quality.contains("2160") {
                return "4K"
            } else if quality.contains("1080") {
                return "1080p"
            } else if quality.contains("720") {
                return "720p"
            } else if quality.contains("480") {
                return "480p"
            } else if quality.contains("360") {
                return "360p"
            } else {
                return source.quality
            }
        } else {
            // Fallback to original quality
            return source.quality
        }
    }
}

struct DownloadButton: View {
    let source: StreamingSource
    let media: Media
    let season: Int?
    let episode: Int?
    
    @ObservedObject var downloadManager = DownloadManager.shared
    @ObservedObject var theme = AppTheme.shared
    @State private var isExtracting = false
    @State private var extractionError: String?
    @State private var showDeleteConfirmation = false
    
    var body: some View {
        // Check status specifically for THIS source
        let isDownloading = downloadManager.isDownloading(mediaId: media.id, season: season, episode: episode, sourceId: source.id)
        let downloadItem = downloadManager.getDownload(mediaId: media.id, season: season, episode: episode, sourceId: source.id)
        
        if let item = downloadItem {
            HStack(spacing: 8) {
                // Button 1: Pause / Resume / Progress
                DownloadButtonContent(state: item.state, progress: item.progress) {
                    if item.state == .downloading || item.state == .queued {
                        downloadManager.pauseDownload(id: item.id)
                    } else if item.state == .paused {
                        downloadManager.resumeDownload(id: item.id)
                    } else if item.state == .completed {
                        // Action for completed (e.g. delete or play - handled elsewhere usually)
                    } else if item.state == .failed {
                        downloadManager.resumeDownload(id: item.id)
                    }
                }
                
                // Button 2: Stop / Delete (Visible only if active/paused/failed)
                if item.state != .completed {
                    Button {
                        showDeleteConfirmation = true
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(AppTheme.primaryRed)
                    }
                }
            }
            .alert(isPresented: $showDeleteConfirmation) {
                Alert(
                    title: Text(theme.t("downloads.deleteAlertTitle")),
                    message: Text(theme.t("downloads.deleteAlertMessage")),
                    primaryButton: .destructive(Text(theme.t("downloads.deleteConfirm"))) {
                        downloadManager.cancelDownload(id: item.id)
                    },
                    secondaryButton: .cancel(Text(theme.t("settings.cancel")))
                )
            }
        } else {
            Button {
                startExtractionAndDownload()
            } label: {
                ZStack {
                    if isExtracting {
                        ProgressView()
                            .scaleEffect(0.8)
                            .frame(width: 40, height: 40)
                    } else {
                        Image(systemName: "arrow.down.circle")
                            .font(.title3)
                            .foregroundColor(AppTheme.primaryRed)
                            .padding(8)
                            .background(theme.cardBackground)
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .stroke(AppTheme.borderGray.opacity(0.3), lineWidth: 1)
                            )
                    }
                }
            }
            .disabled(isExtracting)
            .alert(item: Binding<String?>(
                get: { extractionError },
                set: { extractionError = $0 }
            )) { error in
                Alert(title: Text("Erreur"), message: Text(error), dismissButton: .default(Text("OK")))
            }
        }
    }
    
    private func startExtractionAndDownload() {
        // Block Luluvid downloads - iOS limitation with HLS headers
        if source.provider == "luluvid" {
            extractionError = "Le téléchargement n'est pas disponible pour les sources Luluvid. Utilisez la lecture en streaming."
            return
        }
        
        isExtracting = true
        extractionError = nil
        
        Task {
            do {
                var streamUrl: String
                
                if source.provider == "vidmoly" {
                    streamUrl = try await StreamingService.shared.extractVidMoly(url: source.url)
                } else if source.provider == "vidzy" {
                    streamUrl = try await StreamingService.shared.extractVidzy(url: source.url)
                } else {
                    streamUrl = source.url
                }
                
                await MainActor.run {
                    downloadManager.startDownload(
                        source: source,
                        media: media,
                        season: season,
                        episode: episode,
                        extractedUrl: streamUrl
                    )
                    isExtracting = false
                }
            } catch {
                await MainActor.run {
                    isExtracting = false
                    extractionError = "Impossible d'extraire le lien de téléchargement: \(error.localizedDescription)"
                }
            }
        }
    }
}

// Helper for String to be Identifiable for Alert
extension String: Identifiable {
    public var id: String { self }
}

// Helper view for the button content
struct DownloadButtonContent: View {
    let state: DownloadState
    let progress: Double
    let onAction: () -> Void
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        Button(action: onAction) {
            ZStack {
                if state != .completed {
                    Circle()
                        .fill(theme.cardBackground)
                        .frame(width: 40, height: 40)
                        .overlay(
                            Circle()
                                .stroke(AppTheme.borderGray.opacity(0.3), lineWidth: 1)
                        )
                }
                
                switch state {
                case .waiting, .queued:
                    ProgressView()
                        .scaleEffect(0.8)
                case .downloading:
                    ZStack {
                        Circle()
                            .stroke(theme.secondaryText.opacity(0.3), lineWidth: 3)
                        Circle()
                            .trim(from: 0, to: CGFloat(progress))
                            .stroke(AppTheme.primaryRed, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        
                        Image(systemName: "square.fill")
                            .font(.system(size: 10))
                            .foregroundColor(AppTheme.primaryRed)
                    }
                    .frame(width: 36, height: 36)
                    
                case .completed:
                    Image(systemName: "checkmark")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(AppTheme.primaryRed)
                        .frame(width: 40, height: 40)
                    
                case .paused:
                     Image(systemName: "arrow.down.circle")
                        .font(.system(size: 20))
                        .foregroundColor(AppTheme.primaryRed.opacity(0.5))
                        
                case .failed:
                    Image(systemName: "exclamationmark.circle")
                        .font(.system(size: 20))
                        .foregroundColor(.red)
                }
            }
        }
        .disabled(state == .completed)
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        StreamingSourcesView(sources: [
            StreamingSource(id: "1", url: "", quality: "1080p", type: "m3u8", provider: "FStream", language: "Français"),
            StreamingSource(id: "3", url: "", quality: "HD", type: "m3u8", provider: "Darkibox", language: "Français")
        ], media: Media(id: 1, title: "Test Movie", overview: "", posterPath: nil, backdropPath: nil, rating: 0, year: "", mediaType: .movie, voteCount: 0, originalLanguage: "", releaseDate: "", episodeInfo: nil)) { _ in }
    }
}

