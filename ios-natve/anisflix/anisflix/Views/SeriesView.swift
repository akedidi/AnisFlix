//
//  SeriesView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct SeriesView: View {
    var showHeader: Bool = true
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
        // Content
        ZStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    
                    // DerniÃ¨res SÃ©ries
                    MediaRow(
                        title: theme.t("series.latest"),
                        items: Array(latestSeries.prefix(10)),
                        onItemClick: { media in
                            print("Series clicked: \(media.id)")
                        },
                        seeAllRoute: .latestSeries
                    )
                    
                    // Action & Adventure
                    MediaRow(
                        title: theme.t("series.action"),
                        items: Array(actionSeries.prefix(10)),
                        onItemClick: { media in
                            print("Series clicked: \(media.id)")
                        },
                        seeAllRoute: .genreList(genreId: GENRES.ACTION, genreName: theme.t("series.action"), mediaType: .series)
                    )
                    
                    // Drama
                    MediaRow(
                        title: theme.t("series.drama"),
                        items: Array(dramaSeries.prefix(10)),
                        onItemClick: { media in
                            print("Series clicked: \(media.id)")
                        },
                        seeAllRoute: .genreList(genreId: GENRES.DRAMA, genreName: theme.t("series.drama"), mediaType: .series)
                    )
                    
                    // Crime
                    MediaRow(
                        title: theme.t("series.crime"),
                        items: Array(crimeSeries.prefix(10)),
                        onItemClick: { media in
                            print("Series clicked: \(media.id)")
                        },
                        seeAllRoute: .genreList(genreId: GENRES.CRIME, genreName: theme.t("series.crime"), mediaType: .series)
                    )
                    
                    // Mystery
                    MediaRow(
                        title: theme.t("series.mystery"),
                        items: Array(mysterySeries.prefix(10)),
                        onItemClick: { media in
                            print("Series clicked: \(media.id)")
                        },
                        seeAllRoute: .genreList(genreId: GENRES.MYSTERY, genreName: theme.t("series.mystery"), mediaType: .series)
                    )
                    
                    // Documentary
                    MediaRow(
                        title: theme.t("series.documentary"),
                        items: Array(documentarySeries.prefix(10)),
                        onItemClick: { media in
                            print("Series clicked: \(media.id)")
                        },
                        seeAllRoute: .genreList(genreId: GENRES.DOCUMENTARY, genreName: theme.t("series.documentary"), mediaType: .series)
                    )
                    
                    // Sci-Fi & Fantasy
                    MediaRow(
                        title: theme.t("series.sciFi"),
                        items: Array(sciFiSeries.prefix(10)),
                        onItemClick: { media in
                            print("Series clicked: \(media.id)")
                        },
                        seeAllRoute: .genreList(genreId: GENRES.SCI_FI, genreName: theme.t("series.sciFi"), mediaType: .series)
                    )
                    
                    // Animation
                    MediaRow(
                        title: theme.t("series.animation"),
                        items: Array(animeSeries.prefix(10)),
                        onItemClick: { media in
                            print("Series clicked: \(media.id)")
                        },
                        seeAllRoute: .genreList(genreId: GENRES.ANIMATION, genreName: theme.t("series.animation"), mediaType: .series)
                    )
                    
                }
                
                // Bottom padding for tab bar
                Color.clear.frame(height: 150)
            }
            
            if isLoading && latestSeries.isEmpty {
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
             if showHeader {
                 CustomHeaderView(title: theme.t("nav.series"))
                    .background(theme.backgroundColor)
             }
        }
        .background(theme.backgroundColor.ignoresSafeArea())
        .task {
            await loadAllCategories(showLoadingUI: latestSeries.isEmpty)
        }
    }
    
    // MARK: - Data Loading
    
    private func loadAllCategories(showLoadingUI: Bool = true) async {
        print("🚀 START loadAllCategories() for Series")
        if showLoadingUI {
            isLoading = true
        }
        
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
    SeriesView()
}
