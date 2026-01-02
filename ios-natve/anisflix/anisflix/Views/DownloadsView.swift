//
//  DownloadsView.swift
//  anisflix
//
//  Created by AI Assistant on 03/12/2025.
//

import SwiftUI
import AVKit

struct DownloadsView: View {
    @ObservedObject var downloadManager = DownloadManager.shared
    @ObservedObject var theme = AppTheme.shared
    
    @State private var selectedTab = 0 // 0: Terminé, 1: En cours
    
    var completedDownloads: [DownloadItem] {
        downloadManager.downloads
            .filter { $0.state == .completed }
            .sorted { item1, item2 in
                // First, compare titles
                if item1.title != item2.title {
                    return item1.title < item2.title
                }
                
                // Same title - check if they're episodes or movies
                switch (item1.season, item2.season) {
                case (nil, nil):
                    // Both movies - equal
                    return false
                case (nil, _):
                    // item1 is movie, item2 is episode - movie comes first
                    return true
                case (_, nil):
                    // item1 is episode, item2 is movie - movie comes first
                    return false
                case (let s1?, let s2?):
                    // Both episodes - compare seasons
                    if s1 != s2 {
                        return s1 < s2
                    }
                    // Same season - compare episodes
                    return (item1.episode ?? 0) < (item2.episode ?? 0)
                }
            }
    }
    
    var activeDownloads: [DownloadItem] {
        downloadManager.downloads
            .filter { $0.state != .completed }
            .sorted { item1, item2 in
                // First, compare titles
                if item1.title != item2.title {
                    return item1.title < item2.title
                }
                
                // Same title - check if they're episodes or movies
                switch (item1.season, item2.season) {
                case (nil, nil):
                    // Both movies - equal
                    return false
                case (nil, _):
                    // item1 is movie, item2 is episode - movie comes first
                    return true
                case (_, nil):
                    // item1 is episode, item2 is movie - movie comes first
                    return false
                case (let s1?, let s2?):
                    // Both episodes - compare seasons
                    if s1 != s2 {
                        return s1 < s2
                    }
                    // Same season - compare episodes
                    return (item1.episode ?? 0) < (item2.episode ?? 0)
                }
            }
    }
    
    @State private var itemToDelete: DownloadItem?
    @State private var showDeleteAlert = false
    
    @State private var itemToCancel: DownloadItem? // Added for cancellation
    @State private var showCancelAlert = false     // Added for cancellation
    
    @State private var selectedDownload: DownloadItem? // For fullScreenCover presentation
    
    var body: some View {
        ZStack {
            theme.backgroundColor.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header with Picker (Title removed)
                VStack(spacing: 16) {
                    Picker("Type", selection: $selectedTab) {
                        Text(theme.t("downloads.completed")).tag(0)
                        Text(theme.t("downloads.active")).tag(1)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.top, 10) // Added padding since title is gone
                    .padding(.bottom, 10)
                }
                .background(theme.backgroundColor)
                
                if selectedTab == 0 {
                    // Completed Downloads
                    if completedDownloads.isEmpty {
                        EmptyStateView(
                            icon: "arrow.down.circle",
                            message: theme.t("downloads.emptyCompleted")
                        )
                    } else {
                        List {
                            ForEach(completedDownloads) { item in
                                ZStack(alignment: .bottomTrailing) {
                                    NavigationLink {
                                        DownloadedMediaDetailView(item: item)
                                    } label: {
                                        CompletedDownloadRow(item: item)
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                                .listRowSeparator(.hidden)
                                .listRowBackground(Color.clear)
                                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        itemToDelete = item
                                        showDeleteAlert = true
                                    } label: {
                                        Label(theme.t("downloads.delete"), systemImage: "trash")
                                    }
                                    .tint(.red)
                                }
                            }
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                        .background(theme.backgroundColor)
                        .safeAreaInset(edge: .bottom) {
                            Color.clear.frame(height: 80)
                        }
                    }
                } else {
                    // Active Downloads
                    if activeDownloads.isEmpty {
                        EmptyStateView(
                            icon: "arrow.down",
                            message: theme.t("downloads.emptyActive")
                        )
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                ForEach(activeDownloads) { item in
                                    ActiveDownloadRow(item: item) {
                                        itemToCancel = item
                                        showCancelAlert = true
                                    }
                                }
                            }
                            .padding()
                            .padding(.bottom, 80)
                        }
                    }
                }
            }
        }
        // Toolbar hidden modifier removed to allow NavigationBar to show if needed (but we have custom header... wait, tab nav)
        // Actually, we want the system Back button when navigating deeper, but on this root view, we handle header manually.
        .navigationBarHidden(true) 
        .alert(isPresented: Binding<Bool>(
            get: { showDeleteAlert || showCancelAlert },
            set: { _ in
                showDeleteAlert = false
                showCancelAlert = false
            }
        )) {
            if showDeleteAlert {
                return Alert(
                    title: Text(theme.t("downloads.deleteAlertTitle")),
                    message: Text(theme.t("downloads.deleteAlertMessage")),
                    primaryButton: .destructive(Text(theme.t("downloads.deleteConfirm"))) {
                        if let item = itemToDelete {
                            downloadManager.deleteDownload(id: item.id)
                        }
                        itemToDelete = nil
                    },
                    secondaryButton: .cancel(Text(theme.t("settings.cancel"))) {
                        itemToDelete = nil
                    }
                )
            } else {
                return Alert(
                    title: Text(theme.t("downloads.cancelAlertTitle") ?? "Annuler le téléchargement ?"),
                    message: Text(theme.t("downloads.cancelAlertMessage") ?? "Voulez-vous vraiment annuler ce téléchargement ?"),
                    primaryButton: .destructive(Text(theme.t("downloads.deleteConfirm") ?? "Supprimer")) {
                        if let item = itemToCancel {
                            downloadManager.cancelDownload(id: item.id)
                        }
                        itemToCancel = nil
                    },
                    secondaryButton: .cancel(Text(theme.t("settings.cancel") ?? "Annuler")) {
                        itemToCancel = nil
                    }
                )
            }
        }
    }

}

struct CompletedDownloadRow: View {
    let item: DownloadItem
    @ObservedObject var theme = AppTheme.shared
    @ObservedObject var watchProgressManager = WatchProgressManager.shared
    
    var posterUrl: URL? {
        if let localPath = item.localPosterPath {
            let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            return documentsURL.appendingPathComponent(localPath)
        } else if let path = item.posterPath {
            return URL(string: "https://image.tmdb.org/t/p/w500\(path)")
        }
        return nil
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Poster
            if let url = posterUrl {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure(_):
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .overlay(
                                Image(systemName: "film")
                                    .foregroundColor(.white.opacity(0.5))
                            )
                    case .empty:
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                    @unknown default:
                        EmptyView()
                    }
                }
                .frame(width: 100, height: 150)
                .cornerRadius(8)
                .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)
                .overlay(
                    // Progress bar overlay
                    VStack {
                        Spacer()
                        if watchProgress > 0 && watchProgress < 1 {
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    Rectangle()
                                        .fill(Color.black.opacity(0.6))
                                        .frame(height: 4)
                                    
                                    Rectangle()
                                        .fill(AppTheme.primaryRed)
                                        .frame(width: geometry.size.width * CGFloat(watchProgress), height: 4)
                                }
                            }
                            .frame(height: 4)
                        }
                    }
                    .cornerRadius(8)
                )
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 100, height: 150)
                    .cornerRadius(8)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text(item.title)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(theme.primaryText)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                
                if let season = item.season, let episode = item.episode {
                    Text("S\(season) E\(episode)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(AppTheme.primaryRed)
                }
                
                if let overview = item.overview, !overview.isEmpty {
                    Text(overview)
                        .font(.caption)
                        .foregroundColor(theme.secondaryText)
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                Spacer()
                
                // Metadata Badges
                HStack(spacing: 8) {
                    if let size = getFileSize(for: item) {
                        Text(size)
                            .font(.caption2)
                            .foregroundColor(theme.secondaryText)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
        }
        .padding(12)
        .background(theme.cardBackground)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
    }
    
    // Compute watch progress for this item
    private var watchProgress: Double {
        watchProgressManager.getProgress(
            mediaId: item.mediaId,
            season: item.season,
            episode: item.episode
        )
    }
    
    private func getFileSize(for item: DownloadItem) -> String? {
        guard let localUrl = item.localVideoUrl else { return nil }
        do {
            let resources = try localUrl.resourceValues(forKeys: [.fileSizeKey])
            if let fileSize = resources.fileSize {
                let formatter = ByteCountFormatter()
                formatter.allowedUnits = [.useMB, .useGB]
                formatter.countStyle = .file
                return formatter.string(fromByteCount: Int64(fileSize))
            }
        } catch {
            return nil
        }
        return nil
    }
}

struct ActiveDownloadRow: View {
    let item: DownloadItem
    let onCancel: () -> Void // Callback for cancellation
    @ObservedObject var downloadManager = DownloadManager.shared
    @ObservedObject var theme = AppTheme.shared
    
    var posterUrl: URL? {
        if let localPath = item.localPosterPath {
            let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            return documentsURL.appendingPathComponent(localPath)
        } else if let path = item.posterPath {
            return URL(string: "https://image.tmdb.org/t/p/w500\(path)")
        }
        return nil
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Poster
            if let url = posterUrl {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 70, height: 105)
                .cornerRadius(8)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 70, height: 105)
                    .cornerRadius(8)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text(item.title)
                    .font(.headline)
                    .foregroundColor(theme.primaryText)
                    .lineLimit(1)
                
                if let season = item.season, let episode = item.episode {
                    Text("S\(season) E\(episode)")
                    .font(.caption)
                    .foregroundColor(theme.secondaryText)
                }
                
                // Progress Bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 6)
                            .cornerRadius(3)
                        
                        Rectangle()
                            .fill(AppTheme.primaryRed)
                            .frame(width: max(0, min(geometry.size.width * item.progress, geometry.size.width)), height: 6)
                            .cornerRadius(3)
                    }
                }
                .frame(height: 6)
                
                HStack {
                    if item.state == .failed, let errorMsg = downloadManager.getError(for: item.id) {
                         Text("\(statusText): \(errorMsg)")
                            .font(.caption)
                            .foregroundColor(.red)
                            .lineLimit(1)
                    } else {
                         Text(statusText + (item.downloadSpeed != nil ? " • \(item.downloadSpeed!)" : ""))
                            .font(.caption)
                            .foregroundColor(item.state == .failed ? .red : theme.secondaryText)
                    }
                    
                    Spacer()
                    
                    if item.state == .downloading || item.state == .queued {
                        Button {
                            downloadManager.pauseDownload(id: item.id)
                        } label: {
                            Image(systemName: "pause.circle.fill")
                                .font(.title2)
                                .foregroundColor(theme.primaryText)
                        }
                    } else if item.state == .paused {
                        Button {
                            downloadManager.resumeDownload(id: item.id)
                        } label: {
                            Image(systemName: "play.circle.fill")
                                .font(.title2)
                                .foregroundColor(theme.primaryText)
                        }
                    } else if item.state == .failed {
                        // Resume
                        Button {
                            downloadManager.resumeDownload(id: item.id)
                        } label: {
                            Image(systemName: "arrow.clockwise.circle.fill")
                                .font(.title2)
                                .foregroundColor(theme.primaryText)
                        }
                        
                        // Restart
                        Button {
                            downloadManager.restartDownload(id: item.id)
                        } label: {
                            Image(systemName: "arrow.uturn.backward.circle.fill")
                                .font(.title2)
                                .foregroundColor(.orange)
                        }
                    }
                    
                    // Always show cancel/delete button
                    Button {
                        onCancel()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.gray)
                    }
                }
            }
        }
        .padding(12)
        .background(theme.cardBackground)
        .cornerRadius(12)
        // Alert removed from here
    }
    
    var statusText: String {
        switch item.state {
        case .queued: return theme.t("downloads.queued") ?? "En attente..."
        case .waiting: return theme.t("downloads.waiting")
        case .downloading: return "\(theme.t("downloads.downloading")) \(Int(item.progress * 100))%"
        case .paused: return theme.t("downloads.paused")
        case .completed: return theme.t("downloads.completed")
        case .failed: return theme.t("downloads.failed")
        }
    }
}

struct EmptyStateView: View {
    let icon: String
    let message: String
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(theme.secondaryText.opacity(0.5))
            
            Text(message)
                .font(.headline)
                .foregroundColor(theme.secondaryText)
            Spacer()
        }
    }
}

#Preview {
    DownloadsView()
}
