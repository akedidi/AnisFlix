//
//  FSVidService.swift
//  anisflix
//
//  Extrait les liens M3U8 FSVid (player: 'premium') depuis l'API FStream.
//  Flux:
//    1. GET /api/movix-proxy?path=fstream/{type}/{id}[/season/{s}]
//       → retourne players["VF"] / players["VOSTFR"] avec player: "premium"
//    2. Pour chaque embed URL FSVid:
//       POST /api/extract  { type: "fsvid", url: embedUrl }
//       → retourne { m3u8Url, headers }
//    3. Lecture directe AVPlayer avec Referer: https://fsvid.lol/ (pas de proxy nécessaire sur iOS)
//

import Foundation

// MARK: - FStream API Response Models

private struct FStreamAPIResponse: Codable {
    let success: Bool?
    let players: [String: [FStreamPlayer]]?
    let episodes: [String: FStreamEpisode]?
}

private struct FStreamPlayer: Codable {
    let url: String
    let type: String
    let quality: String
    let player: String
}

private struct FStreamEpisode: Codable {
    let number: Int?
    let title: String?
    let languages: FStreamEpisodeLanguages?
}

private struct FStreamEpisodeLanguages: Codable {
    let VF: [FStreamPlayer]?
    let VOSTFR: [FStreamPlayer]?
}

// MARK: - Extract API Response

private struct ExtractAPIResponse: Codable {
    let success: Bool?
    let m3u8Url: String?
    let type: String?
    let headers: [String: String]?
}

// MARK: - FSVidService

class FSVidService {
    static let shared = FSVidService()
    private init() {}
    
    private let baseUrl = "https://anisflix.vercel.app"
    
    // MARK: - Public API
    
    /// Fetch FSVid sources for a movie
    func fetchMovieSources(tmdbId: Int) async -> [StreamingSource] {
        print("🎬 [FSVid] Fetching movie sources for TMDB ID: \(tmdbId)")
        let path = "fstream/movie/\(tmdbId)"
        return await fetchAndExtract(path: path, episode: nil)
    }
    
    /// Fetch FSVid sources for a TV series episode
    func fetchSeriesSources(tmdbId: Int, season: Int, episode: Int) async -> [StreamingSource] {
        print("📺 [FSVid] Fetching series sources for TMDB ID: \(tmdbId) S\(season)E\(episode)")
        let path = "fstream/tv/\(tmdbId)/season/\(season)"
        return await fetchAndExtract(path: path, episode: episode)
    }
    
    // MARK: - Private Implementation
    
    private func fetchAndExtract(path: String, episode: Int?) async -> [StreamingSource] {
        // Step 1: Fetch FStream API
        guard let fstreamData = await fetchFStreamAPI(path: path) else {
            print("❌ [FSVid] FStream API returned nil for path: \(path)")
            return []
        }
        
        // Step 2: Collect FSVid embed URLs (player: "premium")
        var embedUrls: [(url: String, language: String)] = []
        
        if let episode = episode {
            // TV series: look in episodes dict
            if let episodes = fstreamData.episodes {
                // Find the episode by number
                for (_, ep) in episodes {
                    if ep.number == episode {
                        if let vfPlayers = ep.languages?.VF {
                            let fsvidPlayers = vfPlayers.filter { $0.player.lowercased() == "premium" }
                            embedUrls += fsvidPlayers.map { ($0.url, "VF") }
                        }
                        if let vostfrPlayers = ep.languages?.VOSTFR {
                            let fsvidPlayers = vostfrPlayers.filter { $0.player.lowercased() == "premium" }
                            embedUrls += fsvidPlayers.map { ($0.url, "VOSTFR") }
                        }
                        break
                    }
                }
            }
        } else {
            // Movie: look in players dict
            if let players = fstreamData.players {
                for (langKey, playerList) in players {
                    let language: String
                    switch langKey {
                    case "VOSTFR": language = "VOSTFR"
                    case "VO", "ENG", "English": language = "VO"
                    default: language = "VF" // VF, Default, VFQ, etc.
                    }
                    
                    // Only VF and VOSTFR for FSVid (user request)
                    guard language == "VF" || language == "VOSTFR" else { continue }
                    
                    let fsvidPlayers = playerList.filter { $0.player.lowercased() == "premium" }
                    embedUrls += fsvidPlayers.map { ($0.url, language) }
                }
            }
        }
        
        print("🔗 [FSVid] Found \(embedUrls.count) FSVid embed URLs")
        
        if embedUrls.isEmpty { return [] }
        
        // Step 3: Extract M3U8 from each embed URL concurrently
        let sources = await withTaskGroup(of: StreamingSource?.self) { group in
            for (embedUrl, language) in embedUrls {
                group.addTask {
                    return await self.extractM3U8(embedUrl: embedUrl, language: language)
                }
            }
            
            var results: [StreamingSource] = []
            for await source in group {
                if let source = source {
                    results.append(source)
                }
            }
            return results
        }
        
        print("✅ [FSVid] Extracted \(sources.count) M3U8 sources")
        return sources
    }
    
    private func fetchFStreamAPI(path: String) async -> FStreamAPIResponse? {
        let urlString = "\(baseUrl)/api/movix-proxy?path=\(path)"
        guard let url = URL(string: urlString) else { return nil }
        
        do {
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.timeoutInterval = 15
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                print("❌ [FSVid] FStream API HTTP error for \(path)")
                return nil
            }
            
            return try JSONDecoder().decode(FStreamAPIResponse.self, from: data)
        } catch {
            print("❌ [FSVid] FStream API error: \(error.localizedDescription)")
            return nil
        }
    }
    
    private func extractM3U8(embedUrl: String, language: String) async -> StreamingSource? {
        print("🔍 [FSVid] Extracting M3U8 from: \(embedUrl.prefix(60))...")
        
        guard let url = URL(string: "\(baseUrl)/api/extract") else { return nil }
        
        do {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 20
            
            let body: [String: String] = ["type": "fsvid", "url": embedUrl]
            request.httpBody = try JSONEncoder().encode(body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                print("❌ [FSVid] Extract API HTTP error for \(embedUrl.prefix(40))")
                return nil
            }
            
            let result = try JSONDecoder().decode(ExtractAPIResponse.self, from: data)
            
            guard let m3u8Url = result.m3u8Url, !m3u8Url.isEmpty else {
                print("❌ [FSVid] No M3U8 URL in extract response")
                return nil
            }
            
            print("✅ [FSVid] M3U8 extracted (\(language)): \(m3u8Url.prefix(60))...")
            
            // Build headers for direct playback (no proxy needed on iOS)
            let headers: [String: String] = result.headers ?? [
                "Referer": "https://fsvid.lol/",
                "Origin": "https://fsvid.lol",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ]
            
            return StreamingSource(
                id: "fsvid_\(language)_\(m3u8Url.hashValue)",
                url: m3u8Url,
                quality: "HD",
                type: "hls",
                provider: "fsvid",
                language: language,
                origin: "fstream",
                headers: headers
            )
        } catch {
            print("❌ [FSVid] Extract error: \(error.localizedDescription)")
            return nil
        }
    }
}
