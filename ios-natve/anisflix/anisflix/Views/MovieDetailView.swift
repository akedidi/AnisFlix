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
    @ObservedObject var favoritesManager = FavoritesManager.shared
    
    // Sources
    @State private var sources: [StreamingSource] = []
    @State private var isLoadingSources = false
    // Removed local state to use theme persistence
    // @State private var selectedLanguage = "VF" // VF or VOSTFR
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
                        
                        VStack(alignment: .leading, spacing: 16) {
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
                            
                            // Trailer Button
                            if let trailer = videos.first(where: { $0.type == "Trailer" && $0.site == "YouTube" }) ?? videos.first(where: { $0.site == "YouTube" }) {
                                Button(action: {
                                    openTrailer(key: trailer.key)
                                }) {
                                    HStack {
                                        Image(systemName: "play.rectangle.fill")
                                            .font(.title3)
                                        Text(theme.t("detail.trailer"))
                                            .font(.headline)
                                    }
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(
                                        LinearGradient(
                                            gradient: Gradient(colors: [AppTheme.primaryRed, AppTheme.primaryRed.opacity(0.8)]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .cornerRadius(8)
                                }
                                .padding(.horizontal, 16)
                                .padding(.top, 16)
                            }
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
                                                    // Allow all providers for VO
                                                    return source.language.lowercased().contains("vo") || source.language.lowercased().contains("eng") || source.language.lowercased().contains("english")
                                                }
                                            }
                                            
                                            Button(action: {
                                                if lang == "VF" {
                                                    theme.preferredSourceLanguage = "VF"
                                                } else if lang == "VOSTFR" {
                                                    theme.preferredSourceLanguage = "VOSTFR"
                                                } else {
                                                    theme.preferredSourceLanguage = "VO"
                                                }
                                            }) {
                                                Text(theme.t(lang))
                                                    .font(.subheadline.bold())
                                                    .foregroundColor(theme.preferredSourceLanguage == lang ? .white : (hasSources ? theme.primaryText : theme.secondaryText.opacity(0.3)))
                                                    .padding(.horizontal, 16)
                                                    .padding(.vertical, 8)
                                                    .background(
                                                        ZStack {
                                                            if theme.preferredSourceLanguage == lang {
                                                                AppTheme.primaryRed
                                                            } else {
                                                                theme.cardBackground.opacity(hasSources ? 1.0 : 0.5)
                                                            }
                                                        }
                                                    )
                                                    .cornerRadius(8)
                                            }
                                            .disabled(!hasSources)
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                    
                                    // Sources List (Line by Line)

                                        let filteredSources = filterSources(sources, language: theme.preferredSourceLanguage)
                                            .sorted { s1, s2 in
                                                // Vidzy first, then others
                                                let rank1 = s1.provider.lowercased() == "vidzy" ? 0 : 1
                                                let rank2 = s2.provider.lowercased() == "vidzy" ? 0 : 1
                                                return rank1 < rank2
                                            }
                                        
                                        if filteredSources.isEmpty {
                                            Text("\(theme.t("detail.noSourcesFor")) \(theme.preferredSourceLanguage)")
                                                .foregroundColor(theme.secondaryText)
                                                .font(.subheadline)
                                                .padding(.horizontal, 16)
                                                .padding(.vertical, 20)
                                        } else {
                                            VStack(spacing: 8) {
                                                ForEach(Array(filteredSources.enumerated()), id: \.element.id) { index, source in
                                                    HStack(spacing: 8) {
                                                        Button(action: {
                                                            playSource(source)
                                                        }) {
                                                            HStack {
                                                                Image(systemName: "play.circle.fill")
                                                                    .foregroundColor(AppTheme.primaryRed)
                                                                    .font(.title3)
                                                                
                                                                let displayText = getSourceDisplayText(source: source, filteredSources: filteredSources)
                                                                
                                                                Text(displayText)
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
                            .padding(.top, 24)
                            

                            
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
                            
                            // Bottom padding for floating tab bar
                            Color.clear.frame(height: 150)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(width: UIScreen.main.bounds.width)
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
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        do {
            // Phase 1: Load essential data (fast) - movie details, similar movies, videos
            async let movieDetail = TMDBService.shared.fetchMovieDetails(movieId: movieId)
            async let similar = TMDBService.shared.fetchSimilarMovies(movieId: movieId)
            async let fetchedVideos = TMDBService.shared.fetchVideos(mediaId: movieId, type: .movie)
            
            let (detail, similarResult, videosResult) = try await (movieDetail, similar, fetchedVideos)
            
            await MainActor.run {
                self.movie = detail
                self.similarMovies = similarResult
                self.videos = videosResult
                
                // Load watch progress
                self.watchProgress = WatchProgressManager.shared.getProgress(mediaId: movieId)
                
                // Show UI immediately
                self.isLoading = false
            }
            
            // Phase 2: Load sources asynchronously (can be slow)
            await loadSources()
            
        } catch {
            print("Error loading movie data: \(error)")
            await MainActor.run {
                self.isLoading = false
            }
        }
    }
    
    private func loadSources() async {
        await MainActor.run {
            self.isLoadingSources = true
        }
        
        do {
            let sourcesResult = try await StreamingService.shared.fetchSources(movieId: movieId)
            
            await MainActor.run {
                self.sources = sourcesResult
                
                // Auto-select language: VF > VOSTFR > VO
                let hasVF = sourcesResult.contains { $0.language.lowercased().contains("french") || $0.language.lowercased().contains("vf") }
                let hasVOSTFR = sourcesResult.contains { $0.language.lowercased().contains("vostfr") }
                let hasVO = sourcesResult.contains { $0.language.lowercased().contains("vo") || $0.language.lowercased().contains("eng") || $0.language.lowercased().contains("english") }
                
                if hasVF {
                    theme.preferredSourceLanguage = "VF"
                } else if hasVOSTFR {
                    theme.preferredSourceLanguage = "VOSTFR"
                } else if hasVO {
                    theme.preferredSourceLanguage = "VO"
                }
                
                print("✅ Sources loaded: \(sourcesResult.count)")
                self.isLoadingSources = false
            }
        } catch {
            print("Error loading sources: \(error)")
            await MainActor.run {
                self.isLoadingSources = false
            }
        }
    }
    
    private func openTrailer(key: String) {
        // Try YouTube app first, fall back to Safari
        if let youtubeAppURL = URL(string: "youtube://\(key)") {
            if UIApplication.shared.canOpenURL(youtubeAppURL) {
                UIApplication.shared.open(youtubeAppURL)
                return
            }
        }
        if let youtubeWebURL = URL(string: "https://www.youtube.com/watch?v=\(key)") {
            UIApplication.shared.open(youtubeWebURL)
        }
    }
    
    private func playSource(_ source: StreamingSource) {
        print("🔘 [MovieDetailView] Play button clicked for source: \(source.provider) - \(source.quality)")
        print("▶️ [MovieDetailView] Playing source: \(source.provider) - \(source.url)")
        extractionError = nil
        
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
                } else if source.provider == "primewire" || source.provider == "2embed" || source.provider == "vixsrc" || source.provider == "afterdark" {
                    // UniversalVO and Vixsrc sources are already proxied, use directly
                    print("ℹ️ [MovieDetailView] Using direct URL for provider: \(source.provider)")
                    streamUrl = source.url
                } else {
                    // Fallback for other providers
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
                        print("🎬 [MovieDetailView] Presenting Global Player with URL: \(url)")
                        
                        GlobalPlayerManager.shared.play(
                            url: url,
                            title: self.movie?.title ?? "Movie",
                            posterUrl: self.movie?.posterPath != nil ? "https://image.tmdb.org/t/p/w500\(self.movie!.posterPath!)" : nil,
                            subtitles: subs,
                            mediaId: self.movieId,
                            season: nil,
                            episode: nil,
                            isLive: false,
                            headers: source.headers
                        )
                        
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
    
    // Helper to filter sources by language
    private func filterSources(_ sources: [StreamingSource], language: String) -> [StreamingSource] {
        return sources.filter { source in
            let lang = source.language.lowercased()
            if language == "VF" {
                return lang.contains("french") || lang.contains("vf")
            } else if language == "VOSTFR" {
                return lang.contains("vostfr")
            } else {
                // VO: Only sources that are NOT VF and NOT VOSTFR
                let isVF = lang.contains("french") || lang.contains("vf")
                let isVOSTFR = lang.contains("vostfr")
                // Accept VO, English, or any source that isn't explicitly VF/VOSTFR
                return !isVF && !isVOSTFR
            }
        }
    }
    
    // Helper to format quality display for Movix sources
    private func formatQualityDisplay(_ quality: String) -> String {
        let q = quality.uppercased()
        if q.contains("4K") || q.contains("2160") {
            return "4K"
        } else if q.contains("1080") {
            return "1080p"
        } else if q.contains("720") {
            return "720p"
        } else if q.contains("480") {
            return "480p"
        } else if q.contains("360") {
            return "360p"
        } else {
            return quality
        }
    }
    
    // Helper to build source display text (extracted to simplify view builder)
    private func getSourceDisplayText(source: StreamingSource, filteredSources: [StreamingSource]) -> String {
        let providerIndex = (filteredSources.filter { $0.provider == source.provider }.firstIndex(where: { $0.url == source.url }) ?? 0) + 1
        
        // For Movix/Darkibox sources, show quality + language
        if source.provider.lowercased() == "movix" || source.provider.lowercased() == "darkibox" {
            let quality = formatQualityDisplay(source.quality)
            let sameSources = filteredSources.filter { $0.provider == source.provider && formatQualityDisplay($0.quality) == quality }
            if sameSources.count > 1 {
                let qualityIndex = sameSources.firstIndex(where: { $0.url == source.url }) ?? 0
                return "\(quality) #\(qualityIndex + 1) (\(source.language))"
            } else {
                return "\(quality) (\(source.language))"
            }
        } else {
            // For specified providers like Vidmoly, always show HD
            if source.provider.lowercased() == "vidmoly" {
                return "\(source.provider.capitalized) \(providerIndex) - HD"
            }
            
            // For other streaming sources, show provider + index + quality
            let quality = formatQualityDisplay(source.quality)
            return "\(source.provider.capitalized) \(providerIndex) - \(quality)"
        }
    }
}

