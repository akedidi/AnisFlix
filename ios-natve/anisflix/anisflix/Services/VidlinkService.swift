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
    private let streamListApi = "https://anisflix.vercel.app/api/movix-proxy"
    private let discoveryProxy = "https://anisflix.kedidi-anis.workers.dev/"
    
    private let headers = [
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        "Connection": "keep-alive",
        "Referer": "https://vidlink.pro/",
        "Origin": "https://vidlink.pro",
        "X-Playback-Environment": "webkit"
    ]

    private let vidlinkMediaProxy = "https://flood.sourcerrr.online"
    
    private let qualityOrder: [String: Int] = ["4K": 5, "1440p": 4, "1080p": 3, "720p": 2, "480p": 1, "360p": 0, "240p": -1, "Auto": -2, "Unknown": -3]
    
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        return URLSession(configuration: config, delegate: TLSBypassDelegate(), delegateQueue: nil)
    }()
    
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

    private struct StreamListResponse: Codable {
        let streams: [StreamListItem]?
    }

    private struct StreamListItem: Codable {
        let name: String?
        let url: String
        let quality: String?
    }

    // MARK: - Main Fetch Method
    
    func getStreams(tmdbId: String, mediaType: String = "movie", season: Int? = nil, episode: Int? = nil) async throws -> [ExtractedSource] {
        print("🎬 [VidlinkService] Fetching streams for TMDB:\(tmdbId), Type:\(mediaType)")

        // Discovery only: the backend returns direct media URLs. Playback of
        // those URLs remains entirely local on the iPhone (no media proxy).
        if let listedStreams = try? await getBackendStreamList(
            tmdbId: tmdbId,
            mediaType: mediaType,
            season: season,
            episode: episode
        ), !listedStreams.isEmpty {
            print("✅ [VidlinkService] Backend listed \(listedStreams.count) valid direct stream(s)")
            return listedStreams
        }

        print("⚠️ [VidlinkService] No valid backend listing, using direct iPhone discovery")
        
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
            vidlinkUrl = URL(string: "\(vidlinkApi)/tv/\(encryptedId)/\(s)/\(e)?multiLang=0")!
        } else {
            vidlinkUrl = URL(string: "\(vidlinkApi)/movie/\(encryptedId)?multiLang=0")!
        }
        
        print("🌍 [VidlinkService] Requesting discovery list: \(vidlinkUrl.absoluteString)")
        let data = try await fetchDiscoveryResponse(targetURL: vidlinkUrl)
        
        let rawDict = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] ?? [:]

        // Current Vidlink WebKit responses use a signed DASH manifest. Apply
        // Vidlink's own client-side rewrite locally so playback goes directly
        // from their media relay to the iPhone.
        if let rewrittenPlaylist = rewriteVidlinkPlaylist(rawDict) {
            print("✅ [VidlinkService] Returning fresh WebKit DASH stream")
            return [ExtractedSource(name: "Vidlink - Auto", url: rewrittenPlaylist, quality: "Auto")]
        }

        let rawStreams = processVidlinkResponse(data: rawDict, title: streamTitle)
        
        if rawStreams.isEmpty { return [] }
        
        let playlistStreams = rawStreams.filter { $0.2 == true } // isPlaylist
        let directStreams = rawStreams.filter { $0.2 == false }
        
        var allSources: [ExtractedSource] = directStreams.map {
            ExtractedSource(name: $0.1, url: $0.0, quality: $0.3)
        }
        
        if !playlistStreams.isEmpty {
            for ps in playlistStreams {
                let parsed = await fetchAndParseM3U8(playlistUrl: ps.0, title: streamTitle)
                allSources.append(contentsOf: collapsePlaylistVariants(parsed, masterUrl: ps.0))
            }
        }

        allSources = dedupeVidlinkSources(allSources)
        
        // Sort
        allSources.sort { s1, s2 in
            let q1 = qualityOrder[s1.quality ?? "Unknown"] ?? -3
            let q2 = qualityOrder[s2.quality ?? "Unknown"] ?? -3
            return q1 > q2
        }
        
        print("✅ [VidlinkService] Returning \(allSources.count) streams")
        return allSources
    }

    private func getBackendStreamList(
        tmdbId: String,
        mediaType: String,
        season: Int?,
        episode: Int?
    ) async throws -> [ExtractedSource] {
        guard var components = URLComponents(string: streamListApi) else { throw URLError(.badURL) }
        var queryItems = [
            URLQueryItem(name: "path", value: "vidlink"),
            URLQueryItem(name: "tmdbId", value: tmdbId),
            URLQueryItem(name: "type", value: mediaType),
            URLQueryItem(name: "client", value: "ios-native"),
            URLQueryItem(name: "_", value: String(Int(Date().timeIntervalSince1970)))
        ]
        if let season { queryItems.append(URLQueryItem(name: "season", value: String(season))) }
        if let episode { queryItems.append(URLQueryItem(name: "episode", value: String(episode))) }
        components.queryItems = queryItems
        guard let url = components.url else { throw URLError(.badURL) }

        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }

        let payload = try JSONDecoder().decode(StreamListResponse.self, from: data)
        return (payload.streams ?? []).compactMap { item in
            guard !isExpiredSignedURL(item.url) else {
                print("⚠️ [VidlinkService] Ignoring expired backend URL: \(item.quality ?? "Unknown")")
                return nil
            }
            return ExtractedSource(
                name: item.name ?? "Vidlink - \(item.quality ?? "Auto")",
                url: item.url,
                quality: item.quality ?? "Auto"
            )
        }
    }

    /// Fetches Vidlink metadata through the existing discovery relay. Only
    /// the JSON stream list crosses this relay; media playback uses the URL
    /// returned by Vidlink and stays local on the iPhone.
    private func fetchDiscoveryResponse(targetURL: URL) async throws -> Data {
        guard var components = URLComponents(string: discoveryProxy) else { throw URLError(.badURL) }
        components.queryItems = [
            URLQueryItem(name: "path", value: "mob"),
            URLQueryItem(name: "method", value: "GET"),
            URLQueryItem(name: "url", value: targetURL.absoluteString)
        ]
        guard let proxyURL = components.url else { throw URLError(.badURL) }

        let body = try JSONSerialization.data(withJSONObject: [
            "headers": headers,
            "body": NSNull()
        ])
        var request = URLRequest(url: proxyURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
        return data
    }

    private func isExpiredSignedURL(_ value: String) -> Bool {
        guard let url = URL(string: value),
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let rawExpiry = components.queryItems?.first(where: { $0.name.lowercased() == "t" })?.value,
              let expiry = TimeInterval(rawExpiry) else { return false }
        return expiry <= Date().timeIntervalSince1970
    }

    private func rewriteVidlinkPlaylist(_ data: [String: Any]) -> String? {
        guard let stream = data["stream"] as? [String: Any],
              stream["requiresProxy"] as? Bool == true,
              let playlist = stream["playlist"] as? String,
              let sourceURL = URL(string: playlist),
              let sourceOrigin = sourceURL.scheme.flatMap({ scheme in
                  sourceURL.host.map { host in
                      let port = sourceURL.port.map { ":\($0)" } ?? ""
                      return "\(scheme)://\(host)\(port)"
                  }
              }),
              let playlistHeaders = stream["playlistHeaders"] as? [String: Any],
              let cookie = (playlistHeaders["Cookie"] ?? playlistHeaders["cookie"]) as? String else {
            return nil
        }

        let signCookie = Data(cookie.utf8).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")

        var queryItems = URLComponents(url: sourceURL, resolvingAgainstBaseURL: false)?.queryItems ?? []
        queryItems.removeAll { $0.name == "host" || $0.name == "sc" }
        queryItems.append(URLQueryItem(name: "host", value: sourceOrigin))
        queryItems.append(URLQueryItem(name: "sc", value: signCookie))

        var rewritten = URLComponents()
        rewritten.scheme = "https"
        rewritten.host = URL(string: vidlinkMediaProxy)?.host
        rewritten.path = "/sacdn\(sourceURL.path)"
        rewritten.queryItems = queryItems
        return rewritten.url?.absoluteString
    }
    
    // MARK: - Helpers
    
    private func getTmdbInfo(tmdbId: String, mediaType: String) async throws -> (title: String, year: String?) {
        let endpoint = mediaType == "tv" ? "tv" : "movie"
        let url = URL(string: "https://api.themoviedb.org/3/\(endpoint)/\(tmdbId)?api_key=\(tmdbApiKey)")!
        let (data, _) = try await session.data(from: url)
        
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
        let (data, _) = try await session.data(from: url)
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
    
    /// Master HLS without RESOLUTION tags → many "Auto" rows; keep a single master entry instead.
    private func collapsePlaylistVariants(_ parsed: [ExtractedSource], masterUrl: String) -> [ExtractedSource] {
        let distinctQualities = Set(parsed.compactMap { source -> String? in
            let q = source.quality ?? "Auto"
            if q == "Auto" || q == "Unknown" { return nil }
            return q
        })
        if distinctQualities.count <= 1 {
            print("📺 [VidlinkService] Single-resolution playlist → 1 entry (was \(parsed.count))")
            return [ExtractedSource(name: "Vidlink - Auto", url: masterUrl, quality: "Auto")]
        }
        return parsed
    }

    private func dedupeVidlinkSources(_ sources: [ExtractedSource]) -> [ExtractedSource] {
        var seen = Set<String>()
        var out: [ExtractedSource] = []
        for s in sources {
            if seen.insert(s.url).inserted {
                out.append(s)
            }
        }
        return out
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
            let (data, _) = try await session.data(for: request)
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
