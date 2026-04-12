//
//  YFlixService.swift
//  anisflix
//

import Foundation

class YFlixService {
    static let shared = YFlixService()
    
    private let encDecApi = "https://enc-dec.app/api"
    private let dbApi = "https://enc-dec.app/db/flix"
    private let yflixAjax = "https://yflix.to/ajax"
    
    private let headers: [String: String] = [
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "Connection": "keep-alive"
    ]
    
    private let qualityOrder: [String: Int] = [
        "4K": 5, "1440p": 4, "1080p": 3, "720p": 2,
        "480p": 1, "360p": 0, "240p": -1, "Auto": -2, "Unknown": -3
    ]
    
    // MARK: - Models
    
    struct ExtractedSource {
        let name: String
        let url: String
        let quality: String
        let type: String // "hls" or "file"
        let subtitles: [Subtitle]
    }
    
    struct Subtitle {
        let url: String
        let language: String
        let isDefault: Bool
    }
    
    // MARK: - enc-dec.app API response structures
    
    private struct EncDecResult: Codable {
        let status: Int?
        let result: AnyCodableValue?
    }
    
    private struct DBEntry: Codable {
        let info: DBInfo
        let episodes: [String: [String: EpisodeEntry]]?
    }
    
    private struct DBInfo: Codable {
        let title_en: String?
        let year: String?
        let flix_id: String?
    }
    
    private struct EpisodeEntry: Codable {
        let eid: String?
    }
    
    private struct YFlixAjaxResponse: Codable {
        let status: String?
        let result: String?
    }
    
    private struct DecryptedLink: Codable {
        let url: String?
    }
    
    private struct RapidMediaResponse: Codable {
        let status: Int?
        let result: String?
    }
    
    private struct RapidDecryptedResult: Codable {
        let result: RapidStreams?
    }
    
    private struct RapidStreams: Codable {
        let sources: [RapidSource]?
        let tracks: [RapidTrack]?
    }
    
    private struct RapidSource: Codable {
        let file: String?
    }
    
    private struct RapidTrack: Codable {
        let file: String?
        let label: String?
        let kind: String?
        let `default`: Bool?
    }
    
    // MARK: - Main Fetch Method
    
    func getStreams(tmdbId: String, mediaType: String = "movie", season: Int? = nil, episode: Int? = nil) async -> [ExtractedSource] {
        print("🎬 [YFlixService] Fetching streams for TMDB:\(tmdbId), Type:\(mediaType)")
        
        // Step 1: Find in database
        guard let dbResult = await findInDatabase(tmdbId: tmdbId, mediaType: mediaType) else {
            print("❌ [YFlixService] No match in database")
            return []
        }
        
        let info = dbResult.info
        print("✅ [YFlixService] DB match: \"\(info.title_en ?? "?")\" (\(info.year ?? "?")) flix_id=\(info.flix_id ?? "?")")
        
        // Step 2: Find episode ID
        guard let eid = findEpisodeId(dbResult: dbResult, mediaType: mediaType, season: season, episode: episode) else {
            print("❌ [YFlixService] No episode ID found")
            return []
        }
        print("✅ [YFlixService] eid=\(eid)")
        
        // Step 3: Fetch streams
        let (streams, subtitles) = await runStreamFetch(eid: eid)
        print("✅ [YFlixService] \(streams.count) stream(s), \(subtitles.count) subtitle(s)")
        
        let title = buildTitle(info: info, mediaType: mediaType, season: season, episode: episode)
        
        var allSources: [ExtractedSource] = []
        for stream in streams {
            allSources.append(ExtractedSource(
                name: "YFlix - \(stream.quality)",
                url: stream.url,
                quality: stream.quality,
                type: stream.type,
                subtitles: subtitles
            ))
        }
        
        allSources.sort { s1, s2 in
            let q1 = qualityOrder[s1.quality] ?? -3
            let q2 = qualityOrder[s2.quality] ?? -3
            return q1 > q2
        }
        
        print("✅ [YFlixService] Returning \(allSources.count) streams for \"\(title)\"")
        return allSources
    }
    
    // MARK: - Database Lookup
    
    private func findInDatabase(tmdbId: String, mediaType: String) async -> DBEntry? {
        let type = mediaType == "movie" ? "movie" : "tv"
        guard let url = URL(string: "\(dbApi)/find?tmdb_id=\(tmdbId)&type=\(type)") else { return nil }
        
        do {
            let data = try await fetchData(from: url, headers: encDecHeaders())
            do {
                let entries = try JSONDecoder().decode([DBEntry].self, from: data)
                return entries.first
            } catch {
                let raw = String(data: data, encoding: .utf8) ?? "N/A"
                print("❌ [YFlixService] DB decode failed: \(error.localizedDescription)")
                print("❌ [YFlixService] Raw response (first 500 chars): \(String(raw.prefix(500)))")
                return nil
            }
        } catch {
            print("❌ [YFlixService] DB lookup failed: \(error.localizedDescription)")
            return nil
        }
    }
    
    private func findEpisodeId(dbResult: DBEntry, mediaType: String, season: Int?, episode: Int?) -> String? {
        guard let episodes = dbResult.episodes else { return nil }
        
        if mediaType == "movie" {
            if let firstSeason = episodes.keys.sorted().first,
               let firstEp = episodes[firstSeason]?.keys.sorted().first {
                return episodes[firstSeason]?[firstEp]?.eid
            }
            return nil
        }
        
        let ss = String(season ?? 1)
        let se = String(episode ?? 1)
        return episodes[ss]?[se]?.eid
    }
    
    // MARK: - Stream Fetching Pipeline
    
    private struct RawStream {
        let url: String
        let quality: String
        let type: String
        let serverType: String
        let serverKey: String
    }
    
    private func runStreamFetch(eid: String) async -> (streams: [RawStream], subtitles: [Subtitle]) {
        // Step 1: Encrypt eid
        guard let encEid = await encrypt(text: eid) else {
            print("❌ [YFlixService] Failed to encrypt eid")
            return ([], [])
        }
        
        // Step 2: Get server list
        let linksUrl = "\(yflixAjax)/links/list?eid=\(eid)&_=\(encEid)"
        guard let serversResp = await fetchYFlixAjax(urlString: linksUrl),
              let resultHtml = serversResp.result else {
            print("❌ [YFlixService] Failed to fetch links/list")
            return ([], [])
        }
        
        // Step 3: Parse HTML via enc-dec.app
        guard let servers = await parseHtml(html: resultHtml) else {
            print("❌ [YFlixService] Failed to parse servers HTML")
            return ([], [])
        }
        
        print("📡 [YFlixService] Found servers: \(servers)")
        
        // Step 4: Process each server concurrently
        var allStreams: [RawStream] = []
        var allSubtitles: [Subtitle] = []
        
        await withTaskGroup(of: (streams: [RawStream], subtitles: [Subtitle]).self) { group in
            for (serverType, serverMap) in servers {
                for (serverKey, serverInfo) in serverMap {
                    guard let lid = serverInfo["lid"] else { continue }
                    
                    group.addTask { [self] in
                        return await self.processServer(
                            serverType: serverType,
                            serverKey: serverKey,
                            lid: lid
                        )
                    }
                }
            }
            
            for await result in group {
                allStreams.append(contentsOf: result.streams)
                allSubtitles.append(contentsOf: result.subtitles)
            }
        }
        
        // Deduplicate
        var seen = Set<String>()
        let deduped = allStreams.filter { stream in
            if seen.contains(stream.url) { return false }
            seen.insert(stream.url)
            return true
        }
        
        return (deduped, allSubtitles)
    }
    
    private func processServer(serverType: String, serverKey: String, lid: String) async -> (streams: [RawStream], subtitles: [Subtitle]) {
        print("🔗 [YFlixService] Processing server \(serverType)/\(serverKey) lid=\(lid)")
        
        // Encrypt lid
        guard let encLid = await encrypt(text: lid) else { return ([], []) }
        
        // Get embed URL
        let viewUrl = "\(yflixAjax)/links/view?id=\(lid)&_=\(encLid)"
        guard let viewResp = await fetchYFlixAjax(urlString: viewUrl),
              let encryptedResult = viewResp.result else {
            print("❌ [YFlixService] links/view failed for \(serverType)/\(serverKey)")
            return ([], [])
        }
        
        // Decrypt to get rapidshare URL
        guard let decrypted = await decrypt(text: encryptedResult),
              let embedUrl = decrypted.url,
              embedUrl.contains("rapidshare") else {
            print("⚠️ [YFlixService] \(serverType)/\(serverKey): not rapidshare, skipping")
            return ([], [])
        }
        
        print("🔓 [YFlixService] \(serverType)/\(serverKey): \(embedUrl.prefix(80))...")
        
        // Decrypt rapid media
        guard let rapidResult = await decryptRapidMedia(embedUrl: embedUrl) else {
            print("❌ [YFlixService] \(serverType)/\(serverKey): rapid decrypt failed")
            return ([], [])
        }
        
        // Format results
        var streams: [RawStream] = []
        var subtitles: [Subtitle] = []
        
        for source in rapidResult.sources ?? [] {
            guard let file = source.file, !file.isEmpty else { continue }
            let isHLS = file.contains(".m3u8")
            streams.append(RawStream(
                url: file,
                quality: isHLS ? "Auto" : "Unknown",
                type: isHLS ? "hls" : "file",
                serverType: serverType,
                serverKey: serverKey
            ))
        }
        
        for track in rapidResult.tracks ?? [] {
            if (track.kind == "captions" || track.kind == "subtitles"),
               let file = track.file, !file.isEmpty {
                subtitles.append(Subtitle(
                    url: file,
                    language: track.label ?? "Unknown",
                    isDefault: track.default ?? false
                ))
            }
        }
        
        // Enhance HLS streams with quality variants
        var enhanced: [RawStream] = []
        for stream in streams {
            if stream.type == "hls" {
                let variants = await parseM3U8Master(playlistUrl: stream.url)
                if !variants.isEmpty {
                    for v in variants {
                        enhanced.append(RawStream(
                            url: v.url,
                            quality: v.quality,
                            type: "hls",
                            serverType: serverType,
                            serverKey: serverKey
                        ))
                    }
                } else {
                    enhanced.append(stream)
                }
            } else {
                enhanced.append(stream)
            }
        }
        
        return (enhanced, subtitles)
    }
    
    // MARK: - enc-dec.app Helpers
    
    private func encrypt(text: String) async -> String? {
        guard let encoded = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(encDecApi)/enc-movies-flix?text=\(encoded)") else { return nil }
        
        do {
            let data = try await fetchData(from: url, headers: encDecHeaders())
            let resp = try JSONDecoder().decode(EncDecResult.self, from: data)
            return resp.result?.stringValue
        } catch {
            print("❌ [YFlixService] encrypt failed: \(error.localizedDescription)")
            return nil
        }
    }
    
    private func decrypt(text: String) async -> DecryptedLink? {
        guard let url = URL(string: "\(encDecApi)/dec-movies-flix") else { return nil }
        
        do {
            let body = ["text": text]
            let data = try await postJSON(to: url, body: body, headers: encDecHeaders())
            let resp = try JSONDecoder().decode(DecMoviesFlixResponse.self, from: data)
            return resp.result
        } catch {
            print("❌ [YFlixService] decrypt failed: \(error.localizedDescription)")
            return nil
        }
    }
    
    private struct DecMoviesFlixResponse: Codable {
        let result: DecryptedLink?
    }
    
    private func parseHtml(html: String) async -> [String: [String: [String: String]]]? {
        guard let url = URL(string: "\(encDecApi)/parse-html") else { return nil }
        
        do {
            let body = ["text": html]
            let data = try await postJSON(to: url, body: body, headers: encDecHeaders())
            
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let result = json["result"] as? [String: Any] else { return nil }
            
            var parsed: [String: [String: [String: String]]] = [:]
            for (serverType, value) in result {
                guard let serverMap = value as? [String: Any] else { continue }
                var inner: [String: [String: String]] = [:]
                for (serverKey, serverInfo) in serverMap {
                    guard let info = serverInfo as? [String: Any] else { continue }
                    var entry: [String: String] = [:]
                    if let lid = info["lid"] as? String { entry["lid"] = lid }
                    if let sid = info["sid"] as? String { entry["sid"] = sid }
                    if let name = info["name"] as? String { entry["name"] = name }
                    inner[serverKey] = entry
                }
                parsed[serverType] = inner
            }
            return parsed
        } catch {
            print("❌ [YFlixService] parseHtml failed: \(error.localizedDescription)")
            return nil
        }
    }
    
    private func decryptRapidMedia(embedUrl: String) async -> RapidStreams? {
        let mediaUrl = embedUrl
            .replacingOccurrences(of: "/e/", with: "/media/")
            .replacingOccurrences(of: "/e2/", with: "/media/")
        
        guard let url = URL(string: mediaUrl) else { return nil }
        
        do {
            var hdrs = headers
            hdrs["Referer"] = embedUrl
            if let origin = URL(string: embedUrl)?.scheme.flatMap({ s in URL(string: embedUrl)?.host.map { "\(s)://\($0)" } }) {
                hdrs["Origin"] = origin
            }
            
            let data = try await fetchData(from: url, headers: hdrs)
            
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let encrypted = json["result"] as? String {
                
                guard let decUrl = URL(string: "\(encDecApi)/dec-rapid") else { return nil }
                let body: [String: String] = ["text": encrypted, "agent": headers["User-Agent"] ?? ""]
                let decData = try await postJSON(to: decUrl, body: body, headers: encDecHeaders())
                let decResp = try JSONDecoder().decode(RapidDecryptedResult.self, from: decData)
                return decResp.result
            }
        } catch {
            print("❌ [YFlixService] decryptRapidMedia /media/ failed: \(error.localizedDescription)")
        }
        
        // Fallback: fetch embed page directly
        print("🔄 [YFlixService] Trying /e/ embed page fallback...")
        guard let embedURL = URL(string: embedUrl) else { return nil }
        do {
            var hdrs = headers
            hdrs["Referer"] = "https://yflix.to/"
            hdrs["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            
            let data = try await fetchData(from: embedURL, headers: hdrs)
            if let html = String(data: data, encoding: .utf8) {
                // Try to find direct stream URL in page
                let patterns = [
                    "file[\"']?\\s*:\\s*[\"']([^\"']+)[\"']",
                    "source[\"']?\\s*:\\s*[\"']([^\"']+)[\"']",
                    "src[\"']?\\s*=\\s*[\"'](https?://[^\"']+\\.m3u8[^\"']*)[\"']"
                ]
                for pattern in patterns {
                    if let regex = try? NSRegularExpression(pattern: pattern),
                       let match = regex.firstMatch(in: html, range: NSRange(html.startIndex..., in: html)),
                       let range = Range(match.range(at: 1), in: html) {
                        let streamUrl = String(html[range])
                        return RapidStreams(sources: [RapidSource(file: streamUrl)], tracks: [])
                    }
                }
            }
        } catch {
            print("❌ [YFlixService] /e/ embed fallback failed: \(error.localizedDescription)")
        }
        
        return nil
    }
    
    // MARK: - M3U8 Parsing
    
    private struct M3U8Variant {
        let url: String
        let quality: String
    }
    
    private func parseM3U8Master(playlistUrl: String) async -> [M3U8Variant] {
        guard let url = URL(string: playlistUrl) else { return [] }
        
        do {
            let data = try await fetchData(from: url, headers: headers)
            guard let content = String(data: data, encoding: .utf8),
                  content.contains("#EXT-X-STREAM-INF") else { return [] }
            
            var variants: [M3U8Variant] = []
            let lines = content.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }
            var currentQuality: String?
            
            for line in lines {
                if line.hasPrefix("#EXT-X-STREAM-INF") {
                    currentQuality = extractQualityFromStreamInf(line)
                } else if !line.isEmpty && !line.hasPrefix("#"), let q = currentQuality {
                    var streamUrl = line
                    if !streamUrl.hasPrefix("http") {
                        if let resolved = URL(string: line, relativeTo: url) {
                            streamUrl = resolved.absoluteString
                        }
                    }
                    variants.append(M3U8Variant(url: streamUrl, quality: q))
                    currentQuality = nil
                }
            }
            
            return variants.sorted { (qualityOrder[$0.quality] ?? -3) > (qualityOrder[$1.quality] ?? -3) }
        } catch {
            return []
        }
    }
    
    private func extractQualityFromStreamInf(_ line: String) -> String {
        if let resRange = line.range(of: "RESOLUTION=") {
            let sub = line[resRange.upperBound...]
            let part: String
            if let comma = sub.firstIndex(of: ",") {
                part = String(sub[..<comma])
            } else {
                part = String(sub)
            }
            let comps = part.split(separator: "x")
            if comps.count > 1, let h = Int(comps[1]) {
                if h >= 2160 { return "4K" }
                if h >= 1440 { return "1440p" }
                if h >= 1080 { return "1080p" }
                if h >= 720 { return "720p" }
                if h >= 480 { return "480p" }
                if h >= 360 { return "360p" }
                return "240p"
            }
        }
        
        if let bwRange = line.range(of: "BANDWIDTH=") {
            let sub = line[bwRange.upperBound...]
            let part: String
            if let comma = sub.firstIndex(of: ",") {
                part = String(sub[..<comma])
            } else {
                part = String(sub)
            }
            if let bw = Int(part) {
                if bw >= 4_000_000 { return "1440p" }
                if bw >= 2_500_000 { return "1080p" }
                if bw >= 1_500_000 { return "720p" }
                if bw >= 800_000 { return "480p" }
                return "360p"
            }
        }
        
        return "Auto"
    }
    
    // MARK: - YFlix Ajax Helper
    
    private func fetchYFlixAjax(urlString: String) async -> YFlixAjaxResponse? {
        guard let url = URL(string: urlString) else { return nil }
        
        do {
            var hdrs = headers
            hdrs["Referer"] = "https://yflix.to/"
            hdrs["Origin"] = "https://yflix.to"
            
            let data = try await fetchData(from: url, headers: hdrs)
            return try JSONDecoder().decode(YFlixAjaxResponse.self, from: data)
        } catch {
            print("❌ [YFlixService] Ajax request failed for \(urlString): \(error.localizedDescription)")
            return nil
        }
    }
    
    // MARK: - Networking
    
    private func fetchData(from url: URL, headers: [String: String]) async throws -> Data {
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        request.allHTTPHeaderFields = headers
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpRes = response as? HTTPURLResponse, (200..<400).contains(httpRes.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw NSError(domain: "YFlixService", code: code, userInfo: [NSLocalizedDescriptionKey: "HTTP \(code)"])
        }
        return data
    }
    
    private func postJSON(to url: URL, body: [String: String], headers: [String: String]) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 30
        var hdrs = headers
        hdrs["Content-Type"] = "application/json"
        request.allHTTPHeaderFields = hdrs
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpRes = response as? HTTPURLResponse, (200..<400).contains(httpRes.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw NSError(domain: "YFlixService", code: code, userInfo: [NSLocalizedDescriptionKey: "HTTP \(code)"])
        }
        return data
    }
    
    private func encDecHeaders() -> [String: String] {
        var hdrs = headers
        hdrs["Referer"] = "https://enc-dec.app/"
        hdrs["Origin"] = "https://enc-dec.app"
        return hdrs
    }
    
    // MARK: - Title Helper
    
    private func buildTitle(info: DBInfo, mediaType: String, season: Int?, episode: Int?) -> String {
        var title = info.title_en ?? "Unknown"
        if mediaType == "tv", let s = season, let e = episode {
            title += " S\(s)E\(e)"
        } else if let year = info.year {
            let displayYear = year.prefix(4)
            title += " (\(displayYear))"
        }
        return title
    }
}

// MARK: - AnyCodableValue for flexible JSON decoding

enum AnyCodableValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null
    
    var stringValue: String? {
        switch self {
        case .string(let s): return s
        default: return nil
        }
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let s = try? container.decode(String.self) { self = .string(s); return }
        if let i = try? container.decode(Int.self) { self = .int(i); return }
        if let d = try? container.decode(Double.self) { self = .double(d); return }
        if let b = try? container.decode(Bool.self) { self = .bool(b); return }
        if container.decodeNil() { self = .null; return }
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported value")
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .int(let i): try container.encode(i)
        case .double(let d): try container.encode(d)
        case .bool(let b): try container.encode(b)
        case .null: try container.encodeNil()
        }
    }
}
