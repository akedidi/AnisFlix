//
//  FavoritesView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct FavoritesView: View {
    @ObservedObject var favoritesManager = FavoritesManager.shared
    @ObservedObject var theme = AppTheme.shared
    @State private var selectedSegment = 0
    
    var movies: [Media] {
        favoritesManager.favorites.filter { $0.mediaType == .movie }
    }
    
    var series: [Media] {
        favoritesManager.favorites.filter { $0.mediaType == .series }
    }
    
    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        ZStack {
            theme.backgroundColor.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Custom Header Removed in favor of NavigationBar
                
                // Content
                Picker("Type", selection: $selectedSegment) {
                    Text("Films").tag(0)
                    Text("Séries").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()
                .background(theme.backgroundColor)
                
                // Content
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        if selectedSegment == 0 {
                            if movies.isEmpty {
                                emptyStateView(message: "Aucun film favori")
                            } else {
                                ForEach(movies) { media in
                                    MediaGridCard(media: media, onTap: {
                                        // Navigation is handled by NavigationLink in MediaGridCard
                                    })
                                }
                            }
                        } else {
                            if series.isEmpty {
                                emptyStateView(message: "Aucune série favorite")
                            } else {
                                ForEach(series) { media in
                                    MediaGridCard(media: media, onTap: {
                                        // Navigation is handled by NavigationLink in MediaGridCard
                                    })
                                }
                            }
                        }
                    }
                    .padding()
                    .padding(.bottom, 150) // Space for tab bar + Cast Banner
                }
            }
        }
        .navigationTitle(theme.t("nav.favorites"))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            favoritesManager.loadFavorites()
        }
    }
    
    private func emptyStateView(message: String) -> some View {
        VStack(spacing: 12) {
            Spacer()
                .frame(height: 100)
            Image(systemName: "heart.slash")
                .font(.system(size: 50))
                .foregroundColor(theme.secondaryText)
            Text(message)
                .font(.headline)
                .foregroundColor(theme.secondaryText)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NavigationStack {
        FavoritesView()
    }
}
