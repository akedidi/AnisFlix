//
//  FavoritesManager.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import Foundation
import SwiftUI
import Combine

class FavoritesManager: ObservableObject {
    static let shared = FavoritesManager()
    
    @Published private(set) var favorites: [Media] = []
    private let favoritesKey = "user_favorites"
    
    private init() {
        loadFavorites()
    }
    
    func loadFavorites() {
        if let data = UserDefaults.standard.data(forKey: favoritesKey) {
            if let decoded = try? JSONDecoder().decode([Media].self, from: data) {
                self.favorites = decoded
                print("⭐️ Loaded \(favorites.count) favorites")
                return
            }
        }
        self.favorites = []
    }
    
    func saveFavorites() {
        if let encoded = try? JSONEncoder().encode(favorites) {
            UserDefaults.standard.set(encoded, forKey: favoritesKey)
            print("💾 Saved \(favorites.count) favorites")
        }
    }
    
    func add(_ media: Media) {
        if !isFavorite(media) {
            favorites.append(media)
            saveFavorites()
        }
    }
    
    func remove(_ media: Media) {
        favorites.removeAll { $0.id == media.id && $0.mediaType == media.mediaType }
        saveFavorites()
    }
    
    func isFavorite(_ media: Media) -> Bool {
        return favorites.contains { $0.id == media.id && $0.mediaType == media.mediaType }
    }
    
    func isFavorite(id: Int) -> Bool {
        return favorites.contains { $0.id == id }
    }
    
    func toggle(_ media: Media) {
        if isFavorite(media) {
            remove(media)
        } else {
            add(media)
        }
    }
}
