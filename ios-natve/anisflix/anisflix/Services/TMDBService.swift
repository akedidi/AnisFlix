//
//  TMDBService.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import Foundation

/// Service pour les appels à l'API TMDB
class TMDBService {
    static let shared = TMDBService()
    
    private let apiKey = "f3d757824f08ea2cff45eb8f47ca3a1e"
    private let baseURL = "https://api.themoviedb.org/3"
    private let proxyBaseURL = "https://anisflix.vercel.app/api/tmdb-proxy"
    
    private init() {}
    
    // MARK: - Popular Movies
    
    func fetchPopularMovies(page: Int = 1, language: String? = nil) async throws -> [Media] {
        let lang = language ?? AppTheme.shared.tmdbLanguageCode
        let endpoint = "\(baseURL)/movie/popular?api_key=\(apiKey)&language=\(lang)&page=\(page)"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .movie) }
    }
    
    // MARK: - Latest Movies
    
    func fetchLatestMovies(page: Int = 1, language: String? = nil) async throws -> [Media] {
        let lang = language ?? AppTheme.shared.tmdbLanguageCode
        
        // Use centralized TMDB proxy which handles "Latest" logic robustly (Digital + Physical releases)
        let endpoint = "\(proxyBaseURL)?type=movie&filter=last&page=\(page)&language=\(lang)"
        
        print("🎥 [TMDBService] Fetching latest movies via proxy: \(endpoint)")
        
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .movie) }
    }
    
    // MARK: - Popular Series
    
    func fetchPopularSeries(page: Int = 1, language: String? = nil) async throws -> [Media] {
        let lang = language ?? AppTheme.shared.tmdbLanguageCode
        let endpoint = "\(baseURL)/tv/popular?api_key=\(apiKey)&language=\(lang)&page=\(page)"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .series) }
    }
    
    // MARK: - Latest Series
    
    func fetchLatestSeries(page: Int = 1, language: String? = nil) async throws -> [Media] {
        let lang = language ?? AppTheme.shared.tmdbLanguageCode
        
        // Use centralized TMDB proxy which handles "Latest" logic robustly (Provider + Network filtering)
        // allowing new releases like "Run Away" (Netflix) to appear immediately.
        let endpoint = "\(proxyBaseURL)?type=series&filter=last&page=\(page)&language=\(lang)"
        
        print("🆕 [TMDBService] Fetching latest series via proxy: \(endpoint)")
        
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .series) }
    }
    
    // MARK: - Movies by Provider
    
    // MARK: - Movies by Provider
    
    func fetchMoviesByProvider(providerId: Int, page: Int = 1, language: String = "fr-FR", region: String = "FR") async throws -> [Media] {
        let endpoint = "\(baseURL)/discover/movie?api_key=\(apiKey)&language=\(language)&page=\(page)&with_watch_providers=\(providerId)&watch_region=\(region)&sort_by=primary_release_date.desc&with_watch_monetization_types=flatrate"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .movie) }
    }
    
    // MARK: - Series by Provider
    
    func fetchSeriesByProvider(providerId: Int, page: Int = 1, language: String = "fr-FR", region: String = "FR") async throws -> [Media] {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayStr = dateFormatter.string(from: Date())
        
        let endpoint = "\(baseURL)/discover/tv?api_key=\(apiKey)&language=\(language)&page=\(page)&with_watch_providers=\(providerId)&watch_region=\(region)&sort_by=first_air_date.desc&first_air_date.lte=\(todayStr)&with_watch_monetization_types=flatrate"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .series) }
    }
    
    // MARK: - Movies by Genre
    
    func fetchMoviesByGenre(genreId: Int, page: Int = 1, language: String = "fr-FR") async throws -> [Media] {
        // Special handling for Science Fiction (878) to match web logic
        if genreId == 878 {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let todayStr = dateFormatter.string(from: Date())
            
            let endpoint = "\(baseURL)/discover/movie?api_key=\(apiKey)&language=\(language)&page=\(page)&with_genres=\(genreId)&sort_by=primary_release_date.desc&primary_release_date.lte=\(todayStr)&with_watch_monetization_types=flatrate&watch_region=FR"
            let response: TMDBResponse = try await fetch(from: endpoint)
            return response.results.map { $0.toMedia(mediaType: .movie) }
        }
        
        // Default behavior for other genres (Popularity sort)
        let endpoint = "\(baseURL)/discover/movie?api_key=\(apiKey)&language=\(language)&page=\(page)&with_genres=\(genreId)"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .movie) }
    }
    
    // MARK: - Series by Genre
    
    func fetchSeriesByGenre(genreId: Int, page: Int = 1, language: String = "fr-FR") async throws -> [Media] {
        // Special handling for Sci-Fi & Fantasy (10765) to match web logic
        if genreId == 10765 {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let todayStr = dateFormatter.string(from: Date())
            
            let endpoint = "\(baseURL)/discover/tv?api_key=\(apiKey)&language=\(language)&page=\(page)&with_genres=\(genreId)&sort_by=first_air_date.desc&first_air_date.lte=\(todayStr)&with_watch_monetization_types=flatrate&watch_region=FR"
            let response: TMDBResponse = try await fetch(from: endpoint)
            return response.results.map { $0.toMedia(mediaType: .series) }
        }
        
        // Default behavior for other genres (Popularity sort)
        let endpoint = "\(baseURL)/discover/tv?api_key=\(apiKey)&language=\(language)&page=\(page)&with_genres=\(genreId)"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .series) }
    }
    
    // MARK: - Movies by Provider AND Genre
    
    func fetchMoviesByProviderAndGenre(providerId: Int, genreId: Int, page: Int = 1, language: String = "fr-FR", region: String = "FR") async throws -> [Media] {
        let endpoint = "\(baseURL)/discover/movie?api_key=\(apiKey)&language=\(language)&page=\(page)&with_watch_providers=\(providerId)&with_genres=\(genreId)&watch_region=\(region)&sort_by=primary_release_date.desc&with_watch_monetization_types=flatrate"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .movie) }
    }
    
    // MARK: - Series by Provider AND Genre
    
    func fetchSeriesByProviderAndGenre(providerId: Int, genreId: Int, page: Int = 1, language: String = "fr-FR", region: String = "FR") async throws -> [Media] {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayStr = dateFormatter.string(from: Date())
        
        let endpoint = "\(baseURL)/discover/tv?api_key=\(apiKey)&language=\(language)&page=\(page)&with_watch_providers=\(providerId)&with_genres=\(genreId)&watch_region=\(region)&sort_by=first_air_date.desc&first_air_date.lte=\(todayStr)&with_watch_monetization_types=flatrate"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .series) }
    }
    
    // MARK: - Similar Content
    
    func fetchSimilarMovies(movieId: Int, page: Int = 1, language: String = "fr-FR") async throws -> [Media] {
        let endpoint = "\(baseURL)/movie/\(movieId)/similar?api_key=\(apiKey)&language=\(language)&page=\(page)"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .movie) }
    }
    
    func fetchSimilarSeries(seriesId: Int, page: Int = 1, language: String = "fr-FR") async throws -> [Media] {
        let endpoint = "\(baseURL)/tv/\(seriesId)/similar?api_key=\(apiKey)&language=\(language)&page=\(page)"
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .series) }
    }
    
    // MARK: - Season Details (via Proxy)
    
    func fetchSeasonDetails(seriesId: Int, seasonNumber: Int, language: String = "fr-FR") async throws -> SeasonDetails {
        // Use centralized TMDB proxy - handles virtual seasons, sequential numbering, and generic name fallback
        // Add timestamp to force fresh fetch (bust cache)
        let endpoint = "\(proxyBaseURL)?type=season&seriesId=\(seriesId)&seasonNumber=\(seasonNumber)&language=\(language)&_t=\(Date().timeIntervalSince1970)"
        print("📺 [TMDBService] Fetching season via proxy: \(endpoint)")
        return try await fetch(from: endpoint)
    }
    
    // MARK: - Media Details
    
    func fetchMovieDetails(movieId: Int, language: String = "fr-FR") async throws -> MovieDetail {
        let endpoint = "\(baseURL)/movie/\(movieId)?api_key=\(apiKey)&language=\(language)&append_to_response=external_ids,credits"
        return try await fetch(from: endpoint)
    }
    
    func fetchSeriesDetails(seriesId: Int, language: String = "fr-FR") async throws -> SeriesDetail {
        // Use centralized TMDB proxy - handles Episode Groups and virtual seasons
        let endpoint = "\(proxyBaseURL)?type=series&id=\(seriesId)&language=\(language)"
        print("🎬 [TMDBService] Fetching series via proxy: \(endpoint)")
        return try await fetch(from: endpoint)
    }    
    // MARK: - Videos (Trailers)
    
    func fetchVideos(mediaId: Int, type: Media.MediaType, language: String = "fr-FR") async throws -> [Video] {
        let typePath = type == .movie ? "movie" : "tv"
        // Try to get French videos first
        let endpoint = "\(baseURL)/\(typePath)/\(mediaId)/videos?api_key=\(apiKey)&language=\(language)"
        let response: VideoResponse = try await fetch(from: endpoint)
        
        // If no videos found in French, try English
        if response.results.isEmpty && language != "en-US" {
            let enEndpoint = "\(baseURL)/\(typePath)/\(mediaId)/videos?api_key=\(apiKey)&language=en-US"
            let enResponse: VideoResponse = try await fetch(from: enEndpoint)
            return enResponse.results
        }
        
        return response.results
    }
    
    func fetchSeasonVideos(seriesId: Int, seasonNumber: Int, language: String = "fr-FR") async throws -> [Video] {
        // Try to get French videos first
        let endpoint = "\(baseURL)/tv/\(seriesId)/season/\(seasonNumber)/videos?api_key=\(apiKey)&language=\(language)"
        
        do {
            let response: VideoResponse = try await fetch(from: endpoint)
            
            // If no videos found in French, try English
            if response.results.isEmpty && language != "en-US" {
                let enEndpoint = "\(baseURL)/tv/\(seriesId)/season/\(seasonNumber)/videos?api_key=\(apiKey)&language=en-US"
                let enResponse: VideoResponse = try await fetch(from: enEndpoint)
                return enResponse.results
            }
            
            return response.results
        } catch {
            // If videos fail (e.g. 404 Not Found for season), just return empty list to avoid breaking the whole page
            print("⚠️ [TMDBService] Failed to fetch season videos (harmless): \(error)")
            return []
        }
    }
    
    // MARK: - Helper
    
    private func fetch<T: Codable>(from urlString: String) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        
        let decoder = JSONDecoder()
        
        do {
            let decoded = try decoder.decode(T.self, from: data)
            return decoded
        } catch {
            if let jsonString = String(data: data, encoding: .utf8) {
                print("❌ [TMDBService] Decoding error for URL: \(urlString)")
                print("📄 Raw JSON: \(jsonString)")
            } else {
                print("❌ [TMDBService] Decoding error: Could not convert data to string")
            }
            throw error
        }
    }
}
