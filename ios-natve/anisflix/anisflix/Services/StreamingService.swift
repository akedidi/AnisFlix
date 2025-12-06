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

class StreamingService {
    static let shared = StreamingService()
    private init() {}
    
    private let baseUrl = "https://anisflix.vercel.app"
    
    // MARK: - Fetch Sources
    
    func fetchSources(movieId: Int) async throws -> [StreamingSource] {
        // Fetch from both endpoints concurrently
        async let tmdbSources = fetchTmdbSources(movieId: movieId)
        async let fstreamSources = fetchFStreamSources(movieId: movieId)
        
        let (tmdb, fstream) = await (try? tmdbSources, try? fstreamSources)
        
        var allSources: [StreamingSource] = []
        
        if let tmdb = tmdb {
            allSources.append(contentsOf: tmdb)
        }
        
        if let fstream = fstream {
            allSources.append(contentsOf: fstream)
        }
        
        // Filter for VidMoly and Vidzy
        return allSources.filter { $0.provider == "vidmoly" || $0.provider == "vidzy" }
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
        // Fetch from both endpoints concurrently
        async let tmdbSources = fetchTmdbSeriesSources(seriesId: seriesId, season: season, episode: episode)
        async let fstreamSources = fetchFStreamSeriesSources(seriesId: seriesId, season: season, episode: episode)
        
        let (tmdb, fstream) = await (try? tmdbSources, try? fstreamSources)
        
        var allSources: [StreamingSource] = []
        
        if let tmdb = tmdb {
            allSources.append(contentsOf: tmdb)
        }
        
        if let fstream = fstream {
            allSources.append(contentsOf: fstream)
        }
        
        // Filter for VidMoly and Vidzy
        return allSources.filter { $0.provider == "vidmoly" || $0.provider == "vidzy" }
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
    
    // MARK: - Extractorsion
    
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
        var components = URLComponents(string: "\(baseUrl)/api/vidmoly")!
        components.queryItems = [
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "referer", value: referer)
        ]
        return components.url?.absoluteString ?? url
    }
}
