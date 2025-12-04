//
//  SeriesView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct SeriesView: View {
    @ObservedObject var theme = AppTheme.shared
    
    // State for all categories
    @State private var latestSeries: [Media] = []
    @State private var actionSeries: [Media] = []
    @State private var dramaSeries: [Media] = []
    @State private var crimeSeries: [Media] = []
    @State private var mysterySeries: [Media] = []
    @State private var documentarySeries: [Media] = []
    @State private var sciFiSeries: [Media] = []
    @State private var animeSeries: [Media] = []
    
    @State private var isLoading = true
    
    // Genre IDs from TMDB for Series (different from movies!)
    let GENRES = (
        ACTION: 10759,  // Action & Adventure
        DRAMA: 18,
        CRIME: 80,
        MYSTERY: 9648,
        DOCUMENTARY: 99,
        SCI_FI: 10765,  // Sci-Fi & Fantasy
        ANIMATION: 16
    )
    
    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                // Header
                CustomHeaderView(title: theme.t("nav.series"))
                
                if isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                            .tint(AppTheme.primaryRed)
                        Text(theme.t("common.loading"))
                            .foregroundColor(theme.secondaryText)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            // Padding for header
                            Color.clear.frame(height: 30)
                            
                            // Dernières Séries
                            MediaRow(
                                title: theme.t("series.latest"),
                                items: Array(latestSeries.prefix(10)),
                                onItemClick: { media in
                                    print("Series clicked: \(media.id)")
                                },
                                seeAllDestination: {
                                    MediaListView(
                                        title: theme.t("series.latest"),
                                        fetcher: { page in
                                            try await TMDBService.shared.fetchLatestSeries(page: page)
                                        }
                                    )
                                }
                            )
                            
                            // Action & Aventure
                            MediaRow(
                                title: theme.t("series.actionAdventure"),
                                items: Array(actionSeries.prefix(10)),
                                onItemClick: { media in
                                    print("Series clicked: \(media.id)")
                                },
                                seeAllDestination: {
                                    MediaListView(
                                        title: theme.t("series.actionAdventure"),
                                        fetcher: { page in
                                            try await TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.ACTION, page: page)
                                        }
                                    )
                                }
                            )
                            
                            // Drame
                            MediaRow(
                                title: theme.t("series.drama"),
                                items: Array(dramaSeries.prefix(10)),
                                onItemClick: { media in
                                    print("Series clicked: \(media.id)")
                                },
                                seeAllDestination: {
                                    MediaListView(
                                        title: theme.t("series.drama"),
                                        fetcher: { page in
                                            try await TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.DRAMA, page: page)
                                        }
                                    )
                                }
                            )
                            
                            // Crime
                            MediaRow(
                                title: theme.t("series.crime"),
                                items: Array(crimeSeries.prefix(10)),
                                onItemClick: { media in
                                    print("Series clicked: \(media.id)")
                                },
                                seeAllDestination: {
                                    MediaListView(
                                        title: theme.t("series.crime"),
                                        fetcher: { page in
                                            try await TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.CRIME, page: page)
                                        }
                                    )
                                }
                            )
                            
                            // Mystère
                            MediaRow(
                                title: theme.t("series.mystery"),
                                items: Array(mysterySeries.prefix(10)),
                                onItemClick: { media in
                                    print("Series clicked: \(media.id)")
                                },
                                seeAllDestination: {
                                    MediaListView(
                                        title: theme.t("series.mystery"),
                                        fetcher: { page in
                                            try await TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.MYSTERY, page: page)
                                        }
                                    )
                                }
                            )
                            
                            // Documentaire
                            MediaRow(
                                title: theme.t("series.documentary"),
                                items: Array(documentarySeries.prefix(10)),
                                onItemClick: { media in
                                    print("Series clicked: \(media.id)")
                                },
                                seeAllDestination: {
                                    MediaListView(
                                        title: theme.t("series.documentary"),
                                        fetcher: { page in
                                            try await TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.DOCUMENTARY, page: page)
                                        }
                                    )
                                }
                            )
                            
                            // Sci-Fi & Fantasy
                            MediaRow(
                                title: theme.t("series.sciFi"),
                                items: Array(sciFiSeries.prefix(10)),
                                onItemClick: { media in
                                    print("Series clicked: \(media.id)")
                                },
                                seeAllDestination: {
                                    MediaListView(
                                        title: theme.t("series.sciFi"),
                                        fetcher: { page in
                                            try await TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.SCI_FI, page: page)
                                        }
                                    )
                                }
                            )
                            
                            // Animation
                            MediaRow(
                                title: theme.t("series.animation"),
                                items: Array(animeSeries.prefix(10)),
                                onItemClick: { media in
                                    print("Series clicked: \(media.id)")
                                },
                                seeAllDestination: {
                                    MediaListView(
                                        title: theme.t("series.animation"),
                                        fetcher: { page in
                                            try await TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.ANIMATION, page: page)
                                        }
                                    )
                                }
                            )
                            
                            // Bottom padding for tab bar
                            Color.clear.frame(height: 30)
                        }
                    }
                }
            }
            .background(theme.backgroundColor)
        }
        .task {
            await loadAllCategories()
        }
    }
    
    // MARK: - Data Loading
    
    private func loadAllCategories() async {
        print("🚀 START loadAllCategories() for Series")
        isLoading = true
        
        let language = theme.tmdbLanguageCode
        
        print("🌍 Using language: \(language)")
        
        async let latest = TMDBService.shared.fetchLatestSeries(language: language)
        async let action = TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.ACTION, language: language)
        async let drama = TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.DRAMA, language: language)
        async let crime = TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.CRIME, language: language)
        async let mystery = TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.MYSTERY, language: language)
        async let documentary = TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.DOCUMENTARY, language: language)
        async let sciFi = TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.SCI_FI, language: language)
        async let anime = TMDBService.shared.fetchSeriesByGenre(genreId: GENRES.ANIMATION, language: language)
        
        do {
            let results = try await (latest, action, drama, crime, mystery, documentary, sciFi, anime)
            
            latestSeries = results.0
            actionSeries = results.1
            dramaSeries = results.2
            crimeSeries = results.3
            mysterySeries = results.4
            documentarySeries = results.5
            sciFiSeries = results.6
            animeSeries = results.7
            
            print("✅ All series categories loaded")
            print("📊 Latest: \(latestSeries.count), Action: \(actionSeries.count)")
            
            isLoading = false
        } catch {
            print("❌ ERROR in loadAllCategories: \(error)")
            isLoading = false
        }
    }
}

#Preview {
    SeriesView()
}
