//
//  MediaRow.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct MediaRow<Destination: View>: View {
    let title: String
    let items: [Media]
    let onItemClick: (Media) -> Void
    let seeAllDestination: Destination?
    let progressByMediaId: [Int: Double]? // Optional progress dictionary
    
    @ObservedObject var theme = AppTheme.shared
    
    init(
        title: String,
        items: [Media],
        onItemClick: @escaping (Media) -> Void,
        progressByMediaId: [Int: Double]? = nil,
        @ViewBuilder seeAllDestination: () -> Destination
    ) {
        self.title = title
        self.items = items
        self.onItemClick = onItemClick
        self.seeAllDestination = seeAllDestination()
        self.progressByMediaId = progressByMediaId
    }
    
    init(
        title: String,
        items: [Media],
        onItemClick: @escaping (Media) -> Void,
        progressByMediaId: [Int: Double]? = nil
    ) where Destination == EmptyView {
        self.title = title
        self.items = items
        self.onItemClick = onItemClick
        self.seeAllDestination = nil
        self.progressByMediaId = progressByMediaId
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with title and optional "See All" button
            HStack {
                Text(title)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(theme.primaryText)
                
                Spacer()
                
                if let destination = seeAllDestination {
                    NavigationLink {
                        destination
                    } label: {
                        HStack(spacing: 4) {
                            Text("Voir tout")
                                .font(.subheadline)
                            Image(systemName: "chevron.right")
                                .font(.caption)
                        }
                        .foregroundColor(AppTheme.primaryRed)
                    }
                }
            }
            .padding(.horizontal, 16)
            
            // Scroll horizontal des médias
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) {
                    ForEach(items) { media in
                        MediaCard(media: media, onTap: {
                            onItemClick(media)
                        }, progress: progressByMediaId?[media.id])
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }
}

/// Carte de média pour la liste horizontale
struct MediaCard: View {
    let media: Media
    let onTap: () -> Void
    let progress: Double? // Optional progress (0.0 to 1.0)
    
    @ObservedObject var theme = AppTheme.shared
    
    init(media: Media, onTap: @escaping () -> Void, progress: Double? = nil) {
        self.media = media
        self.onTap = onTap
        self.progress = progress
    }
    
    var body: some View {
        NavigationLink {
            Group {
                if media.mediaType == .movie {
                   MovieDetailView(movieId: media.id)
                } else {
                    SeriesDetailView(seriesId: media.id)
                }
            }
            .onAppear {
                print("🔵 NavigationLink ACTIVATED for: \(media.title) (ID: \(media.id), Type: \(media.mediaType == .movie ? "Movie" : "Series"))")
            }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                // Poster with caching
                CachedAsyncImagePhased(url: media.posterURL) { phase in
                    switch phase {
                    case .empty:
                        RoundedRectangle(cornerRadius: 8)
                            .fill(theme.cardBackground)
                            .frame(width: 120, height: 180)
                            .overlay(
                                Image(systemName: media.mediaType == .movie ? "film" : "tv")
                                    .font(.title)
                                    .foregroundColor(theme.secondaryText.opacity(0.3))
                            )
                    case .success(let image):

                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 120, height: 180)
                            .clipped()
                            .cornerRadius(8)
                    case .failure(let error):
                        let _ = print("❌ Image load failed for \(media.title): \(error)")
                        RoundedRectangle(cornerRadius: 8)
                            .fill(theme.cardBackground)
                            .frame(width: 120, height: 180)
                            .overlay(
                                VStack(spacing: 8) {
                                    Image(systemName: media.mediaType == .movie ? "film" : "tv")
                                        .font(.system(size: 30))
                                        .foregroundColor(theme.secondaryText)
                                    Text("No Image")
                                        .font(.caption2)
                                        .foregroundColor(theme.secondaryText)
                                }
                            )
                    @unknown default:
                        EmptyView()
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(AppTheme.borderGray.opacity(0.3), lineWidth: 1)
                )
                .overlay(
                    // Progress bar if available
                    Group {
                        if let prog = progress {
                            VStack {
                                Spacer()
                                GeometryReader { geometry in
                                    ZStack(alignment: .leading) {
                                        // Background
                                        Rectangle()
                                            .fill(Color.black.opacity(0.6))
                                            .frame(height: 4)
                                        
                                        // Progress
                                        Rectangle()
                                            .fill(AppTheme.primaryRed)
                                            .frame(width: geometry.size.width * CGFloat(prog), height: 4)
                                    }
                                }
                                .frame(height: 4)
                            }
                            .cornerRadius(8)
                        }
                    }
                )
                
                // Info container with fixed height
                VStack(alignment: .leading, spacing: 4) {
                    // Titre
                    Text(media.title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(theme.primaryText)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(width: 120, alignment: .topLeading)
                    
                    // Rating & Year
                    if let rating = media.rating, rating > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.caption2)
                                .foregroundColor(theme.secondaryText)
                            
                            if let year = media.year, !year.isEmpty {
                                Text("•")
                                    .font(.caption2)
                                    .foregroundColor(theme.secondaryText)
                                Text(year)
                                    .font(.caption2)
                                    .foregroundColor(theme.secondaryText)
                            }
                        }
                    } else if let year = media.year, !year.isEmpty {
                        Text(year)
                            .font(.caption2)
                            .foregroundColor(theme.secondaryText)
                    }
                }
                .frame(width: 120, height: 60, alignment: .topLeading)
            }
            .frame(width: 120)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    MediaRow(
        title: "Films Populaires",
        items: [],
        onItemClick: { _ in }
    )
    .background(Color.black)
}
