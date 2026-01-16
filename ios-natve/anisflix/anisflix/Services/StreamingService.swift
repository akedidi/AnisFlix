//
//  StreamingService.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import Foundation

struct Subtitle: Identifiable, Codable, Equatable {
    var id: UUID
    let url: String
    let label: String
    let code: String
    let flag: String
    
    // CodingKeys to exclude id from decoding if it's not in JSON (it's generated)
    enum CodingKeys: String, CodingKey {
        case url, label, code, flag
    }
    
    var lang: String { code } // Backward compatibility
    
    init(url: String, label: String, code: String, flag: String) {
        self.id = UUID()
        self.url = url
        self.label = label
        self.code = code
        self.flag = flag
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        url = try container.decode(String.self, forKey: .url)
        label = try container.decode(String.self, forKey: .label)
        code = try container.decode(String.self, forKey: .code)
        flag = try container.decode(String.self, forKey: .flag)
        id = UUID()
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(url, forKey: .url)
        try container.encode(label, forKey: .label)
        try container.encode(code, forKey: .code)
        try container.encode(flag, forKey: .flag)
    }
}

struct StreamingSource: Identifiable, Codable {
    var id: String
    let url: String
    let quality: String
    let language: String
    let provider: String // Video host: "vidmoly", "vidzy", "darki", "unknown"
    let type: String // "hls", "mp4", etc.
    var origin: String? // Scraper/API origin: "fstream", "moviebox", "vixsrc", "tmdb", etc.
    var tracks: [Subtitle]? // Added tracks
    var headers: [String: String]? // Added custom headers support
    
    enum CodingKeys: String, CodingKey {
        case url = "decoded_url"
        case quality
        case language
        case tracks
        case headers
        // id is excluded
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        url = try container.decode(String.self, forKey: .url)
        quality = try container.decodeIfPresent(String.self, forKey: .quality) ?? "HD"
        let rawLanguage = try container.decodeIfPresent(String.self, forKey: .language) ?? "Français"
        tracks = try container.decodeIfPresent([Subtitle].self, forKey: .tracks)
        headers = try container.decodeIfPresent([String: String].self, forKey: .headers)
        
        // Normalize language (French -> VF, English -> VO, etc.)
        let langLower = rawLanguage.lowercased()
        if langLower.contains("french") || langLower.contains("français") || langLower == "fr" {
            language = "VF"
        } else if langLower.contains("english") || langLower == "en" || langLower == "eng" {
            language = "VO"
        } else if langLower.contains("vostfr") || langLower.contains("subtitle") {
            language = "VOSTFR"
        } else {
            language = "VF" // Default to VF
        }
        
        // Determine provider from quality string AND URL
        let lowerQuality = quality.lowercased()
        let lowerUrl = url.lowercased()
        
        if lowerQuality.contains("vidmoly") || lowerUrl.contains("vidmoly") {
            provider = "vidmoly"
        } else if lowerQuality.contains("vidzy") || lowerUrl.contains("vidzy") {
            provider = "vidzy"
        } else if lowerQuality.contains("darki") || lowerUrl.contains("darki") {
            provider = "darki"
        } else if lowerQuality.contains("moviebox") || lowerUrl.contains("moviebox") || (headers?["Referer"]?.contains("fmovies") ?? false) {
             provider = "moviebox"
        } else {
            provider = "unknown"
        }
        
        // Determine type
        if url.contains(".m3u8") {
            type = "hls"
        } else {
            type = "mp4"
        }
        
        // Generate stable ID
        id = "\(provider)_\(quality)_\(language)_\(url)".data(using: .utf8)?.base64EncodedString() ?? UUID().uuidString
    }
    
    // Init for preview/manual creation
    init(id: String? = nil, url: String, quality: String, type: String, provider: String, language: String, origin: String? = nil, tracks: [Subtitle]? = nil, headers: [String: String]? = nil) {
        self.url = url
        self.quality = quality
        self.type = type
        self.provider = provider
        self.language = language
        self.origin = origin
        self.tracks = tracks
        self.headers = headers
        
        if let providedId = id {
            self.id = providedId
        } else {
            self.id = "\(provider)_\(quality)_\(language)_\(url)".data(using: .utf8)?.base64EncodedString() ?? UUID().uuidString
        }
    }

    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(url, forKey: .url)
        try container.encode(quality, forKey: .quality)
        try container.encode(language, forKey: .language)
        try container.encodeIfPresent(tracks, forKey: .tracks)
        try container.encodeIfPresent(headers, forKey: .headers)
    }
}



struct MovixTmdbResponse: Codable {
    let player_links: [StreamingSource]?
}

// For TV series, API returns player_links inside current_episode
struct MovixTmdbSeriesResponse: Codable {
    let current_episode: MovixCurrentEpisode?
    let player_links: [StreamingSource]? // Fallback for direct player_links
}

struct MovixCurrentEpisode: Codable {
    let season_number: Int?
    let episode_number: Int?
    let title: String?
    let player_links: [StreamingSource]?
}

struct FStreamPlayer: Codable {
    let url: String
    let type: String
    let quality: String
    let player: String
}

struct FStreamResponse: Codable {
    let players: [String: [FStreamPlayer]]?
}

struct UniversalVOResponse: Codable {
    let files: [UniversalVOFile]?
    // errors field removed to prevent decoding failures if error objects structure changes
}

struct UniversalVOFile: Codable {
    let file: String
    let type: String
    let lang: String?
    let quality: String?
    let extractor: String?
    let provider: String?
}

struct UniversalVOError: Codable {
    let provider: String
    let message: String
}

// MARK: - AfterDark Response Structures
struct AfterDarkResponse: Codable {
    let sources: [AfterDarkSource]?
}

struct AfterDarkSource: Codable {
    let url: String
    let quality: String?
    let kind: String?
    let server: String?
    let name: String?
    let proxied: Bool?
    let language: String?
    
    enum CodingKeys: String, CodingKey {
        case url = "file" // Map JSON 'file' to 'url'
        case quality, kind, server, name, proxied, language
    }
}

// MARK: - Cinepro Response Structures
struct CineproResponse: Codable {
    let success: Bool?
    let streams: [CineproStream]?
}

struct CineproStream: Codable {
    let server: String?
    let link: String
    let type: String?
    let quality: String?
    let lang: String?
}

// MARK: - Cpasmal Response Structures
struct CpasmalResponse: Codable {
    let success: Bool?
    let sources: [CpasmalSource]?
    let count: Int?
    let title: String?
    let year: String?
}

struct CpasmalSource: Codable {
    let url: String
    let quality: String?
    let type: String?
    let provider: String?
    let language: String?
    let server: String?
}

// MARK: - Movix Download Response Structures (for TMDB ID matching)
struct MovixSearchResult: Codable {
    let id: Int
    let name: String?
    let tmdb_id: Int?
    let type: String?
}

struct MovixSearchResponse: Codable {
    let results: [MovixSearchResult]?
}

struct MovixDownloadSource: Codable {
    let src: String?
    let language: String?
    let quality: String?
    let m3u8: String?
    let label: String?
}

struct MovixDownloadResponse: Codable {
    let sources: [MovixDownloadSource]?
}

// MARK: - Movix Anime Structures (Added for Anime Support)

struct MovixAnimeResponse: Codable {
    // Top level is array of Anime
    // We don't have a wrapper, so we'll decode directly as [MovixAnime]
}

struct MovixAnime: Codable {
    let name: String
    let seasons: [MovixAnimeSeason]?
}

struct MovixAnimeSeason: Codable {
    let name: String
    let index: Int?
    let episodes: [MovixAnimeEpisode]?
}

struct MovixAnimeEpisode: Codable {
    let name: String
    let index: Int?
    let streaming_links: [MovixAnimePlayer]?
}

struct MovixAnimePlayer: Codable {
    let language: String
    let players: [String]?
}

class StreamingService {
    static let shared = StreamingService()
    private init() {}
    
    private let baseUrl = "https://anisflix.vercel.app"
    
    // MARK: - Fetch Sources
    
    func fetchSources(movieId: Int) async throws -> [StreamingSource] {
        // Fetch from all endpoints concurrently
        async let tmdbSources = fetchTmdbSources(movieId: movieId)
        async let fstreamSources = fetchFStreamSources(movieId: movieId)
        async let vixsrcSources = fetchVixsrcSources(tmdbId: movieId, type: "movie")
        // DISABLED: UniversalVO API is broken
        // async let universalVOSources = fetchUniversalVOSources(tmdbId: movieId, type: "movie")
        async let movieBoxSources = fetchMovieBoxSources(tmdbId: movieId)
        async let fourKHDHubSources = fetchFourKHDHubSources(tmdbId: movieId, type: "movie")
        async let cineproSources = fetchCineproSources(tmdbId: movieId)
        async let wiflixSources = fetchWiflixSources(tmdbId: movieId)
        async let tmdbProxySources = fetchTmdbProxySources(tmdbId: movieId)

        
        // Anime Placeholder
        var animeTask: Task<[StreamingSource], Error>? = nil
        
        print("🔍 [StreamingService] Starting fetch for movie ID: \(movieId)")
        
        // Fetch TMDB info for AfterDark and Movix Download (needs title)
        let tmdbInfo = try? await fetchMovieTmdbInfo(movieId: movieId)
        var afterDarkSources: [StreamingSource] = []
        var movixDownloadSources: [StreamingSource] = []
        
        if let title = tmdbInfo?.title {
            print("ℹ️ [StreamingService] TMDB Info found: \(title) (\(tmdbInfo?.year ?? "?"))")
            
            // DISABLED: AfterDark sources
            // if let year = tmdbInfo?.year {
            //     afterDarkSources = (try? await fetchAfterDarkSources(
            //         tmdbId: movieId,
            //         type: "movie",
            //         title: title,
            //         year: year,
            //         originalTitle: tmdbInfo?.originalTitle
            //     )) ?? []
            // }
            
            // Fetch Movix Download sources (TMDB ID matching)
            movixDownloadSources = (try? await fetchMovixDownloadSources(
                tmdbId: movieId,
                type: "movie",
                title: title
            )) ?? []
            
            // Check for Animation Genre (16)
            if tmdbInfo?.genreIds.contains(16) == true {
                print("🎌 [StreamingService] Animation genre detected for Movie. Fetching AnimeAPI...")
                animeTask = Task {
                    return try await fetchAnimeAPISources(tmdbId: movieId, isMovie: true)
                }
            }
        } else {
             print("⚠️ [StreamingService] TMDB Info fetch failed for movie ID: \(movieId)")
        }
        
        // DISABLED: UniversalVO API is broken - removed from tuple
        let (tmdb, fstream, vixsrc, mBox, hub4k, cinepro, wiflix, tmdbProxy) = await (try? tmdbSources, try? fstreamSources, try? vixsrcSources, try? movieBoxSources, try? fourKHDHubSources, try? cineproSources, try? wiflixSources, try? tmdbProxySources)
        let animeSources = await (try? animeTask?.value) ?? []
        
        print("📊 [StreamingService] Sources fetched:")
        print("   - TMDB: \(tmdb?.count ?? 0)")
        print("   - FStream: \(fstream?.count ?? 0)")
        print("   - Vixsrc: \(vixsrc?.count ?? 0)")
        // print("   - UniversalVO: \(universalVO?.count ?? 0)") // DISABLED
        print("   - MovieBox: \(mBox?.count ?? 0)")
        print("   - 4KHDHub: \(hub4k?.count ?? 0)")
        print("   - Cinepro: \(cinepro?.count ?? 0)")
        print("   - Wiflix: \(wiflix?.count ?? 0)")
        print("   - TMDB Proxy: \(tmdbProxy?.count ?? 0)")
        print("   - AfterDark: \(afterDarkSources.count)")
        print("   - Movix Download: \(movixDownloadSources.count)")
        
        var allSources: [StreamingSource] = []
        
        // Add Cinepro/MegaCDN sources FIRST (highest priority for VO)
        if let cinepro = cinepro {
            allSources.append(contentsOf: cinepro)
        }
        
        // Add Wiflix sources (Luluvid)
        if let wiflix = wiflix {
            allSources.append(contentsOf: wiflix)
        }
        
        // Add TMDB sources (includes Vidzy)
        if let tmdb = tmdb {
            allSources.append(contentsOf: tmdb)
        }
        
        // Add MovieBox sources (High quality VO)
        if let mBox = mBox {
            allSources.append(contentsOf: mBox)
        }
        
        // Add Movix/Darkibox Download sources
        allSources.append(contentsOf: movixDownloadSources)
        
        // DISABLED: UniversalVO API is broken
        // if let universalVO = universalVO {
        //     allSources.append(contentsOf: universalVO)
        // }
        
        // Add AfterDark sources
        // DISABLED: allSources.append(contentsOf: afterDarkSources)
        
        if let vixsrc = vixsrc {
            allSources.append(contentsOf: vixsrc)
        }
        
        if let fstream = fstream {
            allSources.append(contentsOf: fstream)
        }
        
        // Add AnimeAPI sources
        if !animeSources.isEmpty {
            allSources.append(contentsOf: animeSources)
        }
        
        // Add 4KHDHub sources (lower priority)
        if let hub4k = hub4k {
            allSources.append(contentsOf: hub4k)
        }
        
        // Add TMDB Proxy sources (Luluvid)
        if let tmdbProxy = tmdbProxy {
            allSources.append(contentsOf: tmdbProxy)
        }
        
        // Filter for allowed providers
        return allSources.filter { $0.provider == "vidmoly" || $0.provider == "vidzy" || $0.provider == "vixsrc" || $0.provider == "primewire" || $0.provider == "2embed" || $0.provider == "afterdark" || $0.provider == "movix" || $0.provider == "darkibox" || $0.provider == "animeapi" || $0.provider == "moviebox" || $0.provider == "4khdhub" || $0.provider == "megacdn" || $0.provider == "premilkyway" || $0.provider == "luluvid" }
    }
    
    private func fetchTmdbSources(movieId: Int) async throws -> [StreamingSource] {
        let urlString = "\(baseUrl)/api/movix-proxy?path=tmdb/movie/\(movieId)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let decoded = try JSONDecoder().decode(MovixTmdbResponse.self, from: data)
        return decoded.player_links ?? []
    }
    
    private func fetchFStreamSources(movieId: Int) async throws -> [StreamingSource] {
        let urlString = "\(baseUrl)/api/movix-proxy?path=fstream/movie/\(movieId)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let decoded = try JSONDecoder().decode(FStreamResponse.self, from: data)
        var sources: [StreamingSource] = []
        
        if let players = decoded.players {
            for (key, playerList) in players {
                for player in playerList {
                    // Map keys to language expected by UI (VF or VOSTFR)
                    // "Default" usually means VF/French in FStream context if not specified
                    // "VFQ" is also French
                    let language: String
                    if key == "VOSTFR" {
                        language = "VOSTFR"
                    } else if key == "Default" || key == "VFQ" {
                        language = "VF"
                    } else if key == "VO" || key == "ENG" || key == "English" {
                        language = "VO"
                    } else {
                        language = "VF" // Default fallback
                    }
                    
                    let provider = player.player.lowercased()
                    
                    // Map to StreamingSource
                    // Only include if provider is known (vidmoly/vidzy) or if we want all
                    // For now, we filter later, so just map correctly
                    
                    let normalizedProvider: String
                    if provider.contains("vidmoly") {
                        normalizedProvider = "vidmoly"
                    } else if provider.contains("vidzy") {
                        normalizedProvider = "vidzy"
                    } else {
                        normalizedProvider = provider
                    }
                    
                    let source = StreamingSource(
                        url: player.url,
                        quality: player.quality,
                        type: player.type,
                        provider: normalizedProvider,
                        language: language,
                        origin: "fstream"
                    )
                    sources.append(source)
                }
            }
        }
        
        return sources
    }
    
    func fetchSeriesSources(seriesId: Int, season: Int, episode: Int, tmdbInfo: TmdbSeriesInfo? = nil) async throws -> [StreamingSource] {
        // Fetch from all endpoints concurrently
        async let tmdbSources = fetchTmdbSeriesSources(seriesId: seriesId, season: season, episode: episode)
        async let fstreamSources = fetchFStreamSeriesSources(seriesId: seriesId, season: season, episode: episode)
        async let vixsrcSources = fetchVixsrcSources(tmdbId: seriesId, type: "tv", season: season, episode: episode)
        // DISABLED: UniversalVO API is broken
        // async let universalVOSources = fetchUniversalVOSources(tmdbId: seriesId, type: "tv", season: season, episode: episode)
        // async let universalVOSources = fetchUniversalVOSources(tmdbId: seriesId, type: "tv", season: season, episode: episode)
        async let movieBoxSources = fetchMovieBoxSeriesSources(tmdbId: seriesId, season: season, episode: episode)
        async let fourKHDHubSources = fetchFourKHDHubSources(tmdbId: seriesId, type: "tv", season: season, episode: episode)
        async let cineproSources = fetchCineproSources(tmdbId: seriesId, season: season, episode: episode)
        async let wiflixSources = fetchWiflixSources(tmdbId: seriesId, season: season, episode: episode)
        async let tmdbProxySources = fetchTmdbProxySources(tmdbId: seriesId, season: season, episode: episode)
        
        print("🔍 [StreamingService] Starting fetch for series ID: \(seriesId) S\(season)E\(episode)")

        // Fetch TMDB info for AfterDark and Movix Download (needs title)
        // Use provided info if available to avoid race conditions/double calls
        var finalTmdbInfo: TmdbSeriesInfo? = tmdbInfo
        
        if finalTmdbInfo == nil {
             finalTmdbInfo = try? await fetchSeriesTmdbInfo(seriesId: seriesId)
        }

        var afterDarkSources: [StreamingSource] = []
        var movixDownloadSources: [StreamingSource] = []
        // Add Anime sources
        var animeSources: [StreamingSource] = []
        
        if let info = finalTmdbInfo {
            let title = info.title
            print("ℹ️ [StreamingService] TMDB Info found: \(title)")
            
            // Start Anime fetch concurrently if logic matches
            // Check for Animation Genre (16)
            if info.genreIds.contains(16) {
                 print("🎌 [StreamingService] Animation genre detected. Fetching BOTH anime sources...")
                 
                 // Fetch VidMoly sources from Movix anime scraping
                 let movixAnimeSources = (try? await fetchMovixAnimeSources(seriesId: seriesId, title: title, season: season, episode: episode, tmdbInfo: info)) ?? []
                 
                 // Fetch HLS sources from AnimeAPI (GogoAnime)
                 let animeApiSources = (try? await fetchAnimeAPISources(tmdbId: seriesId, isMovie: false, season: season, episode: episode)) ?? []
                 
                 // Merge both
                 animeSources = movixAnimeSources + animeApiSources
                 print("🎌 [StreamingService] Total anime sources: \(animeSources.count) (VidMoly: \(movixAnimeSources.count), AnimeAPI: \(animeApiSources.count))")
            }
            
            // DISABLED: AfterDark sources
            // afterDarkSources = (try? await fetchAfterDarkSources(
            //     tmdbId: seriesId,
            //     type: "tv",
            //     title: title,
            //     year: nil,
            //     season: season,
            //     episode: episode
            // )) ?? []
            
            // Fetch Movix Download sources (TMDB ID matching)
            movixDownloadSources = (try? await fetchMovixDownloadSources(
                tmdbId: seriesId,
                type: "tv",
                title: title,
                season: season,
                episode: episode
            )) ?? []
            
             // Await Anime sources (Already fetched above)
            // animeSources = (try? await fetchedAnime) ?? []
        } else {
            print("⚠️ [StreamingService] TMDB Info fetch failed for series ID: \(seriesId)")
        }
        
        // DISABLED: UniversalVO API is broken - removed from tuple
        // DISABLED: UniversalVO API is broken - removed from tuple
        let (tmdb, fstream, vixsrc, mBox, hub4k, cinepro, wiflix, tmdbProxy) = await (try? tmdbSources, try? fstreamSources, try? vixsrcSources, try? movieBoxSources, try? fourKHDHubSources, try? cineproSources, try? wiflixSources, try? tmdbProxySources)
        
        print("📊 [StreamingService] Series Sources fetched:")
        print("   - TMDB: \(tmdb?.count ?? 0)")
        print("   - FStream: \(fstream?.count ?? 0)")
        print("   - Vixsrc: \(vixsrc?.count ?? 0)")
        // print("   - UniversalVO: \(universalVO?.count ?? 0)") // DISABLED
        print("   - MovieBox: \(mBox?.count ?? 0)")
        print("   - 4KHDHub: \(hub4k?.count ?? 0)")
        print("   - Cinepro: \(cinepro?.count ?? 0)")
        print("   - AfterDark: \(afterDarkSources.count)")
        print("   - Movix Download: \(movixDownloadSources.count)")
        print("   - Wiflix: \(wiflix?.count ?? 0)")
        print("   - TMDB Proxy: \(tmdbProxy?.count ?? 0)")
        print("   - Movix Anime: \(animeSources.count)")
        
        var allSources: [StreamingSource] = []
        
        // Add Cinepro/MegaCDN sources FIRST (highest priority for VO)
        if let cinepro = cinepro {
            allSources.append(contentsOf: cinepro)
        }

        // Add Wiflix sources (Luluvid)
        if let wiflix = wiflix {
            allSources.append(contentsOf: wiflix)
        }
        
        // Add Anime sources (High Priority for VidMoly)
        allSources.append(contentsOf: animeSources)
        
        // Add TMDB sources (includes Vidzy)
        if let tmdb = tmdb {
            allSources.append(contentsOf: tmdb)
        }
        
        // Add MovieBox sources (High quality VO)
        if let mBox = mBox {
            allSources.append(contentsOf: mBox)
        }
        
        // Add Movix/Darkibox Download sources
        allSources.append(contentsOf: movixDownloadSources)
        
        // DISABLED: UniversalVO API is broken
        // if let universalVO = universalVO {
        //     allSources.append(contentsOf: universalVO)
        // }
        
        // Add AfterDark sources
        // DISABLED: allSources.append(contentsOf: afterDarkSources)
        
        if let vixsrc = vixsrc {
            allSources.append(contentsOf: vixsrc)
        }
        
        if let fstream = fstream {
            allSources.append(contentsOf: fstream)
        }
        
        // Add 4KHDHub sources (lower priority)
        if let hub4k = hub4k {
            allSources.append(contentsOf: hub4k)
        }
        
        // Add TMDB Proxy sources (Luluvid)
        if let tmdbProxy = tmdbProxy {
            allSources.append(contentsOf: tmdbProxy)
        }
        
        // Filter for allowed providers
        return allSources.filter { $0.provider == "vidmoly" || $0.provider == "vidzy" || $0.provider == "vixsrc" || $0.provider == "primewire" || $0.provider == "2embed" || $0.provider == "afterdark" || $0.provider == "movix" || $0.provider == "darkibox" || $0.provider == "animeapi" || $0.provider == "moviebox" || $0.provider == "4khdhub" || $0.provider == "megacdn" || $0.provider == "premilkyway" || $0.provider == "luluvid" }
    }
    
    private func fetchFourKHDHubSources(tmdbId: Int, type: String, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        var components = URLComponents(string: "\(baseUrl)/api/movix-proxy")!
        var queryItems = [
            URLQueryItem(name: "path", value: "4KHDHUB"),
            URLQueryItem(name: "tmdbId", value: String(tmdbId)),
            URLQueryItem(name: "type", value: type)
        ]
        
        if let season = season, let episode = episode {
            queryItems.append(URLQueryItem(name: "season", value: String(season)))
            queryItems.append(URLQueryItem(name: "episode", value: String(episode)))
        }
        
        components.queryItems = queryItems
        
        guard let url = components.url else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        print("🚀 [StreamingService] Fetching 4KHDHub: \(url.absoluteString)")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw URLError(.badServerResponse)
            }
            
            if httpResponse.statusCode != 200 {
                print("❌ [StreamingService] 4KHDHub Error: Status \(httpResponse.statusCode)")
                return []
            }
            
            // Expected response: { success: true, streams: [...] }
            struct FourKHDHubResponse: Codable {
                let success: Bool
                let streams: [FourKHDHubStream]?
            }
            
            struct FourKHDHubStream: Codable {
                let url: String
                let quality: String?
                let provider: String?
                let label: String?
                let size: String?
                let type: String?
            }
            
            let decoded = try JSONDecoder().decode(FourKHDHubResponse.self, from: data)
            
            return (decoded.streams ?? []).map { stream in
                StreamingSource(
                    url: stream.url,
                    quality: stream.quality ?? "HD",
                    type: stream.type ?? "mkv",
                    provider: "4khdhub",
                    language: "VO", // Always VO for this provider
                    origin: "4khdhub"
                )
            }
            
        } catch {
            print("❌ [StreamingService] 4KHDHub Exception: \(error.localizedDescription)")
            return []
        }
    }
    
    private func fetchTmdbSeriesSources(seriesId: Int, season: Int, episode: Int) async throws -> [StreamingSource] {
        let urlString = "\(baseUrl)/api/movix-proxy?path=tmdb/tv/\(seriesId)?season=\(season)&episode=\(episode)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        // For TV series, player_links are inside current_episode
        let decoded = try JSONDecoder().decode(MovixTmdbSeriesResponse.self, from: data)
        
        // Try current_episode.player_links first, fallback to direct player_links
        let playerLinks = decoded.current_episode?.player_links ?? decoded.player_links ?? []
        print("🎬 [TMDB Series] Found \(playerLinks.count) player links")
        return playerLinks
    }
    
    // NEW: Targeted fetch for next episode optimization
    func fetchNextEpisodeSources(targetProvider: String, seriesId: Int, season: Int, episode: Int, tmdbInfo: TmdbSeriesInfo? = nil) async throws -> [StreamingSource] {
        print("🎯 [StreamingService] Targeted fetch for provider: \(targetProvider)")
        
        switch targetProvider.lowercased() {
        case "vixsrc":
            return try await fetchVixsrcSources(tmdbId: seriesId, type: "tv", season: season, episode: episode)
            
        case "moviebox":
            return try await fetchMovieBoxSeriesSources(tmdbId: seriesId, season: season, episode: episode)
            
        case "universalvo":
             // UniversalVO usually is a single source, try fetching it
             return try await fetchUniversalVOSources(tmdbId: seriesId, type: "tv", season: season, episode: episode)
            
        case "afterdark":
            // AfterDark needs title, ensure we have it
            guard let info = tmdbInfo else {
                // Should not happen if caller does setup correctly, but fallback to fetch
                 let fetchedInfo = try? await fetchSeriesTmdbInfo(seriesId: seriesId)
                 if let title = fetchedInfo?.title {
                     return (try? await fetchAfterDarkSources(tmdbId: seriesId, type: "tv", title: title, year: nil, season: season, episode: episode)) ?? []
                 }
                 return []
            }
            return (try? await fetchAfterDarkSources(tmdbId: seriesId, type: "tv", title: info.title, year: nil, season: season, episode: episode)) ?? []

        case "fstream":
            return try await fetchFStreamSeriesSources(seriesId: seriesId, season: season, episode: episode)

        case "vidmoly", "vidzy":
             // These usually come from TMDB scraper or Vixsrc. Hard to know origin if provider is just "vidmoly".
             // But if currentProvider was stored as "vidmoly", it likely came from TMDB scraper in initial implementation.
             // We'll try TMDB for these constants.
             return try await fetchTmdbSeriesSources(seriesId: seriesId, season: season, episode: episode)

        default:
            print("⚠️ [StreamingService] Check: Unknown provider '\(targetProvider)', falling back to full fetch")
            return try await fetchSeriesSources(seriesId: seriesId, season: season, episode: episode, tmdbInfo: tmdbInfo)
        }
    }
    
    private func fetchFStreamSeriesSources(seriesId: Int, season: Int, episode: Int) async throws -> [StreamingSource] {
        let urlString = "\(baseUrl)/api/movix-proxy?path=fstream/tv/\(seriesId)/season/\(season)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        // FStream TV response structure is different (nested episodes)
        struct FStreamTVResponse: Codable {
            let episodes: [String: FStreamEpisode]?
        }
        
        struct FStreamEpisode: Codable {
            let languages: [String: [FStreamPlayer]]?
        }
        
        let decoded = try JSONDecoder().decode(FStreamTVResponse.self, from: data)
        var sources: [StreamingSource] = []
        
        // Find the episode (keys are strings "1", "2", etc.)
        if let episodes = decoded.episodes, let episodeData = episodes["\(episode)"], let languages = episodeData.languages {
            for (key, playerList) in languages {
                for player in playerList {
                    // Map keys to language expected by UI (VF or VOSTFR)
                    let language: String
                    if key == "VOSTFR" {
                        language = "VOSTFR"
                    } else if key == "Default" || key == "VFQ" || key == "VF" {
                        language = "VF"
                    } else if key == "VO" || key == "ENG" || key == "English" {
                        language = "VO"
                    } else {
                        language = "VF" // Default fallback
                    }
                    
                    let provider = player.player.lowercased()
                    
                    let normalizedProvider: String
                    if provider.contains("vidmoly") {
                        normalizedProvider = "vidmoly"
                    } else if provider.contains("vidzy") {
                        normalizedProvider = "vidzy"
                    } else {
                        normalizedProvider = provider
                    }
                    
                    let source = StreamingSource(
                        url: player.url,
                        quality: player.quality,
                        type: player.type,
                        provider: normalizedProvider,
                        language: language,
                        origin: "fstream"
                    )
                    sources.append(source)
                }
            }
        }
        
        return sources
    }
    
    // MARK: - MovieBox API
    
    struct MovieBoxResponse: Codable {
        let streams: [MovieBoxStream]?
        let success: Bool?
    }
    
    struct MovieBoxStream: Codable {
        let url: String
        let directUrl: String?
        let quality: String?
        let type: String? // "mp4", "m3u8"
        let headers: [String: String]?
    }

    func fetchMovieBoxSources(tmdbId: Int) async throws -> [StreamingSource] {
        let urlString = "\(baseUrl)/api/movix-proxy?path=moviebox&tmdbId=\(tmdbId)&type=movie"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        print("🌐 [MovieBox] Fetching Movie URL: \(urlString)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("❌ [MovieBox] HTTP Error: \((response as? HTTPURLResponse)?.statusCode ?? -1)")
            if let errorData = String(data: data, encoding: .utf8) {
                print("❌ [MovieBox] Error Response: \(errorData)")
            }
            throw URLError(.badServerResponse)
        }
        
        // Log removed as per user request

        
        do {
            let decoded = try JSONDecoder().decode(MovieBoxResponse.self, from: data)
            var sources: [StreamingSource] = []
            
            if let movieBoxStreams = decoded.streams {
                for src in movieBoxStreams {
                    let quality = src.quality ?? "HD"
                    // FIX: Use proxied URL (`src.url`) instead of direct URL for Chromecast compatibility
                    // The direct URL requires headers (Referer/Origin) which Chromecast does not support.
                    // The proxied URL (`/api/movix-proxy?path=moviebox-stream...`) handles headers server-side.
                    let targetUrl = src.url
                    
                    let source = StreamingSource(
                        url: targetUrl,
                        quality: quality,
                        type: src.type ?? (targetUrl.contains(".m3u8") ? "hls" : "mp4"),
                        provider: "moviebox",
                        language: "VO",
                        origin: "moviebox",
                        headers: src.headers
                    )
                    sources.append(source)
                }
            }
            print("✅ [MovieBox] Found \(sources.count) sources")
            return sources
        } catch {
            print("❌ [MovieBox] Decoding Error: \(error)")
            return []
        }
    }
    
    func fetchMovieBoxSeriesSources(tmdbId: Int, season: Int, episode: Int) async throws -> [StreamingSource] {
        let urlString = "\(baseUrl)/api/movix-proxy?path=moviebox&tmdbId=\(tmdbId)&type=tv&season=\(season)&episode=\(episode)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        print("🌐 [MovieBox] Fetching Series URL: \(urlString)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("❌ [MovieBox] HTTP Error: \((response as? HTTPURLResponse)?.statusCode ?? -1)")
            if let errorData = String(data: data, encoding: .utf8) {
                print("❌ [MovieBox] Error Response: \(errorData)")
            }
            throw URLError(.badServerResponse)
        }
        
        // Log removed as per user request

        
        do {
            let decoded = try JSONDecoder().decode(MovieBoxResponse.self, from: data)
            var sources: [StreamingSource] = []
            
            if let movieBoxStreams = decoded.streams {
                for src in movieBoxStreams {
                    let quality = src.quality ?? "HD"
                    // FIX: Use proxied URL (`src.url`) instead of direct URL for Chromecast compatibility
                    let targetUrl = src.url
                    
                    let source = StreamingSource(
                        url: targetUrl,
                        quality: quality,
                        type: src.type ?? (targetUrl.contains(".m3u8") ? "hls" : "mp4"),
                        provider: "moviebox",
                        language: "VO",
                        origin: "moviebox",
                        headers: src.headers
                    )
                    sources.append(source)
                }
            }
            print("✅ [MovieBox] Found \(sources.count) sources")
            return sources
        } catch {
            print("❌ [MovieBox] Decoding Error: \(error)")
            return []
        }
    }

    
    func getSubtitles(imdbId: String, season: Int? = nil, episode: Int? = nil) async -> [Subtitle] {
        let urlString: String
        if let season = season, let episode = episode {
            urlString = "https://opensubtitles-v3.strem.io/subtitles/series/\(imdbId):\(season):\(episode).json"
        } else {
            urlString = "https://opensubtitles-v3.strem.io/subtitles/movie/\(imdbId).json"
        }
        
        guard let url = URL(string: urlString) else { return [] }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            
            struct OpenSubtitlesResponse: Codable {
                let subtitles: [OpenSubtitleItem]?
            }
            
            struct OpenSubtitleItem: Codable {
                let id: String
                let url: String
                let lang: String
            }
            
            let decoded = try JSONDecoder().decode(OpenSubtitlesResponse.self, from: data)
            guard let items = decoded.subtitles else { return [] }
            
            let languageFlags: [String: String] = [
                "fre": "🇫🇷", "eng": "🇬🇧", "spa": "🇪🇸", "ger": "🇩🇪", "ita": "🇮🇹",
                "por": "🇵🇹", "rus": "🇷🇺", "tur": "🇹🇷", "ara": "🇸🇦", "chi": "🇨🇳",
                "jpn": "🇯🇵", "kor": "🇰🇷", "dut": "🇳🇱", "pol": "🇵🇱", "swe": "🇸🇪",
                "dan": "🇩🇰", "fin": "🇫🇮", "nor": "🇳🇴", "cze": "🇨🇿", "hun": "🇭🇺",
                "rom": "🇷🇴", "bul": "🇧🇬", "gre": "🇬🇷", "heb": "🇮🇱", "tha": "🇹🇭",
                "vie": "🇻🇳", "ind": "🇮🇩", "may": "🇲🇾", "per": "🇮🇷", "ukr": "🇺🇦",
                "hrv": "🇭🇷", "srp": "🇷🇸", "slv": "🇸🇮", "slk": "🇸🇰", "lit": "🇱🇹",
                "lav": "🇱🇻", "est": "🇪🇪"
            ]
            
            let languageNames: [String: String] = [
                "fre": "Français", "eng": "Anglais", "spa": "Espagnol", "ger": "Allemand",
                "ita": "Italien", "por": "Portugais", "rus": "Russe", "tur": "Turc",
                "ara": "Arabe", "chi": "Chinois", "jpn": "Japonais", "kor": "Coréen",
                "dut": "Néerlandais", "pol": "Polonais", "swe": "Suédois", "dan": "Danois",
                "fin": "Finnois", "nor": "Norvégien", "cze": "Tchèque", "hun": "Hongrois",
                "rom": "Roumain", "bul": "Bulgare", "gre": "Grec", "heb": "Hébreu",
                "tha": "Thaï", "vie": "Vietnamien", "ind": "Indonésien", "may": "Malais",
                "per": "Persan", "ukr": "Ukrainien", "hrv": "Croate", "srp": "Serbe",
                "slv": "Slovène", "slk": "Slovaque", "lit": "Lituanien", "lav": "Letton",
                "est": "Estonien"
            ]
            
            var subtitles = items.map { item -> Subtitle in
                let lang = item.lang
                let flag = languageFlags[lang] ?? "🏳️"
                let label = languageNames[lang] ?? lang
                return Subtitle(url: item.url, label: label, code: lang, flag: flag)
            }
            
            // Sort: French, English, then others
            subtitles.sort { a, b in
                if a.code == "fre" && b.code != "fre" { return true }
                if a.code != "fre" && b.code == "fre" { return false }
                if a.code == "eng" && b.code != "eng" { return true }
                if a.code != "eng" && b.code == "eng" { return false }
                return a.label < b.label
            }
            
            return subtitles
            
        } catch {
            print("Error fetching subtitles: \(error)")
            return []
        }
    }
    
    func fetchDarkiboxSources(mediaId: Int, season: Int, episode: Int) async throws -> [StreamingSource] {
        // TODO: Implement Darkibox fetching
        return []
    }
    
    func fetchVixsrcSources(tmdbId: Int, type: String, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        var urlString = "\(baseUrl)/api/movix-proxy?path=vixsrc&tmdbId=\(tmdbId)&type=\(type)"
        if let season = season {
            urlString += "&season=\(season)"
        }
        if let episode = episode {
            urlString += "&episode=\(episode)"
        }
        
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        struct VixsrcResponse: Codable {
            let success: Bool
            let streams: [VixsrcStream]?
        }
        
        struct VixsrcStream: Codable {
            let name: String
            let url: String
            let quality: String
            let type: String
        }
        
        let decoded = try JSONDecoder().decode(VixsrcResponse.self, from: data)
        var sources: [StreamingSource] = []
        
        if let streams = decoded.streams {
            for stream in streams {
                // Wrap URL in proxy to handle CORS/Headers
                let originalUrl = stream.url
                // Use alphanumerics + unreserved to properly encode the nested URL parameter (like JS encodeURIComponent)
                let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
                let encodedUrl = originalUrl.addingPercentEncoding(withAllowedCharacters: allowed) ?? originalUrl
                let proxyUrl = "\(baseUrl)/api/vixsrc-proxy?url=\(encodedUrl)"
                
                let source = StreamingSource(
                    url: proxyUrl,
                    quality: stream.quality,
                    type: stream.type,
                    provider: "vixsrc",
                    language: "VO",
                    origin: "vixsrc"
                )
                sources.append(source)
            }
        }
        
        return sources
    }
    

    func fetchUniversalVOSources(tmdbId: Int, type: String, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        var urlString = "\(baseUrl)/api/movix-proxy?path=universalvo&tmdbId=\(tmdbId)&type=\(type)"
        if let season = season {
            urlString += "&season=\(season)"
        }
        if let episode = episode {
            urlString += "&episode=\(episode)"
        }
        
        print("🌐 [UniversalVO] Fetching URL: \(urlString)")
        
        guard let url = URL(string: urlString) else {
            print("❌ [UniversalVO] Invalid URL")
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 30 // Increased to 30s to allow backend scraping time
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                print("❌ [UniversalVO] HTTP Error: \((response as? HTTPURLResponse)?.statusCode ?? -1)")
                throw URLError(.badServerResponse)
            }
            
            let decoded = try JSONDecoder().decode(UniversalVOResponse.self, from: data)
            print("✅ [UniversalVO] Decoded response. Sources count: \(decoded.files?.count ?? 0)")
            
            var sources: [StreamingSource] = []
            
            if let files = decoded.files {
                for file in files {
                    let provider = file.provider?.lowercased() ?? file.extractor?.lowercased() ?? "unknown"
                    let normalizedProvider: String
                    
                    if provider.contains("primewire") || provider.contains("streamtape") {
                        normalizedProvider = "primewire"
                    } else if provider.contains("2embed") || provider.contains("twoembed") {
                        normalizedProvider = "2embed"
                    } else {
                        normalizedProvider = provider
                    }
                    
                    let quality = file.quality ?? "HD"
                    let language: String
                    
                    // Map language codes
                    if let lang = file.lang {
                        if lang.lowercased().contains("fr") || lang.lowercased().contains("vf") {
                            language = "VF"
                        } else if lang.lowercased().contains("vostfr") {
                            language = "VOSTFR"
                        } else if lang.lowercased().contains("en") || lang.lowercased().contains("vo") {
                            language = "VO"
                        } else {
                            language = "VO" // Default
                        }
                    } else {
                        language = "VO" // Default for UniversalVO
                    }
                    
                    let source = StreamingSource(
                        url: file.file,
                        quality: quality,
                        type: file.type,
                        provider: normalizedProvider,
                        language: language,
                        origin: "universalvo"
                    )
                    sources.append(source)
                }
            }
            
            return sources
        } catch {
             print("❌ [UniversalVO] Error fetching/decoding: \(error)")
             return []
        }
    }
    
    
    // MARK: - AfterDark API
    func fetchAfterDarkSources(
        tmdbId: Int,
        type: String,
        title: String?,
        year: String?,
        originalTitle: String? = nil,
        season: Int? = nil,
        episode: Int? = nil
    ) async throws -> [StreamingSource] {
        var urlString = "\(baseUrl)/api/movix-proxy?path=afterdark"
        
        if type == "movie" {
            urlString += "&type=movie&tmdbId=\(tmdbId)"
        } else {
             urlString += "&type=tv&tmdbId=\(tmdbId)"
             if let s = season { urlString += "&season=\(s)" }
             if let e = episode { urlString += "&episode=\(e)" }
        }
        
        if let t = title {
            let encoded = t.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? t
            urlString += "&title=\(encoded)"
        }
        if let y = year {
             urlString += "&year=\(y)"
        }
        if let ot = originalTitle {
             let encoded = ot.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ot
             urlString += "&originalTitle=\(encoded)"
        }
        
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        
        print("🌐 [AfterDark] Fetching URL: \(url.absoluteString)")
        
        var request = URLRequest(url: url)
        request.timeoutInterval = 30 // Increased to 30s
        
        // Add headers to mimic browser request
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15", forHTTPHeaderField: "User-Agent")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                 print("❌ [AfterDark] HTTP Error: \((response as? HTTPURLResponse)?.statusCode ?? -1)")
                throw URLError(.badServerResponse)
            }
            
            let decoder = JSONDecoder()
            let afterdarkResponse = try decoder.decode(AfterDarkResponse.self, from: data)
            
            print("✅ [AfterDark] Decoded response. Sources: \(afterdarkResponse.sources?.count ?? 0)")
            
            var sources: [StreamingSource] = []
            
            if let afterdarkSources = afterdarkResponse.sources {
            for source in afterdarkSources {
                // Filter requested by user: kind=hls and proxied=false
                if source.proxied != false {
                    print("⚠️ [AfterDark] Skipping proxied source: \(source.name ?? "unknown")")
                    continue
                }
                
                if source.kind != "hls" {
                    print("⚠️ [AfterDark] Skipping non-hls source: \(source.kind ?? "nil")")
                    continue
                }

                // Map 'kind' to type
                let streamType = "m3u8" // Since we filter for hls, it's always m3u8
                
                // Map language
                var language = "VF"
                if let lang = source.language?.lowercased() {
                    if lang == "english" || lang == "eng" || lang == "en" {
                        language = "VO"
                    } else if lang == "multi" {
                        language = "VF"
                    } else if lang.contains("vo") {
                        language = "VO"
                    }
                }
                
                let streamSource = StreamingSource(
                    url: source.url,
                    quality: source.quality ?? "HD",
                    type: streamType,
                    provider: "afterdark",
                    language: language,
                    origin: "afterdark"
                )
                sources.append(streamSource)
            }
        }
        
            return sources
        } catch {
            print("❌ [AfterDark] Error fetching/decoding: \(error)")
            return []
        }
    }
    
        
        
    // MARK: - Extractors
    
    func extractVidMoly(url: String) async throws -> String {
        // 1. Check if it's already an m3u8 (pre-extracted)
        if url.contains(".m3u8") || url.contains("unified-streaming.com") || url.contains("vmeas.cloud") || url.contains("transitto.online") {
            // Check for vidmoly/vmeas manually to ensure normalization
            if url.contains("vidmoly.to") {
                 let normalized = url.replacingOccurrences(of: "vidmoly.to", with: "vidmoly.net")
                 return getVidMolyProxyUrl(url: normalized, referer: "https://vidmoly.net/")
            }
             return getVidMolyProxyUrl(url: url, referer: "https://vidmoly.net/")
        }
        
        // Normalize .to -> .net BEFORE calling API
        let normalizedUrl = url.replacingOccurrences(of: "vidmoly.to", with: "vidmoly.net")
        let apiUrl = URL(string: "\(baseUrl)/api/extract")!
        var request = URLRequest(url: apiUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["type": "vidmoly", "url": normalizedUrl]
        request.httpBody = try JSONEncoder().encode(body)
        
        print("🌐 Calling VidMoly API: \(url)")
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("❌ VidMoly API Error: Status \((response as? HTTPURLResponse)?.statusCode ?? 0)")
            throw URLError(.badServerResponse)
        }
        
        struct ExtractResponse: Codable {
            let success: Bool
            let m3u8Url: String?
            let error: String?
            let type: String?
        }
        
        if let jsonString = String(data: data, encoding: .utf8) {
            print("🎬 VidMoly JSON Response: \(jsonString)")
        }
        
        let result = try JSONDecoder().decode(ExtractResponse.self, from: data)
        print("✅ VidMoly API Response: success=\(result.success)")
        
        guard result.success, let m3u8Url = result.m3u8Url else {
            print("❌ VidMoly extraction failed: success=false or no m3u8")
            throw URLError(.cannotParseResponse)
        }
        
        // Clean URL
        var cleanedUrl = m3u8Url
        // Commas should NOT be removed as they are part of the path in some VidMoly variations (as per user/web behavior)
        // if cleanedUrl.contains(",") && cleanedUrl.contains(".urlset") {
        //    cleanedUrl = cleanedUrl.replacingOccurrences(of: ",", with: "")
        // }
        
        // Check if proxy is needed (Real VidMoly links)
        // With api/extract, we assume it returns the direct/proxied m3u8 or needs our proxy
        // The unified api usually returns a usable m3u8Url
        
        // We still need to check if we should proxy it through our backend or play direct
        let isRealVidMoly = cleanedUrl.contains("vidmoly") || 
                            cleanedUrl.contains("vmeas") ||
                            cleanedUrl.contains("to_be_proxied") // Adjust based on api/extract response
        
        // For now, trust the URL returned by api/extract, but if it's a raw vidmoly link, proxy it
        // Always proxy through our backend to ensure headers (User-Agent, Referer) are correct for AVPlayer
        // The API returns the raw direct link (e.g. vmwesa.online), which fails without proper headers.
        return getVidMolyProxyUrl(url: cleanedUrl, referer: normalizedUrl)
    }
    
    func extractVidzy(url: String) async throws -> String {
        let apiUrl = URL(string: "\(baseUrl)/api/extract")!
        var request = URLRequest(url: apiUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.setValue("https://google.com", forHTTPHeaderField: "Referer")
        request.setValue("navigate", forHTTPHeaderField: "Sec-Fetch-Mode")
        request.setValue("none", forHTTPHeaderField: "Sec-Fetch-Site")
        request.setValue("document", forHTTPHeaderField: "Sec-Fetch-Dest")
        
        let body: [String: String] = ["type": "vidzy", "url": url]
        request.httpBody = try JSONEncoder().encode(body)
        
        print("📤 Extracting Vidzy: \(url)")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        if httpResponse.statusCode != 200 {
            print("❌ Vidzy extraction failed with status: \(httpResponse.statusCode)")
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                print("❌ Error details: \(errorJson)")
            }
            throw URLError(.badServerResponse)
        }
        
        struct ExtractResponse: Codable {
            let success: Bool
            let m3u8Url: String?
            let error: String?
            let type: String?
        }
        
        let result = try JSONDecoder().decode(ExtractResponse.self, from: data)
        
        if let m3u8 = result.m3u8Url {
            print("✅ Vidzy extracted: \(m3u8)")
            return m3u8
        } else if let error = result.error {
            print("❌ Vidzy API Error: \(error)")
            throw NSError(domain: "StreamingService", code: -1, userInfo: [NSLocalizedDescriptionKey: error])
        }
        
        throw URLError(.cannotParseResponse)
    }
    
    func extractLuluvid(url: String) async throws -> String {
        guard let luluvidUrl = URL(string: url) else {
            throw URLError(.badURL)
        }
        
        print("🚀 [Luluvid iOS] Extracting locally: \(url)")
        
        var request = URLRequest(url: luluvidUrl)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("https://luluvid.com/", forHTTPHeaderField: "Referer")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200,
              let html = String(data: data, encoding: .utf8) else {
            print("❌ [Luluvid iOS] Failed to fetch page. Status: \((response as? HTTPURLResponse)?.statusCode ?? 0)")
            throw URLError(.badServerResponse)
        }
        
        // Regex Extraction logic (NSRegularExpression for reliability)
        // Pattern 1: sources: [{file:"https://..."}]
        let pattern1 = #"sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']"#
        // Pattern 2: file: "https://..."
        let pattern2 = #"file:\s*["']([^"']+)["']"#
        
        var m3u8Url: String? = nil
        
        let range = NSRange(html.startIndex..<html.endIndex, in: html)
        
        if let regex1 = try? NSRegularExpression(pattern: pattern1),
           let match = regex1.firstMatch(in: html, options: [], range: range),
           let captureRange = Range(match.range(at: 1), in: html) {
            m3u8Url = String(html[captureRange])
        } else if let regex2 = try? NSRegularExpression(pattern: pattern2),
                  let match = regex2.firstMatch(in: html, options: [], range: range),
                  let captureRange = Range(match.range(at: 1), in: html) {
            m3u8Url = String(html[captureRange])
        }
        
        if let extracted = m3u8Url {
            print("✅ [Luluvid iOS] Extracted M3U8: \(extracted)")
            return extracted
        }
        
        print("❌ [Luluvid iOS] No M3U8 found in HTML")
        throw URLError(.cannotParseResponse)
    }
    
    // MARK: - Proxy Helpers
    
    func getVidMolyProxyUrl(url: String, referer: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
        
        // Match Web: Recursive decode first
        // Web implementation:
        // while (decodedUrl.includes('%25')) {
        //   decodedUrl = decodeURIComponent(decodedUrl);
        // }
        // We do semantically equivalent in Swift:
        
        // Normalize URL .to -> .net
        var decodedUrl = url.replacingOccurrences(of: "vidmoly.to", with: "vidmoly.net")
        // Safety counter to prevent infinite loops
        var loopCount = 0
        let maxLoops = 10
        
        while decodedUrl.contains("%") && loopCount < maxLoops {
            if let unescaped = decodedUrl.removingPercentEncoding {
                if unescaped == decodedUrl {
                    // No change, stable
                    break
                }
                decodedUrl = unescaped
            } else {
                // Decoding failed
                break
            }
            loopCount += 1
        }
        
        print("🔍 Swift VidMoly: Final decoded URL: \(decodedUrl)")
        
        let encodedUrl = decodedUrl.addingPercentEncoding(withAllowedCharacters: allowed) ?? decodedUrl
        
        // Step 1: Encode referer string (equivalent to encodeURIComponent(referer))
        let step1Referer = referer.addingPercentEncoding(withAllowedCharacters: allowed) ?? referer
        // Step 2: Double encode check - The user example shows double encoding for referer
        // referer=https%253A%252F%252Fvidmoly.net
        // %25 is % -> %3A is :
        // So it is indeed double encoded.
        let finalReferer = step1Referer.addingPercentEncoding(withAllowedCharacters: allowed) ?? step1Referer
        
        // REQUIRED for AVPlayer to detect HLS format correctly (Web players are more forgiving)
        // User explicitly instructed NOT to add a suffix
        return "\(baseUrl)/api/vidmoly?url=\(encodedUrl)&referer=\(finalReferer)"
    }
    
    // MARK: - TMDB Info Helpers
    struct TmdbMovieInfo {
        let title: String
        let year: String
        let originalTitle: String?
        let genreIds: [Int]
    }
    
    struct TmdbSeriesInfo {
        let title: String
        let seasons: [TmdbSeasonInfo]
        let genreIds: [Int]
    }
    
    struct TmdbSeasonInfo {
        let seasonNumber: Int
        let episodeCount: Int
    }
    
    private func fetchMovieTmdbInfo(movieId: Int) async throws -> TmdbMovieInfo {
        let apiKey = "68e094699525b18a70bab2f86b1fa706"
        let urlString = "https://api.themoviedb.org/3/movie/\(movieId)?api_key=\(apiKey)"
        
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            let title = json["title"] as? String ?? ""
            let releaseDate = json["release_date"] as? String ?? ""
            let year = String(releaseDate.prefix(4))
            let originalTitle = json["original_title"] as? String
            
            // Extract genre IDs
            var genreIds: [Int] = []
            if let genres = json["genres"] as? [[String: Any]] {
                genreIds = genres.compactMap { $0["id"] as? Int }
            }
            
            return TmdbMovieInfo(title: title, year: year, originalTitle: originalTitle, genreIds: genreIds)
        }
        
        throw URLError(.cannotParseResponse)
    }
    
    private func fetchSeriesTmdbInfo(seriesId: Int) async throws -> TmdbSeriesInfo {
        let apiKey = "68e094699525b18a70bab2f86b1fa706"
        let urlString = "https://api.themoviedb.org/3/tv/\(seriesId)?api_key=\(apiKey)&language=fr-FR"
        
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            let title = json["name"] as? String ?? ""
            
            // Extract genre IDs
            var genreIds: [Int] = []
            if let genres = json["genres"] as? [[String: Any]] {
                genreIds = genres.compactMap { $0["id"] as? Int }
            }
            
            var seasons: [TmdbSeasonInfo] = []
            if let seasonsArray = json["seasons"] as? [[String: Any]] {
                for seasonData in seasonsArray {
                    let number = seasonData["season_number"] as? Int ?? -1
                    let count = seasonData["episode_count"] as? Int ?? 0
                    seasons.append(TmdbSeasonInfo(seasonNumber: number, episodeCount: count))
                }
            }
            
            return TmdbSeriesInfo(title: title, seasons: seasons, genreIds: genreIds)
        }
        
        throw URLError(.cannotParseResponse)
    }
    
    // MARK: - Movix Download Sources (TMDB ID Matching)
    
    /// Search Movix API by title
    private func searchMovix(title: String) async throws -> MovixSearchResponse {
        guard let encodedTitle = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseUrl)/api/movix-proxy?path=search&title=\(encodedTitle)") else {
            throw URLError(.badURL)
        }
        
        print("🔍 [Movix] Searching for: \(title)")
        
        var request = URLRequest(url: url)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.setValue("https://google.com", forHTTPHeaderField: "Referer")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        return try JSONDecoder().decode(MovixSearchResponse.self, from: data)
    }
    
    /// Get Movix ID from TMDB ID by searching and matching
    private func getMovixIdFromTmdb(tmdbId: Int, type: String, title: String) async throws -> Int? {
        let searchResponse = try await searchMovix(title: title)
        
        guard let results = searchResponse.results else {
            print("⚠️ [Movix] No search results for: \(title)")
            return nil
        }
        
        // Find matching result by TMDB ID and type
        // Note: Movix API returns 'series' for TV shows, while we use 'tv'
        let matchingResult = results.first { result in
            result.tmdb_id == tmdbId && (result.type == type || (type == "tv" && result.type == "series"))
        }
        
        if let match = matchingResult {
            print("✅ [Movix] Found matching ID: \(match.id) for TMDB \(tmdbId)")
            return match.id
        }
        
        print("⚠️ [Movix] No matching TMDB ID found in search results")
        return nil
    }
    
    /// Fetch download sources using Movix ID
    func fetchMovixDownloadSources(tmdbId: Int, type: String, title: String, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        // Step 1: Get Movix ID from TMDB ID
        guard let movixId = try await getMovixIdFromTmdb(tmdbId: tmdbId, type: type, title: title) else {
            return []
        }
        
        // Step 2: Build download URL
        let path: String
        if type == "movie" {
            path = "films/download/\(movixId)"
        } else {
            guard let s = season, let e = episode else {
                print("❌ [Movix] Season and episode required for TV shows")
                return []
            }
            path = "series/download/\(movixId)/season/\(s)/episode/\(e)"
        }
        
        guard let url = URL(string: "\(baseUrl)/api/movix-proxy?path=\(path)") else {
            throw URLError(.badURL)
        }
        
        print("📥 [Movix] Fetching download sources: \(path)")
        
        var request = URLRequest(url: url)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.setValue("https://google.com", forHTTPHeaderField: "Referer")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let downloadResponse = try JSONDecoder().decode(MovixDownloadResponse.self, from: data)
        
        // Step 3: Convert to StreamingSource
        var sources: [StreamingSource] = []
        if let downloadSources = downloadResponse.sources {
            for (index, source) in downloadSources.enumerated() {
                // Use m3u8 URL if available, otherwise use src
                let streamUrl = source.m3u8 ?? source.src ?? ""
                guard !streamUrl.isEmpty else { continue }
                
                // Filter Alpha sources
                if let label = source.label, label == "Alpha" {
                    continue
                }

                // Detect provider from URL: darkibox.com = Darkibox, otherwise = Movix
                let detectedProvider: String
                if streamUrl.lowercased().contains("darkibox.com") {
                    detectedProvider = "darkibox"
                } else {
                    detectedProvider = "movix"
                }
                
                // Improved mapping
                var lang = (source.language ?? "VF").lowercased()
                let normalizedLang: String
                
                if lang.contains("french") || lang.contains("français") || lang == "fr" || lang == "vff" || lang == "vfq" || lang == "truefrench" || lang.contains("multi") {
                    normalizedLang = "VF"
                } else if lang.contains("english") || lang == "en" || lang == "eng" || lang.contains("vo") {
                   if lang.contains("vostfr") {
                       normalizedLang = "VOSTFR"
                   } else {
                       normalizedLang = "VO"
                   }
                } else if lang.contains("vostfr") {
                    normalizedLang = "VOSTFR"
                } else {
                    normalizedLang = "VF"
                }
                
                let streamingSource = StreamingSource(
                    id: "\(detectedProvider)-download-\(movixId)-\(index)",
                    url: streamUrl,
                    quality: source.quality ?? "HD",
                    type: streamUrl.contains(".m3u8") ? "hls" : "mp4",
                    provider: detectedProvider,
                    language: normalizedLang,
                    origin: "movix"
                )
                sources.append(streamingSource)
            }
        }
        
        print("✅ [Movix] Found \(sources.count) download sources")
        return sources
    }

    
    // MARK: - Movix Anime Fetching (VidMoly - Original)
    
    private func fetchMovixAnimeSources(seriesId: Int, title: String, season: Int, episode: Int, tmdbInfo: TmdbSeriesInfo) async throws -> [StreamingSource] {
        print("🎬 [Movix Anime] Fetching for: \(title) S\(season)E\(episode)")
        
        // Handle special cases for Attack on Titan
        let isAOT = seriesId == 1429 || title.lowercased().contains("attaque des titans") || title.lowercased().contains("shingeki no kyojin")
        let searchTitle = isAOT ? "L'Attaque des Titans" : title.components(separatedBy: ":").first?.trimmingCharacters(in: .whitespaces) ?? title
        
        // Step 1: Search for anime
        var components = URLComponents(string: "\(baseUrl)/api/movix-proxy")
        components?.queryItems = [
            URLQueryItem(name: "path", value: "anime/search/\(searchTitle)"),
            URLQueryItem(name: "includeSeasons", value: "true"),
            URLQueryItem(name: "includeEpisodes", value: "true")
        ]
        
        guard let searchURL = components?.url else { return [] }
        
        print("🎬 [Movix Anime] Search URL: \(searchURL)")
        
        var request = URLRequest(url: searchURL)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.timeoutInterval = 15
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("⚠️ [Movix Anime] Search failed")
            return []
        }
        
        // Parse response - expecting array of anime objects
        guard let animeList = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            print("⚠️ [Movix Anime] Failed to parse response")
            return []
        }
        
        print("🎬 [Movix Anime] Found \(animeList.count) results")
        
        // Find best match
        var match: [String: Any]? = nil
        
        if isAOT {
            match = animeList.first { ($0["name"] as? String)?.lowercased() == "shingeki no kyojin" }
        }
        
        if match == nil {
            match = animeList.first { anime in
                let name = (anime["name"] as? String)?.lowercased() ?? ""
                return name == searchTitle.lowercased() || name == title.lowercased()
            }
        }
        
        if match == nil {
            match = animeList.first { anime in
                let name = (anime["name"] as? String)?.lowercased() ?? ""
                if name.contains("junior") || name.contains("high-school") { return false }
                return name.contains(searchTitle.lowercased()) || name.contains(title.lowercased())
            }
        }
        
        guard let anime = match, let seasons = anime["seasons"] as? [[String: Any]] else {
            print("⚠️ [Movix Anime] No matching anime found")
            return []
        }
        
        print("✅ [Movix Anime] Found anime: \(anime["name"] ?? "unknown")")
        
        // Find target season and episode
        var targetEpisode: [String: Any]? = nil
        
        // Find season by index or name
        let targetSeason = seasons.first { s in
            if let idx = s["index"] as? Int, idx == season { return true }
            if let name = s["name"] as? String, name.contains("Saison \(season)") { return true }
            return false
        }
        
        if let eps = targetSeason?["episodes"] as? [[String: Any]] {
            targetEpisode = eps.first { e in
                if let idx = e["index"] as? Int, idx == episode { return true }
                if let name = e["name"] as? String, name.contains(String(format: "%02d", episode)) { return true }
                return false
            }
        }
        
        // Fallback: Absolute episode search
        if targetEpisode == nil && season > 0 {
            let previousSeasons = tmdbInfo.seasons.filter { $0.seasonNumber > 0 && $0.seasonNumber < season }
            let previousEpisodeCount = previousSeasons.reduce(0) { $0 + $1.episodeCount }
            let absoluteEpisodeNumber = previousEpisodeCount + episode
            
            print("🎯 [Movix Anime] Trying absolute episode: \(absoluteEpisodeNumber)")
            
            for s in seasons {
                if let eps = s["episodes"] as? [[String: Any]] {
                    targetEpisode = eps.first { e in
                        if let idx = e["index"] as? Int, idx == absoluteEpisodeNumber { return true }
                        if let name = e["name"] as? String, name.contains(String(format: "%02d", absoluteEpisodeNumber)) { return true }
                        return false
                    }
                    if targetEpisode != nil { break }
                }
            }
        }
        
        guard let episode = targetEpisode,
              let streamingLinks = episode["streaming_links"] as? [[String: Any]] else {
            print("⚠️ [Movix Anime] No episode or streaming links found")
            return []
        }
        
        // Extract VidMoly links
        var sources: [StreamingSource] = []
        
        for link in streamingLinks {
            let language = (link["language"] as? String)?.uppercased() ?? "VF"
            
            if let players = link["players"] as? [String] {
                for (index, playerUrl) in players.enumerated() {
                    let trimmedUrl = playerUrl.trimmingCharacters(in: .whitespacesAndNewlines)
                    
                    // Only extract VidMoly links
                    if trimmedUrl.lowercased().contains("vidmoly") {
                        var normalized = trimmedUrl
                        if normalized.contains("vidmoly.to") {
                            normalized = normalized.replacingOccurrences(of: "vidmoly.to", with: "vidmoly.net")
                        }
                        if normalized.hasPrefix("http://") {
                            normalized = normalized.replacingOccurrences(of: "http://", with: "https://")
                        }
                        
                        let source = StreamingSource(
                            id: "movix-anime-vidmoly-\(language)-\(index)",
                            url: normalized,
                            quality: "HD",
                            type: "embed",
                            provider: "vidmoly",
                            language: language,
                            origin: "movixanime"
                        )
                        sources.append(source)
                        print("   -> Added VidMoly: \(language) - \(normalized.prefix(50))...")
                    }
                }
            }
        }
        
        print("✅ [Movix Anime] Found \(sources.count) VidMoly sources")
        return sources
    }
    
    // MARK: - Movix Anime Fetching (AnimeAPI - GogoAnime)
    
    private func fetchAnimeAPISources(tmdbId: Int, isMovie: Bool, season: Int = 1, episode: Int = 1) async throws -> [StreamingSource] {
        // Step 1: Fetch English title using TMDB (en-US)
        let apiKey = "68e094699525b18a70bab2f86b1fa706"
        let tmdbUrlString = "https://api.themoviedb.org/3/\(isMovie ? "movie" : "tv")/\(tmdbId)?api_key=\(apiKey)&language=en-US"
        
        guard let tmdbUrl = URL(string: tmdbUrlString) else { return [] }
        
        // Use a simple fetch for TMDB
        let (tmdbData, tmdbResponse) = try await URLSession.shared.data(from: tmdbUrl)
        
        guard (tmdbResponse as? HTTPURLResponse)?.statusCode == 200,
              let tmdbJson = try? JSONSerialization.jsonObject(with: tmdbData) as? [String: Any] else {
            return []
        }
        
        let title = (tmdbJson["title"] as? String) ?? (tmdbJson["name"] as? String) ?? (tmdbJson["original_title"] as? String) ?? (tmdbJson["original_name"] as? String) ?? ""
        
        guard !title.isEmpty else { return [] }
        
        print("🎌 [AnimeAPI iOS] Searching for: \(title)")
        
        // Step 1.5: Calculate relative episode number (like web does)
        // Fetch season details to find the episode's position in the season
        var relativeEpisode = episode
        
        if !isMovie {
            let seasonUrlString = "https://api.themoviedb.org/3/tv/\(tmdbId)/season/\(season)?api_key=\(apiKey)&language=en-US"
            if let seasonUrl = URL(string: seasonUrlString) {
                do {
                    let (seasonData, seasonResponse) = try await URLSession.shared.data(from: seasonUrl)
                    if (seasonResponse as? HTTPURLResponse)?.statusCode == 200,
                       let seasonJson = try? JSONSerialization.jsonObject(with: seasonData) as? [String: Any],
                       let episodes = seasonJson["episodes"] as? [[String: Any]] {
                        // Find the index of the episode with this episode_number
                        if let episodeIndex = episodes.firstIndex(where: { ($0["episode_number"] as? Int) == episode }) {
                            // relative episode is index + 1 (1-indexed)
                            relativeEpisode = episodeIndex + 1
                            print("🔢 [AnimeAPI iOS] Mapped absolute episode \(episode) to relative \(relativeEpisode) in season \(season)")
                        }
                    }
                } catch {
                    print("⚠️ [AnimeAPI iOS] Failed to fetch season details: \(error)")
                }
            }
        }
        
        // Step 2: Call movix-proxy anime-api endpoint
        // URL needs to generally follow the pattern: /api/movix-proxy?path=anime-api&title=...&season=...&episode=...
        
        // Note: For movies, we use season 1, episode 1 as per backend logic
        
        var components = URLComponents(string: "\(baseUrl)/api/movix-proxy")
        components?.queryItems = [
            URLQueryItem(name: "path", value: "anime-api"),
            URLQueryItem(name: "title", value: title),
            URLQueryItem(name: "season", value: "\(season)"),
            URLQueryItem(name: "episode", value: "\(relativeEpisode)"), // Use relative episode
            URLQueryItem(name: "tmdbId", value: "\(tmdbId)")
        ]
        
        guard let apiURL = components?.url else { return [] }
        
        print("🎌 [AnimeAPI iOS] Request: \(apiURL)")
        
        var request = URLRequest(url: apiURL)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.timeoutInterval = 30
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("⚠️ [AnimeAPI iOS] Request failed: \((response as? HTTPURLResponse)?.statusCode ?? 0)")
            return []
        }
        
        // Parse response
        // Expected JSON: { success: true, results: [ { provider, url, type, quality, tracks: [] } ] }
        
        struct AnimeAPIResponse: Codable {
            let success: Bool
            let results: [AnimeAPISource]?
        }
        
        struct AnimeAPITrack: Codable {
            let file: String
            let label: String
            let kind: String?
            let `default`: Bool?
        }
        
        struct AnimeAPISource: Codable {
            let provider: String?
            let url: String
            let type: String?
            let quality: String?
            let tracks: [AnimeAPITrack]?
        }
        
        let decoder = JSONDecoder()
        guard let apiResponse = try? decoder.decode(AnimeAPIResponse.self, from: data),
              let results = apiResponse.results, !results.isEmpty else {
            print("❌ [AnimeAPI iOS] No results found")
            return []
        }
        
        print("✅ [AnimeAPI iOS] Found \(results.count) sources")
        
        return results.map { source in
            // Map tracks to Subtitle objects
            var subtitles: [Subtitle]? = nil
            if let apiTracks = source.tracks {
                subtitles = apiTracks.map { track in
                    Subtitle(
                        url: track.file,
                        label: track.label,
                        code: track.label.lowercased(), // Usually "English", so code is "english"
                        flag: "" // No flag for now
                    )
                }
                print("📝 [AnimeAPI iOS] Source has \(subtitles?.count ?? 0) tracks")
            }

            // For iOS, we use the DIRECT URL (CORS doesn't apply)
            // Backend provides direct m3u8 link in 'url'
            
            return StreamingSource(
                url: source.url,
                quality: source.quality ?? "HD",
                type: source.type == "hls" ? "m3u8" : "mp4",
                provider: "animeapi",
                language: "VO",
                origin: "animeapi",
                tracks: subtitles
            )
        }
    }
        
    // MARK: - Cinepro API
    private func fetchCineproSources(tmdbId: Int, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        var urlString = "\(baseUrl)/api/movix-proxy?path=cinepro&tmdbId=\(tmdbId)&type=\(season == nil ? "movie" : "tv")"
        if let s = season { urlString += "&season=\(s)" }
        if let e = episode { urlString += "&episode=\(e)" }
        
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.setValue("https://google.com", forHTTPHeaderField: "Referer")
        request.timeoutInterval = 15
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return []
        }
        
        // API returns: { success: true, streams: [{ server, link, type, quality, lang, headers }] }
        struct CineproApiStream: Codable {
            let server: String?
            let link: String
            let type: String?
            let quality: String?
            let lang: String?
            let headers: [String: String]?
        }
        
        struct CineproApiResponse: Codable {
            let success: Bool?
            let streams: [CineproApiStream]?
        }
        
        do {
            let decoded = try JSONDecoder().decode(CineproApiResponse.self, from: data)
            
            return (decoded.streams ?? []).map { stream in
                // Determine provider based on server name
                let provider: String
                if stream.server?.lowercased().contains("megacdn") == true {
                    provider = "megacdn"
                } else if stream.server?.lowercased().contains("milkyway") == true {
                    provider = "premilkyway"
                } else {
                    provider = "cinepro"
                }
                
                // Construct proxied URL for Cinepro sources EXCEPT MegaCDN
                // MegaCDN links are accessed directly on iOS to avoid proxy overhead (no CORS issue)
                var finalUrl = stream.link
                var finalHeaders = stream.headers
                
                if provider != "megacdn" {
                    var components = URLComponents(string: "\(self.baseUrl)/api/movix-proxy")!
                    var queryItems = [
                        URLQueryItem(name: "path", value: "cinepro-proxy"),
                        URLQueryItem(name: "url", value: stream.link)
                    ]
                    
                    if let headers = stream.headers, let jsonData = try? JSONEncoder().encode(headers), let jsonString = String(data: jsonData, encoding: .utf8) {
                        queryItems.append(URLQueryItem(name: "headers", value: jsonString))
                    }
                    
                    components.queryItems = queryItems
                    finalUrl = components.url?.absoluteString ?? stream.link
                    finalHeaders = nil // Headers handled by proxy
                    print("🔗 [Cinepro] Using PROXY for \(provider): \(finalUrl)")
                } else {
                    // For MegaCDN, the API itself might return a proxied URL in `stream.link`.
                    // We must UNWRAP it to get the direct link.
                    if finalUrl.contains("movix-proxy"), let components = URLComponents(string: finalUrl), let queryItems = components.queryItems {
                        if let innerUrl = queryItems.first(where: { $0.name == "url" })?.value {
                            finalUrl = innerUrl
                            print("🔓 [Cinepro] Unwrapped MegaCDN URL: \(finalUrl)")
                        }
                    }
                    print("🔗 [Cinepro] Using DIRECT link for \(provider): \(finalUrl)")
                }
                
                // Extract Quality from Server Name for MegaCDN (e.g. "MegaCDN 1080p")
                var finalQuality = stream.quality ?? "Auto"
                if provider == "megacdn" && (finalQuality == "Auto" || finalQuality.isEmpty) {
                    if let serverName = stream.server {
                        if serverName.contains("1080p") { finalQuality = "1080p" }
                        else if serverName.contains("720p") { finalQuality = "720p" }
                        else if serverName.contains("480p") { finalQuality = "480p" }
                        else if serverName.contains("360p") { finalQuality = "360p" }
                        else if serverName.contains("4k") || serverName.contains("2160p") { finalQuality = "4K" }
                    }
                }

                return StreamingSource(
                    url: finalUrl,
                    quality: finalQuality,
                    type: "m3u8", // Always M3U8 for these proxies
                    provider: provider,
                    language: stream.lang ?? "VO",
                    origin: "cinepro",
                    tracks: nil,
                    headers: finalHeaders
                )
            }
        } catch {
            print("❌ [StreamingService] Cinepro decode error: \(error)")
            return []
        }
    }

    private func fetchWiflixSources(tmdbId: Int, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        let typePath = season == nil ? "movie" : "tv"
        var urlString = "\(baseUrl)/api/movix-proxy?path=wiflix/\(typePath)/\(tmdbId)"
        
        if let s = season { urlString += "&season=\(s)" }
        if let e = episode { urlString += "&episode=\(e)" }
        
        print("🌐 [Wiflix] Fetching URL: \(urlString)")
        
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.setValue("https://google.com", forHTTPHeaderField: "Referer")
        request.timeoutInterval = 15
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return []
        }
        
        // Correct Wiflix Structs based on user JSON
        struct WiflixPlayer: Codable {
            let name: String
            let url: String
            let episode: Int?
            let type: String? // "VF", "VOSTFR"
        }
        
        struct WiflixPlayersDict: Codable {
            let vf: [WiflixPlayer]?
            let vostfr: [WiflixPlayer]?
        }
        
        struct WiflixApiResponse: Codable {
            let success: Bool?
            let players: WiflixPlayersDict?
        }
        
        do {
            let decoded = try JSONDecoder().decode(WiflixApiResponse.self, from: data)
            var sources: [StreamingSource] = []
            
            let processPlayers = { (players: [WiflixPlayer]?, lang: String) in
                guard let players = players else { return }
                for player in players {
                    // Check for Luluvid
                    if player.name.lowercased().contains("luluvid") || player.url.contains("luluvid") {
                        let provider = "luluvid"
                        
                        // Use raw URL for client-side extraction (via /api/extract)
                        let finalUrl = player.url
                        
                        print("🔗 [Wiflix] Found Luluvid (\(lang)): \(finalUrl)")
                        
                        sources.append(StreamingSource(
                            url: finalUrl,
                            quality: "HD", // Luluvid defaults to HD
                            type: "embed", // Embed before extraction
                            provider: provider,
                            language: lang,
                            origin: "wiflix",
                            tracks: nil,
                            headers: nil
                        ))
                    }
                }
            }
            
            processPlayers(decoded.players?.vf, "VF")
            processPlayers(decoded.players?.vostfr, "VOSTFR") // Map to "VO" or "VOSTFR"? Using "VOSTFR" as per UI
            
            return sources
            
        } catch {
            print("❌ [StreamingService] Wiflix decode error: \(error)")
            // Try printing string for partial debug if needed
            // if let str = String(data: data, encoding: .utf8) { print("Dump: \(str)") }
            return []
        }
    }

    // MARK: - ID Conversion Helpers
    
    func fetchImdbId(tmdbId: Int, type: String) async -> String? {
        let apiKey = "68e094699525b18a70bab2f86b1fa706"
        let urlString: String
        
        if type == "movie" {
            urlString = "https://api.themoviedb.org/3/movie/\(tmdbId)?api_key=\(apiKey)"
        } else {
            urlString = "https://api.themoviedb.org/3/tv/\(tmdbId)/external_ids?api_key=\(apiKey)"
        }
        
        guard let url = URL(string: urlString) else { return nil }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                if let imdbId = json["imdb_id"] as? String, !imdbId.isEmpty {
                    print("✅ [StreamingService] Resolved IMDB ID: \(imdbId) for TMDB: \(tmdbId)")
                    return imdbId
                }
            }
        } catch {
            print("❌ [StreamingService] Failed to fetch IMDB ID: \(error)")
        }
        return nil
    }
    
    // MARK: - Next Episode Logic
    
    /// Determines the next episode (S+1 E1 or S same E+1)
    func fetchNextEpisodeDetails(seriesId: Int, currentSeason: Int, currentEpisode: Int) async -> (season: Int, episode: Int)? {
        print("⏭️ [StreamingService] Checking for next episode after S\(currentSeason) E\(currentEpisode)...")
        
        // Helper to check if episode is released
        func isReleased(_ ep: Episode) -> Bool {
            guard let dateStr = ep.airDate, !dateStr.isEmpty else {
                // STRICTER CHECK: If no date, assume NOT released for "Next Episode" prompt purposes.
                // We only want to auto-play definitely released episodes.
                print("⚠️ [StreamingService] Episode S\(ep.seasonNumber) E\(ep.episodeNumber) has NO air_date. Treating as unreleased.")
                return false
            }
            
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            guard let date = formatter.date(from: dateStr) else {
                print("⚠️ [StreamingService] Could not parse air_date: '\(dateStr)'. Treating as unreleased.")
                return false
            }
            
            // Allow if date is today or in past
            let isPast = date <= Date()
            print("🗓️ [StreamingService] Checking S\(ep.seasonNumber) E\(ep.episodeNumber): AirDate='\(dateStr)' released? \(isPast)")
            return isPast
        }
        
        // 1. Check if next episode exists in CURRENT season
        if let seasonDetails = try? await TMDBService.shared.fetchSeasonDetails(seriesId: seriesId, seasonNumber: currentSeason) {
            let episodes = seasonDetails.episodes
            let nextEpNum = currentEpisode + 1
            
            if let nextEp = episodes.first(where: { $0.episodeNumber == nextEpNum }) {
                if isReleased(nextEp) {
                    print("✅ [StreamingService] Found RELEASED next episode in same season: S\(currentSeason) E\(nextEpNum)")
                    return (currentSeason, nextEpNum)
                } else {
                    print("🚫 [StreamingService] Found next episode S\(currentSeason) E\(nextEpNum) but likely UNRELEASED (Date: \(nextEp.airDate ?? "nil"))")
                }
            }
        }
        
        // 2. Check if next SEASON exists (Episode 1)
        let nextSeasonNum = currentSeason + 1
        if let nextSeasonDetails = try? await TMDBService.shared.fetchSeasonDetails(seriesId: seriesId, seasonNumber: nextSeasonNum) {
            let episodes = nextSeasonDetails.episodes
            if !episodes.isEmpty {
                 // Check if Episode 1 exists
                 if let firstEp = episodes.first(where: { $0.episodeNumber == 1 }) {
                     if isReleased(firstEp) {
                         print("✅ [StreamingService] Found RELEASED first episode of next season: S\(nextSeasonNum) E1")
                         return (nextSeasonNum, 1)
                     } else {
                         print("🚫 [StreamingService] Found next season S\(nextSeasonNum) E1 but likely UNRELEASED (Date: \(firstEp.airDate ?? "nil"))")
                     }
                 } else if let first = episodes.first {
                     // Fallback for weird numbering
                     if isReleased(first) {
                         return (nextSeasonNum, first.episodeNumber)
                     }
                 }
            }
        }
        
        print("🚫 [StreamingService] No next episode found.")
        return nil
    }
    
    /// Finds a source that best matches the previous source's criteria
    func findMatchingSource(sources: [StreamingSource], previousProvider: String, previousLanguage: String, previousQuality: String = "") -> StreamingSource? {
        print("🔍 [StreamingService] Looking for source matching Provider: \(previousProvider), Language: \(previousLanguage), Quality: \(previousQuality)")
        print("🔍 [StreamingService] Candidates: \(sources.map { "(\($0.provider), \($0.language), \($0.quality))" })")
        
        // 1. Exact Match (Provider + Language + Quality)
        if !previousQuality.isEmpty {
            if let exactMatch = sources.first(where: {
                $0.provider.lowercased() == previousProvider.lowercased() &&
                $0.language.lowercased() == previousLanguage.lowercased() &&
                $0.quality.lowercased() == previousQuality.lowercased()
            }) {
                print("✅ [StreamingService] Found EXACT match (Provider+Language+Quality): \(exactMatch.provider) (\(exactMatch.language)) [\(exactMatch.quality)]")
                return exactMatch
            }
        }
        
        // 2. Provider + Language Match (ignore quality)
        if let providerLangMatch = sources.first(where: {
            $0.provider.lowercased() == previousProvider.lowercased() &&
            $0.language.lowercased() == previousLanguage.lowercased()
        }) {
            print("✅ [StreamingService] Found PROVIDER+LANGUAGE match: \(providerLangMatch.provider) (\(providerLangMatch.language)) [\(providerLangMatch.quality)]")
            return providerLangMatch
        }
        
        // 3. Same Language, Any Provider
        // Prefer "vidmoly" or "vidzy" if available as they are reliable, else take first
        let sameLangSources = sources.filter { $0.language.lowercased() == previousLanguage.lowercased() }
        
        if let vidmoly = sameLangSources.first(where: { $0.provider == "vidmoly" }) {
             print("✅ [StreamingService] Found SAME LANGUAGE match (Vidmoly): \(vidmoly.provider)")
             return vidmoly
        }
        
        if let vidzy = sameLangSources.first(where: { $0.provider == "vidzy" }) {
             print("✅ [StreamingService] Found SAME LANGUAGE match (Vidzy): \(vidzy.provider)")
             return vidzy
        }
        
        if let anySameLang = sameLangSources.first {
            print("✅ [StreamingService] Found SAME LANGUAGE match: \(anySameLang.provider)")
            return anySameLang
        }
        
        // 4. Fallback: First available source
        if let first = sources.first {
            print("⚠️ [StreamingService] No match found. Fallback to first available: \(first.provider) (\(first.language))")
            return first
        }
        
        print("❌ [StreamingService] No matching source found.")
        return nil
    }
    
    // MARK: - Source Extraction
    
    /// Attempts to extract a direct playable link (mp4/hls) from an embed URL
    func extractDirectLink(for source: StreamingSource) async -> StreamingSource {
        let provider = source.provider.lowercased()
        
        // Only attempt extraction for providers known to strictly need it if they are embeds
        // Use existing extraction methods that map to the backend API or proxy helpers
        if provider == "vidmoly" {
            print("⛏️ [StreamingService] Extracting VidMoly via existing method...")
            do {
                let directUrl = try await extractVidMoly(url: source.url)
                print("✅ [StreamingService] VidMoly extraction successful: \(directUrl)")
                return StreamingSource(
                    id: source.id,
                    url: directUrl,
                    quality: source.quality,
                    type: directUrl.contains(".m3u8") ? "hls" : "mp4",
                    provider: source.provider,
                    language: source.language,
                    origin: source.origin,
                    tracks: source.tracks,
                    headers: source.headers
                )
            } catch {
                print("⚠️ [StreamingService] VidMoly extraction failed: \(error). Using original.")
            }
        } else if provider == "vidzy" {
            print("⛏️ [StreamingService] Extracting Vidzy via existing method...")
            do {
                let directUrl = try await extractVidzy(url: source.url)
                print("✅ [StreamingService] Vidzy extraction successful: \(directUrl)")
                return StreamingSource(
                    id: source.id,
                    url: directUrl,
                    quality: source.quality,
                    type: directUrl.contains(".m3u8") ? "hls" : "mp4",
                    provider: source.provider,
                    language: source.language,
                    origin: source.origin,
                    tracks: source.tracks,
                    headers: source.headers
                )
            } catch {
                 print("⚠️ [StreamingService] Vidzy extraction failed: \(error). Using original.")
            }
        } else if provider == "luluvid" {
            print("⛏️ [StreamingService] Extracting Luluvid via client-side method...")
            do {
                let directUrl = try await extractLuluvid(url: source.url)
                print("✅ [StreamingService] Luluvid extraction successful: \(directUrl)")
                return StreamingSource(
                    id: source.id,
                    url: directUrl,
                    quality: source.quality,
                    type: "hls", // It's always HLS
                    provider: source.provider,
                    language: source.language,
                    origin: source.origin,
                    tracks: source.tracks,
                    headers: source.headers
                )
            } catch {
                 print("⚠️ [StreamingService] Luluvid extraction failed: \(error). Using original.")
            }
        }
        
        // Return original if no extraction needed or failed
        return source
    }
    // MARK: - TMDB Proxy API (Luluvid Integration)
    
    private func fetchTmdbProxySources(tmdbId: Int, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        var urlString = "\(baseUrl)/api/movix-proxy?path=tmdb/\(season == nil ? "movie" : "tv")/\(tmdbId)"
        if let s = season, let e = episode {
            urlString += "&season=\(s)&episode=\(e)"
        }
        
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        print("🌍 [TMDB Proxy] Fetching: \(urlString)")
        
        var request = URLRequest(url: url)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", forHTTPHeaderField: "Accept")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.setValue("https://google.com", forHTTPHeaderField: "Referer")
        request.timeoutInterval = 15
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return []
        }
        
        struct TmdbProxyLink: Codable {
            let decoded_url: String
            let quality: String?
            let language: String?
        }
        
        struct CurrentEpisode: Codable {
            let player_links: [TmdbProxyLink]?
        }
        
        struct TmdbProxyResponse: Codable {
            let player_links: [TmdbProxyLink]?
            let current_episode: CurrentEpisode?
        }
        
        do {
            let result = try JSONDecoder().decode(TmdbProxyResponse.self, from: data)
            var sources: [StreamingSource] = []
            
            // Check both root player_links and current_episode.player_links
            let links = result.current_episode?.player_links ?? result.player_links ?? []
            
            for (index, link) in links.enumerated() {
                let url = link.decoded_url
                
                // Filter for Luluvid / Lulustream
                if url.contains("luluvid") || url.contains("lulustream") {
                     let lang = (link.language ?? "VF").uppercased()
                     let normalizedLang = lang.contains("FRENCH") ? "VF" : lang
                     
                     let source = StreamingSource(
                         id: "tmdb-proxy-luluvid-\(index)",
                         url: url,
                         quality: link.quality ?? "HD", // Default to HD
                         type: "hls", // Must be hls/mp4 to be visible in UI, extraction handled by provider check
                         provider: "luluvid",
                         language: normalizedLang,
                         origin: "tmdb-proxy"
                     )
                     sources.append(source)
                     print("✅ [TMDB Proxy] Added Luluvid: \(url)")
                }
            }
            return sources
        } catch {
            print("❌ [TMDB Proxy] Decode error: \(error)")
            return []
        }
    }
}
