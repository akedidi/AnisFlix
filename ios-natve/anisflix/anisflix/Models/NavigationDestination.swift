//  NavigationDestination.swift
//  anisflix
//
//  Created by AI Assistant on 06/01/2026.
//

import Foundation

// Navigation destination types for programmatic navigation
enum NavigationDestination: Hashable {
    case movieDetail(Media)
    case seriesDetail(Media)
    case providerList(providerId: Int, providerName: String)
    case downloadedMediaPlayer(DownloadItem)
}
