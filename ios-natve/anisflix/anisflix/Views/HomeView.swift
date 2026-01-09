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
    @State private var canalMovies: [Media] = []
    @State private var canalSeries: [Media] = []
    @State private var crunchyrollMovies: [Media] = []
    @State private var crunchyrollSeries: [Media] = []
    @State private var adnMovies: [Media] = []
    @State private var adnSeries: [Media] = []
    @State private var arteMovies: [Media] = []
    @State private var arteSeries: [Media] = []
    @State private var mubiMovies: [Media] = []
    @State private var mubiSeries: [Media] = []
    @State private var tf1Movies: [Media] = []
    @State private var tf1Series: [Media] = []
    @State private var m6Movies: [Media] = []
    @State private var m6Series: [Media] = []
    
    @State private var isLoading = true

    @State private var continueWatching: [Media] = [] // Continue Watching data
    @State private var progressByMediaId: [Int: Double] = [:] // Progress for Continue Watching
    
    let providers = [
        (id: 8, name: "Netflix", logo: "/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg"),
        (id: 9, name: "Amazon Prime", logo: "/emthp39XA2YScoYL1p0sdbAH2WA.jpg"),
        (id: 350, name: "Apple TV+", logo: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg"),
        (id: 531, name: "Paramount+", logo: "/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg"),
        (id: 337, name: "Disney+", logo: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg"),
        (id: 1899, name: "HBO Max", logo: "/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg"),
        (id: 381, name: "Canal+", logo: "/geOzgeKZWpZC3lymAVEHVIk3X0q.jpg"),
        (id: 283, name: "Crunchyroll", logo: "/fzN5Jok5Ig1eJ7gyNGoMhnLSCfh.jpg"),
        (id: 415, name: "ADN", logo: "/w86FOwg0bbgUSHWWnjOTuEjsUvq.jpg"),
        (id: 234, name: "Arte", logo: "/vPZrjHe7wvALuwJEXT2kwYLi0gV.jpg"),
        (id: 11, name: "MUBI", logo: "/x570VpH2C9EKDf1riP83rYc5dnL.jpg"),
        (id: 1754, name: "TF1+", logo: "/blrBF9R2ONYu04ifGkYEb3k779N.jpg"),
        (id: 147, name: "M6+", logo: "/tmYzlEKeiWStvXwC1QdpXIASpN4.jpg")
    ]
    
    var body: some View {
        // Content
        ZStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    // Safe Area handled by PullToRefreshScrollView logic usually results in content at top
                    // Ideally we add some padding if needed, but safeAreaInset handles header.
                    
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
                                    NavigationLink(value: NavigationRoute.providerList(providerId: provider.id, providerName: provider.name)) {
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
                            },
                            seeAllRoute: .latestMovies
                        )
                    }
                    
                    // Dernières Séries
                    if !latestSeries.isEmpty {
                        MediaRow(
                            title: theme.t("series.latest"),
                            items: Array(latestSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to series: \(media.id)")
                            },
                            seeAllRoute: .latestSeries
                        )
                    }
                    
                    // Films Populaires
                    if !popularMovies.isEmpty {
                        MediaRow(
                            title: theme.t("movies.popular"),
                            items: Array(popularMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to movie: \(media.id)")
                            },
                            seeAllRoute: .popularMovies
                        )
                    }
                    
                    // Séries Populaires
                    if !popularSeries.isEmpty {
                        MediaRow(
                            title: theme.t("series.popular"),
                            items: Array(popularSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to series: \(media.id)")
                            },
                            seeAllRoute: .popularSeries
                        )
                    }
                    
                    // Anime - Derniers Films
                    if !animeMoviesLatest.isEmpty {
                        MediaRow(
                            title: "Anime - Derniers Films",
                            items: Array(animeMoviesLatest.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to anime movie: \(media.id)")
                            },
                            seeAllRoute: .genreList(genreId: 16, genreName: "Anime - Derniers Films", mediaType: .movie)
                        )
                    }
                    
                    // Anime - Dernières Séries
                    if !animeSeriesLatest.isEmpty {
                        MediaRow(
                            title: "Anime - Dernières Séries",
                            items: Array(animeSeriesLatest.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to anime series: \(media.id)")
                            },
                            seeAllRoute: .genreList(genreId: 16, genreName: "Anime - Dernières Séries", mediaType: .series)
                        )
                    }
                    
                    // Anime - Films Populaires
                    if !animeMoviesPopular.isEmpty {
                        MediaRow(
                            title: "Anime - Films Populaires",
                            items: Array(animeMoviesPopular.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to anime movie: \(media.id)")
                            },
                            seeAllRoute: .genreList(genreId: 16, genreName: "Anime - Films Populaires", mediaType: .movie)
                        )
                    }
                    
                    // Anime - Séries Populaires
                    if !animeSeriesPopular.isEmpty {
                        MediaRow(
                            title: "Anime - Séries Populaires",
                            items: Array(animeSeriesPopular.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to anime series: \(media.id)")
                            },
                            seeAllRoute: .genreList(genreId: 16, genreName: "Anime - Séries Populaires", mediaType: .series)
                        )
                    }
                    
                    // Netflix
                    if !netflixMovies.isEmpty {
                        MediaRow(
                            title: "Netflix - Films",
                            items: Array(netflixMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Netflix movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 8, providerName: "Netflix", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !netflixSeries.isEmpty {
                        MediaRow(
                            title: "Netflix - Séries",
                            items: Array(netflixSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Netflix series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 8, providerName: "Netflix", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // Amazon Prime
                    if !amazonMovies.isEmpty {
                        MediaRow(
                            title: "Amazon Prime - Films",
                            items: Array(amazonMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Amazon movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 9, providerName: "Amazon Prime", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !amazonSeries.isEmpty {
                        MediaRow(
                            title: "Amazon Prime - Séries",
                            items: Array(amazonSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Amazon series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 9, providerName: "Amazon Prime", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // Apple TV+
                    if !appleTVMovies.isEmpty {
                        MediaRow(
                            title: "Apple TV+ - Films",
                            items: Array(appleTVMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Apple TV movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 350, providerName: "Apple TV+", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !appleTVSeries.isEmpty {
                        MediaRow(
                            title: "Apple TV+ - Séries",
                            items: Array(appleTVSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Apple TV series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 350, providerName: "Apple TV+", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // Disney+
                    if !disneyMovies.isEmpty {
                        MediaRow(
                            title: "Disney+ - Films",
                            items: Array(disneyMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Disney movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 337, providerName: "Disney+", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !disneySeries.isEmpty {
                        MediaRow(
                            title: "Disney+ - Séries",
                            items: Array(disneySeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Disney series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 337, providerName: "Disney+", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // HBO Max
                    if !hboMaxMovies.isEmpty {
                        MediaRow(
                            title: "HBO Max - Films",
                            items: Array(hboMaxMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to HBO movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 384, providerName: "HBO Max", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !hboMaxSeries.isEmpty {
                        MediaRow(
                            title: "HBO Max - Séries",
                            items: Array(hboMaxSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to HBO series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 384, providerName: "HBO Max", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // Canal+
                    if !canalMovies.isEmpty {
                        MediaRow(
                            title: "Canal+ - Films",
                            items: Array(canalMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Canal+ movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 381, providerName: "Canal+", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !canalSeries.isEmpty {
                        MediaRow(
                            title: "Canal+ - Séries",
                            items: Array(canalSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Canal+ series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 381, providerName: "Canal+", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // Crunchyroll
                    if !crunchyrollMovies.isEmpty {
                        MediaRow(
                            title: "Crunchyroll - Films",
                            items: Array(crunchyrollMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Crunchyroll movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 283, providerName: "Crunchyroll", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !crunchyrollSeries.isEmpty {
                        MediaRow(
                            title: "Crunchyroll - Séries",
                            items: Array(crunchyrollSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Crunchyroll series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 283, providerName: "Crunchyroll", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // ADN
                    if !adnMovies.isEmpty {
                        MediaRow(
                            title: "ADN - Films",
                            items: Array(adnMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to ADN movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 415, providerName: "ADN", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !adnSeries.isEmpty {
                        MediaRow(
                            title: "ADN - Séries",
                            items: Array(adnSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to ADN series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 415, providerName: "ADN", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // Arte
                    if !arteMovies.isEmpty {
                        MediaRow(
                            title: "Arte - Films",
                            items: Array(arteMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Arte movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 234, providerName: "Arte", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !arteSeries.isEmpty {
                        MediaRow(
                            title: "Arte - Séries",
                            items: Array(arteSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to Arte series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 234, providerName: "Arte", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // MUBI
                    if !mubiMovies.isEmpty {
                        MediaRow(
                            title: "MUBI - Films",
                            items: Array(mubiMovies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to MUBI movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 11, providerName: "MUBI", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !mubiSeries.isEmpty {
                        MediaRow(
                            title: "MUBI - Séries",
                            items: Array(mubiSeries.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to MUBI series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 11, providerName: "MUBI", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // TF1+
                    if !tf1Movies.isEmpty {
                        MediaRow(
                            title: "TF1+ - Films",
                            items: Array(tf1Movies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to TF1+ movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 1754, providerName: "TF1+", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !tf1Series.isEmpty {
                        MediaRow(
                            title: "TF1+ - Séries",
                            items: Array(tf1Series.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to TF1+ series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 1754, providerName: "TF1+", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                    
                    // M6+
                    if !m6Movies.isEmpty {
                        MediaRow(
                            title: "M6+ - Films",
                            items: Array(m6Movies.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to M6+ movie: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 147, providerName: "M6+", category: "Films", genreId: nil, mediaType: .movie)
                        )
                    }
                    
                    if !m6Series.isEmpty {
                        MediaRow(
                            title: "M6+ - Séries",
                            items: Array(m6Series.prefix(10)),
                            onItemClick: { media in
                                print("Navigate to M6+ series: \(media.id)")
                            },
                            seeAllRoute: .providerCategoryList(providerId: 147, providerName: "M6+", category: "Séries", genreId: nil, mediaType: .series)
                        )
                    }
                }
                .padding(.bottom, 150)  // Increased padding for floating tab bar and cast banner
            }
            
            if isLoading && popularMovies.isEmpty {
                ZStack {
                    theme.backgroundColor.ignoresSafeArea()
                    VStack(spacing: 20) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(AppTheme.primaryRed)
                        Text(theme.t("common.loading"))
                            .foregroundColor(theme.secondaryText)
                    }
                }
            }
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
            // Silent refresh if we already have data
            await loadAllData(showLoadingUI: popularMovies.isEmpty)
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
        // MATCHING WEB LOGIC EXACTLY: Web uses Genre 16 default (Popularity) for both "Latest" and "Popular"
        async let animeMoviesLat = TMDBService.shared.fetchMoviesByGenre(genreId: 16, page: 1, language: language)
        async let animeMoviesPop = TMDBService.shared.fetchMoviesByGenre(genreId: 16, page: 1, language: language)
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
        async let canalMov = TMDBService.shared.fetchMoviesByProvider(providerId: 381, language: language)
        async let canalSer = TMDBService.shared.fetchSeriesByProvider(providerId: 381, language: language)
        async let crunchyrollMov = TMDBService.shared.fetchMoviesByProvider(providerId: 283, language: language)
        async let crunchyrollSer = TMDBService.shared.fetchSeriesByProvider(providerId: 283, language: language)
        async let adnMov = TMDBService.shared.fetchMoviesByProvider(providerId: 415, language: language)
        async let adnSer = TMDBService.shared.fetchSeriesByProvider(providerId: 415, language: language)
        async let arteMov = TMDBService.shared.fetchMoviesByProvider(providerId: 234, language: language)
        async let arteSer = TMDBService.shared.fetchSeriesByProvider(providerId: 234, language: language)
        async let mubiMov = TMDBService.shared.fetchMoviesByProvider(providerId: 11, language: language)
        async let mubiSer = TMDBService.shared.fetchSeriesByProvider(providerId: 11, language: language)
        async let tf1Mov = TMDBService.shared.fetchMoviesByProvider(providerId: 1754, language: language)
        async let tf1Ser = TMDBService.shared.fetchSeriesByProvider(providerId: 1754, language: language)
        async let m6Mov = TMDBService.shared.fetchMoviesByProvider(providerId: 147, language: language)
        async let m6Ser = TMDBService.shared.fetchSeriesByProvider(providerId: 147, language: language)
        
        print("⏳ Waiting for all API calls...")
        
        do {
            let results = try await (
                moviesPopular, moviesLatest, seriesPopular, seriesLatest,
                animeMoviesLat, animeMoviesPop, animeSeriesLat, animeSeriesPop,
                netflixMov, netflixSer, amazonMov, amazonSer,
                appleMov, appleSer, disneyMov, disneySer,
                hboMov, hboSer, canalMov, canalSer, crunchyrollMov, crunchyrollSer,
                adnMov, adnSer, arteMov, arteSer, mubiMov, mubiSer,
                tf1Mov, tf1Ser, m6Mov, m6Ser
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
            canalMovies = results.18
            canalSeries = results.19
            crunchyrollMovies = results.20
            crunchyrollSeries = results.21
            adnMovies = results.22
            adnSeries = results.23
            arteMovies = results.24
            arteSeries = results.25
            mubiMovies = results.26
            mubiSeries = results.27
            tf1Movies = results.28
            tf1Series = results.29
            m6Movies = results.30
            m6Series = results.31
            
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
        
            // STRICT DEDUPLICATION:
            // Check if we've already visited this media ID (regardless of whether we decided to show it or not).
            // This ensures we only evaluate the MOST RECENT progress item for any given media.
            // If the latest item is "finished" and we decide to hide it, we MUST NOT fall back to an older item for the same media.
            if processedMediaIds.contains(item.mediaId) {
                // print("⚠️ Skipping older duplicate media ID: \(item.mediaId)")
                continue
            }
            
            // Mark this ID as processed immediately
            processedMediaIds.insert(item.mediaId)
            
            // For movies: hide if complete (>= 95% watched)
            // For series: if >= 95%, check if there's a next episode
            if item.season == nil && item.episode == nil {
                // Movie - skip if complete
                guard item.progress < 0.95 else { continue }
            } else {
                // Series episode
                if item.progress >= 0.95 {
                    // Check if there's a next episode
                    let hasNext = await checkHasNextEpisode(seriesId: item.mediaId, season: item.season ?? 1, episode: item.episode ?? 1)
                    if !hasNext {
                        print("⏭️ Skipping completed series episode with no next episode: S\(item.season ?? 0)E\(item.episode ?? 0)")
                        continue
                    }
                    print("✅ Keeping completed episode with next available: S\(item.season ?? 0)E\(item.episode ?? 0)")
                }
            }
            
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
    
    // Check if there's a next episode after the given season/episode
    private func checkHasNextEpisode(seriesId: Int, season: Int, episode: Int) async -> Bool {
        do {
            let seriesDetail = try await TMDBService.shared.fetchSeriesDetails(seriesId: seriesId)
            let seasons = seriesDetail.seasons ?? []
            
            // Find current season info
            if let currentSeason = seasons.first(where: { $0.seasonNumber == season }) {
                // Check if there's a next episode in the same season
                if episode < currentSeason.episodeCount {
                    return true
                }
                
                // Check if there's a next season
                let nextSeasonNumber = season + 1
                if seasons.contains(where: { $0.seasonNumber == nextSeasonNumber && $0.episodeCount > 0 }) {
                    return true
                }
            }
            
            return false
        } catch {
            print("❌ Error checking next episode for series \(seriesId): \(error)")
            // On error, assume there might be a next episode (fail-safe)
            return true
        }
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
