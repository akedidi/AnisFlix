//
//  HomeView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct HomeView: View {
    @ObservedObject var theme = AppTheme.shared
    
    // State pour les données
    @State private var popularMovies: [Media] = []
    @State private var latestMovies: [Media] = []
    @State private var popularSeries: [Media] = []
    @State private var latestSeries: [Media] = []
    
    // Anime
    @State private var animeMoviesLatest: [Media] = []
    @State private var animeMoviesPopular: [Media] = []
    @State private var animeSeriesLatest: [Media] = []
    @State private var animeSeriesPopular: [Media] = []
    
    // Providers
    @State private var netflixMovies: [Media] = []
    @State private var netflixSeries: [Media] = []
    @State private var amazonMovies: [Media] = []
    @State private var amazonSeries: [Media] = []
    @State private var appleTVMovies: [Media] = []
    @State private var appleTVSeries: [Media] = []
    @State private var disneyMovies: [Media] = []
    @State private var disneySeries: [Media] = []
    @State private var hboMaxMovies: [Media] = []
    @State private var hboMaxSeries: [Media] = []
    
    @State private var isLoading = true

    @State private var continueWatching: [Media] = [] // Continue Watching data
    @State private var progressByMediaId: [Int: Double] = [:] // Progress for Continue Watching
    
    let providers = [
        (id: 8, name: "Netflix", logo: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg"),
        (id: 9, name: "Amazon Prime", logo: "/emthp39XA2YScoYL1p0sdbAH2WA.jpg"),
        (id: 350, name: "Apple TV+", logo: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg"),
        (id: 531, name: "Paramount+", logo: "/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg"),
        (id: 337, name: "Disney+", logo: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg"),
        (id: 1899, name: "HBO Max", logo: "/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg")
    ]
    
    var body: some View {
        // Content
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                // Safe Area handled by PullToRefreshScrollView logic usually results in content at top
                // Ideally we add some padding if needed, but safeAreaInset handles header.
                
                if isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(AppTheme.primaryRed)
                        Text(theme.t("common.loading"))
                            .foregroundColor(theme.secondaryText)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 100)
                } else {
                    // Continue Watching Section (conditionnelle)
                    if !continueWatching.isEmpty {
                        MediaRow(
                            title: theme.t("home.continueWatching"),
                            items: Array(continueWatching.prefix(20)),
                            onItemClick: { media in
                                print("Continue watching: \(media.id)")
                            },
                            progressByMediaId: progressByMediaId
                        )
                    }
                    
                    // Providers Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text(theme.t("home.byProvider"))
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(theme.primaryText)
                            .padding(.horizontal, 16)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 16) {
                                ForEach(providers, id: \.id) { provider in
                                    NavigationLink {
                                        // Navigate to provider list
                                        ProviderMediaListView(providerId: provider.id, providerName: provider.name)
                                    } label: {
                                        VStack(spacing: 8) {
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color.white)
                                                .frame(width: 90, height: 90)
                                                .overlay(
                                                    AsyncImage(url: URL(string: "https://image.tmdb.org/t/p/w200\(provider.logo)")) { phase in
                                                        switch phase {
                                                        case .success(let image):
                                                            image
                                                                .resizable()
                                                                .aspectRatio(contentMode: .fit)
                                                                .padding(8)
                                                        case .failure, .empty:
                                                            VStack(spacing: 4) {
                                                                ProgressView()
                                                                    .tint(AppTheme.primaryRed)
                                                                Text(provider.name)
                                                                    .font(.caption2)
                                                                    .multilineTextAlignment(.center)
                                                            }
                                                            .padding(8)
                                                        @unknown default:
                                                            EmptyView()
                                                        }
                                                    }
                                                )
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .stroke(AppTheme.borderGray.opacity(0.15), lineWidth: 1)
                                                )
                                                .shadow(color: .black.opacity(0.08), radius: 3, x: 0, y: 2)
                                            
                                            Text(provider.name)
                                                .font(.caption)
                                                .foregroundColor(theme.primaryText)
                                                .lineLimit(1)
                                                .frame(width: 90)
                                        }
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                    
                    // Derniers Films
                    if !latestMovies.isEmpty {
                        MediaRow(
                            title: theme.t("movies.latest"),
                            items: Array(latestMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to movie: \(media.id)")
                            }
                        ) {
                            LatestMoviesView()
                        }
                    }
                    
                    // Dernières Séries
                    if !latestSeries.isEmpty {
                        MediaRow(
                            title: theme.t("series.latest"),
                            items: Array(latestSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to series: \(media.id)")
                            }
                        ) {
                            LatestSeriesView()
                        }
                    }
                    
                    // Films Populaires
                    if !popularMovies.isEmpty {
                        MediaRow(
                            title: theme.t("movies.popular"),
                            items: Array(popularMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to movie: \(media.id)")
                            }
                        ) {
                            PopularMoviesView()
                        }
                    }
                    
                    // Séries Populaires
                    if !popularSeries.isEmpty {
                        MediaRow(
                            title: theme.t("series.popular"),
                            items: Array(popularSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to series: \(media.id)")
                            }
                        ) {
                            PopularSeriesView()
                        }
                    }
                    
                    // Anime - Derniers Films
                    if !animeMoviesLatest.isEmpty {
                        MediaRow(
                            title: "Anime - Derniers Films",
                            items: Array(animeMoviesLatest.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to anime movie: \(media.id)")
                            }
                        ) {
                            GenreMediaListView(genreId: 16, genreName: "Anime - Derniers Films", mediaType: .movie)
                        }
                    }
                    
                    // Anime - Dernières Séries
                    if !animeSeriesLatest.isEmpty {
                        MediaRow(
                            title: "Anime - Dernières Séries",
                            items: Array(animeSeriesLatest.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to anime series: \(media.id)")
                            }
                        ) {
                            GenreMediaListView(genreId: 16, genreName: "Anime - Dernières Séries", mediaType: .series)
                        }
                    }
                    
                    // Anime - Films Populaires
                    if !animeMoviesPopular.isEmpty {
                        MediaRow(
                            title: "Anime - Films Populaires",
                            items: Array(animeMoviesPopular.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to anime movie: \(media.id)")
                            }
                        ) {
                            GenreMediaListView(genreId: 16, genreName: "Anime - Films Populaires", mediaType: .movie)
                        }
                    }
                    
                    // Anime - Séries Populaires
                    if !animeSeriesPopular.isEmpty {
                        MediaRow(
                            title: "Anime - Séries Populaires",
                            items: Array(animeSeriesPopular.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to anime series: \(media.id)")
                            }
                        ) {
                            GenreMediaListView(genreId: 16, genreName: "Anime - Séries Populaires", mediaType: .series)
                        }
                    }
                    
                    // Netflix
                    if !netflixMovies.isEmpty {
                        MediaRow(
                            title: "Netflix - Films",
                            items: Array(netflixMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Netflix movie: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 8, providerName: "Netflix")
                        }
                    }
                    
                    if !netflixSeries.isEmpty {
                        MediaRow(
                            title: "Netflix - Séries",
                            items: Array(netflixSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Netflix series: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 8, providerName: "Netflix")
                        }
                    }
                    
                    // Amazon Prime
                    if !amazonMovies.isEmpty {
                        MediaRow(
                            title: "Amazon Prime - Films",
                            items: Array(amazonMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Amazon movie: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 9, providerName: "Amazon Prime")
                        }
                    }
                    
                    if !amazonSeries.isEmpty {
                        MediaRow(
                            title: "Amazon Prime - Séries",
                            items: Array(amazonSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Amazon series: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 9, providerName: "Amazon Prime")
                        }
                    }
                    
                    // Apple TV+
                    if !appleTVMovies.isEmpty {
                        MediaRow(
                            title: "Apple TV+ - Films",
                            items: Array(appleTVMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Apple TV movie: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 350, providerName: "Apple TV+")
                        }
                    }
                    
                    if !appleTVSeries.isEmpty {
                        MediaRow(
                            title: "Apple TV+ - Séries",
                            items: Array(appleTVSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Apple TV series: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 350, providerName: "Apple TV+")
                        }
                    }
                    
                    // Disney+
                    if !disneyMovies.isEmpty {
                        MediaRow(
                            title: "Disney+ - Films",
                            items: Array(disneyMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Disney movie: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 337, providerName: "Disney+")
                        }
                    }
                    
                    if !disneySeries.isEmpty {
                        MediaRow(
                            title: "Disney+ - Séries",
                            items: Array(disneySeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Disney series: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 337, providerName: "Disney+")
                        }
                    }
                    
                    // HBO Max
                    if !hboMaxMovies.isEmpty {
                        MediaRow(
                            title: "HBO Max - Films",
                            items: Array(hboMaxMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to HBO movie: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 384, providerName: "HBO Max")
                        }
                    }
                    
                    if !hboMaxSeries.isEmpty {
                        MediaRow(
                            title: "HBO Max - Séries",
                            items: Array(hboMaxSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to HBO series: \(media.id)")
                            }
                        ) {
                            ProviderMediaListView(providerId: 384, providerName: "HBO Max")
                        }
                    }
                }
            }
            .padding(.bottom, 50)  // Tab bar spacing
        }
        .safeAreaInset(edge: .top) {
            // Header
            CustomHeaderView(title: theme.t("nav.home")) { query in
                print("Search: \(query)")
                // TODO: Implémenter la recherche avec autocomplétion
            }
            .background(theme.backgroundColor) // Ensure header is opaque
        }
        .background(theme.backgroundColor.ignoresSafeArea())
        .navigationBarHidden(true)
        .task {
            await loadAllData(showLoadingUI: true)
        }
    }
    
    // MARK: - Data Loading
    
    private func loadAllData(showLoadingUI: Bool = true) async {
        print("🚀 START loadAllData()")
        if showLoadingUI {
            isLoading = true
        }
        
        let language = theme.selectedLanguage == "fr" ? "fr-FR" : 
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        print("🌍 Using language: \(language)")
        
        async let moviesPopular = TMDBService.shared.fetchPopularMovies(language: language)
        async let moviesLatest = TMDBService.shared.fetchLatestMovies(language: language)
        async let seriesPopular = TMDBService.shared.fetchPopularSeries(language: language)
        async let seriesLatest = TMDBService.shared.fetchLatestSeries(language: language)
        
        // Anime (genre 16 = Animation)
        async let animeMoviesLat = TMDBService.shared.fetchMoviesByGenre(genreId: 16, page: 1, language: language)
        async let animeMoviesPop = TMDBService.shared.fetchMoviesByGenre(genreId: 16, page: 2, language: language)
        async let animeSeriesLat = TMDBService.shared.fetchSeriesByGenre(genreId: 16, page: 1, language: language)
        async let animeSeriesPop = TMDBService.shared.fetchSeriesByGenre(genreId: 16, page: 2, language: language)
        
        // Providers
        async let netflixMov = TMDBService.shared.fetchMoviesByProvider(providerId: 8, language: language)
        async let netflixSer = TMDBService.shared.fetchSeriesByProvider(providerId: 8, language: language)
        async let amazonMov = TMDBService.shared.fetchMoviesByProvider(providerId: 9, language: language)
        async let amazonSer = TMDBService.shared.fetchSeriesByProvider(providerId: 9, language: language)
        async let appleMov = TMDBService.shared.fetchMoviesByProvider(providerId: 350, language: language)
        async let appleSer = TMDBService.shared.fetchSeriesByProvider(providerId: 350, language: language)
        async let disneyMov = TMDBService.shared.fetchMoviesByProvider(providerId: 337, language: language)
        async let disneySer = TMDBService.shared.fetchSeriesByProvider(providerId: 337, language: language)
        async let hboMov = TMDBService.shared.fetchMoviesByProvider(providerId: 384, language: language)
        async let hboSer = TMDBService.shared.fetchSeriesByProvider(providerId: 384, language: language)
        
        print("⏳ Waiting for all API calls...")
        
        do {
            let results = try await (
                moviesPopular, moviesLatest, seriesPopular, seriesLatest,
                animeMoviesLat, animeMoviesPop, animeSeriesLat, animeSeriesPop,
                netflixMov, netflixSer, amazonMov, amazonSer,
                appleMov, appleSer, disneyMov, disneySer,
                hboMov, hboSer
            )
            
            print("✅ All API calls completed successfully!")
            print("📊 Popular movies count: \(results.0.count)")
            print("📊 Latest movies count: \(results.1.count)")
            
            popularMovies = results.0
            latestMovies = results.1
            popularSeries = results.2
            latestSeries = results.3
            animeMoviesLatest = results.4
            animeMoviesPopular = results.5
            animeSeriesLatest = results.6
            animeSeriesPopular = results.7
            netflixMovies = results.8
            netflixSeries = results.9
            amazonMovies = results.10
            amazonSeries = results.11
            appleTVMovies = results.12
            appleTVSeries = results.13
            disneyMovies = results.14
            disneySeries = results.15
            hboMaxMovies = results.16
            hboMaxSeries = results.17
            
            // Load Continue Watching from WatchProgressManager
            await loadContinueWatching()
            
            if showLoadingUI {
                isLoading = false
            }
            print("🏁 loadAllData() completed")
        } catch {
            print("❌ ERROR in loadAllData: \(error)")
            print("❌ Error details: \(error.localizedDescription)")
            if showLoadingUI {
                isLoading = false
            }
        }
    }
    
    private func loadContinueWatching() async {
        print("🔍 Loading Continue Watching data...")
        let progressItems = WatchProgressManager.shared.getAllProgress()
        print("📊 Got \(progressItems.count) progress items")
        
        var orderedMedia: [Media] = []
        var progDict: [Int: Double] = [:]
        var processedMediaIds: Set<Int> = []
        
        for item in progressItems {
            // Only show items that are not complete (< 95% watched)
            guard item.progress < 0.95 else { continue }
            
            // Skip if we already have this media ID (keep the first = most recent)
            if processedMediaIds.contains(item.mediaId) {
                print("⚠️ Skipping duplicate media ID: \(item.mediaId)")
                continue
            }
            
            processedMediaIds.insert(item.mediaId)
            
            do {
                var media: Media?
                
                // Determine if movie or series based on key format
                if item.season == nil && item.episode == nil {
                    // It's a movie
                    let detail = try await TMDBService.shared.fetchMovieDetails(movieId: item.mediaId)
                    media = Media(
                        id: detail.id,
                        title: detail.title,
                        overview: detail.overview,
                        posterPath: detail.posterPath,
                        backdropPath: detail.backdropPath,
                        rating: detail.voteAverage,
                        year: String(detail.releaseDate?.prefix(4) ?? ""),
                        mediaType: .movie,
                        voteCount: detail.voteCount,
                        originalLanguage: nil,
                        releaseDate: nil
                    )
                } else {
                    // It's a series
                    let detail = try await TMDBService.shared.fetchSeriesDetails(seriesId: item.mediaId)
                    media = Media(
                        id: detail.id,
                        title: detail.name,
                        overview: detail.overview,
                        posterPath: detail.posterPath,
                        backdropPath: detail.backdropPath,
                        rating: detail.voteAverage,
                        year: String(detail.firstAirDate?.prefix(4) ?? ""),
                        mediaType: .series,
                        voteCount: 0,
                        originalLanguage: nil,
                        releaseDate: nil
                    )
                }
                
                if let media = media {
                    orderedMedia.append(media)
                    progDict[media.id] = item.progress
                }
            } catch {
                print("❌ Error fetching media \(item.mediaId): \(error)")
            }
        }
        
        print("✅ Loaded \(orderedMedia.count) unique Continue Watching items")
        continueWatching = orderedMedia
        progressByMediaId = progDict
    }
}

// Placeholder pour les cartes de films
struct MovieCardPlaceholder: View {
    let title: String
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        NavigationLink {
            MovieDetailView(movieId: 0)
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(theme.cardBackground)
                    .frame(width: 120, height: 180)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AppTheme.borderGray.opacity(0.3), lineWidth: 1)
                    )
                
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(theme.primaryText)
                    .lineLimit(2)
            }
            .frame(width: 120)
        }
    }
}

// Placeholder pour les cartes de séries
struct SeriesCardPlaceholder: View {
    let title: String
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        NavigationLink {
            SeriesDetailView(seriesId: 0)
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(theme.cardBackground)
                    .frame(width: 120, height: 180)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AppTheme.primaryRed.opacity(0.3), lineWidth: 1)
                    )
                
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(theme.primaryText)
                    .lineLimit(2)
            }
            .frame(width: 120)
        }
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
}
