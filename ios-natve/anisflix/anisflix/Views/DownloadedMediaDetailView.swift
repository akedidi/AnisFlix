//
//  DownloadedMediaDetailView.swift
//  anisflix
//
//  Created by AI Assistant on 03/12/2025.
//

import SwiftUI
import AVKit

struct DownloadedMediaDetailView: View {
    let item: DownloadItem
    @ObservedObject var theme = AppTheme.shared
    @Environment(\.presentationMode) var presentationMode
    
    @State private var showPlayer = false
    @State private var isFullscreen = false
    @StateObject private var playerVM = PlayerViewModel()
    
    var backdropUrl: URL? {
        if let localPath = item.localBackdropPath {
            let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            return documentsURL.appendingPathComponent(localPath)
        } else if let path = item.backdropPath {
            return URL(string: "https://image.tmdb.org/t/p/w1280\(path)")
        }
        return nil
    }
    
    var posterUrl: URL? {
        if let localPath = item.localPosterPath {
            let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            return documentsURL.appendingPathComponent(localPath)
        } else if let path = item.posterPath {
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
                    GeometryReader { geometry in
                        ZStack(alignment: .topLeading) {
                            if let url = backdropUrl {
                                AsyncImage(url: url) { phase in
                                    if let image = phase.image {
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: geometry.size.width, height: 250)
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
                                            .frame(width: geometry.size.width, height: 250)
                                    }
                                }
                            } else if let url = posterUrl {
                                AsyncImage(url: url) { phase in
                                    if let image = phase.image {
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: geometry.size.width, height: 250)
                                            .clipped()
                                    } else {
                                        Rectangle()
                                            .fill(theme.cardBackground)
                                            .frame(width: geometry.size.width, height: 250)
                                    }
                                }
                            } else {
                                 Rectangle()
                                    .fill(theme.cardBackground)
                                    .frame(width: geometry.size.width, height: 250)
                            }
                        }
                    }
                    .frame(height: 250)
                    
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
                        
                        // Play Button (Big)
                        if !showPlayer {
                            Button(action: {
                                showPlayer = true
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
                        } else {
                            // Placeholder for player space when inline
                             Color.clear.frame(height: 250)
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
                        
                        Spacer(minLength: 50)
                    }
                    .padding(.top, 24)
                }
            }
            
            // Player Overlay
            if showPlayer, let url = item.localVideoUrl {
                GeometryReader { playerGeo in
                    VStack(spacing: 0) {
                        // Header above player when inline
                        if !isFullscreen {
                            HStack {
                                Spacer()
                                
                                Button(action: {
                                    showPlayer = false
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "xmark.circle.fill")
                                        Text(theme.t("detail.close"))
                                    }
                                    .font(.subheadline)
                                    .foregroundColor(theme.secondaryText)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(theme.cardBackground)
                                    .cornerRadius(16)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 8)
                            .padding(.top, 350) // Approximate position
                        }
                        
                        CustomVideoPlayer(
                            url: url,
                            title: item.title,
                            posterUrl: posterUrl?.absoluteString,
                            subtitles: item.localSubtitles.map { Subtitle(url: $0.url.absoluteString, label: $0.label, code: $0.code, flag: $0.flag) },
                            isPresented: $showPlayer,
                            isFullscreen: $isFullscreen,
                            showFullscreenButton: true,
                            mediaId: item.mediaId,
                            season: item.season,
                            episode: item.episode,
                            playerVM: playerVM
                        )
                        .frame(width: playerGeo.size.width, height: isFullscreen ? playerGeo.size.height : 250)
                        
                        if !isFullscreen {
                            Spacer()
                        }
                    }
                    .background(isFullscreen ? Color.black : Color.clear)
                }
                .edgesIgnoringSafeArea(isFullscreen ? .all : [])
                .zIndex(100)
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
        .toolbar(isFullscreen ? .hidden : .visible, for: .tabBar)
        .toolbar(isFullscreen ? .hidden : .visible, for: .navigationBar)
        .navigationBarBackButtonHidden(isFullscreen)
        .statusBar(hidden: isFullscreen)
    }
}
