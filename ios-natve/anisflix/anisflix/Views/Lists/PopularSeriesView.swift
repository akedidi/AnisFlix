//
//  PopularSeriesView.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import SwiftUI

struct PopularSeriesView: View {
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
                    
                    Text("Séries populaires")
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
                ZStack {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 0) {
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 16) {
                                ForEach(items) { media in
                                    MediaGridCard(media: media, onTap: {
                                        print("Navigate to series: \(media.id)")
                                    })
                                    .onAppear {
                                        if media.id == items.last?.id {
                                            loadMoreData()
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 20)
                            
                            // Bottom loader for infinite scroll
                            if isLoading {
                                HStack {
                                    Spacer()
                                    ProgressView()
                                        .tint(AppTheme.primaryRed)
                                        .padding(.vertical, 20)
                                    Spacer()
                                }
                            } else if hasMore {
                                // Spacer to ensure scrollability to bottom
                                Color.clear.frame(height: 20)
                            }
                            
                            Color.clear.frame(height: 20)
                        }
                        .padding(.bottom, 20)
                    }
                    
                    if isLoading && items.isEmpty {
                        ZStack {
                            theme.backgroundColor.ignoresSafeArea()
                            VStack(spacing: 20) {
                                ProgressView()
                                    .tint(AppTheme.primaryRed)
                                Text(theme.t("common.loading"))
                                    .foregroundColor(theme.secondaryText)
                            }
                        }
                    }
                }
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
        print("📥 [PopularSeriesView] Loading page \(currentPage)...")
        
        let language = theme.selectedLanguage == "fr" ? "fr-FR" :
                      theme.selectedLanguage == "en" ? "en-US" :
                      theme.selectedLanguage == "es" ? "es-ES" : "fr-FR"
        
        print("📺 Loading Popular Series - Page 1")
        
        do {
            items = try await TMDBService.shared.fetchPopularSeries(page: 1, language: language)
            print("✅ Loaded \(items.count) items")
            hasMore = items.count >= 20
            currentPage = 1
        } catch {
            print("❌ Error loading popular series: \(error)")
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
        
        print("📄 Loading page \(nextPage) for Popular Series")
        
        Task {
            do {
                let newItems = try await TMDBService.shared.fetchPopularSeries(page: nextPage, language: language)
                
                await MainActor.run {
                    items.append(contentsOf: newItems)
                    currentPage = nextPage
                    hasMore = newItems.count >= 20
                    isLoading = false
                    print("✅ Page \(nextPage) loaded - Total: \(items.count)")
                }
            } catch {
                print("❌ Error loading page \(nextPage): \(error)")
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        PopularSeriesView()
    }
}
