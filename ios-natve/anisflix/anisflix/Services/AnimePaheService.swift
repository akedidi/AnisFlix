//
//  AnimePaheService.swift
//  anisflix
//

import Foundation

class AnimePaheService {
    static let shared = AnimePaheService()

    private let tmdbApiKey = "1865f43a0549ca50d341dd9ab8b29f49"
    private let tmdbBase = "https://api.themoviedb.org/3"
    private let mainUrl = "https://animepahe.pw"
    private let proxyUrl = "https://animepaheproxy.phisheranimepahe.workers.dev/?url="
    private let mappingBase = "https://id-mapping-api-malid.hf.space/api/resolve"
    private let jikanBase = "https://api.jikan.moe/v4/anime"

    private let headers: [String: String] = [
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": "__ddg2_=1234567890",
        "Referer": "https://animepahe.pw/"
    ]

    private let kwikHeaders: [String: String] = [
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://kwik.cx/",
        "Origin": "https://kwik.cx"
    ]

    private let qualityOrder: [String: Int] = [
        "4K": 4, "2160p": 4, "1440p": 3, "1080p": 3, "720p": 2, "480p": 1, "360p": 0, "Unknown": -1
    ]

    // MARK: - Public Models

    struct ExtractedSource {
        let name: String
        let url: String
        let quality: String
        let type: String
        let serverType: String
        let subtitles: [Subtitle]
        let headers: [String: String]
        let embedUrl: String?
    }

    struct Subtitle {
        let url: String
        let language: String
        let isDefault: Bool
    }

    // MARK: - API Models

    private struct PaheSearchResponse: Codable {
        let data: [PaheSearchItem]?
    }

    private struct PaheSearchItem: Codable {
        let session: String?
        let title: String?
    }

    private struct PaheReleaseResponse: Codable {
        let data: [PaheReleaseItem]?
        let per_page: Int?
    }

    private struct PaheReleaseItem: Codable {
        let session: String?
        let episode: Double?
    }

    private struct TmdbExternalIds: Codable {
        let imdb_id: String?
    }

    private struct TmdbMovieDetail: Codable {
        let title: String?
        let original_title: String?
    }

    private struct MalMappingResponse: Codable {
        let mal_id: Int?
        let mal_episode: Int?
        let anime_title: String?
    }

    private struct JikanAnimeResponse: Codable {
        let data: JikanAnimeData?
    }

    private struct JikanAnimeData: Codable {
        let title: String?
    }

    private let tlsBypassDelegate = TLSBypassDelegate()
    private lazy var insecureSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        return URLSession(configuration: config, delegate: tlsBypassDelegate, delegateQueue: nil)
    }()

    // MARK: - Main Entry Point

    func getStreams(tmdbId: Int, mediaType: String, season: Int? = nil, episode: Int? = nil) async -> [ExtractedSource] {
        let ep = episode ?? 1
        let seasonNum = season ?? 1
        print("🐎 [AnimePaheService] Fetching streams for TMDB:\(tmdbId), Type:\(mediaType), S\(seasonNum)E\(ep)")

        guard let (animeSession, mappedEp, animeTitle) = await resolveAnimeSession(
            tmdbId: tmdbId,
            mediaType: mediaType,
            season: seasonNum,
            episode: ep
        ) else {
            print("❌ [AnimePaheService] Could not resolve anime session")
            return []
        }

        print("✅ [AnimePaheService] Session: \(animeSession), ep: \(mappedEp), title: \(animeTitle)")

        guard let episodeSession = await resolveEpisodeSession(animeSession: animeSession, mappedEpisode: mappedEp) else {
            print("❌ [AnimePaheService] Could not resolve episode session")
            return []
        }

        print("✅ [AnimePaheService] Episode session: \(episodeSession)")

        let rawStreams = await extractStreamsFromPlayPage(
            animeSession: animeSession,
            episodeSession: episodeSession,
            animeTitle: animeTitle,
            mappedEpisode: mappedEp
        )

        var validated: [ExtractedSource] = []
        await withTaskGroup(of: (ExtractedSource, Bool).self) { group in
            for stream in rawStreams {
                group.addTask { [self] in
                    let ok = await self.isStreamReachable(url: stream.url, headers: stream.headers)
                    return (stream, ok)
                }
            }
            for await (stream, ok) in group where ok {
                validated.append(stream)
            }
        }

        validated.sort { (qualityOrder[$0.quality] ?? -1) > (qualityOrder[$1.quality] ?? -1) }

        var result = validated
        if result.isEmpty && !rawStreams.isEmpty {
            print("⚠️ [AnimePaheService] CDN pre-check failed for all \(rawStreams.count) URL(s) — returning extracted streams anyway")
            result = rawStreams
        } else if validated.count < rawStreams.count {
            print("⚠️ [AnimePaheService] Filtered \(rawStreams.count - validated.count) dead URL(s), kept \(validated.count)")
        }

        result.sort { (qualityOrder[$0.quality] ?? -1) > (qualityOrder[$1.quality] ?? -1) }
        let subCount = result.filter { $0.serverType == "Sub" }.count
        let dubCount = result.filter { $0.serverType == "Dub" }.count
        let qualities = Set(result.map(\.quality)).sorted { (qualityOrder[$0] ?? 0) > (qualityOrder[$1] ?? 0) }
        print("✅ [AnimePaheService] Returning \(result.count) stream(s) — Sub:\(subCount) Dub:\(dubCount) qualities:\(qualities.joined(separator: ", "))")
        return result
    }

    // MARK: - Resolve Anime Session

    private func resolveAnimeSession(
        tmdbId: Int,
        mediaType: String,
        season: Int,
        episode: Int
    ) async -> (session: String, mappedEp: Int, title: String)? {
        if mediaType == "tv" {
            guard let imdbId = await getImdbId(tmdbId: tmdbId, mediaType: "tv") else {
                print("❌ [AnimePaheService] No IMDB id for TMDB \(tmdbId)")
                return nil
            }
            guard let mapping = await resolveMapping(imdbId: imdbId, season: season, episode: episode) else {
                print("❌ [AnimePaheService] MAL mapping failed for \(imdbId) S\(season)E\(episode)")
                return nil
            }
            guard let malId = mapping.mal_id else {
                return nil
            }
            let mappedEp = mapping.mal_episode ?? episode
            var searchQueries: [String] = []
            if let mappingTitle = mapping.anime_title, !mappingTitle.isEmpty {
                searchQueries.append(mappingTitle)
            }
            if let jikanTitle = await getMalTitle(malId: malId), !jikanTitle.isEmpty {
                searchQueries.append(jikanTitle)
            }
            searchQueries = Array(Set(searchQueries))
            guard !searchQueries.isEmpty else {
                print("❌ [AnimePaheService] No search title for MAL \(malId)")
                return nil
            }
            print("✅ [AnimePaheService] MAL id \(malId), search: \(searchQueries.joined(separator: " | "))")
            guard let session = await findAnimeSessionByMal(malId: malId, searchQueries: searchQueries) else {
                return nil
            }
            return (session, mappedEp, searchQueries[0])
        }

        guard let movieTitle = await getMovieTitle(tmdbId: tmdbId) else {
            print("❌ [AnimePaheService] TMDB movie title failed for \(tmdbId)")
            return nil
        }
        let searchResults = await searchAnime(query: movieTitle)
        guard let first = searchResults.data?.first,
              let session = first.session,
              !session.isEmpty else {
            return nil
        }
        let resultTitle = first.title ?? movieTitle
        if resultTitle.lowercased() == movieTitle.lowercased() {
            return (session, 1, movieTitle)
        }
        print("⚠️ [AnimePaheService] Search title mismatch: '\(resultTitle)' vs '\(movieTitle)'")
        return (session, 1, resultTitle)
    }

    // MARK: - Episode Session

    private func resolveEpisodeSession(animeSession: String, mappedEpisode: Int) async -> String? {
        let firstPagePath = "/api?m=release&id=\(animeSession)&sort=episode_asc&page=1"
        guard let firstPage: PaheReleaseResponse = await fetchJson(path: firstPagePath) else {
            return nil
        }
        guard let firstData = firstPage.data, !firstData.isEmpty else {
            return nil
        }

        let paheEpStart = Int(floor(firstData[0].episode ?? 1))
        let perPage = max(firstPage.per_page ?? 30, 1)
        let targetPaheEp = paheEpStart - 1 + mappedEpisode
        let targetPage = max(Int(ceil(Double(mappedEpisode) / Double(perPage))), 1)

        let targetPagePath = "/api?m=release&id=\(animeSession)&sort=episode_asc&page=\(targetPage)"
        if let targetPageData: PaheReleaseResponse = await fetchJson(path: targetPagePath),
           let items = targetPageData.data {
            if let found = items.first(where: { Int(floor($0.episode ?? 0)) == targetPaheEp }),
               let session = found.session, !session.isEmpty {
                return session
            }
        }

        if targetPage != 1,
           let found = firstData.first(where: { Int(floor($0.episode ?? 0)) == targetPaheEp }),
           let session = found.session, !session.isEmpty {
            return session
        }

        return nil
    }

    // MARK: - Play Page + Kwik

    private struct KwikButton {
        let url: String
        let label: String
        let resolution: String?
        let audio: String?
    }

    private func extractStreamsFromPlayPage(
        animeSession: String,
        episodeSession: String,
        animeTitle: String,
        mappedEpisode: Int
    ) async -> [ExtractedSource] {
        let playPath = "/play/\(animeSession)/\(episodeSession)"
        guard let html = await fetchText(path: playPath, useProxy: true) else {
            print("❌ [AnimePaheService] Play page fetch failed")
            return []
        }

        var buttons = parseResolutionMenuButtons(html: html)
        if buttons.isEmpty {
            buttons = parseKwikButtonsFromScripts(html: html)
        }
        if buttons.isEmpty {
            print("❌ [AnimePaheService] No Kwik buttons (html \(html.count) chars, kwik.cx x\((html.components(separatedBy: "kwik.cx").count - 1)))")
            return []
        }

        print("🐎 [AnimePaheService] Found \(buttons.count) Kwik button(s)")

        var results: [ExtractedSource] = []
        await withTaskGroup(of: ExtractedSource?.self) { group in
            for btn in buttons {
                group.addTask { [self] in
                    guard let extracted = await self.extractKwik(url: btn.url) else {
                        return nil
                    }
                    let quality = self.qualityLabel(resolution: btn.resolution, label: btn.label)
                    let serverType = self.audioLabel(audio: btn.audio, label: btn.label)
                    let typeLabel = serverType == "Dub" ? "Dub" : "Sub"
                    return ExtractedSource(
                        name: "AnimePahe (\(quality) \(typeLabel))",
                        url: extracted.url,
                        quality: quality,
                        type: extracted.url.contains(".m3u8") ? "hls" : "mp4",
                        serverType: serverType,
                        subtitles: [],
                        headers: extracted.headers,
                        embedUrl: btn.url
                    )
                }
            }
            for await item in group {
                if let item { results.append(item) }
            }
        }

        return results
    }

    private func parseResolutionMenuButtons(html: String) -> [KwikButton] {
        if let menuRange = html.range(of: #"id=["']resolutionMenu["']"#, options: .regularExpression) {
            let menuSlice = String(html[menuRange.lowerBound...])
            let endMarkers = [
                "<div id=\"serversMenu\"",
                "<div id='serversMenu'",
                "<div id=\"pickDownload\"",
                "<div id='pickDownload'",
                "</body>"
            ]
            var menuHtml = menuSlice
            for marker in endMarkers {
                if let r = menuSlice.range(of: marker) {
                    menuHtml = String(menuSlice[..<r.lowerBound])
                    break
                }
            }
            let fromMenu = parseKwikButtonsInHtml(menuHtml)
            if !fromMenu.isEmpty { return fromMenu }
        }
        return parseKwikButtonsInHtml(html)
    }

    /// Page embeds the active Kwik URL in inline scripts: `let url = "https://kwik.cx/e/..."`.
    private func parseKwikButtonsFromScripts(html: String) -> [KwikButton] {
        let pattern = #"let\s+url\s*=\s*["'](https?://kwik\.cx/[^"']+)["']"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else {
            return []
        }
        let ns = html as NSString
        guard let match = regex.firstMatch(in: html, range: NSRange(location: 0, length: ns.length)),
              match.numberOfRanges >= 2 else {
            return []
        }
        let url = ns.substring(with: match.range(at: 1))
        print("🐎 [AnimePaheService] Using Kwik URL from page script: \(url)")
        return [KwikButton(url: url, label: "1080p", resolution: "1080", audio: "jpn")]
    }

    private func parseKwikButtonsInHtml(_ html: String) -> [KwikButton] {
        var buttons: [KwikButton] = []
        var seen = Set<String>()
        // https://kwik.cx — no chars between :// and kwik, so use [^"]* not [^"]+
        let patterns = [
            #"<button[^>]*\sdata-src=["'](https?://[^"']*kwik[^"']*)["']([^>]*)>([\s\S]*?)</button>"#,
            #"\sdata-src=["'](https?://[^"']*kwik[^"']*)["'][^>]*data-resolution=["'](\d+)["'][^>]*data-audio=["']([^"']*)["']"#
        ]

        let ns = html as NSString
        let range = NSRange(location: 0, length: ns.length)

        if let regex = try? NSRegularExpression(pattern: patterns[0], options: .caseInsensitive) {
            for match in regex.matches(in: html, options: [], range: range) {
                guard match.numberOfRanges >= 4 else { continue }
                let src = ns.substring(with: match.range(at: 1))
                guard src.lowercased().contains("kwik"), seen.insert(src).inserted else { continue }
                let attrs = ns.substring(with: match.range(at: 2))
                let innerHtml = ns.substring(with: match.range(at: 3))
                let label = stripHtmlTags(innerHtml)
                buttons.append(KwikButton(
                    url: src,
                    label: label,
                    resolution: extractAttribute("data-resolution", from: attrs),
                    audio: extractAttribute("data-audio", from: attrs)
                ))
            }
        }

        if buttons.isEmpty, let regex = try? NSRegularExpression(pattern: patterns[1], options: .caseInsensitive) {
            for match in regex.matches(in: html, options: [], range: range) {
                guard match.numberOfRanges >= 4 else { continue }
                let src = ns.substring(with: match.range(at: 1))
                guard seen.insert(src).inserted else { continue }
                let resolution = ns.substring(with: match.range(at: 2))
                let audio = ns.substring(with: match.range(at: 3))
                buttons.append(KwikButton(url: src, label: "\(resolution)p", resolution: resolution, audio: audio))
            }
        }

        return buttons
    }

    private func stripHtmlTags(_ html: String) -> String {
        guard let regex = try? NSRegularExpression(pattern: "<[^>]+>", options: []) else {
            return html
        }
        let range = NSRange(html.startIndex..., in: html)
        let stripped = regex.stringByReplacingMatches(in: html, range: range, withTemplate: " ")
        return stripped
            .replacingOccurrences(of: "&middot;", with: "·")
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    private func extractAttribute(_ name: String, from attrs: String) -> String? {
        let pattern = #"\#(name)="([^"]*)""#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let match = regex.firstMatch(in: attrs, range: NSRange(attrs.startIndex..., in: attrs)),
              match.numberOfRanges >= 2,
              let range = Range(match.range(at: 1), in: attrs) else {
            return nil
        }
        return String(attrs[range])
    }

    private func qualityLabel(resolution: String?, label: String) -> String {
        if let res = resolution, let n = Int(res), n > 0 {
            return "\(n)p"
        }
        let pattern = #"(\d{3,4}p)"#
        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: label, range: NSRange(label.startIndex..., in: label)),
           match.numberOfRanges >= 2,
           let range = Range(match.range(at: 1), in: label) {
            return String(label[range])
        }
        return "720p"
    }

    private func audioLabel(audio: String?, label: String) -> String {
        if audio?.lowercased() == "eng" || label.lowercased().contains("eng") {
            return "Dub"
        }
        return "Sub"
    }

    // MARK: - Kwik Extractor

    private func extractKwik(url: String) async -> (url: String, headers: [String: String])? {
        var hdrs = kwikHeaders
        hdrs["Referer"] = url
        guard let html = await fetchText(urlString: url, useProxy: false, extraHeaders: hdrs) else {
            print("⚠️ [AnimePaheService] Kwik fetch failed: \(url)")
            return nil
        }

        let packedBlocks = extractPackedJsBlocks(from: html)
        if packedBlocks.isEmpty {
            print("⚠️ [AnimePaheService] No packed JS in \(url)")
            return nil
        }
        for (i, block) in packedBlocks.enumerated() {
            let unpacked = unpackJsPacker(code: block)
            if let streamUrl = findStreamUrlInScript(unpacked) {
                print("✅ [AnimePaheService] Kwik block[\(i)] → \(streamUrl.prefix(80))…")
                return (streamUrl, kwikHeaders)
            }
        }
        print("⚠️ [AnimePaheService] Kwik unpack found no source in \(packedBlocks.count) block(s): \(url)")
        return nil
    }

    private func extractPackedJsBlocks(from html: String) -> [String] {
        var blocks: [String] = []
        let scriptPattern = #"<script[^>]*>([\s\S]*?)</script>"#
        let scripts: [String]
        if let scriptRegex = try? NSRegularExpression(pattern: scriptPattern, options: .caseInsensitive) {
            let ns = html as NSString
            scripts = scriptRegex.matches(in: html, range: NSRange(location: 0, length: ns.length)).compactMap { match -> String? in
                guard match.numberOfRanges >= 2 else { return nil }
                return ns.substring(with: match.range(at: 1))
            }
        } else {
            scripts = [html]
        }

        let marker = "eval(function(p,a,c,k,e,d)"
        for script in scripts where script.contains(marker) {
            var searchStart = script.startIndex
            while searchStart < script.endIndex,
                  let range = script.range(of: marker, range: searchStart..<script.endIndex) {
                let slice = script[range.lowerBound...]
                if let splitRange = slice.range(of: ".split('|')"),
                   let closeRange = slice.range(of: "))", range: splitRange.upperBound..<slice.endIndex) {
                    let end = closeRange.upperBound
                    blocks.append(String(slice[..<end]))
                    searchStart = end
                } else {
                    searchStart = range.upperBound
                }
            }
        }
        return blocks
    }

    private func unpackJsPacker(code: String) -> String {
        let pattern = #"\}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|['"]\)"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: code, range: NSRange(code.startIndex..., in: code)),
              match.numberOfRanges >= 7 else {
            return code
        }

        let ns = code as NSString
        var p = ns.substring(with: match.range(at: 2))
        p = p.replacingOccurrences(of: "\\'", with: "'")
            .replacingOccurrences(of: "\\\"", with: "\"")
            .replacingOccurrences(of: "\\\\", with: "\\")

        guard let a = Int(ns.substring(with: match.range(at: 3))),
              let c = Int(ns.substring(with: match.range(at: 4))) else {
            return code
        }

        let kStr = ns.substring(with: match.range(at: 6))
        let k = kStr.split(separator: "|", omittingEmptySubsequences: false).map(String.init)

        func e(_ cVal: Int) -> String {
            // JS: (c2 < a ? '' : e(c2/a)) + ((c2 % a) > 35 ? char : toString(36))
            let head = cVal < a ? "" : e(cVal / a)
            let remainder = cVal % a
            let tail = remainder > 35
                ? String(UnicodeScalar(remainder + 29)!)
                : String(remainder, radix: 36)
            return head + tail
        }

        var dict: [String: String] = [:]
        var idx = c
        while idx >= 0 {
            let key = e(idx)
            if idx < k.count, !k[idx].isEmpty {
                dict[key] = k[idx]
            } else {
                dict[key] = key // JS: k[c] || e(c)
            }
            idx -= 1
        }

        return applyWordDictionary(p, dict: dict)
    }

    /// JS: `p.replace(/\b\w+\b/g, (w) => d[w])` — undefined dict entries keep the original word.
    private func applyWordDictionary(_ p: String, dict: [String: String]) -> String {
        // JS \w = [A-Za-z0-9_] only; Swift \w is Unicode-aware and breaks the packer.
        guard let wordRegex = try? NSRegularExpression(pattern: #"\b[A-Za-z0-9_]+\b"#) else { return p }
        let pNs = p as NSString
        let fullRange = NSRange(location: 0, length: pNs.length)
        let matches = wordRegex.matches(in: p, options: [], range: fullRange)
        guard !matches.isEmpty else { return p }

        var out = ""
        var cursor = 0
        for match in matches {
            let start = match.range.location
            if start > cursor {
                out += pNs.substring(with: NSRange(location: cursor, length: start - cursor))
            }
            let word = pNs.substring(with: match.range(at: 0))
            out += dict[word] ?? word
            cursor = start + match.range.length
        }
        if cursor < pNs.length {
            out += pNs.substring(from: cursor)
        }
        return out
    }

    private func findStreamUrlInScript(_ script: String) -> String? {
        let patterns = [
            #"const\s+source\s*=\s*['"](https?://[^'"]+)['"]"#,
            #"var\s+source\s*=\s*['"](https?://[^'"]+)['"]"#,
            #"source\s*=\s*['"](https?://[^'"]+)['"]"#,
            #"src\s*:\s*['"](https?://[^'"]+)['"]"#,
            #"(https?://[^\s'"]+\.m3u8[^\s'"]*)"#
        ]
        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: script, range: NSRange(script.startIndex..., in: script)),
               match.numberOfRanges >= 2,
               let range = Range(match.range(at: 1), in: script) {
                return String(script[range])
            }
        }
        return nil
    }

    // MARK: - TMDB / MAL / Search

    private func getImdbId(tmdbId: Int, mediaType: String) async -> String? {
        let path = "/\(mediaType == "tv" ? "tv" : "movie")/\(tmdbId)/external_ids?api_key=\(tmdbApiKey)"
        guard let url = URL(string: tmdbBase + path) else { return nil }
        do {
            let data = try await URLSession.shared.data(from: url).0
            let decoded = try JSONDecoder().decode(TmdbExternalIds.self, from: data)
            return decoded.imdb_id
        } catch {
            print("❌ [AnimePaheService] getImdbId: \(error.localizedDescription)")
            return nil
        }
    }

    private func resolveMapping(imdbId: String, season: Int, episode: Int) async -> MalMappingResponse? {
        var components = URLComponents(string: mappingBase)
        components?.queryItems = [
            URLQueryItem(name: "id", value: imdbId),
            URLQueryItem(name: "s", value: String(season)),
            URLQueryItem(name: "e", value: String(episode))
        ]
        guard let url = components?.url else { return nil }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                return nil
            }
            return try JSONDecoder().decode(MalMappingResponse.self, from: data)
        } catch {
            print("❌ [AnimePaheService] resolveMapping: \(error.localizedDescription)")
            return nil
        }
    }

    private func getMalTitle(malId: Int) async -> String? {
        guard let url = URL(string: "\(jikanBase)/\(malId)") else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let decoded = try JSONDecoder().decode(JikanAnimeResponse.self, from: data)
            return decoded.data?.title
        } catch {
            return nil
        }
    }

    private func getMovieTitle(tmdbId: Int) async -> String? {
        guard let url = URL(string: "\(tmdbBase)/movie/\(tmdbId)?api_key=\(tmdbApiKey)") else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let decoded = try JSONDecoder().decode(TmdbMovieDetail.self, from: data)
            return decoded.title ?? decoded.original_title
        } catch {
            return nil
        }
    }

    private func searchAnime(query: String) async -> PaheSearchResponse {
        let encodedQuery = percentEncodeURIComponent(query)
        let path = "/api?m=search&l=8&q=\(encodedQuery)"
        return await fetchJson(path: path) ?? PaheSearchResponse(data: nil)
    }

    private func findAnimeSessionByMal(malId: Int, searchQueries: [String]) async -> String? {
        var checkedSessions = Set<String>()
        for query in searchQueries {
            let results = await searchAnime(query: query)
            guard let items = results.data else { continue }
            let limit = min(items.count, 3)
            for i in 0..<limit {
                guard let session = items[i].session, !session.isEmpty, !checkedSessions.contains(session) else { continue }
                checkedSessions.insert(session)
                let pagePath = "/anime/\(session)"
                guard let pageHtml = await fetchText(path: pagePath, useProxy: true) else { continue }
                if pageHtml.contains("myanimelist.net/anime/\(malId)") {
                    print("✅ [AnimePaheService] Matched session via query \"\(query)\": \(items[i].title ?? session)")
                    return session
                }
            }
        }
        return nil
    }

    /// encodeURIComponent equivalent (full URL for proxy, query values for API paths).
    private func percentEncodeURIComponent(_ value: String) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    // MARK: - Networking

    private func fetchText(path: String, useProxy: Bool, extraHeaders: [String: String] = [:]) async -> String? {
        await fetchText(urlString: buildUrl(path: path, useProxy: useProxy), useProxy: useProxy, extraHeaders: extraHeaders)
    }

    private func fetchText(urlString: String, useProxy: Bool, extraHeaders: [String: String] = [:]) async -> String? {
        guard let url = URL(string: urlString) else { return nil }
        do {
            return try await fetchText(from: url, extraHeaders: extraHeaders)
        } catch {
            print("❌ [AnimePaheService] fetchText: \(error.localizedDescription)")
            return nil
        }
    }

    private func fetchJson<T: Decodable>(path: String) async -> T? {
        guard let text = await fetchText(path: path, useProxy: true),
              let data = text.data(using: .utf8) else {
            return nil
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            print("❌ [AnimePaheService] fetchJson decode: \(error.localizedDescription)")
            return nil
        }
    }

    private func buildUrl(path: String, useProxy: Bool) -> String {
        let finalUrl = path.hasPrefix("http") ? path : "\(mainUrl)\(path.hasPrefix("/") ? path : "/\(path)")"
        if useProxy {
            return proxyUrl + percentEncodeURIComponent(finalUrl)
        }
        return finalUrl
    }

    private func fetchText(from url: URL, extraHeaders: [String: String]) async throws -> String {
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        var hdrs = headers
        for (k, v) in extraHeaders { hdrs[k] = v }
        request.allHTTPHeaderFields = hdrs

        let session = needsTLSBypass(url: url) ? insecureSession : URLSession.shared
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<400).contains(http.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw NSError(domain: "AnimePaheService", code: code, userInfo: [NSLocalizedDescriptionKey: "HTTP \(code)"])
        }
        guard let text = String(data: data, encoding: .utf8) else {
            throw NSError(domain: "AnimePaheService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid UTF-8"])
        }
        return text
    }

    private func needsTLSBypass(url: URL) -> Bool {
        let host = url.host?.lowercased() ?? ""
        return host.contains("kwik")
            || host.contains("animepahe")
            || host.contains("owocdn")
            || host.contains("vault-")
    }

    private func isStreamReachable(url: String, headers: [String: String]) async -> Bool {
        guard let target = URL(string: url) else { return false }
        var request = URLRequest(url: target)
        request.httpMethod = "GET"
        request.timeoutInterval = 12
        var hdrs = headers
        if url.contains(".m3u8") {
            hdrs["Accept"] = "application/vnd.apple.mpegurl,application/x-mpegURL,*/*"
        }
        request.allHTTPHeaderFields = hdrs
        do {
            let session = needsTLSBypass(url: target) ? insecureSession : URLSession.shared
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<400).contains(http.statusCode) else {
                return false
            }
            if url.contains(".m3u8"), let text = String(data: data, encoding: .utf8) {
                return text.contains("#EXTM3U") || text.contains("#EXT-X-")
            }
            return true
        } catch {
            print("⚠️ [AnimePaheService] Unreachable \(target.host ?? url): \(error.localizedDescription)")
            return false
        }
    }
}
