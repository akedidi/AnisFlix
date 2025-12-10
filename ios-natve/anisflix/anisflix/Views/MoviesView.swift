//
//  MoviesView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct MoviesView: View {
    @ObservedObject var theme = AppTheme.shared
    
    // State for all categories
    @State private var latestMovies: [Media] = []
    @State private var actionMovies: [Media] = []
    @State private var dramaMovies: [Media] = []
    @State private var crimeMovies: [Media] = []
    @State private var mysteryMovies: [Media] = []
    @State private var documentaryMovies: [Media] = []
    @State private var sciFiMovies: [Media] = []
    @State private var animeMovies: [Media] = []
    
    @State private var isLoading = true

    
    // Genre IDs from TMDB (same as web)
    let GENRES = (
        ACTION: 28,
        DRAMA: 18,
        CRIME: 80,
        MYSTERY: 9648,
        DOCUMENTARY: 99,
        SCI_FI: 878,
        ANIMATION: 16
    )
    
    var body: some View {
        // Content
        ZStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    
                    // Derniers Films
                    MediaRow(
                        title: theme.t("movies.latest"),
                        items: Array(latestMovies.prefix(10)),
                        onItemClick: { media in
                            print("Movie clicked: \(media.id)")
                        },
                        seeAllDestination: {
                            MediaListView(
                                title: theme.t("movies.latest"),
                                fetcher: { page in
                                    try await TMDBService.shared.fetchLatestMovies(page: page)
                                }
                            )
                        }
                    )
                    
                    // Action
                    MediaRow(
                        title: theme.t("movies.action"),
                        items: Array(actionMovies.prefix(10)),
                        onItemClick: { media in
                            print("Movie clicked: \(media.id)")
                        },
                        seeAllDestination: {
                            MediaListView(
                                title: theme.t("movies.action"),
                                fetcher: { page in
                                    try await TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.ACTION, page: page)
                                }
                            )
                        }
                    )
                    
                    // Drama
                    MediaRow(
                        title: theme.t("movies.drama"),
                        items: Array(dramaMovies.prefix(10)),
                        onItemClick: { media in
                            print("Movie clicked: \(media.id)")
                        },
                        seeAllDestination: {
                            MediaListView(
                                title: theme.t("movies.drama"),
                                fetcher: { page in
                                    try await TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.DRAMA, page: page)
                                }
                            )
                        }
                    )
                    
                    // Crime
                    MediaRow(
                        title: theme.t("movies.crime"),
                        items: Array(crimeMovies.prefix(10)),
                        onItemClick: { media in
                            print("Movie clicked: \(media.id)")
                        },
                        seeAllDestination: {
                            MediaListView(
                                title: theme.t("movies.crime"),
                                fetcher: { page in
                                    try await TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.CRIME, page: page)
                                }
                            )
                        }
                    )
                    
                    // Mystery
                    MediaRow(
                        title: theme.t("movies.mystery"),
                        items: Array(mysteryMovies.prefix(10)),
                        onItemClick: { media in
                            print("Movie clicked: \(media.id)")
                        },
                        seeAllDestination: {
                            MediaListView(
                                title: theme.t("movies.mystery"),
                                fetcher: { page in
                                    try await TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.MYSTERY, page: page)
                                }
                            )
                        }
                    )
                    
                    // Documentary
                    MediaRow(
                        title: theme.t("movies.documentary"),
                        items: Array(documentaryMovies.prefix(10)),
                        onItemClick: { media in
                            print("Movie clicked: \(media.id)")
                        },
                        seeAllDestination: {
                            MediaListView(
                                title: theme.t("movies.documentary"),
                                fetcher: { page in
                                    try await TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.DOCUMENTARY, page: page)
                                }
                            )
                        }
                    )
                    
                    // Science-Fiction
                    MediaRow(
                        title: theme.t("movies.sciFi"),
                        items: Array(sciFiMovies.prefix(10)),
                        onItemClick: { media in
                            print("Movie clicked: \(media.id)")
                        },
                        seeAllDestination: {
                            MediaListView(
                                title: theme.t("movies.sciFi"),
                                fetcher: { page in
                                    try await TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.SCI_FI, page: page)
                                }
                            )
                        }
                    )
                    
                    // Animation
                    MediaRow(
                        title: theme.t("movies.animation"),
                        items: Array(animeMovies.prefix(10)),
                        onItemClick: { media in
                            print("Movie clicked: \(media.id)")
                        },
                        seeAllDestination: {
                            MediaListView(
                                title: theme.t("movies.animation"),
                                fetcher: { page in
                                    try await TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.ANIMATION, page: page)
                                }
                            )
                        }
                    )
                }
                
                // Bottom padding for tab bar
                Color.clear.frame(height: 50)
            }
            
            if isLoading && latestMovies.isEmpty {
                ZStack {
                    theme.backgroundColor.ignoresSafeArea()
                    VStack(spacing: 20) {
                        ProgressView()
                            .tint(AppTheme.primaryRed)
                            .scaleEffect(1.5)
                        Text(theme.t("common.loading"))
                            .foregroundColor(theme.secondaryText)
                    }
                }
            }
        }
        .safeAreaInset(edge: .top) {
             CustomHeaderView(title: theme.t("nav.movies"))
                .background(theme.backgroundColor)
        }
        .background(theme.backgroundColor.ignoresSafeArea())
        .task {
            await loadAllCategories(showLoadingUI: latestMovies.isEmpty)
        }
    }
    
    // MARK: - Data Loading
    
    private func loadAllCategories(showLoadingUI: Bool = true) async {
        print("🚀 START loadAllCategories() for Movies")
        if showLoadingUI {
            isLoading = true
        }
        
        let language = theme.tmdbLanguageCode
        
        print("🌍 Using language: \(language)")
        
        async let latest = TMDBService.shared.fetchLatestMovies(language: language)
        async let action = TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.ACTION, language: language)
        async let drama = TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.DRAMA, language: language)
        async let crime = TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.CRIME, language: language)
        async let mystery = TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.MYSTERY, language: language)
        async let documentary = TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.DOCUMENTARY, language: language)
        async let sciFi = TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.SCI_FI, language: language)
        async let anime = TMDBService.shared.fetchMoviesByGenre(genreId: GENRES.ANIMATION, language: language)
        
        do {
            let results = try await (latest, action, drama, crime, mystery, documentary, sciFi, anime)
            
            latestMovies = results.0
            actionMovies = results.1
            dramaMovies = results.2
            crimeMovies = results.3
            mysteryMovies = results.4
            documentaryMovies = results.5
            sciFiMovies = results.6
            animeMovies = results.7
            
            print("✅ All movie categories loaded")
            print("📊 Latest: \(latestMovies.count), Action: \(actionMovies.count)")
            
            if showLoadingUI {
                isLoading = false
            }
        } catch {
            print("❌ ERROR in loadAllCategories: \(error)")
            if showLoadingUI {
                isLoading = false
            }
        }
    }
}

#Preview {
    MoviesView()
}
