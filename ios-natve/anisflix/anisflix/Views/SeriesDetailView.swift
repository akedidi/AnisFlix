//
//  SeriesDetailView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI
import AVKit

struct SeriesDetailView: View {
    let seriesId: Int
    
    @ObservedObject var theme = AppTheme.shared
    @State private var series: SeriesDetail?
    @State private var similarSeries: [Media] = []
    @State private var isLoading = true
    @Environment(\.presentationMode) var presentationMode
    
    @State private var videos: [Video] = []
    @State private var showPlayer = false
    @State private var playerURL: URL?
    @State private var subtitles: [Subtitle] = []
    @State private var isFullscreen = false
    @StateObject private var playerVM = PlayerViewModel()
    @State private var seasonDetails: SeasonDetails?
    @State private var isSeasonLoading = false
    @State private var selectedSeason = 1
    // Removed local state to use theme persistence
    // @State private var selectedSourceLanguage = "VF"
    
    @ObservedObject var favoritesManager = FavoritesManager.shared
    
    // Episode selection and sources
    @State private var selectedEpisodeId: Int?
    @State private var episodeSources: [StreamingSource] = []
    @State private var isLoadingEpisodeSources = false
    @State private var isLoadingSource = false
    @State private var extractionError: String?
    
    @Namespace private var animation
    
    var body: some View {
        ZStack(alignment: .top) {
            theme.backgroundColor.ignoresSafeArea()
            
            if isLoading {
                // ... (loading view)
                VStack {
                    ProgressView()
                        .tint(AppTheme.primaryRed)
                    Text(theme.t("common.loading"))
                        .foregroundColor(theme.secondaryText)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let series = series {
                ScrollView {
                    // ... (content)
                    VStack(alignment: .leading, spacing: 0) {
                        // Header with Backdrop/Poster
                        ZStack(alignment: .topLeading) {
                            if let backdropPath = series.backdropPath {
                                AsyncImage(url: URL(string: "https://image.tmdb.org/t/p/w1280\(backdropPath)")) { phase in
                                    if let image = phase.image {
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: UIScreen.main.bounds.width, height: 300)
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
                                            .frame(width: UIScreen.main.bounds.width, height: 300)
                                    }
                                }
                            } else if let posterPath = series.posterPath {
                                AsyncImage(url: URL(string: "https://image.tmdb.org/t/p/w500\(posterPath)")) { phase in
                                    if let image = phase.image {
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: UIScreen.main.bounds.width, height: 300)
                                            .clipped()
                                    }
                                }
                            }
                            
                            // Back button removed to use system navigation
                        }
                        .frame(width: UIScreen.main.bounds.width)
                        
                        VStack(alignment: .leading, spacing: 16) {
                            // ... (rest of content)
                            // Title & Info
                            VStack(alignment: .leading, spacing: 16) {
                                HStack(alignment: .top) {
                                    Text(series.name)
                                        .font(.title.bold())
                                        .foregroundColor(theme.primaryText)
                                        .fixedSize(horizontal: false, vertical: true)
                                    
                                    Spacer()
                                    
                                    // Favorite Button
                                    // Favorite Button
                                    Button {
                                        favoritesManager.toggle(Media(id: seriesId, title: series.name, overview: series.overview, posterPath: series.posterPath, backdropPath: series.backdropPath, rating: series.voteAverage, year: String(series.firstAirDate?.prefix(4) ?? ""), mediaType: .series, voteCount: 0, originalLanguage: "en", releaseDate: nil))
                                    } label: {
                                        Image(systemName: favoritesManager.isFavorite(Media(id: seriesId, title: "", overview: nil, posterPath: nil, backdropPath: nil, rating: nil, year: nil, mediaType: .series, voteCount: nil, originalLanguage: nil, releaseDate: nil)) ? "heart.fill" : "heart")
                                            .font(.title2)
                                            .foregroundColor(favoritesManager.isFavorite(Media(id: seriesId, title: "", overview: nil, posterPath: nil, backdropPath: nil, rating: nil, year: nil, mediaType: .series, voteCount: nil, originalLanguage: nil, releaseDate: nil)) ? AppTheme.primaryRed : theme.secondaryText)
                                            .padding(10)
                                            .background(theme.cardBackground)
                                            .clipShape(Circle())
                                    }
                                }
                                
                                HStack(spacing: 16) {
                                    if let firstAirDate = series.firstAirDate {
                                        Text(String(firstAirDate.prefix(4)))
                                            .font(.subheadline)
                                            .foregroundColor(theme.secondaryText)
                                    }
                                    
                                    HStack(spacing: 4) {
                                        Image(systemName: "star.fill")
                                        .foregroundColor(.yellow)
                                        .font(.subheadline)
                                        Text(String(format: "%.1f", series.voteAverage))
                                            .font(.subheadline.bold())
                                            .foregroundColor(theme.primaryText)
                                    }
                                    
                                    Text("\(series.numberOfSeasons) Saisons")
                                        .font(.subheadline)
                                        .foregroundColor(theme.secondaryText)
                                }
                                
                                // Genres
                                if !series.genres.isEmpty {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 8) {
                                            ForEach(series.genres, id: \.id) { genre in
                                                Text(genre.name)
                                                    .font(.caption)
                                                    .padding(.horizontal, 10)
                                                    .padding(.vertical, 4)
                                                    .background(theme.cardBackground)
                                                    .foregroundColor(theme.secondaryText)
                                                    .cornerRadius(12)
                                            }
                                        }
                                        .padding(.horizontal, 16)
                                    }
                                    .padding(.horizontal, -16)
                                }
                            }
                            
                            // Overview
                            if let overview = series.overview, !overview.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(theme.t("detail.overview"))
                                        .font(.headline)
                                        .foregroundColor(theme.primaryText)
                                    Text(overview)
                                        .font(.body)
                                        .foregroundColor(theme.secondaryText)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                .padding(.top, 8)
                            }
                            
                            // Seasons & Episodes
                            VStack(alignment: .leading, spacing: 16) {
                                Text(theme.t("detail.seasons"))
                                    .font(.headline)
                                    .foregroundColor(theme.primaryText)
                                
                                // Season Selector
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 12) {
                                        ForEach(1...series.numberOfSeasons, id: \.self) { seasonNum in
                                            Button {
                                                if selectedSeason != seasonNum {
                                                    selectedSeason = seasonNum
                                                    selectedEpisodeId = nil
                                                    Task {
                                                        await loadSeasonDetails()
                                                    }
                                                }
                                            } label: {
                                                Text("\(theme.t("detail.season")) \(seasonNum)")
                                                    .font(.subheadline)
                                                    .fontWeight(selectedSeason == seasonNum ? .bold : .regular)
                                                    .padding(.horizontal, 16)
                                                    .padding(.vertical, 8)
                                                    .background(
                                                        RoundedRectangle(cornerRadius: 8)
                                                            .fill(selectedSeason == seasonNum ? AppTheme.primaryRed : theme.cardBackground)
                                                    )
                                                    .foregroundColor(selectedSeason == seasonNum ? .white : theme.primaryText)
                                            }
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                }
                                .padding(.horizontal, -16)
                                // Episodes List
                                if isSeasonLoading {
                                    ProgressView()
                                        .tint(AppTheme.primaryRed)
                                        .frame(maxWidth: .infinity, alignment: .center)
                                        .padding()
                                } else if let season = seasonDetails {
                                    VStack(spacing: 16) {
                                        ForEach(season.episodes) { episode in
                                            VStack(alignment: .leading, spacing: 0) {
                                                Button {
                                                    if selectedEpisodeId == episode.id {
                                                        selectedEpisodeId = nil
                                                    } else {
                                                        selectedEpisodeId = episode.id
                                                        Task {
                                                            // Reset player when changing episode
                                                            playerVM.reset()
                                                            await loadEpisodeSources(episode: episode)
                                                        }
                                                    }
                                                } label: {
                                                    HStack(alignment: .top, spacing: 12) {
                                                        // Episode Image
                                                        AsyncImage(url: episode.stillURL) { phase in
                                                            if let image = phase.image {
                                                                image
                                                                    .resizable()
                                                                    .aspectRatio(16/9, contentMode: .fill)
                                                                    .frame(width: 120, height: 68)
                                                                    .clipped()
                                                                    .cornerRadius(4)
                                                            } else {
                                                                Rectangle()
                                                                    .fill(theme.cardBackground)
                                                                    .frame(width: 120, height: 68)
                                                                    .cornerRadius(4)
                                                                    .overlay(
                                                                        Image(systemName: "play.circle")
                                                                            .foregroundColor(theme.secondaryText)
                                                                    )
                                                            }
                                                        }
                                                        
                                                        VStack(alignment: .leading, spacing: 4) {
                                                            Text("\(episode.episodeNumber). \(episode.name)")
                                                                .font(.subheadline)
                                                                .fontWeight(.medium)
                                                                .foregroundColor(selectedEpisodeId == episode.id ? AppTheme.primaryRed : theme.primaryText)
                                                                .lineLimit(1)
                                                                .multilineTextAlignment(.leading)
                                                            
                                                            if let overview = episode.overview, !overview.isEmpty {
                                                                Text(overview)
                                                                    .font(.caption)
                                                                    .foregroundColor(theme.secondaryText)
                                                                    .lineLimit(2)
                                                                    .multilineTextAlignment(.leading)
                                                            }
                                                            
                                                            Text("\(episode.seasonNumber)h \(episode.episodeNumber)m") // Placeholder duration
                                                                .font(.caption2)
                                                                .foregroundColor(theme.secondaryText)
                                                            
                                                            // Progress Bar
                                                            let progress = WatchProgressManager.shared.getProgress(
                                                                mediaId: seriesId,
                                                                season: episode.seasonNumber,
                                                                episode: episode.episodeNumber
                                                            )
                                                            if progress > 0 && progress < 0.95 {
                                                                GeometryReader { geometry in
                                                                    ZStack(alignment: .leading) {
                                                                        Rectangle()
                                                                            .fill(theme.cardBackground)
                                                                            .frame(height: 3)
                                                                            .cornerRadius(1.5)
                                                                        
                                                                        Rectangle()
                                                                            .fill(AppTheme.primaryRed)
                                                                            .frame(width: geometry.size.width * progress, height: 3)
                                                                            .cornerRadius(1.5)
                                                                    }
                                                                }
                                                                .frame(height: 3)
                                                                .padding(.top, 4)
                                                            }
                                                        }
                                                        Spacer()
                                                    }
                                                    .padding(8)
                                                    .background(theme.cardBackground.opacity(0.5))
                                                    .cornerRadius(8)
                                                }
                                                
                                                // Sources for selected episode
                                                if selectedEpisodeId == episode.id {
                                                    sourcesView(for: episode)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(.top, 24)
                            
                            
                            // Similar Series
                            if !similarSeries.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text(theme.t("detail.similar"))
                                        .font(.headline)
                                        .foregroundColor(theme.primaryText)
                                    
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        LazyHStack(spacing: 12) {
                                            ForEach(similarSeries.prefix(10)) { media in
                                                MediaGridCard(media: media, onTap: {
                                                    print("Navigate to series: \(media.id)")
                                                })
                                                .frame(width: 120)
                                            }
                                        }
                                        .padding(.horizontal, 16)
                                    }
                                    .padding(.horizontal, -16)
                                }
                                .padding(.top, 24)
                            }
                        }
                        .padding(.horizontal, 16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.bottom, 80)
                    }
                    .frame(width: UIScreen.main.bounds.width)
                }
            }
            
            // Fullscreen Player Overlay (Single Instance)
            if showPlayer, let url = playerURL, let episodeId = selectedEpisodeId, let season = seasonDetails, let episode = season.episodes.first(where: { $0.id == episodeId }) {
                
                // Fullscreen Geometry Placeholder (to match against)
                if isFullscreen {
                    Color.clear
                        .edgesIgnoringSafeArea(.all)
                        .matchedGeometryEffect(id: "videoPlayer", in: animation)
                }
                
                CustomVideoPlayer(
                    url: url,
                    title: "\(series?.name ?? "") - S\(episode.seasonNumber)E\(episode.episodeNumber)",
                    subtitles: subtitles,
                    isPresented: $showPlayer,
                    isFullscreen: $isFullscreen,
                    showFullscreenButton: true,
                    mediaId: seriesId,
                    season: episode.seasonNumber,
                    episode: episode.episodeNumber,
                    playerVM: playerVM
                )
                .matchedGeometryEffect(id: "videoPlayer", in: animation, isSource: false)
                .zIndex(100)
            }
        }
        // .navigationBarHidden(true) removed to show system back button
        .toolbar(isFullscreen ? .hidden : .visible, for: .tabBar)

        .task {
            await loadSeriesDetails()
        }
    }
    
    // MARK: - Actions
    
    private func openTrailer(key: String) {
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
    
    private func handleSourceSelection(_ source: StreamingSource, episode: Episode) {
        print("🔘 [SeriesDetailView] Play button clicked for source: \(source.provider) - \(source.quality)")
        print("▶️ [SeriesDetailView] Playing source (Series): \(source.provider) - \(source.url)")
        isLoadingSource = true
        extractionError = nil
        
        // Check for local download first
        /* Temporarily disabled for debugging streaming
        if let download = DownloadManager.shared.getDownload(mediaId: seriesId, season: episode.seasonNumber, episode: episode.episodeNumber),
           download.state == .completed,
           let localUrl = download.localVideoUrl {
            print("📂 [SeriesDetailView] Found local download, playing offline: \(localUrl)")
            
            Task {
                await MainActor.run {
                    self.playerURL = localUrl
                    self.playerURL = localUrl
                    // Use local subtitles if available
                    self.subtitles = download.localSubtitles.map { 
                        Subtitle(url: $0.url.absoluteString, label: $0.label, code: $0.code, flag: $0.flag) 
                    }
                    
                    self.showPlayer = true
                    self.isLoadingSource = false
                }
            }
            return
        }
        */
        
        Task {
            var finalURL: URL?
            
            do {
                if source.provider == "vidzy" {
                    print("🔍 [SeriesDetailView] Extracting Vidzy...")
                    let extracted = try await StreamingService.shared.extractVidzy(url: source.url)
                    finalURL = URL(string: extracted)
                } else if source.provider == "vidmoly" {
                    print("🔍 [SeriesDetailView] Extracting VidMoly...")
                    let extracted = try await StreamingService.shared.extractVidMoly(url: source.url)
                    finalURL = URL(string: extracted)
                } else {
                    print("ℹ️ [SeriesDetailView] Using direct URL for provider: \(source.provider)")
                    finalURL = URL(string: source.url)
                }
                
                print("✅ [SeriesDetailView] Extraction successful: \(finalURL?.absoluteString ?? "nil")")
                
                if let url = finalURL {
                    await MainActor.run {
                        print("🎬 [SeriesDetailView] Presenting player with URL: \(url)")
                        playerURL = url
                    }
                    
                    if let imdbId = series?.externalIds?.imdbId {
                        let subs = await StreamingService.shared.getSubtitles(
                            imdbId: imdbId,
                            season: episode.seasonNumber,
                            episode: episode.episodeNumber
                        )
                        await MainActor.run {
                            subtitles = subs
                        }
                    }
                    await MainActor.run {
                        showPlayer = true
                    }
                } else {
                    throw URLError(.badURL)
                }
            } catch {
                print("❌ [SeriesDetailView] Extraction error: \(error)")
                await MainActor.run {
                    extractionError = "Erreur de lecture: \(error.localizedDescription)"
                }
            }
            
            await MainActor.run {
                isLoadingSource = false
            }
        }
    }
    
    // MARK: - Data Loading
    
    private func loadSeriesDetails() async {
        isLoading = true
        
        let language = theme.selectedLanguage == "fr" ? "fr-FR" :
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        do {
            async let details = TMDBService.shared.fetchSeriesDetails(seriesId: seriesId, language: language)
            async let similar = TMDBService.shared.fetchSimilarSeries(seriesId: seriesId, language: language)
            async let videosData = TMDBService.shared.fetchVideos(mediaId: seriesId, type: .series, language: language)
            
            let (seriesDetails, similarResults, videosResults) = try await (details, similar, videosData)
            
            self.series = seriesDetails
            self.similarSeries = similarResults
            self.videos = videosResults
            
            // Load first season
            await loadSeasonDetails()
            
            print("✅ Series details loaded: \(seriesDetails.name)")
        } catch {
            print("❌ Error loading series details: \(error)")
        }
        
        isLoading = false
    }
    
    private func loadSeasonDetails() async {
        isSeasonLoading = true
        let language = theme.selectedLanguage == "fr" ? "fr-FR" :
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        do {
            let details = try await TMDBService.shared.fetchSeasonDetails(seriesId: seriesId, seasonNumber: selectedSeason, language: language)
            self.seasonDetails = details
        } catch {
            print("❌ Error loading season details: \(error)")
        }
        isSeasonLoading = false
    }
    
    private func loadEpisodeSources(episode: Episode) async {
        isLoadingEpisodeSources = true
        episodeSources = []
        
        do {
            let sources = try await StreamingService.shared.fetchSeriesSources(
                seriesId: seriesId,
                season: episode.seasonNumber,
                episode: episode.episodeNumber
            )
            self.episodeSources = sources
        } catch {
            print("❌ Error loading episode sources: \(error)")
        }
        
        isLoadingEpisodeSources = false
        
        // Auto-select language: VF > VOSTFR > VO
        let hasVF = episodeSources.contains { $0.language.lowercased().contains("french") || $0.language.lowercased().contains("vf") }
        let hasVOSTFR = episodeSources.contains { $0.language.lowercased().contains("vostfr") }
        let hasVO = episodeSources.contains { $0.provider == "vixsrc" && ($0.language.lowercased().contains("vo") || $0.language.lowercased().contains("eng") || $0.language.lowercased().contains("english")) }
        
        if hasVF {
            theme.preferredSourceLanguage = "VF"
        } else if hasVOSTFR {
            theme.preferredSourceLanguage = "VOSTFR"
        } else if hasVO {
            theme.preferredSourceLanguage = "VO"
        }
    }
    
    // Helper to filter sources by language
    private func filterSources(_ sources: [StreamingSource], language: String) -> [StreamingSource] {
        return sources.filter { source in
            if language == "VF" {
                return source.language.lowercased().contains("french") || source.language.lowercased().contains("vf")
            } else if language == "VOSTFR" {
                return source.language.lowercased().contains("vostfr")
            } else {
                // For VO, strictly only allow Vixsrc
                return source.provider == "vixsrc" && (source.language.lowercased().contains("vo") || source.language.lowercased().contains("eng") || source.language.lowercased().contains("english"))
            }
        }
    }
    @ViewBuilder
    private func sourcesView(for episode: Episode) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if isLoadingSource {
                HStack {
                    ProgressView()
                        .tint(AppTheme.primaryRed)
                    Text("Préparation de la lecture...")
                        .foregroundColor(theme.secondaryText)
                        .font(.subheadline)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, 20)
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
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, 20)
            } else if showPlayer, let url = playerURL {
                // Close button
                HStack {
                    Spacer()
                    Button(action: {
                        showPlayer = false
                        playerURL = nil
                        playerVM.player.pause()
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
                .padding(.bottom, 4)
                
                // Inline Player Placeholder
                Color.clear
                    .frame(height: 250)
                    .matchedGeometryEffect(id: "videoPlayer", in: animation)
                    .cornerRadius(8)
            } else {
                // Sources List
                Text(theme.t("detail.availableSources"))
                    .font(.headline)
                    .foregroundColor(theme.secondaryText)
                    .padding(.top, 8)
                
                if isLoadingEpisodeSources {
                    ProgressView()
                        .tint(AppTheme.primaryRed)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding()
                } else {
                    // Language Tabs
                    HStack(spacing: 20) {
                        ForEach(["VF", "VOSTFR", "VO"], id: \.self) { lang in
                            let hasSources = !filterSources(episodeSources, language: lang).isEmpty
                            
                            Button(action: {
                                if hasSources {
                                    theme.preferredSourceLanguage = lang
                                }
                            }) {
                                VStack(spacing: 8) {
                                    Text(lang)
                                        .font(.headline)
                                        .foregroundColor(theme.preferredSourceLanguage == lang ? AppTheme.primaryRed : (hasSources ? theme.secondaryText : theme.secondaryText.opacity(0.3)))
                                    
                                    if theme.preferredSourceLanguage == lang {
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
                    .padding(.bottom, 16)
                    
                    // Filtered Source List
                    if filterSources(episodeSources, language: theme.preferredSourceLanguage).isEmpty {
                        Text("\(theme.t("detail.noSourcesFor")) \(theme.preferredSourceLanguage)")
                            .foregroundColor(theme.secondaryText)
                            .font(.subheadline)
                            .padding(.vertical, 20)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(Array(filterSources(episodeSources, language: theme.preferredSourceLanguage).enumerated()), id: \.element.id) { index, source in
                                HStack(spacing: 8) {
                                    Button(action: {
                                        handleSourceSelection(source, episode: episode)
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
                                    
                                    DownloadButton(
                                        source: source,
                                        media: getMedia(from: series),
                                        season: episode.seasonNumber,
                                        episode: episode.episodeNumber
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.bottom, 12)
        .background(theme.cardBackground.opacity(0.3))
        .cornerRadius(8, corners: [.bottomLeft, .bottomRight])
    }
    
    private func getMedia(from series: SeriesDetail?) -> Media {
        return Media(
            id: seriesId,
            title: series?.name ?? "",
            overview: series?.overview,
            posterPath: series?.posterPath,
            backdropPath: series?.backdropPath,
            rating: series?.voteAverage,
            year: String(series?.firstAirDate?.prefix(4) ?? ""),
            mediaType: .series,
            voteCount: 0,
            originalLanguage: "en",
            releaseDate: series?.firstAirDate
        )
    }
}

// Helper for rounded corners
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape( RoundedCorner(radius: radius, corners: corners) )
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}

// MARK: - Series Detail Model (Moved to Media.swift)
// Removed local struct definition as it is now in Media.swift

#Preview {
    NavigationStack {
        SeriesDetailView(seriesId: 1399) // Game of Thrones
    }
}
