//
//  MediaListView.swift
//  anisflix
//
//  Created by AI Assistant on 30/11/2025.
//

import SwiftUI

struct MediaListView: View {
    let title: String
    let fetcher: (Int) async throws -> [Media]
    
    @ObservedObject var theme = AppTheme.shared
    @State private var items: [Media] = []
    @State private var currentPage = 1
    @State private var isLoading = false
    @State private var hasMorePages = true
    
    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        ZStack {
            theme.backgroundColor.ignoresSafeArea()
            
            VStack(spacing: 0) {
                CustomHeaderView(title: title, showBackButton: true)
                
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(items) { media in
                            MediaGridCard(media: media, onTap: {
                                // Navigation is handled by MediaGridCard's internal NavigationLink
                            })
                            .onAppear {
                                if media.id == items.last?.id && !isLoading && hasMorePages {
                                    Task {
                                        await loadMore()
                                    }
                                }
                            }
                        }
                    }
                    .padding(16)
                    
                    if isLoading {
                        ProgressView()
                            .tint(AppTheme.primaryRed)
                            .padding()
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .task {
            if items.isEmpty {
                await loadMore()
            }
        }
    }
    
    private func loadMore() async {
        guard !isLoading && hasMorePages else { return }
        
        isLoading = true
        
        do {
            let newItems = try await fetcher(currentPage)
            if newItems.isEmpty {
                hasMorePages = false
            } else {
                items.append(contentsOf: newItems)
                currentPage += 1
            }
        } catch {
            print("Error loading more items: \(error)")
        }
        
        isLoading = false
    }
}
