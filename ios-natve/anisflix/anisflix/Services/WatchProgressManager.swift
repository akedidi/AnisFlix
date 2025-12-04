//
//  WatchProgressManager.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import Foundation
import SwiftUI
import Combine

struct WatchProgress: Codable {
    let mediaId: Int
    let season: Int?
    let episode: Int?
    let progress: Double // 0.0 to 1.0
    let currentTime: Double
    let duration: Double
    let lastWatched: Date
}

class WatchProgressManager: ObservableObject {
    static let shared = WatchProgressManager()
    
    @Published private(set) var progressMap: [String: WatchProgress] = [:]
    private let progressKey = "user_watch_progress"
    
    private init() {
        loadProgress()
    }
    
    func loadProgress() {
        if let data = UserDefaults.standard.data(forKey: progressKey) {
            if let decoded = try? JSONDecoder().decode([String: WatchProgress].self, from: data) {
                self.progressMap = decoded
                print("⏱️ Loaded watch progress for \(progressMap.count) items")
                return
            }
        }
        self.progressMap = [:]
    }
    
    func saveProgress() {
        if let encoded = try? JSONEncoder().encode(progressMap) {
            UserDefaults.standard.set(encoded, forKey: progressKey)
        }
    }
    
    func saveProgress(mediaId: Int, season: Int? = nil, episode: Int? = nil, currentTime: Double, duration: Double) {
        let key = makeKey(mediaId: mediaId, season: season, episode: episode)
        let progress = duration > 0 ? currentTime / duration : 0
        
        let item = WatchProgress(
            mediaId: mediaId,
            season: season,
            episode: episode,
            progress: progress,
            currentTime: currentTime,
            duration: duration,
            lastWatched: Date()
        )
        
        progressMap[key] = item
        saveProgress()
    }
    
    func getProgress(mediaId: Int, season: Int? = nil, episode: Int? = nil) -> Double {
        let key = makeKey(mediaId: mediaId, season: season, episode: episode)
        return progressMap[key]?.progress ?? 0
    }
    
    private func makeKey(mediaId: Int, season: Int?, episode: Int?) -> String {
        if let s = season, let e = episode {
            return "series_\(mediaId)_s\(s)_e\(e)"
        } else {
            return "movie_\(mediaId)"
        }
    }
    
    // Get saved currentTime for auto-resume
    func getSavedTime(mediaId: Int, season: Int? = nil, episode: Int? = nil) -> Double? {
        let key = makeKey(mediaId: mediaId, season: season, episode: episode)
        return progressMap[key]?.currentTime
    }
    
    func clearProgress() {
        progressMap.removeAll()
        UserDefaults.standard.removeObject(forKey: progressKey)
        print("🗑️ Watch progress cleared")
    }
    
    // Get all progress items sorted by most recent first
    func getAllProgress() -> [WatchProgress] {
        return Array(progressMap.values).sorted { $0.lastWatched > $1.lastWatched }
    }
}
