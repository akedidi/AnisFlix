//
//  VidlinkService.swift
//  anisflix
//
//  Created by AI Assistant on 05/03/2026.
//

import Foundation

class VidlinkService {
    static let shared = VidlinkService()
    
    private let tmdbApiKey = "68e094699525b18a70bab2f86b1fa706"
    private let encDecApi = "https://enc-dec.app/api"
    private let vidlinkApi = "https://vidlink.pro/api/b"
    
    private let headers = [
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "Connection": "keep-alive",
        "Referer": "https://vidlink.pro/",
        "Origin": "https://vidlink.pro"
    ]
    
    private let qualityOrder: [String: Int] = ["4K": 5, "1440p": 4, "1080p": 3, "720p": 2, "480p": 1, "360p": 0, "240p": -1, "Auto": -2, "Unknown": -3]
    
    // MARK: - Models
    
    struct ExtractedSource {
        let name: String
        let url: String
        let quality: String?
    }
    
    // MARK: - API Response Structures
    
    private struct EncryptResponse: Codable {
        let result: String?
    }
    
    private struct TMDBSimpleMovie: Codable {
        let title: String?
        let release_date: String?
    }
    
    private struct TMDBSimpleTV: Codable {
        let name: String?
        let first_air_date: String?
    }
    
    // MARK: - Main Fetch Method
    
    func getStreams(tmdbId: String, mediaType: String = "movie", season: Int? = nil, episode: Int? = nil) async throws -> [ExtractedSource] {
        print("🎬 [VidlinkService] Fetching streams for TMDB:\(tmdbId), Type:\(mediaType)")
        
        let info = try await getTmdbInfo(tmdbId: tmdbId, mediaType: mediaType)
        let encryptedId = try await encryptTmdbId(tmdbId: tmdbId)
        
        var streamTitle = info.title
        if mediaType == "tv", let s = season, let e = episode {
            streamTitle = "\(info.title) S\(String(format: "%02d", s))E\(String(format: "%02d", e))"
        } else if let year = info.year {
            streamTitle = "\(info.title) (\(year))"
        }
        
        let vidlinkUrl: URL
        if mediaType == "tv", let s = season, let e = episode {
            vidlinkUrl = URL(string: "\(vidlinkApi)/tv/\(encryptedId)/\(s)/\(e)")!
        } else {
            vidlinkUrl = URL(string: "\(vidlinkApi)/movie/\(encryptedId)")!
        }
        
        print("🌍 [VidlinkService] Requesting: \(vidlinkUrl.absoluteString)")
        var request = URLRequest(url: vidlinkUrl)
        request.allHTTPHeaderFields = headers
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let rawDict = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] ?? [:]
        var rawStreams = processVidlinkResponse(data: rawDict, title: streamTitle)
        
        if rawStreams.isEmpty { return [] }
        
        let playlistStreams = rawStreams.filter { $0.2 == true } // isPlaylist
        let directStreams = rawStreams.filter { $0.2 == false }
        
        var allSources: [ExtractedSource] = directStreams.map {
            ExtractedSource(name: $0.1, url: $0.0, quality: $0.3)
        }
        
        if !playlistStreams.isEmpty {
            for ps in playlistStreams {
                let parsed = await fetchAndParseM3U8(playlistUrl: ps.0, title: streamTitle)
                allSources.append(contentsOf: parsed)
            }
        }
        
        // Sort
        allSources.sort { s1, s2 in
            let q1 = qualityOrder[s1.quality ?? "Unknown"] ?? -3
            let q2 = qualityOrder[s2.quality ?? "Unknown"] ?? -3
            return q1 > q2
        }
        
        print("✅ [VidlinkService] Returning \(allSources.count) streams")
        return allSources
    }
    
    // MARK: - Helpers
    
    private func getTmdbInfo(tmdbId: String, mediaType: String) async throws -> (title: String, year: String?) {
        let endpoint = mediaType == "tv" ? "tv" : "movie"
        let url = URL(string: "https://api.themoviedb.org/3/\(endpoint)/\(tmdbId)?api_key=\(tmdbApiKey)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        
        if mediaType == "tv" {
            let res = try JSONDecoder().decode(TMDBSimpleTV.self, from: data)
            let year = String(res.first_air_date?.prefix(4) ?? "")
            return (res.name ?? "", year.isEmpty ? nil : year)
        } else {
            let res = try JSONDecoder().decode(TMDBSimpleMovie.self, from: data)
            let year = String(res.release_date?.prefix(4) ?? "")
            return (res.title ?? "", year.isEmpty ? nil : year)
        }
    }
    
    private func encryptTmdbId(tmdbId: String) async throws -> String {
        let url = URL(string: "\(encDecApi)/enc-vidlink?text=\(tmdbId)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let res = try JSONDecoder().decode(EncryptResponse.self, from: data)
        guard let result = res.result else {
            throw URLError(.cannotDecodeRawData)
        }
        return result
    }
    
    private func extractQuality(_ source: Any) -> String {
        guard let streamDict = source as? [String: Any] else { return "Unknown" }
        
        for field in ["quality", "resolution", "label", "name"] {
            guard let val = streamDict[field] as? String else { continue }
            let q = val.lowercased()
            if q.contains("2160") || q.contains("4k") { return "4K" }
            if q.contains("1440") || q.contains("2k") { return "1440p" }
            if q.contains("1080") || q.contains("fhd") { return "1080p" }
            if q.contains("720") || q.contains("hd") { return "720p" }
            if q.contains("480") || q.contains("sd") { return "480p" }
            if q.contains("360") { return "360p" }
            if q.contains("240") { return "240p" }
            
            // Regex match
            if let regex = try? NSRegularExpression(pattern: "(\\d{3,4})[pP]?") {
                if let match = regex.firstMatch(in: q, range: NSRange(q.startIndex..., in: q)) {
                    if let rRange = Range(match.range(at: 1), in: q), let r = Int(q[rRange]) {
                        if r >= 2160 { return "4K" }
                        if r >= 1440 { return "1440p" }
                        if r >= 1080 { return "1080p" }
                        if r >= 720 { return "720p" }
                        if r >= 480 { return "480p" }
                        if r >= 360 { return "360p" }
                        return "240p"
                    }
                }
            }
        }
        return "Unknown"
    }
    
    private func getQualityFromResolution(_ res: String?) -> String {
        guard let resolution = res, resolution.contains("x") else { return "Auto" }
        let comps = resolution.split(separator: "x")
        guard comps.count > 1, let h = Int(comps[1]) else { return "Auto" }
        
        if h >= 2160 { return "4K" }
        if h >= 1440 { return "1440p" }
        if h >= 1080 { return "1080p" }
        if h >= 720 { return "720p" }
        if h >= 480 { return "480p" }
        if h >= 360 { return "360p" }
        return "240p"
    }
    
    /// Returns (url, name, isPlaylist, quality)
    private func processVidlinkResponse(data: [String: Any], title: String) -> [(String, String, Bool, String)] {
        var streams: [(String, String, Bool, String)] = []
        
        if let streamData = data["stream"] as? [String: Any] {
            if let qualities = streamData["qualities"] as? [String: Any] {
                for (qualityKey, val) in qualities {
                    if let qData = val as? [String: Any], let url = qData["url"] as? String {
                        let q = extractQuality(["quality": qualityKey])
                        streams.append((url, "Vidlink - \(q)", false, q))
                    }
                }
                if let playlist = streamData["playlist"] as? String {
                    streams.append((playlist, "Playlist", true, "Auto"))
                }
            } else if let playlist = streamData["playlist"] as? String {
                streams.append((playlist, "Playlist", true, "Auto"))
            }
        } else if let url = data["url"] as? String {
            let q = extractQuality(data)
            streams.append((url, "Vidlink - \(q)", false, q))
        }
        
        return streams
    }
    
    private func fetchAndParseM3U8(playlistUrl: String, title: String) async -> [ExtractedSource] {
        guard let url = URL(string: playlistUrl) else { return [] }
        var request = URLRequest(url: url)
        request.allHTTPHeaderFields = headers
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            guard let content = String(data: data, encoding: .utf8) else {
                return [ExtractedSource(name: "Vidlink - Auto", url: playlistUrl, quality: "Auto")]
            }
            
            let lines = content.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            var streams: [ExtractedSource] = []
            var currentRes: String? = nil
            
            for line in lines {
                if line.hasPrefix("#EXT-X-STREAM-INF:") {
                    if let range = line.range(of: "RESOLUTION=") {
                        let sub = line[range.upperBound...]
                        if let comma = sub.firstIndex(of: ",") {
                            currentRes = String(sub[..<comma])
                        } else {
                            currentRes = String(sub)
                        }
                    }
                } else if !line.hasPrefix("#") {
                    var absoluteURL: String
                    if line.hasPrefix("http") {
                        absoluteURL = line
                    } else if line.hasPrefix("/") {
                        // Absolute path on same host - use URL(string:relativeTo:) to correctly parse query strings
                        if let resolved = URL(string: line, relativeTo: url) {
                            absoluteURL = resolved.absoluteString
                        } else {
                            absoluteURL = line
                        }
                        
                        // Inherit query from parent URL if the entry doesn't have its own query
                        if !absoluteURL.contains("?"), let parentQuery = url.query {
                            absoluteURL += "?\(parentQuery)"
                        }
                    } else {
                        // Relative path: Use URL(string:relativeTo:) to properly parse query strings on 'line'
                        if let resolved = URL(string: line, relativeTo: url.deletingLastPathComponent()) {
                            absoluteURL = resolved.absoluteString
                        } else {
                            absoluteURL = line
                        }
                        
                        // Re-attach query parameters if the new URL doesn't have any but the parent does
                        if !absoluteURL.contains("?"), let parentQuery = url.query {
                            absoluteURL += "?\(parentQuery)"
                        }
                    }
                    
                    let q = getQualityFromResolution(currentRes)
                    streams.append(ExtractedSource(name: "Vidlink - \(q)", url: absoluteURL, quality: q))
                    currentRes = nil
                }
            }
            
            if streams.isEmpty {
                return [ExtractedSource(name: "Vidlink - Auto", url: playlistUrl, quality: "Auto")]
            }
            return streams
            
        } catch {
            return [ExtractedSource(name: "Vidlink - Auto", url: playlistUrl, quality: "Auto")]
        }
    }
}
