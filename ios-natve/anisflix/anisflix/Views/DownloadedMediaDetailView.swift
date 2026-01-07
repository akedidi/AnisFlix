//
//  DownloadedMediaDetailView.swift
//  anisflix
//
//  Created by AI Assistant on 05/12/2025.
//

import SwiftUI
import AVKit

struct DownloadedMediaDetailView: View {
    let item: DownloadItem
    @ObservedObject var theme = AppTheme.shared
    @ObservedObject var watchProgressManager = WatchProgressManager.shared
    @ObservedObject var playerManager = GlobalPlayerManager.shared
    @Environment(\.presentationMode) var presentationMode
    
    var backdropUrl: URL? {
        // Priority 1: Local downloaded file
        if let localPath = item.localBackdropPath {
            let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            return documentsURL.appendingPathComponent(localPath)
        }
        // Fallback: Remote TMDB (if download not yet completed)
        if let path = item.backdropPath {
            return URL(string: "https://image.tmdb.org/t/p/w780\(path)")
        }
        return nil
    }
    
    var posterUrl: URL? {
        // Priority 1: Local downloaded file
        if let localPath = item.localPosterPath {
            let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            return documentsURL.appendingPathComponent(localPath)
        }
        // Fallback: Remote TMDB (if download not yet completed)
        if let path = item.posterPath {
            return URL(string: "https://image.tmdb.org/t/p/w500\(path)")
        }
        return nil
    }
    
    var body: some View {
        ZStack(alignment: .top) {
            theme.backgroundColor.ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Header with Backdrop/Poster
                    ZStack(alignment: .topLeading) {
                        if let url = backdropUrl {
                            AsyncImage(url: url) { phase in
                                if let image = phase.image {
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: UIScreen.main.bounds.width, height: 250)
                                        .clipped()
                                        .overlay(
                                            LinearGradient(
                                                gradient: Gradient(colors: [.clear, theme.backgroundColor]),
                                                startPoint: .center,
                                                endPoint: .bottom
                                            )
                                        )
                                } else {
                                    Rectangle()
                                        .fill(theme.cardBackground)
                                        .frame(width: UIScreen.main.bounds.width, height: 250)
                                }
                            }
                        } else if let url = posterUrl {
                            AsyncImage(url: url) { phase in
                                if let image = phase.image {
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: UIScreen.main.bounds.width, height: 250)
                                        .clipped()
                                } else {
                                    Rectangle()
                                        .fill(theme.cardBackground)
                                        .frame(width: UIScreen.main.bounds.width, height: 250)
                                }
                            }
                        } else {
                             Rectangle()
                                .fill(theme.cardBackground)
                                .frame(width: UIScreen.main.bounds.width, height: 250)
                        }
                        
                        // Back button removed to use system navigation
                    }
                    .frame(width: UIScreen.main.bounds.width)
                    
                    VStack(alignment: .leading, spacing: 24) {
                        // Title & Info
                        VStack(alignment: .leading, spacing: 16) {
                            Text(item.title)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(theme.primaryText)
                            
                            if let season = item.season, let episode = item.episode {
                                Text("S\(season) E\(episode)")
                                    .font(.headline)
                                    .foregroundColor(theme.secondaryText)
                            }
                            
                            HStack(spacing: 16) {
                                if let rating = item.rating {
                                    HStack(spacing: 4) {
                                        Image(systemName: "star.fill")
                                            .foregroundColor(.yellow)
                                            .font(.subheadline)
                                        Text(String(format: "%.1f", rating))
                                            .font(.subheadline.bold())
                                            .foregroundColor(theme.primaryText)
                                    }
                                }
                                
                                // Quality label removed
                                
                                Text(item.language)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(theme.cardBackground)
                                    .cornerRadius(4)
                                    .foregroundColor(theme.secondaryText)
                            }
                        }
                        .padding(.horizontal, 16)
                        
                        
                        // Watch Progress Bar
                        if watchProgress > 0 {
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    Rectangle()
                                        .fill(theme.secondaryText.opacity(0.3))
                                        .frame(height: 4)
                                    
                                    Rectangle()
                                        .fill(AppTheme.primaryRed)
                                        .frame(width: geometry.size.width * CGFloat(watchProgress), height: 4)
                                }
                                .cornerRadius(2)
                            }
                            .frame(height: 4)
                            .padding(.horizontal, 16)
                        }
                        
                        // Play Button (Big)
                        if let localUrl = item.localVideoUrl {
                            Button(action: {
                                // Build poster URL string
                                let posterUrlStr: String? = {
                                    if let localPath = item.localPosterPath {
                                        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                                        return documentsURL.appendingPathComponent(localPath).absoluteString
                                    } else if let remotePath = item.posterPath {
                                        return "https://image.tmdb.org/t/p/w500\(remotePath)"
                                    }
                                    return nil
                                }()
                                
                                // Convert local subtitles to Subtitle array
                                let subtitles = item.localSubtitles.map { 
                                    Subtitle(url: $0.url.absoluteString, label: $0.label, code: $0.code, flag: $0.flag) 
                                }
                                
                                // Format title: For series, include S01E01 - Episode Title
                                let displayTitle: String = {
                                    if let season = item.season, let episode = item.episode {
                                        // item.title is the episode title, we need to construct full title
                                        // Format: "S01E01 - Episode Title" (series name might not be available here)
                                        return "S\(String(format: "%02d", season))E\(String(format: "%02d", episode)) - \(item.title)"
                                    }
                                    return item.title
                                }()
                                
                                // Build server URL for Cast (Chromecast can't play local files)
                                let serverUrl = URL(string: item.videoUrl)
                                
                                // Use GlobalPlayerManager for consistent UX
                                playerManager.play(
                                    url: localUrl,
                                    title: displayTitle,
                                    posterUrl: posterUrlStr,
                                    subtitles: subtitles,
                                    mediaId: item.mediaId,
                                    season: item.season,
                                    episode: item.episode,
                                    isLive: false,
                                    serverUrl: serverUrl,
                                    provider: "download",
                                    language: item.language
                                )
                            }) {
                                HStack {
                                    Image(systemName: "play.fill")
                                    Text(theme.t("downloads.play"))
                                }
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(AppTheme.primaryRed)
                                .cornerRadius(12)
                            }
                            .padding(.horizontal, 16)
                        }
                        
                        // Overview
                        if let overview = item.overview, !overview.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(theme.t("detail.overview"))
                                    .font(.headline)
                                    .foregroundColor(theme.primaryText)
                                Text(overview)
                                    .font(.body)
                                    .foregroundColor(theme.secondaryText)
                            }
                            .padding(.horizontal, 16)
                        }
                        
                        Color.clear.frame(height: 150)
                    }
                    .padding(.top, 24)
                }
            }
            
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(item.title)
                    .font(.headline)
                    .foregroundColor(theme.primaryText)
            }
        }
    }
    
    // Compute watch progress for this item
    private var watchProgress: Double {
        watchProgressManager.getProgress(
            mediaId: item.mediaId,
            season: item.season,
            episode: item.episode
        )
    }
}
