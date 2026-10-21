//
//  ProviderMediaListView.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import SwiftUI

struct ProviderMediaListView: View {
    let providerId: Int
    let providerName: String
    
    @ObservedObject var theme = AppTheme.shared
    @State private var movies: [Media] = []
    @State private var series: [Media] = []
    @State private var actionMovies: [Media] = []
    @State private var dramaMovies: [Media] = []
    @State private var comedyMovies: [Media] = []
    @State private var actionSeries: [Media] = []
    @State private var dramaSeries: [Media] = []
    @State private var comedySeries: [Media] = []
    @State private var isLoading = true

    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack(alignment: .top) {
            theme.backgroundColor.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Custom Header with Back Button
                HStack {
                    Button {
                        presentationMode.wrappedValue.dismiss()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "chevron.left")
                                .font(.body.weight(.semibold))
                            Text("Retour")
                                .font(.body)
                        }
                        .foregroundColor(AppTheme.primaryRed)
                    }
                    
                    Spacer()
                    
                    Text(providerName)
                        .font(.headline)
                        .foregroundColor(theme.primaryText)
                    
                    Spacer()
                    
                    // Placeholder for symmetry
                    HStack(spacing: 8) {
                        Image(systemName: "chevron.left")
                            .font(.body.weight(.semibold))
                        Text("Retour")
                            .font(.body)
                    }
                    .opacity(0)
                }
                .padding()
                .background(theme.backgroundColor)
                
                Divider()
                    .background(theme.secondaryText.opacity(0.2))
                
                // Content
                if isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(AppTheme.primaryRed)
                        Text(theme.t("common.loading"))
                            .foregroundColor(theme.secondaryText)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 20) {
                            Color.clear.frame(height: 8)
                            
                            // Films
                            if !movies.isEmpty {
                                MediaRow(
                                    title: "Films",
                                    items: Array(movies.prefix(10)),
                                    onItemClick: { _ in },
                                    seeAllRoute: .providerCategoryList(providerId: providerId, providerName: providerName, category: "Films", genreId: nil, mediaType: .movie)
                                )
                            }
                            
                            // Séries
                            if !series.isEmpty {
                                MediaRow(
                                    title: "Séries",
                                    items: Array(series.prefix(10)),
                                    onItemClick: { _ in },
                                    seeAllRoute: .providerCategoryList(providerId: providerId, providerName: providerName, category: "Séries", genreId: nil, mediaType: .series)
                                )
                            }
                            
                            // Films d'Action
                            if !actionMovies.isEmpty {
                                MediaRow(
                                    title: "Films d'Action",
                                    items: Array(actionMovies.prefix(10)),
                                    onItemClick: { _ in },
                                    seeAllRoute: .providerCategoryList(providerId: providerId, providerName: providerName, category: "Films d'Action", genreId: 28, mediaType: .movie)
                                )
                            }
                            
                            // Films de Drame
                            if !dramaMovies.isEmpty {
                                MediaRow(
                                    title: "Films de Drame",
                                    items: Array(dramaMovies.prefix(10)),
                                    onItemClick: { _ in },
                                    seeAllRoute: .providerCategoryList(providerId: providerId, providerName: providerName, category: "Films de Drame", genreId: 18, mediaType: .movie)
                                )
                            }
                            
                            // Films de Comédie
                            if !comedyMovies.isEmpty {
                                MediaRow(
                                    title: "Films de Comédie",
                                    items: Array(comedyMovies.prefix(10)),
                                    onItemClick: { _ in },
                                    seeAllRoute: .providerCategoryList(providerId: providerId, providerName: providerName, category: "Films de Comédie", genreId: 35, mediaType: .movie)
                                )
                            }
                            
                            // Séries d'Action
                            if !actionSeries.isEmpty {
                                MediaRow(
                                    title: "Séries d'Action",
                                    items: Array(actionSeries.prefix(10)),
                                    onItemClick: { _ in },
                                    seeAllRoute: .providerCategoryList(providerId: providerId, providerName: providerName, category: "Séries d'Action", genreId: 10759, mediaType: .series)
                                )
                            }
                            
                            // Séries de Drame
                            if !dramaSeries.isEmpty {
                                MediaRow(
                                    title: "Séries de Drame",
                                    items: Array(dramaSeries.prefix(10)),
                                    onItemClick: { _ in },
                                    seeAllRoute: .providerCategoryList(providerId: providerId, providerName: providerName, category: "Séries de Drame", genreId: 18, mediaType: .series)
                                )
                            }
                            
                            // Séries de Comédie
                            if !comedySeries.isEmpty {
                                MediaRow(
                                    title: "Séries de Comédie",
                                    items: Array(comedySeries.prefix(10)),
                                    onItemClick: { _ in },
                                    seeAllRoute: .providerCategoryList(providerId: providerId, providerName: providerName, category: "Séries de Comédie", genreId: 35, mediaType: .series)
                                )
                            }

                            
                            // Bottom padding for TabBar and Cast Banner
                            Color.clear.frame(height: 150)
                        }
                    }
                } // End else
            } // End VStack
            .tint(AppTheme.primaryRed)
        } // End ZStack
        .navigationBarHidden(true)
        .task(id: theme.selectedLanguage) {
            await loadAllData(showLoadingUI: true)
        }
    }
    
    // MARK: - Data Loading
    
    private func loadAllData(showLoadingUI: Bool = true) async {
        if showLoadingUI {
            isLoading = true
        }
        
        var language = theme.tmdbLanguageCode
        
        print("📺 Loading \(providerName) content...")
        
        // Determine region based on provider
        // Amazon Prime (9) uses US catalog
        // HBO Max (1899) uses FR catalog (available in France via Canal+ or other partners)
        // Peacock (386) uses US catalog
        let region = (providerId == 9 || providerId == 386) ? "US" : "FR"
        print("🌍 Using region: \(region) for provider: \(providerId)")
        
        do {
            // Load movies and series by provider
            async let moviesData = TMDBService.shared.fetchMoviesByProvider(providerId: providerId, page: 1, language: language, region: region)
            async let seriesData = TMDBService.shared.fetchSeriesByProvider(providerId: providerId, page: 1, language: language, region: region)
            
            // Load movies by provider+genre (NOT genre alone!)
            async let actionMoviesData = TMDBService.shared.fetchMoviesByProviderAndGenre(providerId: providerId, genreId: 28, page: 1, language: language, region: region)
            async let dramaMoviesData = TMDBService.shared.fetchMoviesByProviderAndGenre(providerId: providerId, genreId: 18, page: 1, language: language, region: region)
            async let comedyMoviesData = TMDBService.shared.fetchMoviesByProviderAndGenre(providerId: providerId, genreId: 35, page: 1, language: language, region: region)
            
            // Load series by provider+genre
            async let actionSeriesData = TMDBService.shared.fetchSeriesByProviderAndGenre(providerId: providerId, genreId: 10759, page: 1, language: language, region: region)
            async let dramaSeriesData = TMDBService.shared.fetchSeriesByProviderAndGenre(providerId: providerId, genreId: 18, page: 1, language: language, region: region)
            async let comedySeriesData = TMDBService.shared.fetchSeriesByProviderAndGenre(providerId: providerId, genreId: 35, page: 1, language: language, region: region)
            
            let results = try await (moviesData, seriesData, actionMoviesData, dramaMoviesData, comedyMoviesData, actionSeriesData, dramaSeriesData, comedySeriesData)
            
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let today = dateFormatter.string(from: Date())
            
            func filterAndSort(_ media: [Media]) -> [Media] {
                return media
                    .filter { ($0.releaseDate ?? "") <= today && !($0.releaseDate ?? "").isEmpty }
                    .sorted { ($0.releaseDate ?? "") > ($1.releaseDate ?? "") }
            }
            
            movies = filterAndSort(results.0)
            series = filterAndSort(results.1)
            actionMovies = filterAndSort(results.2)
            dramaMovies = filterAndSort(results.3)
            comedyMovies = filterAndSort(results.4)
            actionSeries = filterAndSort(results.5)
            dramaSeries = filterAndSort(results.6)
            comedySeries = filterAndSort(results.7)
            
            print("✅ Loaded all \(providerName) categories")
        } catch {
            print("❌ Error loading \(providerName) content: \(error)")
        }
        
        if showLoadingUI {
            isLoading = false
        }
    }
}

#Preview {
    NavigationStack {
        ProviderMediaListView(
            providerId: 8,
            providerName: "Netflix"
        )
    }
}
