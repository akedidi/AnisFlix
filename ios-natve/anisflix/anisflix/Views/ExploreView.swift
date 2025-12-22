//
//  ExploreView.swift
//  anisflix
//
//  Created by AI Assistant on 15/12/2025.
//

import SwiftUI

struct ExploreView: View {
    @ObservedObject var theme = AppTheme.shared
    @State private var selectedTab = 0 // 0: Movies, 1: Series
    
    var body: some View {
        ZStack {
            theme.backgroundColor.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header with Search and Picker
                VStack(spacing: 0) {
                    CustomHeaderView(title: "Explorer", autoFocus: true) { query in
                        print("Search query: \(query)")
                        // TODO: Implement search
                    }
                    
                    Picker("Type", selection: $selectedTab) {
                        Text(theme.t("nav.movies")).tag(0)
                        Text(theme.t("nav.series")).tag(1)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.bottom, 10)
                }
                .background(theme.backgroundColor)
                .zIndex(1)
                
                // Content
                // Note: Using ZStack to keep state or if/else for memory?
                // If we use if/else, switching tabs reloads the view (and resets scroll).
                // To preserve scroll, we can use ZStack with opacity, but MoviesView loads data in .task.
                // If .task is cancelled, reloading happens.
                // Better to let them reload or use valid State preservation.
                // Given the simplicity, conditional is fine.
                
                if selectedTab == 0 {
                    MoviesView(showHeader: false)
                        .transition(.opacity)
                } else {
                    SeriesView(showHeader: false)
                        .transition(.opacity)
                }
            }
        }
    }
}

#Preview {
    ExploreView()
}
