//
//  TVChannelsView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct TVChannelsView: View {
    @ObservedObject var theme = AppTheme.shared
    
    // Data
    @State private var selectedCategory: String = "France" // "France" or "Arab"
    @State private var groups: [TVGroup] = []
    @State private var selectedGroup: TVGroup?
    @State private var isLoading = true
    
    // Player
    @State private var playingChannel: TVChannel?
    @State private var currentStreamUrl: URL?
    @State private var isFullscreen = false
    @StateObject private var playerVM = PlayerViewModel()
    
    // Grid Layout
    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        ZStack(alignment: .top) {
            // Background
            theme.backgroundColor
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Spacer for Header
                Color.clear.frame(height: 70)
                
                // Inline Player Placeholder (keeps space when not fullscreen)
                if playingChannel != nil && !isFullscreen {
                    Color.clear.frame(height: 270) // 220 (Player) + 50 (Close Strip)
                }
                
                if isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                            .tint(AppTheme.primaryRed)
                        Text(theme.t("common.loading"))
                            .foregroundColor(theme.secondaryText)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    // Category Tabs (France / Arab)
                    HStack(spacing: 0) {
                        CategoryTabButton(title: theme.t("tv.france"), isSelected: selectedCategory == "France") {
                            switchCategory("France")
                        }
                        CategoryTabButton(title: theme.t("tv.arabWorld"), isSelected: selectedCategory == "Arab") {
                            switchCategory("Arab")
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    
                    // Groups Selector (Horizontal Scroll)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(groups) { group in
                                Button {
                                    withAnimation {
                                        selectedGroup = group
                                    }
                                } label: {
                                    Text(group.name)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(
                                            selectedGroup?.id == group.id ?
                                            AppTheme.primaryRed :
                                            theme.cardBackground
                                        )
                                        .foregroundColor(.white)
                                        .cornerRadius(20)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 20)
                                                .stroke(theme.secondaryText.opacity(0.2), lineWidth: 1)
                                        )
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)
                    }
                    .background(theme.backgroundColor)
                    
                    // Channels List (Grid)
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 16) {
                            if let group = selectedGroup {
                                ForEach(group.channels) { channel in
                                    Button {
                                        playChannel(channel)
                                    } label: {
                                        VStack(spacing: 12) {
                                            // Logo Container
                                            ZStack {
                                                Color.white
                                                
                                                AsyncImage(url: URL(string: channel.logo)) { phase in
                                                    switch phase {
                                                    case .success(let image):
                                                        image
                                                            .resizable()
                                                            .aspectRatio(contentMode: .fit)
                                                            .padding(12)
                                                    case .failure:
                                                        Image(systemName: "tv")
                                                            .font(.largeTitle)
                                                            .foregroundColor(theme.secondaryText)
                                                    case .empty:
                                                        if !channel.logo.isEmpty {
                                                            ProgressView()
                                                        } else {
                                                            Image(systemName: "tv")
                                                                .font(.largeTitle)
                                                                .foregroundColor(theme.secondaryText)
                                                        }
                                                    @unknown default:
                                                        Image(systemName: "tv")
                                                            .font(.largeTitle)
                                                            .foregroundColor(theme.secondaryText)
                                                    }
                                                }
                                            }
                                            .frame(height: 100)
                                            .cornerRadius(12)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .stroke(
                                                        playingChannel?.id == channel.id ? AppTheme.primaryRed : theme.secondaryText.opacity(0.1),
                                                        lineWidth: playingChannel?.id == channel.id ? 2 : 1
                                                    )
                                            )
                                            
                                            // Channel Name
                                            Text(channel.name)
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                                .foregroundColor(playingChannel?.id == channel.id ? AppTheme.primaryRed : theme.primaryText)
                                                .lineLimit(1)
                                        }
                                        .padding(8)
                                        .background(theme.cardBackground.opacity(0.5))
                                        .cornerRadius(16)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        }
                        .padding(16)
                        
                        // Bottom padding
                        Color.clear.frame(height: 80)
                    }
                }
            }
            
            // Header
            if !isFullscreen {
                TVHeaderView(title: theme.t("nav.tvChannels")) { channel in
                    playChannel(channel)
                }
            }
            
            // Player Layer (Top of ZStack)
            if let channel = playingChannel, let url = currentStreamUrl {
                VStack(spacing: 0) {
                    if !isFullscreen {
                        // Spacer to push player down below header
                        Color.clear.frame(height: 70)
                    }
                    
                    CustomVideoPlayer(
                        url: url,
                        title: channel.name,
                        subtitles: [],
                        isPresented: Binding(get: { true }, set: { _ in
                            playingChannel = nil
                            currentStreamUrl = nil
                            isFullscreen = false
                        }),
                        isFullscreen: $isFullscreen,
                        showFullscreenButton: true,
                        isLive: true,
                        mediaId: nil as Int?,
                        season: nil as Int?,
                        episode: nil as Int?,
                        playerVM: playerVM
                    )
                    .frame(height: isFullscreen ? nil : 220)
                    .ignoresSafeArea(edges: isFullscreen ? .all : [])
                    
                    if !isFullscreen {
                        // Close button strip
                        HStack {
                            Text("\(theme.t("tv.nowPlaying")) \(channel.name)")
                                .font(.caption)
                                .foregroundColor(.white)
                            Spacer()
                            Button {
                                playingChannel = nil
                                currentStreamUrl = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.white)
                            }
                        }
                        .padding(8)
                        .background(AppTheme.primaryRed)
                        
                        Spacer() // Push to top
                    }
                }
                .background(isFullscreen ? Color.black : Color.clear)
                .transition(.move(edge: .top).combined(with: .opacity))
                .zIndex(100) // Ensure on top
            }
        }
        .toolbar(isFullscreen ? .hidden : .visible, for: .tabBar)
        .task {
            await loadData()
        }
    }
    
    private func loadData() async {
        // Only show loading initially
        if groups.isEmpty {
            isLoading = true
        }
        
        do {
            groups = try await TVService.shared.fetchGroups(category: selectedCategory)
            if let first = groups.first {
                selectedGroup = first
            }
            isLoading = false
        } catch {
            print("Error loading TV data: \(error)")
            isLoading = false
        }
    }
    
    private func switchCategory(_ category: String) {
        guard selectedCategory != category else { return }
        selectedCategory = category
        Task {
            await loadData()
        }
    }
    
    private func playChannel(_ channel: TVChannel) {
        // Get filtered links (iOS native logic: remove MPD)
        let links = TVService.shared.getFilteredLinks(for: channel)
        
        if let firstLink = links.first {
            // Apply proxy logic
            let proxyUrlString = TVService.shared.getProxyUrl(originalUrl: firstLink.url, type: firstLink.type)
            
            if let url = URL(string: proxyUrlString) {
                withAnimation {
                    playingChannel = channel
                    currentStreamUrl = url
                }
            }
        } else {
            // Fallback to streamUrl if no links
            if let url = URL(string: channel.streamUrl), !channel.streamUrl.isEmpty {
                withAnimation {
                    playingChannel = channel
                    currentStreamUrl = url
                }
            }
        }
    }
}

struct CategoryTabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(title)
                    .font(.headline)
                    .fontWeight(isSelected ? .bold : .medium)
                    .foregroundColor(isSelected ? theme.primaryText : theme.secondaryText)
                
                Rectangle()
                    .fill(isSelected ? AppTheme.primaryRed : Color.clear)
                    .frame(height: 3)
            }
            .frame(maxWidth: .infinity)
            .background(theme.backgroundColor)
        }
    }
}

#Preview {
    TVChannelsView()
}
