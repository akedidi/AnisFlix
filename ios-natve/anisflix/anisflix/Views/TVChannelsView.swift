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
    @State private var sections: [TVSection] = []
    @State private var selectedSection: TVSection?
    @State private var groups: [TVGroup] = []
    @State private var selectedGroup: TVGroup?
    @State private var isLoading = true

    
    // Player
    @State private var playingChannel: TVChannel?
    @State private var currentStreamUrl: URL?
    @State private var isFullscreen = false
    @StateObject private var playerVM = PlayerViewModel()
    @State private var isSearchActive = false // Track search overlay state
    
    // Grid Layout
    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        ZStack(alignment: .top) {
            // Background is implicitly handled by themes in subviews or can be placed here if needed,
            // but safeAreaInset works best on the ScrollView.
            theme.backgroundColor.ignoresSafeArea()
            
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
                        // Inline Player Placeholder (keeps space when not fullscreen)
                        if playingChannel != nil && !isFullscreen {
                            Color.clear.frame(height: 270) // 220 (Player) + 50 (Close Strip)
                        }
                        
                        // Section Tabs (Dynamic - from API)
                        if sections.count > 1 {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(sections, id: \.id) { section in
                                        CategoryTabButton(
                                            title: section.name,
                                            isSelected: selectedSection?.id == section.id
                                        ) {
                                            switchSection(section)
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        
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
                        .background(theme.backgroundColor) // Ensure background matches
                        
                        // Channels List (Grid)
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
                                                
                                                if channel.logo.lowercased().hasSuffix(".svg"), let logoUrl = URL(string: channel.logo) {
                                                    SVGImageView(url: logoUrl)
                                                        .frame(height: 80) // SLightly smaller for SVG to avoid overflow
                                                        .padding(12)
                                                } else {
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


        }
        .tint(AppTheme.primaryRed)
        .safeAreaInset(edge: .top) {
            if !isFullscreen {
                TVHeaderView(
                    title: theme.t("nav.tvChannels"),
                    isSearchActive: $isSearchActive
                ) { channel in
                    playChannel(channel)
                }
                .background(theme.backgroundColor) // Ensure header is opaque
            }
        }
        .overlay {
            // Player Layer (Overlay) - Hidden when search is active
            if let channel = playingChannel, let url = currentStreamUrl, !isSearchActive {
                VStack(spacing: 0) {
                    if !isFullscreen {
                        // Spacer to push player down below header
                        // Since we use safeAreaInset for header, we know it consumes top safe area + height.
                        // It does NOT affect this ZStack overlay.
                        // So we still need this spacer to clear the header visually.
                        Color.clear.frame(height: 70)
                    }
                    
                    CustomVideoPlayer(
                        url: url,
                        title: channel.name,
                        posterUrl: channel.logo,
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
            }
        }
        .toolbar(isFullscreen ? .hidden : .visible, for: .tabBar)
        .task {
            await loadData(showLoadingUI: true)
        }
    }
    
    
    private func loadData(showLoadingUI: Bool = true) async {
        // Only show loading initially
        if sections.isEmpty && showLoadingUI {
            isLoading = true
        }
        
        do {
            sections = try await TVService.shared.fetchSections()
            if let firstSection = sections.first {
                selectedSection = firstSection
                await loadGroups(for: firstSection)
            }
            if showLoadingUI {
                isLoading = false
            }
        } catch {
            print("Error loading TV sections: \(error)")
            if showLoadingUI {
                isLoading = false
            }
        }
    }
    
    private func loadGroups(for section: TVSection) async {
        do {
            groups = try  await TVService.shared.fetchGroups(category: section.id)
            if let first = groups.first {
                selectedGroup = first
            }
        } catch {
            print("Error loading groups for section \(section.name): \(error)")
        }
    }
    
    private func switchSection(_ section: TVSection) {
        guard selectedSection?.id != section.id else { return }
        selectedSection = section
        Task {
            await loadGroups(for: section)
        }
    }
    
    private func playChannel(_ channel: TVChannel) {
        // Get all links (no filtering)
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
