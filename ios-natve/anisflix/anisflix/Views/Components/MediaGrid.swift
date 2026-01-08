//
//  MediaGrid.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct MediaGrid: View {
    let items: [Media]
    let columns: Int
    let onItemClick: (Media) -> Void
    let onLoadMore: (() -> Void)?
    let isLoading: Bool
    let hasMore: Bool
    
    @ObservedObject var theme = AppTheme.shared
    
    init(
        items: [Media],
        columns: Int = 2,
        onItemClick: @escaping (Media) -> Void,
        onLoadMore: (() -> Void)? = nil,
        isLoading: Bool = false,
        hasMore: Bool = false
    ) {
        self.items = items
        self.columns = columns
        self.onItemClick = onItemClick
        self.onLoadMore = onLoadMore
        self.isLoading = isLoading
        self.hasMore = hasMore
    }
    
    private var gridColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 12), count: columns)
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                LazyVGrid(columns: gridColumns, spacing: 16) {
                    ForEach(items) { media in
                        MediaGridCard(media: media, onTap: { onItemClick(media) })
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 20)
                
                // Loading indicator - Below grid
                if isLoading {
                    HStack(spacing: 12) {
                        ProgressView()
                            .tint(AppTheme.primaryRed)
                        Text("Chargement...")
                            .font(.subheadline)
                            .foregroundColor(theme.secondaryText)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .padding(.horizontal, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(theme.cardBackground.opacity(0.5))
                    )
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                }
                
                // Invisible trigger for infinite scroll
                if hasMore && !isLoading, let loadMore = onLoadMore {
                    Color.clear
                        .frame(height: 50) // Increased height for better trigger point
                        .padding(.top, 40) // Space before trigger
                        .onAppear {
                            loadMore()
                        }
                }
            }
            .padding(.bottom, 20)
        }
    }
}

// MARK: - Grid Card

struct MediaGridCard: View {
    let media: Media
    let onTap: () -> Void
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        NavigationLink(value: media.mediaType == .movie ? NavigationRoute.movieDetail(movieId: media.id) : NavigationRoute.seriesDetail(seriesId: media.id)) {
            VStack(alignment: .leading, spacing: 8) {
                // Poster
                // Poster
                if let posterURL = media.posterURL {
                    CachedAsyncImagePhased(url: posterURL) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(2/3, contentMode: .fill)
                                .clipped()
                                .cornerRadius(8)
                        case .failure:
                            RoundedRectangle(cornerRadius: 8)
                                .fill(theme.cardBackground)
                                .aspectRatio(2/3, contentMode: .fit)
                                .overlay(
                                    Image(systemName: media.mediaType == .movie ? "film" : "tv")
                                        .font(.title)
                                        .foregroundColor(theme.secondaryText)
                                )
                        case .empty:
                            RoundedRectangle(cornerRadius: 8)
                                .fill(theme.cardBackground)
                                .aspectRatio(2/3, contentMode: .fit)
                                .overlay(
                                    Image(systemName: media.mediaType == .movie ? "film" : "tv")
                                        .font(.title)
                                        .foregroundColor(theme.secondaryText.opacity(0.3))
                                )
                        @unknown default:
                            EmptyView()
                        }
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AppTheme.borderGray.opacity(0.3), lineWidth: 1)
                    )
                } else {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(theme.cardBackground)
                        .aspectRatio(2/3, contentMode: .fit)
                        .overlay(
                            Image(systemName: media.mediaType == .movie ? "film" : "tv")
                                .font(.title)
                                .foregroundColor(theme.secondaryText)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(AppTheme.borderGray.opacity(0.3), lineWidth: 1)
                        )
                }
                
                // Title
                Text(media.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(theme.primaryText)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                
                // Info row
                HStack(spacing: 4) {
                    if let year = media.year, !year.isEmpty {
                        Text(year)
                            .font(.caption2)
                            .foregroundColor(theme.secondaryText)
                    }
                    
                    if let rating = media.rating, rating > 0 {
                        if media.year != nil && !media.year!.isEmpty {
                            Text("•")
                                .font(.caption2)
                                .foregroundColor(theme.secondaryText)
                        }
                        
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 8))
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.caption2)
                                .foregroundColor(theme.secondaryText)
                        }
                    }
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    MediaGrid(
        items: [],
        onItemClick: { _ in }
    )
    .background(Color.black)
}
