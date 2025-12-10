//
//  ProviderCategoryListView.swift
//  anisflix
//
//  Created by AI Assistant on 01/12/2025.
//

import SwiftUI

struct ProviderCategoryListView: View {
    let providerId: Int
    let providerName: String
    let category: String
    let genreId: Int?
    let mediaType: Media.MediaType
    
    @ObservedObject var theme = AppTheme.shared
    @State private var items: [Media] = []
    @State private var isLoading = false
    @State private var currentPage = 1
    @State private var hasMore = true

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
                    
                    Text("\(providerName) - \(category)")
                        .font(.headline)
                        .foregroundColor(theme.primaryText)
                        .lineLimit(1)
                    
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
                
                if isLoading {
                     VStack(spacing: 20) {
                         ProgressView()
                             .tint(AppTheme.primaryRed)
                         Text(theme.t("common.loading"))
                             .foregroundColor(theme.secondaryText)
                     }
                     .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 0) {
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 16) {
                                ForEach(items) { media in
                                    MediaGridCard(media: media, onTap: {
                                        print("Navigate to \(mediaType == .movie ? "movie" : "series"): \(media.id)")
                                    })
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 20)
                            
                            // Invisible trigger for infinite scroll
                            if hasMore && !isLoading {
                                Color.clear
                                    .frame(height: 50)
                                    .padding(.top, 40)
                                    .onAppear {
                                        loadMoreData()
                                    }
                            }
                            
                            Color.clear.frame(height: 20)
                        }
                        .padding(.bottom, 20)
                    }
                }
            }
            .tint(AppTheme.primaryRed)
        }
        .navigationBarHidden(true)
        .task {
            await loadInitialData()
        }
    }
    
    // MARK: - Data Loading
    
    private func loadInitialData(showLoadingUI: Bool = true, forceReload: Bool = false) async {
        if !forceReload {
             guard items.isEmpty else { return }
        }
        
        if showLoadingUI {
            isLoading = true
        }
        
        let language = theme.selectedLanguage == "fr" ? "fr-FR" :
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        print("📺 Loading \(providerName) - \(category) - Page 1")
        
        await loadPage(1, language: language, replaceItems: true)
        
        if showLoadingUI {
            isLoading = false
        }
    }
    
    private func loadMoreData() {
        guard !isLoading && hasMore else { return }
        
        isLoading = true
        let nextPage = currentPage + 1
        
        let language = theme.selectedLanguage == "fr" ? "fr-FR" :
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        print("📄 Loading page \(nextPage) for \(providerName) - \(category)")
        
        Task {
            await loadPage(nextPage, language: language, replaceItems: false)
            isLoading = false
        }
    }
    
    private func loadPage(_ page: Int, language: String, replaceItems: Bool) async {
        do {
            var newItems: [Media] = []
            
            // Determine region based on provider
            // Amazon Prime (9) uses US catalog
            // HBO Max (1899) uses FR catalog
            let region = (providerId == 9) ? "US" : "FR"
            
            if let genre = genreId {
                // Use provider+genre combined query
                if mediaType == .movie {
                    newItems = try await TMDBService.shared.fetchMoviesByProviderAndGenre(
                        providerId: providerId,
                        genreId: genre,
                        page: page,
                        language: language,
                        region: region
                    )
                } else {
                    newItems = try await TMDBService.shared.fetchSeriesByProviderAndGenre(
                        providerId: providerId,
                        genreId: genre,
                        page: page,
                        language: language,
                        region: region
                    )
                }
            } else {
                // No genre filter - just provider
                if mediaType == .movie {
                    newItems = try await TMDBService.shared.fetchMoviesByProvider(
                        providerId: providerId,
                        page: page,
                        language: language,
                        region: region
                    )
                } else {
                    newItems = try await TMDBService.shared.fetchSeriesByProvider(
                        providerId: providerId,
                        page: page,
                        language: language,
                        region: region
                    )
                }
            }
            
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let today = dateFormatter.string(from: Date())
            
            let filteredAndSorted = newItems
                .filter { ($0.releaseDate ?? "") <= today && !($0.releaseDate ?? "").isEmpty }
                .sorted { ($0.releaseDate ?? "") > ($1.releaseDate ?? "") }
            
            if replaceItems {
                items = filteredAndSorted
            } else {
                items.append(contentsOf: filteredAndSorted)
            }
            currentPage = page
            hasMore = newItems.count >= 20
            print("✅ Page \(page) loaded - Total: \(items.count)")
        } catch {
            print("❌ Error loading page \(page): \(error)")
            print("❌ Error loading page \(page): \(error)")
        }
    }
    

}
