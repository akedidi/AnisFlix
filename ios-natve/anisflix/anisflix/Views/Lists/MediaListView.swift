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
                
                if isLoading && items.isEmpty {
                    VStack {
                        Spacer()
                        ProgressView()
                            .tint(AppTheme.primaryRed)
                            .scaleEffect(1.5)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ZStack {
                        ScrollView(showsIndicators: false) {
                            VStack(spacing: 0) {
                                LazyVGrid(columns: columns, spacing: 16) {
                                    ForEach(items) { media in
                                        MediaGridCard(media: media, onTap: {
                                            // Navigation is handled by MediaGridCard's internal NavigationLink
                                        })
                                        .onAppear {
                                            if media.id == items.last?.id {
                                                Task {
                                                    await loadMore()
                                                }
                                            }
                                        }
                                    }
                                }
                                .padding(16)
                                
                                // Bottom loader for infinite scroll
                                if isLoading && !items.isEmpty {
                                    HStack {
                                        Spacer()
                                        ProgressView()
                                            .tint(AppTheme.primaryRed)
                                            .padding(.vertical, 20)
                                        Spacer()
                                    }
                                } else if hasMorePages {
                                     HStack {
                                        Spacer()
                                        Color.clear.frame(height: 20)
                                        Spacer()
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .tint(AppTheme.primaryRed)
        }
        .navigationBarHidden(true)
        .task {
            if items.isEmpty {
                await loadData(reset: false, showLoadingUI: true)
            }
        }
    }
    
    private func loadData(reset: Bool = false, showLoadingUI: Bool = true) async {
        if reset {
            currentPage = 1
            hasMorePages = true
            // if we want to keep items visible, don't clear them here yet
        }
        
        guard !isLoading && hasMorePages else { return }
        
        isLoading = true  // Set lock immediately
        
        do {
            let newItems = try await fetcher(currentPage)
            if newItems.isEmpty {
                hasMorePages = false
            } else {
                if reset {
                    items = newItems
                } else {
                    items.append(contentsOf: newItems)
                }
                currentPage += 1
            }
        } catch {
            print("Error loading items: \(error)")
        }
        
        isLoading = false
    }
    
    private func loadMore() async {
        await loadData(reset: false, showLoadingUI: false) // Pagination doesn't need full screen loader usually, just bottom spinner
    }
    

}
