//
//  MovieDetailView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI
import Combine

struct MovieDetailView: View {
    let movieId: Int
    
    @ObservedObject var theme = AppTheme.shared
    @State private var movie: MovieDetail?
    @State private var similarMovies: [Media] = []
    @State private var isLoading = true
    @Environment(\.presentationMode) var presentationMode
    
    @State private var videos: [Video] = []
    @State private var showPlayer = false
    @State private var playerURL: URL?
    @State private var subtitles: [Subtitle] = []
    @State private var isFullscreen = false
    @StateObject private var playerVM = PlayerViewModel()
    @ObservedObject var favoritesManager = FavoritesManager.shared
    
    // Sources
    @State private var sources: [StreamingSource] = []
    @State private var isLoadingSources = false
    @State private var selectedLanguage = "VF" // VF or VOSTFR
    @State private var extractionError: String?
    @State private var watchProgress: Double? // Watch progress (0.0 to 1.0)
    
    var body: some View {
        ZStack(alignment: .top) {
            theme.backgroundColor.ignoresSafeArea()
            
            if isLoading {
                VStack {
                    ProgressView()
                        .tint(AppTheme.primaryRed)
                    Text(theme.t("common.loading"))
                        .foregroundColor(theme.secondaryText)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let movie = movie {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {

                        
                        // Header with Backdrop/Poster
                        ZStack(alignment: .topLeading) {
                            if let backdropPath = movie.backdropPath {
                                AsyncImage(url: URL(string: "https://image.tmdb.org/t/p/w1280\(backdropPath)")) { phase in
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
                            } else if let posterPath = movie.posterPath {
                                AsyncImage(url: URL(string: "https://image.tmdb.org/t/p/w500\(posterPath)")) { phase in
                                    if let image = phase.image {
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: UIScreen.main.bounds.width, height: 250)
                                            .clipped()
                                    }
                                }
                            }
                            
                            // Back button removed to use system navigation
                        }
                        .frame(width: UIScreen.main.bounds.width)
                        
                        VStack(alignment: .leading, spacing: 64) {
                            // Title & Info
                            VStack(alignment: .leading, spacing: 16) {
                                HStack(alignment: .top) {
                                    Text(movie.title)
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(theme.primaryText)
                                        .fixedSize(horizontal: false, vertical: true)
                                    
                                    Spacer()
                                    
                                    // Favorite Button
                                    Button(action: {
                                        let media = Media(
                                            id: movie.id,
                                            title: movie.title,
                                            overview: movie.overview,
                                            posterPath: movie.posterPath,
                                            backdropPath: movie.backdropPath,
                                            rating: movie.voteAverage,
                                            year: String(movie.releaseDate?.prefix(4) ?? ""),
                                            mediaType: .movie,
                                            voteCount: movie.voteCount,
                                            originalLanguage: nil,
                                            releaseDate: movie.releaseDate
                                        )
                                        
                                        if favoritesManager.isFavorite(media) {
                                            favoritesManager.remove(media)
                                        } else {
                                            favoritesManager.add(media)
                                        }
                                    }) {
                                        Image(systemName: favoritesManager.isFavorite(Media(id: movieId, title: "", overview: nil, posterPath: nil, backdropPath: nil, rating: nil, year: nil, mediaType: .movie, voteCount: nil, originalLanguage: nil, releaseDate: nil)) ? "heart.fill" : "heart")
                                            .font(.title2)
                                            .foregroundColor(favoritesManager.isFavorite(id: movie.id) ? AppTheme.primaryRed : theme.secondaryText)
                                    }
                                }
                                
                                HStack(spacing: 16) {
                                    if let releaseDate = movie.releaseDate {
                                        Label(String(releaseDate.prefix(4)), systemImage: "calendar")
                                            .font(.subheadline)
                                            .foregroundColor(theme.secondaryText)
                                    }
                                    
                                    HStack(spacing: 4) {
                                        Image(systemName: "star.fill")
                                            .foregroundColor(.yellow)
                                            .font(.subheadline)
                                        Text(String(format: "%.1f", movie.voteAverage))
                                            .font(.subheadline.bold())
                                            .foregroundColor(theme.primaryText)
                                    }
                                    
                                    if movie.runtime > 0 {
                                        Label(movie.formattedDuration, systemImage: "clock")
                                            .font(.subheadline)
                                            .foregroundColor(theme.secondaryText)
                                    }
                                }
                                
                                // Genres
                                if !movie.genres.isEmpty {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack {
                                            ForEach(movie.genres) { genre in
                                                Text(genre.name)
                                                    .font(.caption)
                                                    .padding(.horizontal, 12)
                                                    .padding(.vertical, 6)
                                                    .background(theme.cardBackground)
                                                    .cornerRadius(16)
                                                    .foregroundColor(theme.secondaryText)
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            
                            }
                            
                            // Overview
                            if let overview = movie.overview, !overview.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(theme.t("detail.overview"))
                                        .font(.headline)
                                        .foregroundColor(theme.primaryText)
                                    Text(overview)
                                        .font(.body)
                                        .foregroundColor(theme.secondaryText)
                                        .lineLimit(4)
                                }
                                .padding(.horizontal, 16)
                                .padding(.top, 24)
                            }
                            
                            // Sources Section
                            VStack(alignment: .leading, spacing: 16) {
                                // Simple progress bar if available
                                if let progress = watchProgress, progress > 0 {
                                    GeometryReader { geometry in
                                        ZStack(alignment: .leading) {
                                            // Background
                                            Rectangle()
                                                .fill(Color.gray.opacity(0.3))
                                                .frame(height: 3)
                                            
                                            // Progress
                                            Rectangle()
                                                .fill(AppTheme.primaryRed)
                                                .frame(width: geometry.size.width * CGFloat(progress), height: 3)
                                        }
                                    }
                                    .frame(height: 3)
                                    .padding(.horizontal, 16)
                                }
                                
                                Text(theme.t("detail.availableSources"))
                                    .font(.headline)
                                    .foregroundColor(theme.primaryText)
                                    .padding(.horizontal, 16)
                                
                                if isLoadingSources {
                                    HStack {
                                        ProgressView()
                                            .tint(AppTheme.primaryRed)
                                        Text(theme.t("common.loading"))
                                            .foregroundColor(theme.secondaryText)
                                            .font(.subheadline)
                                    }
                                    .padding(.horizontal, 16)
                                } else if let error = extractionError {
                                    VStack(spacing: 8) {
                                        Text(error)
                                            .foregroundColor(.red)
                                            .font(.caption)
                                            .multilineTextAlignment(.center)
                                        
                                        Button("Réessayer") {
                                            extractionError = nil
                                        }
                                        .font(.caption.bold())
                                        .foregroundColor(AppTheme.primaryRed)
                                    }
                                    .padding(.horizontal, 16)
                                } else if sources.isEmpty {
                                    Text(theme.t("detail.noSources"))
                                        .foregroundColor(theme.secondaryText)
                                        .font(.subheadline)
                                        .padding(.horizontal, 16)
                                } else {
                                    // Language Tabs
                                    HStack(spacing: 20) {
                                        ForEach(["VF", "VOSTFR", "VO"], id: \.self) { lang in
                                            let hasSources = sources.contains { source in
                                                if lang == "VF" {
                                                    return source.language.lowercased().contains("french") || source.language.lowercased().contains("vf")
                                                } else if lang == "VOSTFR" {
                                                    return source.language.lowercased().contains("vostfr")
                                                } else {
                                                    return source.language.lowercased().contains("vo") || source.language.lowercased().contains("eng") || source.language.lowercased().contains("english")
                                                }
                                            }
                                            
                                            Button(action: {
                                                if hasSources {
                                                    selectedLanguage = lang
                                                }
                                            }) {
                                                VStack(spacing: 8) {
                                                    Text(lang)
                                                        .font(.headline)
                                                        .foregroundColor(selectedLanguage == lang ? AppTheme.primaryRed : (hasSources ? theme.secondaryText : theme.secondaryText.opacity(0.3)))
                                                    
                                                    if selectedLanguage == lang {
                                                        Rectangle()
                                                            .fill(AppTheme.primaryRed)
                                                            .frame(height: 2)
                                                    } else {
                                                        Rectangle()
                                                            .fill(Color.clear)
                                                            .frame(height: 2)
                                                    }
                                                }
                                            }
                                            .disabled(!hasSources)
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                    
                                    // Sources List (Line by Line)
                                    if !showPlayer {
                                        if sources.filter({ source in
                                            if selectedLanguage == "VF" {
                                                return source.language.lowercased().contains("french") || source.language.lowercased().contains("vf")
                                            } else if selectedLanguage == "VOSTFR" {
                                                return source.language.lowercased().contains("vostfr")
                                            } else {
                                                return source.language.lowercased().contains("vo") || source.language.lowercased().contains("eng") || source.language.lowercased().contains("english")
                                            }
                                        }).isEmpty {
                                            Text("\(theme.t("detail.noSourcesFor")) \(selectedLanguage)")
                                                .foregroundColor(theme.secondaryText)
                                                .font(.subheadline)
                                                .padding(.horizontal, 16)
                                                .padding(.vertical, 20)
                                        } else {
                                            VStack(spacing: 8) {
                                                ForEach(Array(sources.filter({ source in
                                                    if selectedLanguage == "VF" {
                                                        return source.language.lowercased().contains("french") || source.language.lowercased().contains("vf")
                                                    } else if selectedLanguage == "VOSTFR" {
                                                        return source.language.lowercased().contains("vostfr")
                                                    } else {
                                                        return source.language.lowercased().contains("vo") || source.language.lowercased().contains("eng") || source.language.lowercased().contains("english")
                                                    }
                                                }).enumerated()), id: \.element.id) { index, source in
                                                    HStack(spacing: 8) {
                                                        Button(action: {
                                                            playSource(source)
                                                        }) {
                                                            HStack {
                                                                Image(systemName: "play.circle.fill")
                                                                    .foregroundColor(AppTheme.primaryRed)
                                                                    .font(.title3)
                                                                
                                                                Text("\(source.provider.capitalized) \(index + 1)")
                                                                    .font(.headline)
                                                                    .fontWeight(.medium)
                                                                    .foregroundColor(theme.primaryText)
                                                                
                                                                Spacer()
                                                                
                                                                Image(systemName: "chevron.right")
                                                                    .foregroundColor(theme.secondaryText)
                                                                    .font(.caption)
                                                            }
                                                            .padding(12)
                                                            .background(theme.cardBackground)
                                                            .cornerRadius(8)
                                                        }
                                                        
                                                        DownloadButton(source: source, media: getMedia(from: movie), season: nil, episode: nil)
                                                    }
                                                }
                                            }
                                            .padding(.horizontal, 16)
                                        }
                                    }
                                }
                            }
                            .padding(.top, 24)
                            
                            // Inline Player Placeholder (keeps space)
                            if showPlayer && playerURL != nil && !isFullscreen {
                                Color.clear.frame(height: 250)
                            }
                            
                            // Similar Movies
                            if !similarMovies.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text(theme.t("detail.similar"))
                                        .font(.title3)
                                        .fontWeight(.bold)
                                        .foregroundColor(theme.primaryText)
                                        .padding(.horizontal, 16)
                                    
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 16) {
                                            ForEach(similarMovies) { movie in
                                                MediaGridCard(media: movie, onTap: {})
                                                    .frame(width: 120)
                                            }
                                        }
                                        .padding(.horizontal, 16)
                                    }
                                }
                                .padding(.top, 24)
                            }
                            
                            Color.clear.frame(height: 40)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(width: UIScreen.main.bounds.width)
                }

            // Player Overlay (Single Instance)
            if showPlayer, let url = playerURL, let movie = movie {
                VStack(spacing: 0) {
                    // Header above player when inline
                    if !isFullscreen {
                        HStack {
                            Spacer()
                            
                            Button(action: {
                                showPlayer = false
                                playerURL = nil
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
                        .padding(.top, 350) // Adjust based on content above (poster + info + sources)
                        // Note: Hardcoded padding is risky. Better to use GeometryReader or AnchorPreferences, 
                        // but for now we'll use a ZStack alignment approach.
                    }
                    
                    CustomVideoPlayer(
                        url: url,
                        title: movie.title,
                        subtitles: subtitles,
                        isPresented: $showPlayer,
                        isFullscreen: $isFullscreen,
                        showFullscreenButton: true,
                        mediaId: movieId,
                        season: nil,
                        episode: nil,
                        playerVM: playerVM
                    )
                    .frame(width: UIScreen.main.bounds.width, height: isFullscreen ? UIScreen.main.bounds.height : 250)
                    .edgesIgnoringSafeArea(isFullscreen ? .all : [])
                    
                    if !isFullscreen {
                        Spacer()
                    }
                }
                .background(isFullscreen ? Color.black : Color.clear)
                .zIndex(100)
                // Position logic:
                // When inline, we want it to appear "in place". 
                // Since we are in a ZStack, we need to position it correctly.
                // However, scrolling makes this hard with a simple ZStack overlay if it's not pinned.
                // TVChannelsView works because the list is below the player.
                // Here, the player is in the middle of a scroll view.
                
                // ALTERNATIVE APPROACH:
                // Keep the player in the ScrollView when inline, and use .matchedGeometryEffect 
                // OR just use the ZStack overlay ONLY when fullscreen?
                // No, that causes the recreation.
                
                // The TVChannelsView approach works because the player is at the TOP (or fixed position).
                // Here, the player is scrolled.
                
                // If we want smooth transition, the view must NOT be destroyed.
                // We can use .fullScreenCover but with a custom transition? No, that's a new view.
                
                // We can use a GeometryReader to track the inline position, 
                // and then move the player to fullscreen.
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(movie?.title ?? "")
                    .font(.headline)
                    .foregroundColor(theme.primaryText)
            }
        }
        .toolbar(isFullscreen ? .hidden : .visible, for: .tabBar)
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        do {
            async let movieDetail = TMDBService.shared.fetchMovieDetails(movieId: movieId)
            async let similar = TMDBService.shared.fetchSimilarMovies(movieId: movieId)
            async let fetchedSources = StreamingService.shared.fetchSources(movieId: movieId)
            
            let (detail, similarResult, sourcesResult) = try await (movieDetail, similar, fetchedSources)
            
            self.movie = detail
            self.similarMovies = similarResult
            self.sources = sourcesResult
            
            // Load watch progress
            self.watchProgress = WatchProgressManager.shared.getProgress(mediaId: movieId)
            
            self.isLoading = false
        } catch {
            print("Error loading movie data: \(error)")
            self.isLoading = false
        }
    }
    
    private func playSource(_ source: StreamingSource) {
        print("🔘 [MovieDetailView] Play button clicked for source: \(source.provider) - \(source.quality)")
        print("▶️ [MovieDetailView] Playing source: \(source.provider) - \(source.url)")
        extractionError = nil
        
        // Check for local download first
        /* Temporarily disabled for debugging streaming
        if let download = DownloadManager.shared.getDownload(mediaId: movieId, season: nil, episode: nil),
           download.state == .completed,
           let localUrl = download.localVideoUrl {
            print("📂 [MovieDetailView] Found local download, playing offline: \(localUrl)")
            
            Task {
                await MainActor.run {
                    self.playerURL = localUrl
                    self.playerURL = localUrl
                    // Use local subtitles if available
                    self.subtitles = download.localSubtitles.map { 
                        Subtitle(url: $0.url.absoluteString, label: $0.label, code: $0.code, flag: $0.flag) 
                    }
                    
                    self.showPlayer = true
                }
            }
            return
        }
        */
        
        Task {
            do {
                await MainActor.run {
                    self.isLoadingSources = true
                }
                
                var streamUrl: String
                
                if source.provider == "vidmoly" {
                    print("🔍 [MovieDetailView] Extracting VidMoly...")
                    streamUrl = try await StreamingService.shared.extractVidMoly(url: source.url)
                } else if source.provider == "vidzy" {
                    print("🔍 [MovieDetailView] Extracting Vidzy...")
                    streamUrl = try await StreamingService.shared.extractVidzy(url: source.url)
                } else {
                    // Fallback or other providers
                    print("ℹ️ [MovieDetailView] Using direct URL for provider: \(source.provider)")
                    streamUrl = source.url
                }
                
                print("✅ [MovieDetailView] Extraction successful: \(streamUrl)")
                
                if let url = URL(string: streamUrl) {
                    // Fetch subtitles
                    let subs: [Subtitle]
                    if let imdbId = movie?.externalIds?.imdbId {
                        subs = await StreamingService.shared.getSubtitles(imdbId: imdbId)
                    } else {
                        subs = []
                    }
                    
                    await MainActor.run {
                        print("🎬 [MovieDetailView] Presenting player with URL: \(url)")
                        self.playerURL = url
                        self.subtitles = subs
                        self.showPlayer = true
                        self.isLoadingSources = false
                    }
                } else {
                    throw URLError(.badURL)
                }
            } catch {
                print("❌ [MovieDetailView] Error extracting source: \(error)")
                await MainActor.run {
                    self.isLoadingSources = false
                    self.extractionError = "Erreur de lecture: \(error.localizedDescription)"
                }
            }
        }
    }
    
    private func getMedia(from movie: MovieDetail) -> Media {
        return Media(
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            posterPath: movie.posterPath,
            backdropPath: movie.backdropPath,
            rating: movie.voteAverage,
            year: String(movie.releaseDate?.prefix(4) ?? ""),
            mediaType: .movie,
            voteCount: movie.voteCount,
            originalLanguage: nil,
            releaseDate: movie.releaseDate
        )
    }
}

