//
//  SeriesDetailView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI
import AVKit

// Convert ISO country code to flag emoji (if not already defined)
private func seriesCountryFlag(for countryCode: String) -> String {
    let base: UInt32 = 127397
    var flag = ""
    for scalar in countryCode.uppercased().unicodeScalars {
        if let unicodeScalar = UnicodeScalar(base + scalar.value) {
            flag.unicodeScalars.append(unicodeScalar)
        }
    }
    return flag
}

struct SeriesDetailView: View {
    let seriesId: Int
    
    @ObservedObject var theme = AppTheme.shared
    @State private var series: SeriesDetail?
    @State private var similarSeries: [Media] = []
    @State private var isLoading = true
    @Environment(\.presentationMode) var presentationMode
    
    @State private var videos: [Video] = []
    @State private var seasonDetails: SeasonDetails?
    @State private var additionalWatchProviders: WatchProvidersResponse?
    @State private var isSeasonLoading = false
    @State private var selectedSeason = 1
    // Removed local state to use theme persistence
    // @State private var selectedSourceLanguage = "VF"
    
    @ObservedObject var favoritesManager = FavoritesManager.shared
    @ObservedObject var playerManager = GlobalPlayerManager.shared
    @ObservedObject var castManager = CastManager.shared
    @ObservedObject var watchProgressManager = WatchProgressManager.shared
    
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
                                        favoritesManager.toggle(Media(id: seriesId, title: series.name, overview: series.overview, posterPath: series.posterPath, backdropPath: series.backdropPath, rating: series.voteAverage, year: String(series.firstAirDate?.prefix(4) ?? ""), mediaType: .series, voteCount: 0, originalLanguage: "en", releaseDate: nil, episodeInfo: nil))
                                    } label: {
                                        Image(systemName: favoritesManager.isFavorite(Media(id: seriesId, title: "", overview: nil, posterPath: nil, backdropPath: nil, rating: nil, year: nil, mediaType: .series, voteCount: nil, originalLanguage: nil, releaseDate: nil, episodeInfo: nil)) ? "heart.fill" : "heart")
                                            .font(.title2)
                                            .foregroundColor(favoritesManager.isFavorite(Media(id: seriesId, title: "", overview: nil, posterPath: nil, backdropPath: nil, rating: nil, year: nil, mediaType: .series, voteCount: nil, originalLanguage: nil, releaseDate: nil, episodeInfo: nil)) ? AppTheme.primaryRed : theme.secondaryText)
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
                                
                                // Country of origin
                                if let countries = series.originCountry {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 8) {
                                            ForEach(countries, id: \.self) { countryCode in
                                                HStack(spacing: 4) {
                                                    Text(seriesCountryFlag(for: countryCode))
                                                    Text(countryCode)
                                                }
                                                .font(.caption)
                                                .padding(.horizontal, 10)
                                                .padding(.vertical, 4)
                                                .background(Color.blue.opacity(0.2))
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .stroke(Color.blue.opacity(0.5), lineWidth: 1)
                                                )
                                                .cornerRadius(12)
                                                .foregroundColor(.blue)
                                            }
                                        }
                                        .padding(.horizontal, 16)
                                    }
                                    .padding(.horizontal, -16)
                                }
                                
                                // Watch Providers
                                WatchProvidersView(providers: series.watchProviders ?? additionalWatchProviders)
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
                                        // Get seasons list or fallback to range
                                        let seasons: [SeriesDetail.SeasonSummary] = series.seasons ?? 
                                            (1...series.numberOfSeasons).map { SeriesDetail.SeasonSummary(id: $0, name: "", overview: nil, seasonNumber: $0, episodeCount: 0, posterPath: nil) }
                                        
                                        // Sort: Specials (0) at the end, others ascending
                                        let sortedSeasons = seasons.sorted { s1, s2 in
                                            if s1.seasonNumber == 0 { return false } // s1=0 => needs to be > s2 (so false)
                                            if s2.seasonNumber == 0 { return true }  // s2=0 => needs to be > s1 (so true)
                                            return s1.seasonNumber < s2.seasonNumber
                                        }

                                        ForEach(sortedSeasons, id: \.seasonNumber) { season in
                                            Button {
                                                if selectedSeason != season.seasonNumber {
                                                    selectedSeason = season.seasonNumber
                                                    selectedEpisodeId = nil
                                                    Task {
                                                        await loadSeasonDetails()
                                                    }
                                                }
                                            } label: {
                                                Text(season.seasonNumber == 0 ? theme.t("detail.specials") : "\(theme.t("detail.season")) \(season.seasonNumber)")
                                                    .font(.subheadline)
                                                    .fontWeight(selectedSeason == season.seasonNumber ? .bold : .regular)
                                                    .padding(.horizontal, 16)
                                                    .padding(.vertical, 8)
                                                    .background(
                                                        RoundedRectangle(cornerRadius: 8)
                                                            .fill(selectedSeason == season.seasonNumber ? AppTheme.primaryRed : theme.cardBackground)
                                                    )
                                                    .foregroundColor(selectedSeason == season.seasonNumber ? .white : theme.primaryText)
                                            }
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                }
                                .padding(.horizontal, -16)
                                
                                // Trailer Button (below season selector)
                                if let trailer = videos.first(where: { $0.type == "Trailer" && $0.site == "YouTube" }) ?? videos.first(where: { $0.site == "YouTube" }) {
                                    Button(action: {
                                        openTrailer(key: trailer.key)
                                    }) {
                                        HStack {
                                            Image(systemName: "play.rectangle.fill")
                                                .font(.title3)
                                            Text("\(theme.t("detail.trailer")) \(selectedSeason == 0 ? theme.t("detail.specials") : "\(theme.t("detail.season")) \(selectedSeason)")")
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
                                }
                                // Episodes List
                                if isSeasonLoading {
                                    ProgressView()
                                        .tint(AppTheme.primaryRed)
                                        .frame(maxWidth: .infinity, alignment: .center)
                                        .padding()
                                } else if let season = seasonDetails {
                                    let filteredEpisodes = season.episodes.filter { episode in
                                        // Show episodes with no date or episodes released today or in the past
                                        guard let airDate = episode.airDate, !airDate.isEmpty else { return true }
                                        let dateFormatter = DateFormatter()
                                        dateFormatter.dateFormat = "yyyy-MM-dd"
                                        let todayStr = dateFormatter.string(from: Date())
                                        return airDate <= todayStr
                                    }
                                    
                                    if filteredEpisodes.isEmpty {
                                        Text(theme.t("detail.noEpisodes"))
                                            .font(.body)
                                            .foregroundColor(theme.secondaryText)
                                            .padding()
                                            .frame(maxWidth: .infinity, alignment: .center)
                                            .padding(.vertical, 32)
                                    } else {
                                        VStack(spacing: 16) {
                                            ForEach(filteredEpisodes) { episode in
                                            VStack(alignment: .leading, spacing: 0) {
                                                Button {
                                                    if selectedEpisodeId == episode.id {
                                                        selectedEpisodeId = nil
                                                    } else {
                                                        selectedEpisodeId = episode.id
                                                        Task {
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
                                                            Text("\(episode.episodeNumber). \(getEpisodeTitle(episode))")
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
                                                            
                                                            
                                                            if let runtime = episode.runtime {
                                                                Text("\(runtime) min")
                                                                    .font(.caption2)
                                                                    .foregroundColor(theme.secondaryText)
                                                            }
                                                            
                                                            // Progress Bar - Uses observed WatchProgressManager for real-time updates
                                                            let progressKey = "series_\(seriesId)_s\(episode.seasonNumber)_e\(episode.episodeNumber)"
                                                            let progress = watchProgressManager.progressMap[progressKey]?.progress ?? 0
                                                            if progress > 0 {
                                                                GeometryReader { geometry in
                                                                    ZStack(alignment: .leading) {
                                                                        Rectangle()
                                                                            .fill(theme.cardBackground)
                                                                            .frame(height: 3)
                                                                            .cornerRadius(1.5)
                                                                        
                                                                        Rectangle()
                                                                            .fill(AppTheme.primaryRed)
                                                                            .frame(width: geometry.size.width * (progress >= 0.95 ? 1.0 : progress), height: 3)
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
                                    } // End VStack
                                } // End else
                            } // End else if seasonDetails != nil
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
                        .padding(.bottom, 150)
                    }
                    .frame(width: UIScreen.main.bounds.width)
                }
            }
            
            // Fullscreen Player Overlay (Single Instance)
            // Fullscreen Player Overlay Removed (Global Player)
            
            // Cast: Next Episode Overlay
            if castManager.isConnected, playerManager.showNextEpisodePrompt {
                VStack {
                    Spacer()
                    NextEpisodeOverlay(
                        nextEpisodeTitle: playerManager.nextEpisodeTitle,
                        timeLeft: playerManager.nextEpisodeCountdown,
                        onCancel: {
                            playerManager.cancelNextEpisode()
                        },
                        onPlayNow: {
                            print("⏭️ [SeriesDetailView] User clicked Play Now (Cast Mode)")
                            playerManager.playNextEpisode()
                        }
                    )
                    .padding(.bottom, 80) // Raise above standard controls
                    .padding(.horizontal, 16)
                }
                .transition(.move(edge: .bottom))
                .animation(.easeInOut, value: playerManager.showNextEpisodePrompt)
                .zIndex(100)
            }
        }
        // .navigationBarHidden(true) removed to show system back button

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
        let urlType = source.url.contains("movix-proxy") ? "PROXY" : "DIRECT"
        print("▶️ [SeriesDetailView] Playing source (Series) [\(urlType)]: \(source.provider) - \(source.url)")
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
            var finalHeaders = source.headers
            
            do {
                if source.provider == "vidzy" {
                    print("🔍 [SeriesDetailView] Extracting Vidzy...")
                    let extracted = try await StreamingService.shared.extractVidzy(url: source.url)
                    finalURL = URL(string: extracted)
                    
                    var newHeaders = finalHeaders ?? [:]
                    newHeaders["Referer"] = "https://google.com"
                    newHeaders["User-Agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                    finalHeaders = newHeaders
                } else if source.provider == "vidmoly" {
                    print("🔍 [SeriesDetailView] Extracting VidMoly...")
                    let extracted = try await StreamingService.shared.extractVidMoly(url: source.url)
                    finalURL = URL(string: extracted)
                } else if source.provider == "luluvid" {
                    print("🔍 [SeriesDetailView] Extracting Luluvid...")
                    let (url, cookie) = try await StreamingService.shared.extractLuluvid(url: source.url)
                    finalURL = URL(string: url)
                    
                    var newHeaders = finalHeaders ?? [:]
                    newHeaders["Referer"] = "https://luluvid.com/"
                    newHeaders["Origin"] = "https://luluvid.com"
                    newHeaders["User-Agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                    if let c = cookie {
                        newHeaders["Cookie"] = c
                    }
                    finalHeaders = newHeaders
                } else if source.provider == "primewire" || source.provider == "2embed" || source.provider == "vixsrc" || source.provider == "afterdark" {
                    // UniversalVO and Vixsrc sources are already proxied, use directly
                    print("ℹ️ [SeriesDetailView] Using direct URL for provider: \(source.provider)")
                    finalURL = URL(string: source.url)
                } else if source.provider.lowercased() == "4khdhub" || source.provider.lowercased() == "fourkhdhub" {
                    // 4KHDHub sources are MKV - route through GlobalPlayerManager (uses VLC)
                    print("🎬 [SeriesDetailView] MKV source detected, routing to GlobalPlayerManager with VLC")
                    finalURL = URL(string: source.url)
                } else if source.provider.lowercased() == "moviebox" {
                    // MovieBox: dual-mode playback
                    // - Chromecast: use proxied URL (Chromecast can't handle custom headers)
                    // - Local AVPlayer: prefer direct URL with headers for lower latency
                    if CastManager.shared.isConnected {
                        print("📺 [SeriesDetailView] MovieBox Chromecast mode - using proxied URL")
                        finalURL = URL(string: source.url)
                    } else if let directUrl = source.directUrl {
                        print("📱 [SeriesDetailView] MovieBox local mode - using direct URL with headers")
                        finalURL = URL(string: directUrl)
                    } else {
                        print("⚠️ [SeriesDetailView] MovieBox local mode - no directUrl, falling back to proxied URL")
                        finalURL = URL(string: source.url)
                    }
                } else {
                    // Fallback for other providers
                    print("ℹ️ [SeriesDetailView] Using direct URL for provider: \(source.provider)")
                    finalURL = URL(string: source.url)
                }
                
                print("✅ [SeriesDetailView] Extraction successful: \(finalURL?.absoluteString ?? "nil")")
                
                if let url = finalURL {
                     // Subtitles logic
                    var finalSubtitles = source.tracks ?? []
                     
                    if let imdbId = series?.externalIds?.imdbId {
                        let subs = await StreamingService.shared.getSubtitles(
                            imdbId: imdbId,
                            season: episode.seasonNumber,
                            episode: episode.episodeNumber
                        )
                        finalSubtitles.append(contentsOf: subs)
                    }
                    
                    await MainActor.run {
                        print("🎬 [SeriesDetailView] Presenting Global Player with URL: \(url)")
                        
                        GlobalPlayerManager.shared.play(
                            url: url,
                            title: "\(self.series?.name ?? "") - S\(episode.seasonNumber)E\(episode.episodeNumber) - \(getEpisodeTitle(episode))",
                            posterUrl: self.series?.posterPath != nil ? "https://image.tmdb.org/t/p/w500\(self.series!.posterPath!)" : nil,
                            subtitles: finalSubtitles,
                            mediaId: self.seriesId,
                            season: episode.seasonNumber,
                            episode: episode.episodeNumber,
                            isLive: false,
                            headers: finalHeaders,
                            provider: source.provider,
                            language: source.language,
                            quality: source.quality,
                            origin: source.origin // KEY: Pass scraper origin (fstream, moviebox, etc.) for targeted fetch
                        )
                        
                        isLoadingSource = false
                    }
                } else {
                    throw URLError(.badURL)
                }
            } catch {
                print("❌ [SeriesDetailView] Extraction error: \(error)")
                await MainActor.run {
                    extractionError = "Erreur de lecture: \(error.localizedDescription)"
                    isLoadingSource = false
                }
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
            
            // Fetch watch providers independently since Proxy might optionally miss them or be outdated
            Task {
                do {
                    let providers = try await TMDBService.shared.fetchSeriesWatchProviders(seriesId: seriesId)
                    await MainActor.run {
                        self.additionalWatchProviders = providers
                    }
                } catch {
                    print("⚠️ Failed to fetch independent watch providers: \(error)")
                }
            }
            
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
        self.seasonDetails = nil // Reset to prevent showing stale data
        let language = theme.selectedLanguage == "fr" ? "fr-FR" :
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        do {
            async let details = TMDBService.shared.fetchSeasonDetails(seriesId: seriesId, seasonNumber: selectedSeason, language: language)
            async let semesterVideos = TMDBService.shared.fetchSeasonVideos(seriesId: seriesId, seasonNumber: selectedSeason, language: language)
            
            let (season, videos) = try await (details, semesterVideos)
            self.seasonDetails = season
            
            // If season videos exist, use them. Otherwise keep series videos (or clear them?)
            // Ideally we want specific season trailer.
            if !videos.isEmpty {
                self.videos = videos
            } else {
                // Should we fallback to series videos?
                // For now, let's just keep existing videos if no season videos found,
                // BUT we should probably re-fetch series videos if we want to fallback properly, 
                // or simpler: just set videos to empty or fetched result.
                // However, user said "same trailer for all seasons", so we WANT to replace it.
                self.videos = videos
            }
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
        let hasVO = episodeSources.contains { $0.language.lowercased().contains("vo") || $0.language.lowercased().contains("eng") || $0.language.lowercased().contains("english") }
        
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
                                    Text(theme.t(lang))
                                        .font(.headline)
                                        .foregroundColor(theme.preferredSourceLanguage == lang ? AppTheme.primaryRed : (hasSources ? theme.primaryText : theme.secondaryText.opacity(0.3)))
                                    
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
                            ForEach(Array(filterSources(episodeSources, language: theme.preferredSourceLanguage).sorted { s1, s2 in
                                func getRank(_ source: StreamingSource) -> Int {
                                    let provider = source.provider.lowercased()
                                    if provider == "fsvid" { return -1 } // FSVid: highest priority (VF/VOSTFR)
                                    if provider == "vidzy" { return 0 }
                                    if provider == "moviebox" { return 1 }
                                    if provider == "vixsrc" { return 2 }
                                    if provider == "megacdn" || provider == "cinepro" { return 3 }
                                    if provider == "4khdhub" || provider == "fourkhdhub" { return 10 }
                                    if provider.contains("luluvid") { return 99 }
                                    return 5
                                }
                                
                                func getQualityValue(_ quality: String) -> Int {
                                    let q = quality.lowercased()
                                    if q.contains("4k") || q.contains("2160") { return 2160 }
                                    if q.contains("1080") { return 1080 }
                                    if q.contains("720") { return 720 }
                                    if q.contains("480") { return 480 }
                                    if q.contains("360") { return 360 }
                                    return 0
                                }
                                
                                let rank1 = getRank(s1)
                                let rank2 = getRank(s2)
                                
                                // Primary sort: by provider rank
                                if rank1 != rank2 {
                                    return rank1 < rank2
                                }
                                
                                // Secondary sort: by quality DESCENDING (1080p before 360p)
                                return getQualityValue(s1.quality) > getQualityValue(s2.quality)
                            }.enumerated()), id: \.element.id) { index, source in
                                HStack(spacing: 8) {
                                    Button(action: {
                                        handleSourceSelection(source, episode: episode)
                                    }) {
                                        HStack {
                                            Image(systemName: "play.circle.fill")
                                                .foregroundColor(AppTheme.primaryRed)
                                                .font(.title3)
                                            
                                            let displayText = getSourceDisplayText(source: source, filteredSources: filterSources(episodeSources, language: theme.preferredSourceLanguage))
                                            let is4kHub = source.provider.lowercased() == "4khdhub" || source.provider.lowercased() == "fourkhdhub"
                                            
                                            Text(is4kHub ? "\(displayText) (VLC Player)" : displayText)
                                                .font(.subheadline) // Reduced from headline
                                                .fontWeight(.medium)
                                                .foregroundColor(theme.primaryText)
                                                .lineLimit(1)
                                                .minimumScaleFactor(0.8)
                                            
                                            Spacer()
                                            
                                            Image(systemName: "chevron.right")
                                                .foregroundColor(theme.secondaryText)
                                                .font(.caption)
                                        }
                                        .padding(12)
                                        .background(theme.cardBackground)
                                        .cornerRadius(8)
                                    }
                                    
                                    // Copy Button for 4khdhub
                                    if source.provider.lowercased() == "4khdhub" || source.provider.lowercased() == "fourkhdhub" {
                                        Button(action: {
                                            UIPasteboard.general.string = source.url
                                            let generator = UINotificationFeedbackGenerator()
                                            generator.notificationOccurred(.success)
                                        }) {
                                            Image(systemName: "doc.on.doc")
                                                .foregroundColor(theme.secondaryText)
                                                .padding(12)
                                                .background(theme.cardBackground)
                                                .cornerRadius(8)
                                        }
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
            releaseDate: series?.firstAirDate,
            episodeInfo: nil
        )
    }
    
    private func getEpisodeTitle(_ episode: Episode) -> String {
        // Regex for generic titles: "Episode 1", "Épisode 1", "Episodio 1"
        let pattern = "^(Episode|Épisode|Episodio) \\d+$"
        let isGeneric = episode.name.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil
        
        // Also check strict equality with "Episode {N}"
        let isStrictGeneric = episode.name == "Episode \(episode.episodeNumber)"
        
        if (isGeneric || isStrictGeneric), let originalName = episode.originalName {
            return originalName
        }
        
        return episode.name
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
