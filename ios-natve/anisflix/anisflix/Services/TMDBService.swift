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
    
    // MARK: - Movies by Provider
    
    func fetchMoviesByProvider(providerId: Int, page: Int = 1, language: String = "fr-FR", region: String = "FR") async throws -> [Media] {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayStr = dateFormatter.string(from: Date())
        
        // MATCHING WEB LOGIC: sort_by 'release_date.desc' + filter future releases (lte today)
        let endpoint = "\(baseURL)/discover/movie?api_key=\(apiKey)&language=\(language)&page=\(page)&with_watch_providers=\(providerId)&watch_region=\(region)&sort_by=release_date.desc&release_date.lte=\(todayStr)&with_watch_monetization_types=flatrate"
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
    
    func fetchMoviesByGenre(genreId: Int, page: Int = 1, language: String = "fr-FR", sortBy: String? = nil) async throws -> [Media] {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayStr = dateFormatter.string(from: Date())
        
        // Special handling for Science Fiction (878) to match web logic
        if genreId == 878 {
            let endpoint = "\(baseURL)/discover/movie?api_key=\(apiKey)&language=\(language)&page=\(page)&with_genres=\(genreId)&sort_by=primary_release_date.desc&primary_release_date.lte=\(todayStr)&with_watch_monetization_types=flatrate&watch_region=FR"
            let response: TMDBResponse = try await fetch(from: endpoint)
            return response.results.map { $0.toMedia(mediaType: .movie) }
        }
        
        var endpoint = "\(baseURL)/discover/movie?api_key=\(apiKey)&language=\(language)&page=\(page)&with_genres=\(genreId)"
        
        if let sortBy = sortBy {
            endpoint += "&sort_by=\(sortBy)"
            // If sorting by release date, filter out future releases
            if sortBy.contains("release_date") {
                endpoint += "&primary_release_date.lte=\(todayStr)"
            }
        }
        
        // Default behavior (Popularity sort if sortBy is nil)
        let response: TMDBResponse = try await fetch(from: endpoint)
        return response.results.map { $0.toMedia(mediaType: .movie) }
    }
    
    // MARK: - Series by Genre
    
    func fetchSeriesByGenre(genreId: Int, page: Int = 1, language: String = "fr-FR", sortBy: String? = nil) async throws -> [Media] {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayStr = dateFormatter.string(from: Date())
        
        // Special handling for Sci-Fi & Fantasy (10765) to match web logic
        if genreId == 10765 {
            let endpoint = "\(baseURL)/discover/tv?api_key=\(apiKey)&language=\(language)&page=\(page)&with_genres=\(genreId)&sort_by=first_air_date.desc&first_air_date.lte=\(todayStr)&with_watch_monetization_types=flatrate&watch_region=FR"
            let response: TMDBResponse = try await fetch(from: endpoint)
            return response.results.map { $0.toMedia(mediaType: .series) }
        }
        
        var endpoint = "\(baseURL)/discover/tv?api_key=\(apiKey)&language=\(language)&page=\(page)&with_genres=\(genreId)"
        
        if let sortBy = sortBy {
            endpoint += "&sort_by=\(sortBy)"
            // If sorting by air date, filter out future releases
            if sortBy.contains("first_air_date") {
                endpoint += "&first_air_date.lte=\(todayStr)"
            }
        }
        
        // Default behavior (Popularity sort if sortBy is nil)
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
        let endpoint = "\(baseURL)/movie/\(movieId)?api_key=\(apiKey)&language=\(language)&append_to_response=external_ids,credits,watch/providers"
        return try await fetch(from: endpoint)
    }
    
    func fetchSeriesDetails(seriesId: Int, language: String = "fr-FR") async throws -> SeriesDetail {
        // Use centralized TMDB proxy - handles Episode Groups and virtual seasons
        let endpoint = "\(proxyBaseURL)?type=series&id=\(seriesId)&language=\(language)"
        print("🎬 [TMDBService] Fetching series via proxy: \(endpoint)")
        return try await fetch(from: endpoint)
    }    
    func fetchSeriesWatchProviders(seriesId: Int) async throws -> WatchProvidersResponse {
        let endpoint = "\(baseURL)/tv/\(seriesId)/watch/providers?api_key=\(apiKey)"
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
        
        var request = URLRequest(url: url)
        // Add User-Agent and other headers to avoid Vercel "Security Checkpoint" block
        // Simulating a full browser request
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        // Vercel sometimes blocked requests without Referer or with empty Referer
        request.setValue("https://google.com", forHTTPHeaderField: "Referer")
        request.setValue("https://google.com", forHTTPHeaderField: "Origin")
        request.setValue("navigate", forHTTPHeaderField: "Sec-Fetch-Mode")
        request.setValue("none", forHTTPHeaderField: "Sec-Fetch-Site")
        request.setValue("document", forHTTPHeaderField: "Sec-Fetch-Dest")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
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
