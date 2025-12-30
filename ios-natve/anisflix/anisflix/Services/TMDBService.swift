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
    
    // Cache for requests of "Virtual Seasons" (from Episode Groups)
    // Key: "{seriesId}_{seasonNumber}"
    private var virtualSeasonsCache: [String: SeasonDetails] = [:]
    
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
        
        // Latest series from major providers, sorted by release date
        // Major Providers: Netflix(8), Amazon FR(119), Disney+(337), Canal+(381), Crunchyroll(283), AppleTV+(350), HBO(1899)
        let majorProviders = "8|119|337|381|283|350|1899"
        let watchRegion = "FR"
        
        let endpoint = "\(baseURL)/discover/tv?api_key=\(apiKey)&language=\(lang)&page=\(page)&sort_by=first_air_date.desc&include_adult=false&include_null_first_air_dates=false&first_air_date.lte=\(todayStr)&with_watch_providers=\(majorProviders)&watch_region=\(watchRegion)&with_watch_monetization_types=flatrate"
        
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
    
    // MARK: - Season Details
    
    func fetchSeasonDetails(seriesId: Int, seasonNumber: Int, language: String = "fr-FR") async throws -> SeasonDetails {
        // Check cache first
        let cacheKey = "\(seriesId)_\(seasonNumber)"
        if let cached = virtualSeasonsCache[cacheKey] {
            print("⚡️ [TMDBService] Returning cached virtual season \(seasonNumber) for series \(seriesId)")
            return cached
        }
        
        let endpoint = "\(baseURL)/tv/\(seriesId)/season/\(seasonNumber)?api_key=\(apiKey)&language=\(language)"
        let frData: SeasonDetails = try await fetch(from: endpoint)
        
        // Check for generic episode names in the response
        // Regex: starts with Episode/Épisode/Episodio followed by a number
        let pattern = "^(Episode|Épisode|Episodio) \\d+$"
        
        let hasGenericNames = frData.episodes.contains { episode in
            return episode.name.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil ||
                   episode.name == "Episode \(episode.episodeNumber)"
        }
        
        if hasGenericNames {
            print("⚠️ [TMDBService] Generic names detected for season \(seasonNumber), fetching English fallback...")
            do {
                // Fetch English data
                let enEndpoint = "\(baseURL)/tv/\(seriesId)/season/\(seasonNumber)?api_key=\(apiKey)&language=en-US"
                let enData: SeasonDetails = try await fetch(from: enEndpoint)
                
                // Merge English names where French ones are generic
                let updatedEpisodes = frData.episodes.map { frEp -> Episode in
                    let isGeneric = frEp.name.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil ||
                                    frEp.name == "Episode \(frEp.episodeNumber)"
                    
                    if isGeneric {
                        if let enEp = enData.episodes.first(where: { $0.id == frEp.id }) {
                            print("✅ [TMDBService] Replaced generic \"\(frEp.name)\" with \"\(enEp.name)\"")
                            // Inject English name as originalName and use it as name
                            return Episode(
                                id: frEp.id,
                                name: enEp.name,
                                overview: frEp.overview,
                                stillPath: frEp.stillPath,
                                episodeNumber: frEp.episodeNumber,
                                seasonNumber: frEp.seasonNumber,
                                airDate: frEp.airDate,
                                voteAverage: frEp.voteAverage,
                                originalName: enEp.name // Use EN name as originalName too
                            )
                        }
                    }
                    return frEp
                }
                
                return SeasonDetails(
                    id: frData.id,
                    name: frData.name,
                    overview: frData.overview,
                    posterPath: frData.posterPath,
                    seasonNumber: frData.seasonNumber,
                    episodes: updatedEpisodes
                )
                
            } catch {
                print("❌ [TMDBService] Failed to fetch English fallback: \(error)")
            }
        }
        
        return frData
    }
    
    // MARK: - Media Details
    
    func fetchMovieDetails(movieId: Int, language: String = "fr-FR") async throws -> MovieDetail {
        let endpoint = "\(baseURL)/movie/\(movieId)?api_key=\(apiKey)&language=\(language)&append_to_response=external_ids,credits"
        return try await fetch(from: endpoint)
    }
    
    func fetchSeriesDetails(seriesId: Int, language: String = "fr-FR") async throws -> SeriesDetail {
        let endpoint = "\(baseURL)/tv/\(seriesId)?api_key=\(apiKey)&language=\(language)&append_to_response=external_ids,credits,episode_groups"
        var detail: SeriesDetail = try await fetch(from: endpoint)
        
        // Check for "Seasons" Episode Group (Type 6 usually, or name "Seasons")
        if let groups = detail.episodeGroups?.results,
           let seasonsGroup = groups.first(where: { $0.type == 6 || $0.name == "Seasons" }) {
            
            print("✅ [TMDBService] Found 'Seasons' episode group: \(seasonsGroup.name) (ID: \(seasonsGroup.id))")
            
            do {
                // Fetch group details
                let groupDetails = try await fetchEpisodeGroupDetails(groupId: seasonsGroup.id)
                var newSeasons: [SeriesDetail.SeasonSummary] = []
                
                for group in groupDetails.groups {
                    // Create SeasonSummary
                    // Assuming group.order is the season number
                    let summary = SeriesDetail.SeasonSummary(
                        id: Int(group.id) ?? 0, // group.id is String, SeasonSummary expects Int... fallback
                        name: group.name,
                        overview: nil,
                        seasonNumber: group.order,
                        episodeCount: group.episodes.count,
                        posterPath: detail.posterPath // Groups usually don't have posters, inherit from series
                    )
                    newSeasons.append(summary)
                    
                    // Hydrate Cache for this season
                    let seasonNumber = group.order
                    let cacheKey = "\(seriesId)_\(seasonNumber)"
                    
                    // Map episodes to proper Episode struct
                    // IMPORTANT: Overwrite seasonNumber to make sure it matches the virtual season
                    let mappedEpisodes = group.episodes.map { ep -> Episode in
                        Episode(
                            id: ep.id,
                            name: ep.name,
                            overview: ep.overview,
                            stillPath: ep.stillPath,
                            episodeNumber: ep.episodeNumber,
                            seasonNumber: seasonNumber, // Force virtual season number
                            airDate: ep.airDate,
                            voteAverage: ep.voteAverage,
                            originalName: ep.originalName
                        )
                    }
                    
                    let seasonDetails = SeasonDetails(
                        id: Int(group.id) ?? 0,
                        name: group.name,
                        overview: nil,
                        posterPath: detail.posterPath,
                        seasonNumber: seasonNumber,
                        episodes: mappedEpisodes
                    )
                    
                    virtualSeasonsCache[cacheKey] = seasonDetails
                    print("💧 [TMDBService] Hydrated cache for Virtual Season \(seasonNumber)")
                }
                
                // Update series details with new seasons
                detail.seasons = newSeasons
                detail.numberOfSeasons = newSeasons.count
                print("✨ [TMDBService] Updated series with \(newSeasons.count) virtual seasons")
                
            } catch {
                print("❌ [TMDBService] Failed to fetch episode group details: \(error)")
            }
        }
        
        return detail
    }
    
    func fetchEpisodeGroupDetails(groupId: String) async throws -> EpisodeGroupDetails {
        let endpoint = "\(baseURL)/tv/episode_group/\(groupId)?api_key=\(apiKey)&language=fr-FR"
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
        let response: VideoResponse = try await fetch(from: endpoint)
        
        // If no videos found in French, try English
        if response.results.isEmpty && language != "en-US" {
            let enEndpoint = "\(baseURL)/tv/\(seriesId)/season/\(seasonNumber)/videos?api_key=\(apiKey)&language=en-US"
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
