//
//  TMDBService+Search.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import Foundation

extension TMDBService {
    /// Recherche multi (films et séries)
    func searchMulti(query: String) async throws -> [Media] {
        guard !query.isEmpty else { return [] }
        
        let language = "fr-FR"
        let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let endpoint = "https://api.themoviedb.org/3/search/multi?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&language=\(language)&query=\(encodedQuery)&include_adult=false"
        
        guard let url = URL(string: endpoint) else {
            throw URLError(.badURL)
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let decoder = JSONDecoder()
        // CodingKeys are explicit in models
        let response = try decoder.decode(TMDBResponse.self, from: data)
        
        // Filter only movies and TV shows
        return response.results.compactMap { tmdbMedia in
            if tmdbMedia.mediaType == "movie" {
                return tmdbMedia.toMedia(mediaType: .movie)
            } else if tmdbMedia.mediaType == "tv" {
                return tmdbMedia.toMedia(mediaType: .series)
            }
            return nil
        }
    }
}
