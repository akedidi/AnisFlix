//
//  CustomHeaderView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct CustomHeaderView: View {
    let title: String
    var showBackButton: Bool = false
    
    @State private var searchText: String = ""
    @State private var searchResults: [Media] = []
    @State private var showingResults = false
    
    // Navigation State
    @State private var selectedMedia: Media?
    @State private var navigateToMovie = false
    @State private var navigateToSeries = false
    
    @ObservedObject var theme = AppTheme.shared
    @FocusState private var searchFieldFocused: Bool
    @Environment(\.dismiss) private var dismiss
    var onSearch: ((String) -> Void)?
    
    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                // Safe Area spacer
                Color.clear
                    .frame(height: 0)
                    .background(
                        GeometryReader { geometry in
                            Color.clear.preference(
                                key: SafeAreaTopKey.self,
                                value: geometry.safeAreaInsets.top
                            )
                        }
                    )
                
                // Header Content
                HStack(spacing: 12) {
                    if showBackButton {
                        Button {
                            dismiss()
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundColor(theme.primaryText)
                                .frame(width: 40, height: 40)
                                .background(theme.cardBackground)
                                .clipShape(Circle())
                        }
                    }
                    
                    // Search Bar
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(theme.secondaryText)
                            .font(.system(size: 16))
                        
                        TextField("Rechercher...", text: $searchText)
                            .foregroundColor(theme.primaryText)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.webSearch)
                            .submitLabel(.search)
                            .focused($searchFieldFocused)
                            .onChange(of: searchText) { newValue in
                                onSearch?(newValue)
                                if newValue.count >= 2 {
                                    performSearch(query: newValue)
                                } else {
                                    searchResults = []
                                    showingResults = false
                                }
                            }
                            .onSubmit {
                                searchFieldFocused = false
                                showingResults = false
                            }
                        
                        if !searchText.isEmpty {
                            Button {
                                searchText = ""
                                searchResults = []
                                showingResults = false
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(theme.secondaryText)
                                    .font(.system(size: 16))
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(theme.cardBackground.opacity(0.8))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(theme.secondaryText.opacity(0.2), lineWidth: 1)
                    )
                    
                    // Cast Button
                    CastButton()
                    
                    // Language Picker
                    LanguagePicker()
                    
                    // Theme Toggle
                    ThemeToggle()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .background(theme.backgroundColor)
            
            // Autocomplete Results Overlay
            if showingResults && !searchResults.isEmpty {
                VStack(spacing: 0) {
                    // Spacer for header
                    Color.clear.frame(height: 60)
                    
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(searchResults.prefix(8)) { media in
                                Button {
                                    // Navigate to detail
                                    selectedMedia = media
                                    searchFieldFocused = false
                                    showingResults = false
                                    searchText = ""
                                    
                                    if media.mediaType == .movie {
                                        navigateToMovie = true
                                    } else {
                                        navigateToSeries = true
                                    }
                                } label: {
                                    HStack(spacing: 12) {
                                        // Poster
                                        AsyncImage(url: media.posterURL) { phase in
                                            switch phase {
                                            case .success(let image):
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                                    .frame(width: 50, height: 75)
                                                    .clipped()
                                                    .cornerRadius(6)
                                            default:
                                                RoundedRectangle(cornerRadius: 6)
                                                    .fill(theme.cardBackground)
                                                    .frame(width: 50, height: 75)
                                                    .overlay(
                                                        Image(systemName: media.mediaType == .movie ? "film" : "tv")
                                                            .font(.caption)
                                                            .foregroundColor(theme.secondaryText)
                                                    )
                                            }
                                        }
                                        
                                        // Info
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(media.title)
                                                .font(.body)
                                                .fontWeight(.medium)
                                                .foregroundColor(theme.primaryText)
                                                .lineLimit(1)
                                            
                                            HStack(spacing: 8) {
                                                Text(media.mediaType == .movie ? "Film" : "Série")
                                                    .font(.caption)
                                                    .foregroundColor(theme.secondaryText)
                                                
                                                if let year = media.year, !year.isEmpty {
                                                    Text("•")
                                                        .foregroundColor(theme.secondaryText)
                                                    Text(year)
                                                        .font(.caption)
                                                        .foregroundColor(theme.secondaryText)
                                                }
                                                
                                                if let rating = media.rating, rating > 0 {
                                                    Text("•")
                                                        .foregroundColor(theme.secondaryText)
                                                    HStack(spacing: 2) {
                                                        Image(systemName: "star.fill")
                                                            .font(.caption2)
                                                            .foregroundColor(.yellow)
                                                        Text(String(format: "%.1f", rating))
                                                            .font(.caption)
                                                            .foregroundColor(theme.secondaryText)
                                                    }
                                                }
                                            }
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.caption)
                                            .foregroundColor(theme.secondaryText)
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                    .background(theme.cardBackground)
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                Divider()
                                    .background(theme.secondaryText.opacity(0.1))
                            }
                        }
                    }
                    .frame(maxHeight: 400)
                    .background(theme.cardBackground)
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
                    .padding(.horizontal, 16)
                    
                    Spacer()
                }
                .background(
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                        .onTapGesture {
                            searchFieldFocused = false
                            showingResults = false
                        }
                )
            }
        }
        .navigationDestination(isPresented: $navigateToMovie) {
            if let media = selectedMedia {
                MovieDetailView(movieId: media.id)
            }
        }
        .navigationDestination(isPresented: $navigateToSeries) {
            if let media = selectedMedia {
                SeriesDetailView(seriesId: media.id)
            }
        }
    }
    
    // MARK: - Search
    
    private func performSearch(query: String) {
        Task {
            do {
                let results = try await TMDBService.shared.searchMulti(query: query)
                await MainActor.run {
                    searchResults = results
                    showingResults = !results.isEmpty
                }
            } catch {
                print("Search error: \(error)")
            }
        }
    }
}

// Preference Key for Safe Area
struct SafeAreaTopKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

#Preview {
    VStack {
        CustomHeaderView(title: "Accueil")
        Spacer()
    }
    .background(Color.black)
}
