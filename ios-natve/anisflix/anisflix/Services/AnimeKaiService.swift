//
//  AnimeKaiService.swift
//  anisflix
//

import Foundation

class AnimeKaiService {
    static let shared = AnimeKaiService()

    private let tmdbApiKey = "439c478a771f35c05022f9feabcca01c"
    private let tmdbBase = "https://api.themoviedb.org/3"
    private let anilistUrl = "https://graphql.anilist.co"
    private let encDecApi = "https://enc-dec.app/api"
    private let dbApi = "https://enc-dec.app/db/kai"
    private let kaiAjax = "https://animekai.to/ajax"
    private let armBase = "https://arm.haglund.dev/api/v2"

    private let headers: [String: String] = [
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "Connection": "keep-alive"
    ]

    private let qualityOrder: [String: Int] = [
        "4K": 7, "2160p": 7, "1440p": 6, "1080p": 5, "720p": 4,
        "480p": 3, "360p": 2, "240p": 1, "Auto": 0, "Unknown": -1
    ]

    // MARK: - Public Models

    struct ExtractedSource {
        let name: String
        let url: String
        let quality: String
        let type: String
        let serverType: String
        let subtitles: [Subtitle]
    }

    struct Subtitle {
        let url: String
        let language: String
        let isDefault: Bool
    }

    // MARK: - Internal Models

    private struct DBEntry: Codable {
        let info: DBInfo?
        let episodes: [String: [String: EpisodeEntry]]?
    }

    private struct DBInfo: Codable {
        let title_en: String?
    }

    private struct EpisodeEntry: Codable {
        let token: String?
        let title: String?
    }

    private struct KaiAjaxResponse: Codable {
        let status: String?
        let result: String?
    }

    private struct DecryptedLink: Codable {
        let url: String?
    }

    private struct DecKaiResponse: Codable {
        let result: DecryptedLink?
    }

    private struct MegaMediaResponse: Codable {
        let result: String?
    }

    private struct MegaDecryptedResult: Codable {
        let result: MegaStreams?
    }

    private struct MegaStreams: Codable {
        let sources: [MegaSource]?
        let tracks: [MegaTrack]?
    }

    private struct MegaSource: Codable {
        let file: String?
    }

    private struct MegaTrack: Codable {
        let file: String?
        let label: String?
        let kind: String?
        let `default`: Bool?
    }

    private struct SyncResult {
        let alId: Int
        let episode: Int
    }

    private struct CinemetaInfo {
        let date: String?
        let title: String?
        let dayIndex: Int
    }

    // MARK: - Main Entry Point

    func getStreams(tmdbId: Int, mediaType: String, season: Int? = nil, episode: Int? = nil) async -> [ExtractedSource] {
        let ep = episode ?? 1
        print("🎌 [AnimeKaiService] Fetching streams for TMDB:\(tmdbId), Type:\(mediaType), S\(season ?? 1)E\(ep)")

        guard let syncResult = await resolveTmdbToAniList(tmdbId: tmdbId, mediaType: mediaType, season: season, episode: ep) else {
            print("❌ [AnimeKaiService] Could not resolve TMDB → AniList")
            return []
        }

        print("✅ [AnimeKaiService] AniList ID: \(syncResult.alId), Episode: \(syncResult.episode)")

        guard let dbResult = await findInDatabase(alId: syncResult.alId) else {
            print("❌ [AnimeKaiService] AniList ID \(syncResult.alId) not found in database")
            return []
        }

        let info = dbResult.info
        print("✅ [AnimeKaiService] DB match: \"\(info?.title_en ?? "?")\"")

        guard let token = findToken(dbResult: dbResult, episode: syncResult.episode) else {
            print("❌ [AnimeKaiService] No token found for episode \(syncResult.episode)")
            return []
        }
        print("✅ [AnimeKaiService] Token found for episode \(syncResult.episode)")

        let (streams, subtitles) = await runStreamFetch(token: token)
        print("✅ [AnimeKaiService] \(streams.count) stream(s), \(subtitles.count) subtitle(s)")

        var allSources: [ExtractedSource] = []
        for stream in streams {
            // Only include sub and softsub (no dub)
            let st = stream.serverType.lowercased()
            guard st == "sub" || st == "softsub" else { continue }

            let typeLabel = st == "sub" ? "Hard Sub" : "Soft Sub"
            allSources.append(ExtractedSource(
                name: "AnimeKai | \(stream.serverName) | [\(typeLabel)] - \(stream.quality)",
                url: stream.url,
                quality: stream.quality,
                type: stream.url.contains(".m3u8") ? "hls" : "mp4",
                serverType: st,
                subtitles: subtitles
            ))
        }

        allSources.sort { (qualityOrder[$0.quality] ?? -1) > (qualityOrder[$1.quality] ?? -1) }
        print("✅ [AnimeKaiService] Returning \(allSources.count) streams (sub/softsub only)")
        return allSources
    }

    // MARK: - TMDB → AniList Resolution

    private func resolveTmdbToAniList(tmdbId: Int, mediaType: String, season: Int?, episode: Int) async -> SyncResult? {
        let tmdbType = mediaType == "movie" ? "movie" : "tv"

        // Step 1: Get TMDB details + external IDs
        guard let (imdbId, title, movieDate) = await getTmdbDetails(tmdbId: tmdbId, type: tmdbType) else {
            print("❌ [AnimeKaiService] Failed to get TMDB details")
            return nil
        }

        // Step 2: Get release date from Cinemata
        let cinemetaInfo = await getCinemetaInfo(imdbId: imdbId, mediaType: mediaType, season: season, episode: episode)
        var releaseDate = cinemetaInfo.date
        if mediaType == "movie", let md = movieDate {
            releaseDate = md
        }

        guard let date = releaseDate else {
            print("❌ [AnimeKaiService] No release date found")
            return nil
        }

        // Step 3: Search AniList by title + date matching
        return await resolveByDate(
            releaseDate: date,
            showTitle: title ?? "Unknown",
            season: season,
            episodeTitle: cinemetaInfo.title,
            dayIndex: cinemetaInfo.dayIndex,
            originalEpisode: episode
        )
    }

    private func getTmdbDetails(tmdbId: Int, type: String) async -> (imdbId: String?, title: String?, movieDate: String?)? {
        do {
            let baseUrl = "\(tmdbBase)/\(type)/\(tmdbId)"
            let baseData = try await fetchData(from: URL(string: "\(baseUrl)?api_key=\(tmdbApiKey)")!, headers: headers)
            let baseJson = try JSONSerialization.jsonObject(with: baseData) as? [String: Any]
            let title = (baseJson?["name"] as? String) ?? (baseJson?["title"] as? String)
            let movieDate = baseJson?["release_date"] as? String

            var imdbId = baseJson?["imdb_id"] as? String

            if imdbId == nil {
                let eidUrl = "\(baseUrl)/external_ids?api_key=\(tmdbApiKey)"
                if let eidData = try? await fetchData(from: URL(string: eidUrl)!, headers: headers),
                   let eidJson = try? JSONSerialization.jsonObject(with: eidData) as? [String: Any] {
                    imdbId = eidJson["imdb_id"] as? String
                }
            }

            if imdbId == nil {
                if let armData = try? await fetchData(from: URL(string: "\(armBase)/themoviedb?id=\(tmdbId)")!, headers: headers),
                   let armArr = try? JSONSerialization.jsonObject(with: armData) as? [[String: Any]],
                   let first = armArr.first {
                    imdbId = first["imdb"] as? String
                }
            }

            return (imdbId, title, movieDate)
        } catch {
            print("❌ [AnimeKaiService] TMDB details error: \(error.localizedDescription)")
            return nil
        }
    }

    private func getCinemetaInfo(imdbId: String?, mediaType: String, season: Int?, episode: Int) async -> CinemetaInfo {
        guard let imdbId = imdbId else { return CinemetaInfo(date: nil, title: nil, dayIndex: 1) }

        let cinType = mediaType == "movie" ? "movie" : "series"
        guard let url = URL(string: "https://v3-cinemeta.strem.io/meta/\(cinType)/\(imdbId).json") else {
            return CinemetaInfo(date: nil, title: nil, dayIndex: 1)
        }

        do {
            let data = try await fetchData(from: url, headers: headers)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let meta = json?["meta"] as? [String: Any]

            if mediaType == "movie" {
                let released = (meta?["released"] as? String)?.prefix(10).description
                return CinemetaInfo(date: released, title: meta?["name"] as? String, dayIndex: 1)
            }

            let videos = meta?["videos"] as? [[String: Any]] ?? []
            let target = videos.first { v in
                let s = v["season"] as? Int
                let e = v["episode"] as? Int
                return s == (season ?? 1) && e == episode
            }

            guard let targetReleased = target?["released"] as? String else {
                return CinemetaInfo(date: nil, title: nil, dayIndex: 1)
            }

            let targetDate = String(targetReleased.prefix(10))
            let targetTitle = target?["name"] as? String

            var dayIndex = 1
            for v in videos {
                let s = v["season"] as? Int
                let e = v["episode"] as? Int
                let rel = (v["released"] as? String)?.prefix(10).description
                if s == (season ?? 1) && rel == targetDate && (e ?? 0) < episode {
                    dayIndex += 1
                }
            }

            return CinemetaInfo(date: targetDate, title: targetTitle, dayIndex: dayIndex)
        } catch {
            return CinemetaInfo(date: nil, title: nil, dayIndex: 1)
        }
    }

    private func resolveByDate(releaseDate: String, showTitle: String, season: Int?, episodeTitle: String?, dayIndex: Int, originalEpisode: Int) async -> SyncResult? {
        let dateRegex = try? NSRegularExpression(pattern: "^\\d{4}-\\d{2}-\\d{2}")
        guard dateRegex?.firstMatch(in: releaseDate, range: NSRange(releaseDate.startIndex..., in: releaseDate)) != nil else {
            return nil
        }

        print("🔍 [AnimeKaiService] Resolving AniList for date \(releaseDate), title: \(showTitle)")

        let query = """
        query($search:String){Page(perPage:20){media(search:$search,type:ANIME){id type format title{romaji english}startDate{year month day}endDate{year month day}episodes streamingEpisodes{title}}}}
        """

        guard let url = URL(string: anilistUrl) else { return nil }

        do {
            let body: [String: Any] = ["query": query, "variables": ["search": showTitle]]
            let bodyData = try JSONSerialization.data(withJSONObject: body)

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.timeoutInterval = 20
            request.allHTTPHeaderFields = headers
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = bodyData

            let (data, _) = try await URLSession.shared.data(for: request)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let page = (json?["data"] as? [String: Any])?["Page"] as? [String: Any]
            let candidates = page?["media"] as? [[String: Any]] ?? []

            if candidates.isEmpty { return nil }
            print("🔍 [AnimeKaiService] Found \(candidates.count) AniList candidates")

            let df = DateFormatter()
            df.dateFormat = "yyyy-MM-dd"
            df.timeZone = TimeZone(identifier: "UTC")
            guard let targetDate = df.date(from: String(releaseDate.prefix(10))) else { return nil }

            for anime in candidates {
                let startDateObj = anime["startDate"] as? [String: Any]
                guard let year = startDateObj?["year"] as? Int,
                      let month = startDateObj?["month"] as? Int,
                      let day = startDateObj?["day"] as? Int else { continue }

                let startStr = String(format: "%04d-%02d-%02d", year, month, day)
                guard let startDate = df.date(from: startStr) else { continue }

                let format = anime["format"] as? String
                let episodes = anime["episodes"] as? Int
                let diffDays = abs(Calendar.current.dateComponents([.day], from: targetDate, to: startDate).day ?? 999)

                var isMatch = false
                if format == "MOVIE" || format == "SPECIAL" || episodes == 1 {
                    isMatch = diffDays <= 2
                } else {
                    let startLimit = Calendar.current.date(byAdding: .day, value: -2, to: startDate)!
                    if targetDate >= startLimit {
                        if let endDateObj = anime["endDate"] as? [String: Any],
                           let ey = endDateObj["year"] as? Int, ey > 0 {
                            let em = endDateObj["month"] as? Int ?? 12
                            let ed = endDateObj["day"] as? Int ?? 28
                            let endStr = String(format: "%04d-%02d-%02d", ey, em, ed)
                            if let endDate = df.date(from: endStr) {
                                let endLimit = Calendar.current.date(byAdding: .day, value: 2, to: endDate)!
                                isMatch = targetDate <= endLimit
                            }
                        } else {
                            isMatch = true
                        }
                    }
                }

                if isMatch {
                    let alId = anime["id"] as? Int ?? 0
                    let titleObj = anime["title"] as? [String: Any]
                    let matchTitle = (titleObj?["english"] as? String) ?? (titleObj?["romaji"] as? String) ?? "?"
                    print("✅ [AnimeKaiService] AniList match: ID \(alId) (\(matchTitle))")

                    let isTV = format != "MOVIE" && format != "SPECIAL" && episodes != 1
                    var episodeNum = isTV ? originalEpisode : dayIndex

                    // Title tie-breaker
                    let streamingEps = anime["streamingEpisodes"] as? [[String: Any]] ?? []
                    if streamingEps.count > 1, let epTitle = episodeTitle {
                        let cleanTarget = epTitle.lowercased().replacingOccurrences(of: "[^a-z0-9]", with: "", options: .regularExpression)
                        for (j, se) in streamingEps.enumerated() {
                            let seTitle = (se["title"] as? String ?? "").lowercased().replacingOccurrences(of: "[^a-z0-9]", with: "", options: .regularExpression)
                            if !seTitle.isEmpty && (seTitle.contains(cleanTarget) || cleanTarget.contains(seTitle)) {
                                episodeNum = j + 1
                                print("✅ [AnimeKaiService] Title tie-breaker: episode #\(episodeNum)")
                                break
                            }
                        }
                    }

                    return SyncResult(alId: alId, episode: episodeNum)
                }
            }

            return nil
        } catch {
            print("❌ [AnimeKaiService] AniList resolve error: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - Database Lookup

    private func findInDatabase(alId: Int) async -> DBEntry? {
        guard let url = URL(string: "\(dbApi)/find?anilist_id=\(alId)") else { return nil }

        do {
            let data = try await fetchData(from: url, headers: encDecHeaders())
            let entries = try JSONDecoder().decode([DBEntry].self, from: data)
            return entries.first
        } catch {
            print("❌ [AnimeKaiService] DB lookup failed: \(error.localizedDescription)")
            return nil
        }
    }

    private func findToken(dbResult: DBEntry, episode: Int) -> String? {
        guard let episodes = dbResult.episodes else { return nil }
        let epStr = String(episode)

        for seasonKey in episodes.keys.sorted() {
            if let ep = episodes[seasonKey]?[epStr] {
                return ep.token
            }
        }
        return nil
    }

    // MARK: - Stream Fetching Pipeline

    private struct RawStream {
        let url: String
        let quality: String
        let type: String
        let serverType: String
        let serverName: String
    }

    private func runStreamFetch(token: String) async -> (streams: [RawStream], subtitles: [Subtitle]) {
        guard let encToken = await encryptKai(text: token) else {
            print("❌ [AnimeKaiService] Failed to encrypt token")
            return ([], [])
        }

        let listUrl = "\(kaiAjax)/links/list?token=\(token)&_=\(encToken)"
        guard let listResp = await fetchKaiAjax(urlString: listUrl),
              let resultHtml = listResp.result else {
            print("❌ [AnimeKaiService] Failed to fetch links/list")
            return ([], [])
        }

        guard let servers = await parseHtml(html: resultHtml) else {
            print("❌ [AnimeKaiService] Failed to parse servers HTML")
            return ([], [])
        }

        print("📡 [AnimeKaiService] Servers: \(servers.keys.joined(separator: ", "))")

        var allStreams: [RawStream] = []
        var allSubtitles: [Subtitle] = []

        await withTaskGroup(of: (streams: [RawStream], subtitles: [Subtitle]).self) { group in
            for (serverType, serverMap) in servers {
                for (serverKey, serverInfo) in serverMap {
                    guard let lid = serverInfo["lid"] else { continue }
                    let serverName = serverInfo["name"] ?? serverInfo["title"] ?? serverInfo["label"] ?? "Server \(serverKey)"

                    group.addTask { [self] in
                        return await self.processServer(serverType: serverType, serverName: serverName, lid: lid)
                    }
                }
            }

            for await result in group {
                allStreams.append(contentsOf: result.streams)
                allSubtitles.append(contentsOf: result.subtitles)
            }
        }

        // Resolve M3U8 masters
        var enhanced: [RawStream] = []
        for stream in allStreams {
            if stream.url.contains(".m3u8") {
                let variants = await parseM3U8Master(playlistUrl: stream.url)
                if !variants.isEmpty {
                    for v in variants {
                        enhanced.append(RawStream(url: v.url, quality: v.quality, type: "hls", serverType: stream.serverType, serverName: stream.serverName))
                    }
                } else {
                    enhanced.append(stream)
                }
            } else {
                enhanced.append(stream)
            }
        }

        var seen = Set<String>()
        let deduped = enhanced.filter { s in
            guard !seen.contains(s.url) else { return false }
            seen.insert(s.url)
            return true
        }

        return (deduped, allSubtitles)
    }

    private func processServer(serverType: String, serverName: String, lid: String) async -> (streams: [RawStream], subtitles: [Subtitle]) {
        guard let encLid = await encryptKai(text: lid) else { return ([], []) }

        let viewUrl = "\(kaiAjax)/links/view?id=\(lid)&_=\(encLid)"
        guard let viewResp = await fetchKaiAjax(urlString: viewUrl),
              let encryptedResult = viewResp.result else { return ([], []) }

        guard let decrypted = await decryptKai(text: encryptedResult),
              let embedUrl = decrypted.url, !embedUrl.isEmpty else { return ([], []) }

        guard let megaResult = await decryptMegaMedia(embedUrl: embedUrl) else { return ([], []) }

        var streams: [RawStream] = []
        var subtitles: [Subtitle] = []

        for source in megaResult.sources ?? [] {
            guard let file = source.file, !file.isEmpty else { continue }
            streams.append(RawStream(
                url: file,
                quality: extractQualityFromUrl(file),
                type: file.contains(".m3u8") ? "hls" : "mp4",
                serverType: serverType,
                serverName: serverName
            ))
        }

        for track in megaResult.tracks ?? [] {
            if track.kind == "captions", let file = track.file, !file.isEmpty {
                subtitles.append(Subtitle(url: file, language: track.label ?? "Unknown", isDefault: track.default ?? false))
            }
        }

        return (streams, subtitles)
    }

    // MARK: - enc-dec.app Helpers

    private func encryptKai(text: String) async -> String? {
        guard let encoded = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(encDecApi)/enc-kai?text=\(encoded)") else { return nil }

        do {
            let data = try await fetchData(from: url, headers: encDecHeaders())
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            return json?["result"] as? String
        } catch {
            print("❌ [AnimeKaiService] encrypt failed: \(error.localizedDescription)")
            return nil
        }
    }

    private func decryptKai(text: String) async -> DecryptedLink? {
        guard let url = URL(string: "\(encDecApi)/dec-kai") else { return nil }

        do {
            let data = try await postJSON(to: url, body: ["text": text], headers: encDecHeaders())
            let resp = try JSONDecoder().decode(DecKaiResponse.self, from: data)
            return resp.result
        } catch {
            print("❌ [AnimeKaiService] decrypt failed: \(error.localizedDescription)")
            return nil
        }
    }

    private func parseHtml(html: String) async -> [String: [String: [String: String]]]? {
        guard let url = URL(string: "\(encDecApi)/parse-html") else { return nil }

        do {
            let data = try await postJSON(to: url, body: ["text": html], headers: encDecHeaders())
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let result = json?["result"] as? [String: Any] else { return nil }

            var parsed: [String: [String: [String: String]]] = [:]
            for (serverType, value) in result {
                guard let serverMap = value as? [String: Any] else { continue }
                var inner: [String: [String: String]] = [:]
                for (serverKey, serverInfo) in serverMap {
                    guard let info = serverInfo as? [String: Any] else { continue }
                    var entry: [String: String] = [:]
                    if let lid = info["lid"] as? String { entry["lid"] = lid }
                    if let name = info["name"] as? String { entry["name"] = name }
                    if let title = info["title"] as? String { entry["title"] = title }
                    if let label = info["label"] as? String { entry["label"] = label }
                    inner[serverKey] = entry
                }
                parsed[serverType] = inner
            }
            return parsed
        } catch {
            return nil
        }
    }

    private func decryptMegaMedia(embedUrl: String) async -> MegaStreams? {
        let mediaUrl = embedUrl.replacingOccurrences(of: "/e/", with: "/media/")
        guard let url = URL(string: mediaUrl) else { return nil }

        do {
            let data = try await fetchData(from: url, headers: headers)
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let encrypted = json?["result"] as? String else { return nil }

            let decUrl = URL(string: "\(encDecApi)/dec-mega")!
            let body: [String: String] = ["text": encrypted, "agent": headers["User-Agent"] ?? ""]
            let decData = try await postJSON(to: decUrl, body: body, headers: encDecHeaders())
            let decResp = try JSONDecoder().decode(MegaDecryptedResult.self, from: decData)
            return decResp.result
        } catch {
            print("❌ [AnimeKaiService] decryptMegaMedia failed: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - Quality Extraction

    private func extractQualityFromUrl(_ url: String) -> String {
        let patterns: [(String, String)] = [
            ("[._/-]2160[pP]?", "4K"), ("[._/-]1440[pP]?", "1440p"),
            ("[._/-]1080[pP]?", "1080p"), ("[._/-]720[pP]?", "720p"),
            ("[._/-]480[pP]?", "480p"), ("[._/-]360[pP]?", "360p"),
            ("\\b(4k|uhd)\\b", "4K"), ("\\b(fhd|1080)\\b", "1080p"),
            ("\\b(hd|720)\\b", "720p"), ("\\b(sd|480)\\b", "480p")
        ]

        for (pattern, label) in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               regex.firstMatch(in: url, range: NSRange(url.startIndex..., in: url)) != nil {
                return label
            }
        }
        return "Unknown"
    }

    // MARK: - M3U8 Parsing

    private struct M3U8Variant {
        let url: String
        let quality: String
    }

    private func parseM3U8Master(playlistUrl: String) async -> [M3U8Variant] {
        guard let url = URL(string: playlistUrl) else { return [] }

        do {
            var hdrs = headers
            hdrs["Accept"] = "application/vnd.apple.mpegurl,application/x-mpegURL,*/*"
            let data = try await fetchData(from: url, headers: hdrs)
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
                    if !streamUrl.hasPrefix("http"), let resolved = URL(string: line, relativeTo: url) {
                        streamUrl = resolved.absoluteString
                    }
                    variants.append(M3U8Variant(url: streamUrl, quality: q))
                    currentQuality = nil
                }
            }

            return variants.sorted { (qualityOrder[$0.quality] ?? -1) > (qualityOrder[$1.quality] ?? -1) }
        } catch {
            return []
        }
    }

    private func extractQualityFromStreamInf(_ line: String) -> String {
        if let resRange = line.range(of: "RESOLUTION=") {
            let sub = line[resRange.upperBound...]
            let part = sub.prefix(while: { $0 != "," })
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
            let part = sub.prefix(while: { $0 != "," })
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

    // MARK: - Ajax Helper

    private func fetchKaiAjax(urlString: String) async -> KaiAjaxResponse? {
        guard let url = URL(string: urlString) else { return nil }

        do {
            var hdrs = headers
            hdrs["Referer"] = "https://animekai.to/"
            hdrs["Origin"] = "https://animekai.to"
            let data = try await fetchData(from: url, headers: hdrs)
            return try JSONDecoder().decode(KaiAjaxResponse.self, from: data)
        } catch {
            print("❌ [AnimeKaiService] Ajax failed for \(urlString): \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - Networking

    private func fetchData(from url: URL, headers: [String: String]) async throws -> Data {
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        request.allHTTPHeaderFields = headers
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpRes = response as? HTTPURLResponse, (200..<400).contains(httpRes.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw NSError(domain: "AnimeKaiService", code: code, userInfo: [NSLocalizedDescriptionKey: "HTTP \(code)"])
        }
        return data
    }

    private func postJSON(to url: URL, body: [String: String], headers: [String: String]) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        var hdrs = headers
        hdrs["Content-Type"] = "application/json"
        request.allHTTPHeaderFields = hdrs
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpRes = response as? HTTPURLResponse, (200..<400).contains(httpRes.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw NSError(domain: "AnimeKaiService", code: code, userInfo: [NSLocalizedDescriptionKey: "HTTP \(code)"])
        }
        return data
    }

    private func encDecHeaders() -> [String: String] {
        var hdrs = headers
        hdrs["Referer"] = "https://enc-dec.app/"
        hdrs["Origin"] = "https://enc-dec.app"
        return hdrs
    }
}
