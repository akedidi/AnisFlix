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
    let provider: String // "vidmoly", "vidzy", "darki", "unknown"
    let type: String // "hls", "mp4", etc.
    
    enum CodingKeys: String, CodingKey {
        case url = "decoded_url"
        case quality
        case language
        // id is excluded
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        url = try container.decode(String.self, forKey: .url)
        quality = try container.decodeIfPresent(String.self, forKey: .quality) ?? "HD"
        language = try container.decodeIfPresent(String.self, forKey: .language) ?? "Français"
        
        // Determine provider from quality string
        let lowerQuality = quality.lowercased()
        if lowerQuality.contains("vidmoly") {
            provider = "vidmoly"
        } else if lowerQuality.contains("vidzy") {
            provider = "vidzy"
        } else if lowerQuality.contains("darki") {
            provider = "darki"
        } else {
            provider = "unknown"
        }
        
        // Determine type
        if url.contains(".m3u8") {
            type = "hls"
        } else {
            type = "mp4"
        }
        
        // Generate stable ID based on content to persist download status across reloads
        // We use a combination of provider, quality, language and a hash of the URL to keep it reasonable length
        // Note: We avoid Swift's hashValue as it's not stable across launches. 
        // We'll use the URL directly if it's not too long, otherwise we'd need a stable hash.
        // For now, let's use the URL as the main unique identifier component.
        id = "\(provider)_\(quality)_\(language)_\(url)".data(using: .utf8)?.base64EncodedString() ?? UUID().uuidString
    }
    
    // Init for preview/manual creation
    init(id: String? = nil, url: String, quality: String, type: String, provider: String, language: String) {
        self.url = url
        self.quality = quality
        self.type = type
        self.provider = provider
        self.language = language
        
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
    }
}



struct MovixTmdbResponse: Codable {
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
    
    enum CodingKeys: String, CodingKey {
        case url = "file" // Map JSON 'file' to 'url'
        case quality, kind, server, name, proxied
    }
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
        async let universalVOSources = fetchUniversalVOSources(tmdbId: movieId, type: "movie")
        
        print("🔍 [StreamingService] Starting fetch for movie ID: \(movieId)")
        
        // Fetch TMDB info for AfterDark and Movix Download (needs title)
        let tmdbInfo = try? await fetchMovieTmdbInfo(movieId: movieId)
        var afterDarkSources: [StreamingSource] = []
        var movixDownloadSources: [StreamingSource] = []
        
        if let title = tmdbInfo?.title {
            print("ℹ️ [StreamingService] TMDB Info found: \(title) (\(tmdbInfo?.year ?? "?"))")
            
            // Fetch AfterDark sources
            if let year = tmdbInfo?.year {
                afterDarkSources = (try? await fetchAfterDarkSources(
                    tmdbId: movieId,
                    type: "movie",
                    title: title,
                    year: year,
                    originalTitle: tmdbInfo?.originalTitle
                )) ?? []
            }
            
            // Fetch Movix Download sources (TMDB ID matching)
            movixDownloadSources = (try? await fetchMovixDownloadSources(
                tmdbId: movieId,
                type: "movie",
                title: title
            )) ?? []
        } else {
             print("⚠️ [StreamingService] TMDB Info fetch failed for movie ID: \(movieId)")
        }
        
        let (tmdb, fstream, vixsrc, universalVO) = await (try? tmdbSources, try? fstreamSources, try? vixsrcSources, try? universalVOSources)
        
        print("📊 [StreamingService] Sources fetched:")
        print("   - TMDB: \(tmdb?.count ?? 0)")
        print("   - FStream: \(fstream?.count ?? 0)")
        print("   - Vixsrc: \(vixsrc?.count ?? 0)")
        print("   - UniversalVO: \(universalVO?.count ?? 0)")
        print("   - AfterDark: \(afterDarkSources.count)")
        print("   - Movix Download: \(movixDownloadSources.count)")
        
        var allSources: [StreamingSource] = []
        
        // Add TMDB sources FIRST (includes Vidzy)
        if let tmdb = tmdb {
            allSources.append(contentsOf: tmdb)
        }
        
        // Add Movix/Darkibox Download sources second
        allSources.append(contentsOf: movixDownloadSources)
        
        if let universalVO = universalVO {
            allSources.append(contentsOf: universalVO)
        }
        
        // Add AfterDark sources
        allSources.append(contentsOf: afterDarkSources)
        
        if let vixsrc = vixsrc {
            allSources.append(contentsOf: vixsrc)
        }
        
        if let fstream = fstream {
            allSources.append(contentsOf: fstream)
        }
        
        // Filter for allowed providers (added "darkibox")
        return allSources.filter { $0.provider == "vidmoly" || $0.provider == "vidzy" || $0.provider == "vixsrc" || $0.provider == "primewire" || $0.provider == "2embed" || $0.provider == "afterdark" || $0.provider == "movix" || $0.provider == "darkibox" }
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
                        language: language
                    )
                    sources.append(source)
                }
            }
        }
        
        return sources
    }
    
    func fetchSeriesSources(seriesId: Int, season: Int, episode: Int) async throws -> [StreamingSource] {
        // Fetch from all endpoints concurrently
        async let tmdbSources = fetchTmdbSeriesSources(seriesId: seriesId, season: season, episode: episode)
        async let fstreamSources = fetchFStreamSeriesSources(seriesId: seriesId, season: season, episode: episode)
        async let vixsrcSources = fetchVixsrcSources(tmdbId: seriesId, type: "tv", season: season, episode: episode)
        async let universalVOSources = fetchUniversalVOSources(tmdbId: seriesId, type: "tv", season: season, episode: episode)
        
        print("🔍 [StreamingService] Starting fetch for series ID: \(seriesId) S\(season)E\(episode)")

        // Fetch TMDB info for AfterDark and Movix Download (needs title)
        let tmdbInfo = try? await fetchSeriesTmdbInfo(seriesId: seriesId)
        var afterDarkSources: [StreamingSource] = []
        var movixDownloadSources: [StreamingSource] = []
        // Add Anime sources
        var animeSources: [StreamingSource] = []
        
        if let title = tmdbInfo?.title {
            print("ℹ️ [StreamingService] TMDB Info found: \(title)")
            
            // Start Anime fetch concurrently if we have title
            async let fetchedAnime = fetchMovixAnimeSources(seriesId: seriesId, title: title, season: season, episode: episode)
            
            // Fetch AfterDark sources
            afterDarkSources = (try? await fetchAfterDarkSources(
                tmdbId: seriesId,
                type: "tv",
                title: title,
                year: nil,
                season: season,
                episode: episode
            )) ?? []
            
            // Fetch Movix Download sources (TMDB ID matching)
            movixDownloadSources = (try? await fetchMovixDownloadSources(
                tmdbId: seriesId,
                type: "tv",
                title: title,
                season: season,
                episode: episode
            )) ?? []
            
             // Await Anime sources
            animeSources = (try? await fetchedAnime) ?? []
        } else {
            print("⚠️ [StreamingService] TMDB Info fetch failed for series ID: \(seriesId)")
        }
        
        let (tmdb, fstream, vixsrc, universalVO) = await (try? tmdbSources, try? fstreamSources, try? vixsrcSources, try? universalVOSources)
        
        print("📊 [StreamingService] Series Sources fetched:")
        print("   - TMDB: \(tmdb?.count ?? 0)")
        print("   - FStream: \(fstream?.count ?? 0)")
        print("   - Vixsrc: \(vixsrc?.count ?? 0)")
        print("   - UniversalVO: \(universalVO?.count ?? 0)")
        print("   - AfterDark: \(afterDarkSources.count)")
        print("   - Movix Download: \(movixDownloadSources.count)")
        print("   - Movix Anime: \(animeSources.count)")
        
        var allSources: [StreamingSource] = []
        
        // Add Anime sources FIRST (High Priority for VidMoly)
        allSources.append(contentsOf: animeSources)
        
        // Add TMDB sources FIRST (includes Vidzy)
        if let tmdb = tmdb {
            allSources.append(contentsOf: tmdb)
        }
        
        // Add Movix/Darkibox Download sources second
        allSources.append(contentsOf: movixDownloadSources)
        
        if let universalVO = universalVO {
            allSources.append(contentsOf: universalVO)
        }
        
        // Add AfterDark sources
        allSources.append(contentsOf: afterDarkSources)
        
        if let vixsrc = vixsrc {
            allSources.append(contentsOf: vixsrc)
        }
        
        if let fstream = fstream {
            allSources.append(contentsOf: fstream)
        }
        
        // Filter for allowed providers (added "darkibox")
        return allSources.filter { $0.provider == "vidmoly" || $0.provider == "vidzy" || $0.provider == "vixsrc" || $0.provider == "primewire" || $0.provider == "2embed" || $0.provider == "afterdark" || $0.provider == "movix" || $0.provider == "darkibox" }
    }
    
    private func fetchTmdbSeriesSources(seriesId: Int, season: Int, episode: Int) async throws -> [StreamingSource] {
        let urlString = "\(baseUrl)/api/movix-proxy?path=tmdb/tv/\(seriesId)&season=\(season)&episode=\(episode)"
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
                        language: language
                    )
                    sources.append(source)
                }
            }
        }
        
        return sources
    }
    
    // MARK: - Stubs for Series (To be implemented)
    
    // MARK: - Subtitles
    
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
                    language: "VO"
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
                        language: language
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
        var urlString = "https://afterdark.mom/api/sources"
        
        if type == "movie" {
            urlString += "/movies?"
            var params: [String] = []
            params.append("tmdbId=\(tmdbId)")
            if let title = title {
                let encoded = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? title
                params.append("title=\(encoded)")
            }
            if let year = year {
                params.append("year=\(year)")
            }
            if let originalTitle = originalTitle {
                let encoded = originalTitle.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? originalTitle
                params.append("originalTitle=\(encoded)")
            }
            urlString += params.joined(separator: "&")
        } else if type == "tv" {
            urlString += "/shows?"
            var params: [String] = []
            params.append("tmdbId=\(tmdbId)")
            if let season = season {
                params.append("season=\(season)")
            }
            if let episode = episode {
                params.append("episode=\(episode)")
            }
            if let title = title {
                let encoded = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? title
                params.append("title=\(encoded)")
            }
            urlString += params.joined(separator: "&")
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
                
                let streamSource = StreamingSource(
                    url: source.url,
                    quality: source.quality ?? "HD",
                    type: streamType,
                    provider: "afterdark",
                    language: "VF"
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
        if url.contains(".m3u8") || url.contains("unified-streaming.com") || url.contains("vmeas.cloud") {
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
    }
    
    struct TmdbSeriesInfo {
        let title: String
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
            
            return TmdbMovieInfo(title: title, year: year, originalTitle: originalTitle)
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
            return TmdbSeriesInfo(title: title)
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
        let (data, response) = try await URLSession.shared.data(from: url)
        
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
        let (data, response) = try await URLSession.shared.data(from: url)
        
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
                
                // Detect provider from URL: darkibox.com = Darkibox, otherwise = Movix
                let detectedProvider: String
                if streamUrl.lowercased().contains("darkibox.com") {
                    detectedProvider = "darkibox"
                } else {
                    detectedProvider = "movix"
                }
                
                let streamingSource = StreamingSource(
                    id: "\(detectedProvider)-download-\(movixId)-\(index)",
                    url: streamUrl,
                    quality: source.quality ?? "HD",
                    type: streamUrl.contains(".m3u8") ? "hls" : "mp4",
                    provider: detectedProvider,
                    // Convert "Multi" to "VF" as Multi sources are actually French
                    language: (source.language?.lowercased().contains("multi") == true) ? "VF" : (source.language ?? "VF")
                )
                sources.append(streamingSource)
            }
        }
        
        print("✅ [Movix] Found \(sources.count) download sources")
        return sources
    }

    
    // MARK: - Movix Anime Fetching
    
    private func fetchMovixAnimeSources(seriesId: Int, title: String, season: Int, episode: Int) async throws -> [StreamingSource] {
        // Clean title logic (same as web)
        let isAOT = seriesId == 1429 || title.lowercased().contains("attaque des titans") || title.lowercased().contains("shingeki no kyojin")
        let searchTitle = isAOT ? "L'Attaque des Titans" : title.split(separator: ":")[0].trimmingCharacters(in: .whitespaces)
        
        // Build URL
        // replace " - Saison ..." pattern (simplified)
        // User Fix: Replace spaces AND hyphens with + instead of %20.
        // Example: One-Punch Man -> One+Punch+Man
        let encodedTitle = searchTitle.replacingOccurrences(of: " ", with: "+")
            .replacingOccurrences(of: "-", with: "+")
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)?
            .replacingOccurrences(of: "%2B", with: "+") ?? searchTitle
            
        let urlString = "\(baseUrl)/api/movix-proxy?path=anime/search/\(encodedTitle)&includeSeasons=true&includeEpisodes=true"
        
        print("🔍 [Movix Anime] Searching for: \(searchTitle) (\(urlString))")
        
        guard let url = URL(string: urlString) else { return [] }
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("⚠️ [Movix Anime] Search failed: \((response as? HTTPURLResponse)?.statusCode ?? 0)")
            // Fallback to simple search here? Web does strict check first.
             return []
        }
        
        let decoder = JSONDecoder()
        
        // The API returns an array of Anime objects
        guard let animeList = try? decoder.decode([MovixAnime].self, from: data) else {
            print("❌ [Movix Anime] Failed to decode anime list")
            return []
        }
        
        // Find best match (Web logic port)
        var match: MovixAnime? = nil
        
        if isAOT {
             match = animeList.first { $0.name.lowercased() == "shingeki no kyojin" }
             print("🔍 [Movix Anime] AOT match: \(match?.name ?? "nil")")
        }
        
        if match == nil {
             // Exact match with flexible separator
             match = animeList.first { item in
                 let itemName = item.name.lowercased().replacingOccurrences(of: "-", with: " ")
                 let sTitle = searchTitle.lowercased().replacingOccurrences(of: "-", with: " ")
                 let oTitle = title.lowercased().replacingOccurrences(of: "-", with: " ")
                 return itemName == sTitle || itemName == oTitle
             }
        }
        
        if match == nil {
            // Partial match (excluding Junior High)
            match = animeList.first { item in
                let itemName = item.name.lowercased().replacingOccurrences(of: "-", with: " ")
                let sTitle = searchTitle.lowercased().replacingOccurrences(of: "-", with: " ")
                let oTitle = title.lowercased().replacingOccurrences(of: "-", with: " ")
                
                if itemName.contains("junior") || itemName.contains("high-school") { return false }
                
                // Allow match if one contains the other
                return itemName.contains(sTitle) || sTitle.contains(itemName) ||
                       itemName.contains(oTitle) || oTitle.contains(itemName)
            }
        }
        
        guard let anime = match, let seasons = anime.seasons else {
            print("⚠️ [Movix Anime] No matching anime or seasons found")
            return []
        }
        
        print("✅ [Movix Anime] Found anime: \(anime.name)")
        
        // Season/Episode Selection Logic
        var targetSeason: MovixAnimeSeason? = nil
        var targetEpisode: MovixAnimeEpisode? = nil
        
        if seriesId == 1429 { // AOT Special Logic
            if season == 4 {
                if episode <= 16 {
                    targetSeason = seasons.first { $0.name == "Saison 4 partie 1" }
                    targetEpisode = targetSeason?.episodes?.first { $0.index == episode || $0.name.contains(String(format: "%02d", episode)) }
                } else {
                    targetSeason = seasons.first { $0.name == "Saison 4 partie 2" }
                    let offset = episode - 16
                    targetEpisode = targetSeason?.episodes?.first { $0.index == offset || $0.name.contains(String(format: "%02d", offset)) }
                }
            } else if season == 0 {
                // Specials AOT
                if episode == 36 {
                     targetSeason = seasons.first { $0.name == "Saison 4 partie 3" }
                     targetEpisode = targetSeason?.episodes?.first // First episode
                } else if episode == 37 {
                     targetSeason = seasons.first { $0.name == "Saison 4 partie 4" }
                     targetEpisode = targetSeason?.episodes?.first
                } else {
                     targetSeason = seasons.first { $0.name == "OAV" }
                     targetEpisode = targetSeason?.episodes?.first { $0.index == episode || $0.name.contains(String(format: "%02d", episode)) }
                }
            } else {
                targetSeason = seasons.first { $0.name == "Saison \(season)" }
                targetEpisode = targetSeason?.episodes?.first { $0.index == episode || $0.name.contains(String(format: "%02d", episode)) }
            }
        } else {
            // Generic Logic
             targetSeason = seasons.first {
                 ($0.index == season) ||
                 ($0.name.contains("Saison \(season)")) ||
                 (season == 0 && ($0.name.lowercased().contains("oav") || $0.name.lowercased().contains("special")))
             }
             
             if let eps = targetSeason?.episodes {
                 targetEpisode = eps.first {
                     $0.index == episode || $0.name.contains(String(format: "%02d", episode))
                 }
             }
        }
        
        guard let finalEpisode = targetEpisode, let links = finalEpisode.streaming_links else {
            print("⚠️ [Movix Anime] No episode or links found for S\(season)E\(episode)")
            return []
        }
        
        // Extract VidMoly Links
        var sources: [StreamingSource] = []
        
        for link in links {
            let language = link.language.uppercased() // VF/VOSTFR
            
            if let players = link.players {
                for (index, rawUrl) in players.enumerated() {
                    let playerUrl = rawUrl.trimmingCharacters(in: .whitespacesAndNewlines)
                    
                    // Filter: We only want VidMoly links
                    if playerUrl.lowercased().contains("vidmoly") {
                        // Normalize URL: .to -> .net
                        var normalized = playerUrl
                        if normalized.contains("vidmoly.to") {
                            normalized = normalized.replacingOccurrences(of: "vidmoly.to", with: "vidmoly.net")
                        }
                        
                        // Ensure scheme is https
                        if normalized.hasPrefix("http://") {
                            normalized = normalized.replacingOccurrences(of: "http://", with: "https://")
                        }
                        
                        let source = StreamingSource(
                            id: "movix-anime-vidmoly-\(language)-\(index)",
                            url: normalized,
                            quality: "HD",
                            type: "embed", // Will be extracted later
                            provider: "vidmoly",
                            language: language
                        )
                        sources.append(source)
                        print("   -> Added VidMoly source: \(language) - \(normalized)")
                    }
                }
            }
        }
        
        print("✅ [Movix Anime] Found \(sources.count) VidMoly sources")
        return sources
    }
}
