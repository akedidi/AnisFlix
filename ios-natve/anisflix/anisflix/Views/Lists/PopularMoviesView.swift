//
//  PopularMoviesView.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import SwiftUI

struct PopularMoviesView: View {
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
                    
                    Text("Films populaires")
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
                MediaGrid(
                    items: items,
                    columns: 3,
                    onItemClick: { media in
                        print("Navigate to movie: \(media.id)")
                    },
                    onLoadMore: hasMore ? {
                        loadMoreData()
                    } : nil,
                    isLoading: isLoading,
                    hasMore: hasMore
                )
            }
        }
        .navigationBarHidden(true)
        .task {
            await loadInitialData()
        }
    }
    
    // MARK: - Data Loading
    
    private func loadInitialData() async {
        guard items.isEmpty else { return }
        isLoading = true
        
        let language = theme.selectedLanguage == "fr" ? "fr-FR" :
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        print("🎬 Loading Popular Movies - Page 1")
        
        do {
            items = try await TMDBService.shared.fetchPopularMovies(page: 1, language: language)
            print("✅ Loaded \(items.count) items")
            hasMore = items.count >= 20
            currentPage = 1
        } catch {
            print("❌ Error loading popular movies: \(error)")
        }
        
        isLoading = false
    }
    
    private func loadMoreData() {
        guard !isLoading && hasMore else { return }
        
        isLoading = true
        let nextPage = currentPage + 1
        
        let language = theme.selectedLanguage == "fr" ? "fr-FR" :
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        print("📄 Loading page \(nextPage) for Popular Movies")
        
        Task {
            do {
                let newItems = try await TMDBService.shared.fetchPopularMovies(page: nextPage, language: language)
                items.append(contentsOf: newItems)
                currentPage = nextPage
                hasMore = newItems.count >= 20
                print("✅ Page \(nextPage) loaded - Total: \(items.count)")
            } catch {
                print("❌ Error loading page \(nextPage): \(error)")
            }
            
            isLoading = false
        }
    }
}

#Preview {
    NavigationStack {
        PopularMoviesView()
    }
}
