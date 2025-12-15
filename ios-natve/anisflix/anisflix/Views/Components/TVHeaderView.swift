//
//  TVHeaderView.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import SwiftUI

struct TVHeaderView: View {
    let title: String
    @State private var searchText: String = ""
    @State private var searchResults: [TVChannel] = []
    @State private var showingResults = false
    @ObservedObject var theme = AppTheme.shared
    @FocusState private var searchFieldFocused: Bool
    @Binding var isSearchActive: Bool
    
    var onChannelSelect: ((TVChannel) -> Void)?
    
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
                    // Search Bar
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(theme.secondaryText)
                            .font(.system(size: 16))
                        
                        TextField(theme.t("common.search"), text: $searchText)
                            .foregroundColor(theme.primaryText)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.webSearch)
                            .submitLabel(.search)
                            .focused($searchFieldFocused)
                            .onChange(of: searchText) { newValue in
                                if newValue.count >= 2 {
                                    performSearch(query: newValue)
                                } else {
                                    searchResults = []
                                    showingResults = false
                                    isSearchActive = false
                                }
                            }
                            .onSubmit {
                                searchFieldFocused = false
                                showingResults = false
                                isSearchActive = false
                            }
                        
                        if !searchText.isEmpty {
                            Button {
                                searchText = ""
                                searchResults = []
                                showingResults = false
                                isSearchActive = false
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
                        VStack(spacing: 0) {
                            ForEach(searchResults) { channel in
                                Button {
                                    // Play channel
                                    searchFieldFocused = false
                                    showingResults = false
                                    searchText = ""
                                    isSearchActive = false
                                    onChannelSelect?(channel)
                                } label: {
                                    HStack(spacing: 12) {
                                        // Logo with SVG support
                                        if channel.logo.lowercased().hasSuffix(".svg"), let logoUrl = URL(string: channel.logo) {
                                            SVGImageView(url: logoUrl)
                                                .frame(width: 50, height: 50)
                                                .background(Color.white)
                                                .cornerRadius(6)
                                        } else {
                                            AsyncImage(url: URL(string: channel.logo)) { phase in
                                                switch phase {
                                                case .success(let image):
                                                    image
                                                        .resizable()
                                                        .aspectRatio(contentMode: .fit)
                                                        .frame(width: 50, height: 50)
                                                        .background(Color.white)
                                                        .cornerRadius(6)
                                                default:
                                                    RoundedRectangle(cornerRadius: 6)
                                                        .fill(Color.white.opacity(0.9))
                                                        .frame(width: 50, height: 50)
                                                        .overlay(
                                                            Image(systemName: "tv")
                                                                .font(.caption)
                                                                .foregroundColor(.gray)
                                                        )
                                                }
                                            }
                                        }
                                        
                                        // Info
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(channel.name)
                                                .font(.body)
                                                .fontWeight(.medium)
                                                .foregroundColor(theme.primaryText)
                                            
                                            Text(channel.group)
                                                .font(.caption)
                                                .foregroundColor(theme.secondaryText)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "play.circle.fill")
                                            .font(.title2)
                                            .foregroundColor(AppTheme.primaryRed)
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                    .background(theme.cardBackground)
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                if channel.id != searchResults.last?.id {
                                    Divider()
                                        .background(theme.secondaryText.opacity(0.1))
                                }
                            }
                        }
                    }
                    .frame(maxHeight: 400)
                    .background(theme.cardBackground)
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.3), radius: 15, x: 0, y: 8)
                    .padding(.horizontal, 16)
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(
                    Color.black.opacity(0.5)
                        .ignoresSafeArea()
                        .onTapGesture {
                            searchFieldFocused = false
                            showingResults = false
                            isSearchActive = false
                        }
                )
                .zIndex(1000) // Higher than player's zIndex (100)
            }
        }
    }
    
    // MARK: - Search
    
    private func performSearch(query: String) {
        Task {
            let results = await TVService.shared.searchChannels(query: query)
            await MainActor.run {
                searchResults = results
                showingResults = !results.isEmpty
                isSearchActive = !results.isEmpty
            }
        }
    }
}
