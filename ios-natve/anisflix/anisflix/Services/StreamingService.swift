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
    let errors: [UniversalVOError]?
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
        
        // Fetch TMDB info for AfterDark (needs title and year)
        let tmdbInfo = try? await fetchMovieTmdbInfo(movieId: movieId)
        var afterDarkSources: [StreamingSource] = []
        if let title = tmdbInfo?.title, let year = tmdbInfo?.year {
            print("ℹ️ [StreamingService] TMDB Info found: \(title) (\(year))")
            afterDarkSources = (try? await fetchAfterDarkSources(
                tmdbId: movieId,
                type: "movie",
                title: title,
                year: year,
                originalTitle: tmdbInfo?.originalTitle
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
        
        var allSources: [StreamingSource] = []
        
        if let tmdb = tmdb {
            allSources.append(contentsOf: tmdb)
        }
        
        if let fstream = fstream {
            allSources.append(contentsOf: fstream)
        }
        
        if let vixsrc = vixsrc {
            allSources.append(contentsOf: vixsrc)
        }
        
        if let universalVO = universalVO {
            allSources.append(contentsOf: universalVO)
        }
        
        // Add AfterDark sources
        allSources.append(contentsOf: afterDarkSources)
        
        // Filter for Vidzy, Vixsrc, UniversalVO, and AfterDark providers
        return allSources.filter { $0.provider == "vidzy" || $0.provider == "vixsrc" || $0.provider ==  "primewire" || $0.provider == "2embed" || $0.provider == "afterdark" }
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

        // Fetch TMDB info for AfterDark (needs title)
        let tmdbInfo = try? await fetchSeriesTmdbInfo(seriesId: seriesId)
        var afterDarkSources: [StreamingSource] = []
        if let title = tmdbInfo?.title {
            print("ℹ️ [StreamingService] TMDB Info found: \(title)")
            afterDarkSources = (try? await fetchAfterDarkSources(
                tmdbId: seriesId,
                type: "tv",
                title: title,
                year: nil,
                season: season,
                episode: episode
            )) ?? []
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
        
        var allSources: [StreamingSource] = []
        
        if let tmdb = tmdb {
            allSources.append(contentsOf: tmdb)
        }
        
        if let fstream = fstream {
            allSources.append(contentsOf: fstream)
        }
        
        if let vixsrc = vixsrc {
            allSources.append(contentsOf: vixsrc)
        }
        
        if let universalVO = universalVO {
            allSources.append(contentsOf: universalVO)
        }
        
        // Add AfterDark sources
        allSources.append(contentsOf: afterDarkSources)
        
        // Filter for Vidzy, Vixsrc, UniversalVO, and AfterDark providers
        return allSources.filter { $0.provider == "vidzy" || $0.provider == "vixsrc" || $0.provider == "primewire" || $0.provider == "2embed" || $0.provider == "afterdark" }
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
        request.timeoutInterval = 15
        
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
        request.timeoutInterval = 15
        
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
            return getVidMolyProxyUrl(url: url, referer: "https://vidmoly.net/")
        }
        
        // 2. Call extraction API
        let apiUrl = URL(string: "\(baseUrl)/api/vidmoly")!
        var request = URLRequest(url: apiUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["url": url, "method": "auto"]
        request.httpBody = try JSONEncoder().encode(body)
        
        print("🌐 Calling VidMoly API: \(url)")
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("❌ VidMoly API Error: Status \((response as? HTTPURLResponse)?.statusCode ?? 0)")
            throw URLError(.badServerResponse)
        }
        
        struct VidMolyResponse: Codable {
            let success: Bool
            let m3u8Url: String?
            let method: String?
        }
        
        if let jsonString = String(data: data, encoding: .utf8) {
            print("🎬 VidMoly JSON Response: \(jsonString)")
        }
        
        let result = try JSONDecoder().decode(VidMolyResponse.self, from: data)
        print("✅ VidMoly API Response: success=\(result.success)")
        
        guard result.success, let m3u8Url = result.m3u8Url else {
            print("❌ VidMoly extraction failed: success=false or no m3u8")
            throw URLError(.cannotParseResponse)
        }
        
        // Clean URL
        var cleanedUrl = m3u8Url
        if cleanedUrl.contains(",") && cleanedUrl.contains(".urlset") {
            cleanedUrl = cleanedUrl.replacingOccurrences(of: ",", with: "")
        }
        
        // Check if proxy is needed (Real VidMoly links)
        let isRealVidMoly = (result.method == "extracted_real" ||
                             result.method == "direct_master_m3u8" ||
                             (result.method?.starts(with: "direct_pattern_") ?? false) ||
                             cleanedUrl.contains("vmwesa.online") ||
                             cleanedUrl.contains("vmeas.cloud"))
        
        if isRealVidMoly {
            return getVidMolyProxyUrl(url: cleanedUrl, referer: url)
        } else {
            return cleanedUrl
        }
    }
    
    func extractVidzy(url: String) async throws -> String {
        let apiUrl = URL(string: "\(baseUrl)/api/vidzy")!
        var request = URLRequest(url: apiUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // api/vidzy expects just { "url": "..." }
        let body: [String: String] = ["url": url]
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
        
        struct VidzyRealResponse: Codable {
            let m3u8Url: String?
            let error: String?
        }
        
        let result = try JSONDecoder().decode(VidzyRealResponse.self, from: data)
        
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
        
        var decodedUrl = url
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
        // Step 2: Encode the result (equivalent to URLSearchParams encoding the value)
        let finalReferer = step1Referer.addingPercentEncoding(withAllowedCharacters: allowed) ?? step1Referer
        
        // Append a dummy parameter forcing .m3u8 extension for AVPlayer detection
        return "\(baseUrl)/api/vidmoly?url=\(encodedUrl)&referer=\(finalReferer)&_=.m3u8"
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
        let urlString = "https://api.themoviedb.org/3/tv/\(seriesId)?api_key=\(apiKey)"
        
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
}
