//
//  Media.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import Foundation

/// Modèle pour un média (film ou série)
struct Media: Identifiable, Codable, Hashable {
    let id: Int
    let title: String
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let rating: Double?
    let year: String?
    let mediaType: MediaType
    let voteCount: Int?
    let originalLanguage: String?
    let releaseDate: String?
    
    enum MediaType: String, Codable, Hashable {
        case movie = "movie"
        case series = "tv"
    }
    
    var posterURL: URL? {
        guard let path = posterPath, !path.isEmpty else { return nil }
        return URL(string: "https://image.tmdb.org/t/p/w500\(path)")
    }
    
    var backdropURL: URL? {
        guard let path = backdropPath, !path.isEmpty else { return nil }
        return URL(string: "https://image.tmdb.org/t/p/w1280\(path)")
    }
}

/// Réponse de l'API TMDB
struct TMDBResponse: Codable {
    let results: [TMDBMedia]
    let page: Int
    let totalPages: Int?
    let totalResults: Int?
    
    private enum CodingKeys: String, CodingKey {
        case results, page
        case totalPages = "total_pages"
        case totalResults = "total_results"
    }
}

/// Média brut de TMDB (avant transformation)
struct TMDBMedia: Codable {
    let id: Int
    let title: String?
    let name: String?
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let voteAverage: Double?
    let releaseDate: String?
    let firstAirDate: String?
    let voteCount: Int?
    let originalLanguage: String?
    let mediaType: String?
    
    private enum CodingKeys: String, CodingKey {
        case id
        case title
        case name
        case overview
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case voteAverage = "vote_average"
        case releaseDate = "release_date"
        case firstAirDate = "first_air_date"
        case voteCount = "vote_count"
        case originalLanguage = "original_language"
        case mediaType = "media_type"
    }
    
    /// Convertir en Media
    func toMedia(mediaType: Media.MediaType) -> Media {
        let displayTitle = title ?? name ?? "Sans titre"
        let date = releaseDate ?? firstAirDate ?? ""
        let year = date.isEmpty ? "" : String(date.prefix(4))
        

        
        return Media(
            id: id,
            title: displayTitle,
            overview: overview,
            posterPath: posterPath,
            backdropPath: backdropPath,
            rating: voteAverage,
            year: year,
            mediaType: mediaType,
            voteCount: voteCount,
            originalLanguage: originalLanguage,
            releaseDate: date
        )
    }
}

// MARK: - New Models for Detail Pages

struct MovieDetail: Codable {
    let id: Int
    let title: String
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let releaseDate: String?
    let voteAverage: Double
    let voteCount: Int
    let runtime: Int
    let genres: [Genre]
    let externalIds: ExternalIds?
    let credits: Credits?
    
    struct Genre: Codable, Identifiable {
        let id: Int
        let name: String
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, title, overview, runtime, genres
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case releaseDate = "release_date"
        case voteAverage = "vote_average"
        case voteCount = "vote_count"
        case externalIds = "external_ids"
        case credits
    }
}

struct SeriesDetail: Codable {
    let id: Int
    let name: String
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let firstAirDate: String?
    let voteAverage: Double
    var numberOfSeasons: Int
    let numberOfEpisodes: Int
    let genres: [Genre]
    let externalIds: ExternalIds?
    var seasons: [SeasonSummary]?
    let episodeGroups: EpisodeGroups?
    
    struct Genre: Codable, Identifiable {
        let id: Int
        let name: String
    }
    
    struct SeasonSummary: Codable, Identifiable {
        let id: Int
        let name: String
        let overview: String?
        let seasonNumber: Int
        let episodeCount: Int
        let posterPath: String?
        
        private enum CodingKeys: String, CodingKey {
            case id, name, overview
            case seasonNumber = "season_number"
            case episodeCount = "episode_count"
            case posterPath = "poster_path"
        }
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, name, overview, genres
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case firstAirDate = "first_air_date"
        case voteAverage = "vote_average"
        case numberOfSeasons = "number_of_seasons"
        case numberOfEpisodes = "number_of_episodes"
        case externalIds = "external_ids"
        case credits
        case seasons
        case episodeGroups = "episode_groups"
    }
    
    let credits: Credits?
}

struct Credits: Codable {
    let cast: [CastMember]
}

struct CastMember: Codable, Identifiable {
    let id: Int
    let name: String
    let character: String
    let profilePath: String?
    
    private enum CodingKeys: String, CodingKey {
        case id, name, character
        case profilePath = "profile_path"
    }
}

struct ExternalIds: Codable {
    let imdbId: String?
    
    private enum CodingKeys: String, CodingKey {
        case imdbId = "imdb_id"
    }
}

// MARK: - Episode Groups Models

struct EpisodeGroups: Codable {
    let results: [EpisodeGroup]
}

struct EpisodeGroup: Codable {
    let id: String
    let name: String
    let order: Int?
    let type: Int
}

struct EpisodeGroupDetails: Codable {
    let id: String
    let name: String
    let groups: [EpisodeGroupSeason]
}

struct EpisodeGroupSeason: Codable {
    let id: String
    let name: String
    let order: Int
    let episodes: [Episode]
}

extension MovieDetail {
    var formattedDuration: String {
        let hours = runtime / 60
        let minutes = runtime % 60
        return "\(hours)h \(String(format: "%02d", minutes))"
    }
}

struct SeasonDetails: Codable {
    let id: Int
    let name: String
    let overview: String?
    let posterPath: String?
    let seasonNumber: Int
    let episodes: [Episode]
    
    private enum CodingKeys: String, CodingKey {
        case id, name, overview
        case posterPath = "poster_path"
        case seasonNumber = "season_number"
        case episodes
    }
}

struct Episode: Codable, Identifiable {
    let id: Int
    let name: String
    let overview: String?
    let stillPath: String?
    let episodeNumber: Int
    let seasonNumber: Int
    let airDate: String?
    let voteAverage: Double?
    let originalName: String?
    let runtime: Int?
    
    private enum CodingKeys: String, CodingKey {
        case id, name, overview
        case stillPath = "still_path"
        case episodeNumber = "episode_number"
        case seasonNumber = "season_number"
        case airDate = "air_date"
        case voteAverage = "vote_average"
        case originalName = "original_name"
        case runtime
    }
    
    var stillURL: URL? {
        guard let path = stillPath, !path.isEmpty else { return nil }
        return URL(string: "https://image.tmdb.org/t/p/w500\(path)")
    }
}

struct VideoResponse: Codable {
    let id: Int
    let results: [Video]
}

struct Video: Codable, Identifiable {
    let id: String
    let key: String
    let name: String
    let site: String
    let type: String
    let official: Bool
    
    var youtubeURL: URL? {
        guard site == "YouTube" else { return nil }
        return URL(string: "https://www.youtube.com/watch?v=\(key)")
    }
}
