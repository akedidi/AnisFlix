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
        let endpoint = "\(baseURL)/movie/now_playing?api_key=\(apiKey)&language=\(lang)&page=\(page)"
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
        
        let today = Date()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayStr = dateFormatter.string(from: today)
        
        // Define regions and their providers
        // US Providers: Netflix(8), Amazon(9), Disney+(337), AppleTV+(350), HBO(384|1899), Hulu(15), Peacock(386), Paramount+(531)
        let usProviders = "8|9|337|350|384|1899|15|386|531"
        
        // GB Providers: Netflix(8), Amazon(9), Disney+(337), BBC iPlayer(38), ITVX(41), Channel 4(103), Now TV(39), Sky Go(29), AppleTV+(350)
        let gbProviders = "8|9|337|38|41|103|39|29|350"
        
        // FR Providers: Netflix(8), Amazon FR(119), Disney+(337), Canal+(381), Crunchyroll(283), AppleTV+(350)
        let frProviders = "8|119|337|381|283|350"
        
        let regions = [
            ("US", usProviders),
            ("GB", gbProviders),
            ("FR", frProviders)
        ]
        
        // Use TaskGroup to fetch from all regions in parallel
        var allResults: [TMDBMedia] = []
        
        try await withThrowingTaskGroup(of: TMDBResponse.self) { group in
            for (region, providers) in regions {
                let endpoint = "\(baseURL)/discover/tv?api_key=\(apiKey)&language=\(lang)&page=\(page)&sort_by=first_air_date.desc&include_adult=false&include_null_first_air_dates=false&first_air_date.lte=\(todayStr)&with_watch_providers=\(providers)&watch_region=\(region)&with_watch_monetization_types=flatrate"
                
                group.addTask {
                    return try await self.fetch(from: endpoint)
                }
            }
            
            for try await response in group {
                allResults.append(contentsOf: response.results)
            }
        }
        
        // Deduplicate results based on ID
        var seenIds = Set<Int>()
        let uniqueResults = allResults.filter { media in
            if seenIds.contains(media.id) {
                return false
            } else {
                seenIds.insert(media.id)
                return true
            }
        }
        
        // Sort by date descending (merging might break order)
        let sortedResults = uniqueResults.sorted { m1, m2 in
            guard let d1 = m1.firstAirDate, let d2 = m2.firstAirDate else { return false }
            return d1 > d2
        }
        
        return sortedResults.map { $0.toMedia(mediaType: .series) }
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
    
    // MARK: - Season Details
    
    func fetchSeasonDetails(seriesId: Int, seasonNumber: Int, language: String = "fr-FR") async throws -> SeasonDetails {
        let endpoint = "\(baseURL)/tv/\(seriesId)/season/\(seasonNumber)?api_key=\(apiKey)&language=\(language)"
        return try await fetch(from: endpoint)
    }
    
    // MARK: - Media Details
    
    func fetchMovieDetails(movieId: Int, language: String = "fr-FR") async throws -> MovieDetail {
        let endpoint = "\(baseURL)/movie/\(movieId)?api_key=\(apiKey)&language=\(language)&append_to_response=external_ids,credits"
        return try await fetch(from: endpoint)
    }
    
    func fetchSeriesDetails(seriesId: Int, language: String = "fr-FR") async throws -> SeriesDetail {
        let endpoint = "\(baseURL)/tv/\(seriesId)?api_key=\(apiKey)&language=\(language)&append_to_response=external_ids,credits"
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
    
    // MARK: - Helper
    
    private func fetch<T: Codable>(from urlString: String) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        

        
        let (data, response) = try await URLSession.shared.data(from: url)
        

        

        
        let decoder = JSONDecoder()
        // CodingKeys are explicitly defined in models, no need for strategy
        
        let decoded = try decoder.decode(T.self, from: data)

        
        return decoded
    }
}
