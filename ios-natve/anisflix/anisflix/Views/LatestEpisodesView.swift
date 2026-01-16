//
//  LatestEpisodesView.swift
//  anisflix
//
//  Created by AI Assistant on 16/01/2026.
//

import SwiftUI

struct LatestEpisodesView: View {
    @ObservedObject var theme = AppTheme.shared
    @State private var episodes: [Media] = []
    @State private var isLoading = true
    @State private var currentPage = 1
    @State private var totalPages = 8
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(theme.t("episodes.latest"))
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(theme.primaryText)
                    
                    Text("Découvrez les derniers épisodes diffusés aujourd'hui.")
                        .font(.subheadline)
                        .foregroundColor(theme.secondaryText)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.top, 8)
                
                if isLoading && episodes.isEmpty {
                    ProgressView()
                        .padding(.top, 50)
                } else {
                    // Grid of episodes
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 16) {
                        ForEach(episodes) { media in
                            NavigationLink(value: NavigationRoute.seriesDetail(seriesId: media.id)) {
                                VStack(alignment: .leading, spacing: 8) {
                                    // Poster with episode badge
                                    ZStack(alignment: .topLeading) {
                                        CachedAsyncImagePhased(url: media.posterURL) { phase in
                                            switch phase {
                                            case .empty:
                                                RoundedRectangle(cornerRadius: 8)
                                                    .fill(theme.cardBackground)
                                                    .aspectRatio(2/3, contentMode: .fit)
                                            case .success(let image):
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                                    .aspectRatio(2/3, contentMode: .fit)
                                                    .clipped()
                                                    .cornerRadius(8)
                                            case .failure:
                                                RoundedRectangle(cornerRadius: 8)
                                                    .fill(theme.cardBackground)
                                                    .aspectRatio(2/3, contentMode: .fit)
                                                    .overlay(
                                                        Image(systemName: "tv")
                                                            .foregroundColor(theme.secondaryText)
                                                    )
                                            @unknown default:
                                                EmptyView()
                                            }
                                        }
                                        
                                        // Episode badge
                                        if let epInfo = media.episodeInfo {
                                            Text("S\(epInfo.season)E\(epInfo.episode)")
                                                .font(.caption2)
                                                .fontWeight(.bold)
                                                .foregroundColor(.white)
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 3)
                                                .background(AppTheme.primaryRed)
                                                .cornerRadius(4)
                                                .padding(6)
                                        }
                                    }
                                    
                                    // Title
                                    Text(media.title)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(theme.primaryText)
                                        .lineLimit(2)
                                    
                                    // Rating & Year
                                    if let rating = media.rating, rating > 0 {
                                        HStack(spacing: 4) {
                                            Image(systemName: "star.fill")
                                                .font(.caption2)
                                                .foregroundColor(.yellow)
                                            Text(String(format: "%.1f", rating))
                                                .font(.caption2)
                                                .foregroundColor(theme.secondaryText)
                                        }
                                    }
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(.horizontal, 16)
                    
                    // Pagination
                    if totalPages > 1 {
                        HStack(spacing: 20) {
                            Button(action: {
                                if currentPage > 1 {
                                    currentPage -= 1
                                    Task { await loadEpisodes() }
                                }
                            }) {
                                Image(systemName: "chevron.left")
                                    .font(.title2)
                                    .foregroundColor(currentPage > 1 ? AppTheme.primaryRed : theme.secondaryText)
                            }
                            .disabled(currentPage <= 1)
                            
                            Text("Page \(currentPage) / \(totalPages)")
                                .foregroundColor(theme.primaryText)
                            
                            Button(action: {
                                if currentPage < totalPages {
                                    currentPage += 1
                                    Task { await loadEpisodes() }
                                }
                            }) {
                                Image(systemName: "chevron.right")
                                    .font(.title2)
                                    .foregroundColor(currentPage < totalPages ? AppTheme.primaryRed : theme.secondaryText)
                            }
                            .disabled(currentPage >= totalPages)
                        }
                        .padding(.vertical, 20)
                    }
                }
            }
            .padding(.bottom, 100)
        }
        .background(theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadEpisodes()
        }
    }
    
    private func loadEpisodes() async {
        isLoading = true
        do {
            let result = try await TMDBService.shared.fetchLatestEpisodes(page: currentPage)
            await MainActor.run {
                episodes = result
                isLoading = false
            }
        } catch {
            print("❌ Failed to load latest episodes: \(error)")
            await MainActor.run {
                isLoading = false
            }
        }
    }
}

#Preview {
    NavigationStack {
        LatestEpisodesView()
    }
}
