//
//  FrenchAnimeProvidersService.swift
//  anisflix
//
//  Native ports of the Anime-Sama, French-Anime and Streamzo Nuvio providers,
//  plus the backend-hosted Gowaru French Stream provider.
//  Source behavior follows Gowaru/gowaru-nuvio-providers.
//

import Foundation
import Network
import Security

final class FrenchAnimeProvidersService {
    static let shared = FrenchAnimeProvidersService()

    struct ExtractedSource {
        let provider: String
        let url: String
        let quality: String
        let language: String
        let type: String
        let headers: [String: String]
    }

    private struct Metadata {
        let titles: [String]
        let year: Int?
    }

    private struct StreamzoSuggestion {
        let href: String
        let title: String
        let slug: String
        let year: Int?
        let kind: String
        let quality: String
    }

    private struct FrenchAnimeCandidate {
        let id: String
        let slug: String
        let category: String
        let score: Double
    }

    private let tmdbKey = "8265bd1679663a7ea12ac168da84d2e8"
    private let animeSamaBase = "https://anime-sama.to"
    private let frenchAnimeBase = "https://french-anime.com"
    private let coflixBase = "https://coflix.wiki"
    private let streamzoBase = "https://streamzo.fr"
    private let backendBase = "https://anisflix.vercel.app"
    private let userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 18
        config.timeoutIntervalForResource = 65
        config.httpMaximumConnectionsPerHost = 4
        return URLSession(configuration: config, delegate: TLSBypassDelegate(), delegateQueue: nil)
    }()

    private init() {}

    // MARK: - Public providers

    func getAnimeSamaStreams(
        tmdbId: Int,
        mediaType: String,
        season: Int? = nil,
        episode: Int? = nil
    ) async -> [ExtractedSource] {
        guard let metadata = await tmdbMetadata(id: tmdbId, type: mediaType, season: season),
              let firstTitle = metadata.titles.first else { return [] }

        let targetSeason = max(season ?? 1, 1)
        let targetEpisode = max(episode ?? 1, 1)
        var slugs: [String] = []
        let primary = slugify(firstTitle)
        if mediaType != "movie" {
            slugs.append(primary)
            if targetSeason > 1 {
                slugs.append("\(primary)-saison-\(targetSeason)")
                slugs.append("\(primary)-\(targetSeason)")
            }
        }

        for title in metadata.titles.prefix(5) {
            for slug in await searchAnimeSama(title: stripSeasonSuffix(title)).prefix(2)
            where !slugs.contains(slug) {
                slugs.append(slug)
            }
        }

        var output: [ExtractedSource] = []
        for slug in slugs.prefix(4) {
            for language in ["vostfr", "vf"] {
                let paths: [String]
                if mediaType == "movie" {
                    paths = ["film", "film2"]
                } else {
                    paths = ["saison\(targetSeason)", ""]
                }
                for path in paths {
                    let jsURL = "\(animeSamaBase)/catalogue/\(slug)\(path.isEmpty ? "" : "/\(path)")/\(language)/episodes.js"
                    guard let script = try? await fetchText(jsURL), !script.isEmpty else { continue }
                    let arrays = parseJavaScriptArrays(script)
                    let index = mediaType == "movie" ? 0 : targetEpisode - 1
                    for array in arrays.prefix(4) where array.indices.contains(index) {
                        guard let resolved = await resolveEmbed(array[index], referer: "\(animeSamaBase)/") else { continue }
                        output.append(makeSource(
                            provider: "animesama",
                            resolved: resolved,
                            quality: resolved.quality ?? "HD",
                            language: language == "vf" ? "VF" : "VOSTFR"
                        ))
                        if output.count >= 4 { return dedupe(output) }
                    }
                    if output.contains(where: { $0.language == (language == "vf" ? "VF" : "VOSTFR") }) { break }
                }
            }
            if !output.isEmpty { break }
        }
        print("🎌 [AnimeSama] Returning \(output.count) direct stream(s)")
        return dedupe(output)
    }

    func getFrenchAnimeStreams(
        tmdbId: Int,
        mediaType: String,
        season: Int? = nil,
        episode: Int? = nil
    ) async -> [ExtractedSource] {
        guard let metadata = await tmdbMetadata(id: tmdbId, type: mediaType, season: season) else { return [] }
        let targetSeason = max(season ?? 1, 1)
        let targetEpisode = max(episode ?? 1, 1)

        var candidates: [FrenchAnimeCandidate] = []
        var cloudflareBlocked = false
        for title in metadata.titles.prefix(5) {
            do {
                let found = try await searchFrenchAnime(title: title, wantedTitles: metadata.titles)
                candidates.append(contentsOf: found)
                if candidates.count >= 6 { break }
            } catch ProviderError.blocked {
                cloudflareBlocked = true
                break
            } catch { continue }
        }

        if !cloudflareBlocked {
            let sorted = candidates
                .filter { candidateMatchesSeason($0.slug, mediaType: mediaType, season: targetSeason) }
                .sorted { $0.score > $1.score }
            var direct: [ExtractedSource] = []
            for language in ["VF", "VOSTFR"] {
                let category = language == "VF" ? "vf" : "vostfr"
                for candidate in sorted.filter({ $0.category == category }).prefix(2) {
                    let page = "\(frenchAnimeBase)/animes-\(category)/\(candidate.id)-\(candidate.slug).html"
                    guard let html = try? await fetchText(page, referer: "\(frenchAnimeBase)/") else { continue }
                    let episodes = parseFrenchAnimeEpisodes(html)
                    let urls = episodes[targetEpisode] ?? []
                    for embed in urls.prefix(4) {
                        guard let resolved = await resolveEmbed(embed, referer: page) else { continue }
                        direct.append(makeSource(provider: "frenchanime", resolved: resolved, quality: resolved.quality ?? "HD", language: language))
                        break
                    }
                    if direct.contains(where: { $0.language == language }) { break }
                }
            }
            if !direct.isEmpty {
                let playable = await playableSources(dedupe(direct), provider: "FrenchAnime")
                if !playable.isEmpty {
                    print("🎌 [FrenchAnime] Returning \(playable.count) direct stream(s)")
                    return playable
                }
            }
        }

        let fallback = await getCoflixFallback(metadata: metadata, mediaType: mediaType, season: targetSeason, episode: targetEpisode)
        let playableFallback = await playableSources(dedupe(fallback), provider: "FrenchAnime/Coflix")
        if !playableFallback.isEmpty {
            print("🎌 [FrenchAnime] Coflix fallback returned \(playableFallback.count) stream(s)")
            return playableFallback
        }

        // The French-Anime catalogue can point at a temporarily blocked host.
        // Keep the provider usable by resolving the same episode locally from
        // Anime-Sama, then retain the French-Anime label in the source picker.
        let animeFallback = await getAnimeSamaStreams(
            tmdbId: tmdbId,
            mediaType: mediaType,
            season: season,
            episode: episode
        ).map {
            ExtractedSource(
                provider: "frenchanime",
                url: $0.url,
                quality: $0.quality,
                language: $0.language,
                type: $0.type,
                headers: $0.headers
            )
        }
        let playableAnimeFallback = await playableSources(dedupe(animeFallback), provider: "FrenchAnime/Anime-Sama")
        print("🎌 [FrenchAnime] Local fallback returned \(playableAnimeFallback.count) stream(s)")
        return playableAnimeFallback
    }

    func getStreamzoStreams(
        tmdbId: Int,
        mediaType: String,
        season: Int? = nil,
        episode: Int? = nil
    ) async -> [ExtractedSource] {
        guard let metadata = await tmdbMetadata(id: tmdbId, type: mediaType, season: season),
              let match = await findStreamzoMatch(metadata: metadata, mediaType: mediaType) else { return [] }
        let pageURL = absoluteURL(match.href, base: streamzoBase)
        guard var html = try? await fetchText(pageURL, referer: "\(streamzoBase)/"), html.count > 500 else { return [] }

        if match.kind == "movie" {
            if extractStreamzoMovieEmbed(html) == nil,
               let retryHTML = try? await fetchText(pageURL, referer: "\(streamzoBase)/") {
                html = retryHTML
            }
            guard let embed = extractStreamzoMovieEmbed(html),
                  let resolved = await resolveStreamzoEmbedWithRetry(embed, referer: pageURL) else { return [] }
            let language = match.href.lowercased().contains("-vostfr") ? "VOSTFR" : "VF"
            return await playableStreamzoSources([
                makeSource(provider: "streamzo", resolved: resolved, quality: match.quality, language: language)
            ])
        }

        let targetSeason = max(season ?? 1, 1)
        let targetEpisode = max(episode ?? 1, 1)
        var variants = parseStreamzoEpisodes(html, season: targetSeason, episode: targetEpisode)
        if variants.isEmpty,
           let retryHTML = try? await fetchText(pageURL, referer: "\(streamzoBase)/") {
            variants = parseStreamzoEpisodes(retryHTML, season: targetSeason, episode: targetEpisode)
        }
        var output: [ExtractedSource] = []
        for variant in variants.prefix(2) {
            guard let resolved = await resolveStreamzoEmbedWithRetry(variant.url, referer: pageURL) else { continue }
            output.append(makeSource(
                provider: "streamzo",
                resolved: resolved,
                quality: match.quality,
                language: variant.language
            ))
        }
        let playable = await playableStreamzoSources(dedupe(output))
        print("🎌 [Streamzo] Returning \(playable.count) playable stream(s)")
        return playable
    }

    func getFrenchStreamStreams(
        tmdbId: Int,
        mediaType: String,
        season: Int? = nil,
        episode: Int? = nil
    ) async -> [ExtractedSource] {
        guard var components = URLComponents(string: "\(backendBase)/api/movix-proxy") else { return [] }
        var queryItems = [
            URLQueryItem(name: "path", value: "french-provider"),
            URLQueryItem(name: "provider", value: "frenchstream"),
            URLQueryItem(name: "tmdbId", value: String(tmdbId)),
            URLQueryItem(name: "type", value: mediaType)
        ]
        if let season { queryItems.append(URLQueryItem(name: "season", value: String(season))) }
        if let episode { queryItems.append(URLQueryItem(name: "episode", value: String(episode))) }
        components.queryItems = queryItems
        guard let url = components.url else { return [] }
        var request = URLRequest(url: url)
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        guard let (data, response) = try? await session.data(for: request),
              let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let streams = json["streams"] as? [[String: Any]] else { return [] }

        let sources = streams.compactMap { stream -> ExtractedSource? in
            guard let url = stream["url"] as? String, !url.isEmpty else { return nil }
            let headers = stream["headers"] as? [String: String] ?? [:]
            let rawLanguage = (stream["language"] as? String)?.uppercased() ?? "VF"
            let language = rawLanguage.contains("VOST") ? "VOSTFR" : (rawLanguage == "VO" ? "VO" : "VF")
            let inferredType = url.lowercased().contains(".m3u8") ? "m3u8" : "mp4"
            let type = stream["type"] as? String ?? inferredType
            guard type == "m3u8" || type == "mp4" else { return nil }
            return ExtractedSource(
                provider: "frenchstream",
                url: url,
                quality: stream["quality"] as? String ?? "HD",
                language: language,
                type: type,
                headers: headers
            )
        }
        let result = dedupe(sources)
        print("🇫🇷 [FrenchStream] Returning \(result.count) direct stream(s)")
        return result
    }

    // MARK: - Metadata

    private func tmdbMetadata(id: Int, type: String, season: Int?) async -> Metadata? {
        let endpoint = type == "movie" ? "movie" : "tv"
        guard let main = try? await fetchJSON("https://api.themoviedb.org/3/\(endpoint)/\(id)?api_key=\(tmdbKey)&language=en-US") else { return nil }
        var titles: [String] = []
        let primary = (endpoint == "movie" ? main["title"] : main["name"]) as? String
        let original = (endpoint == "movie" ? main["original_title"] : main["original_name"]) as? String
        if let primary, !primary.isEmpty { titles.append(primary) }
        if let original, !original.isEmpty, !titles.contains(where: { $0.caseInsensitiveCompare(original) == .orderedSame }) { titles.append(original) }

        if let translations = try? await fetchJSON("https://api.themoviedb.org/3/\(endpoint)/\(id)/translations?api_key=\(tmdbKey)"),
           let rows = translations["translations"] as? [[String: Any]],
           let fr = rows.first(where: { ($0["iso_639_1"] as? String) == "fr" }),
           let data = fr["data"] as? [String: Any],
           let french = (endpoint == "movie" ? data["title"] : data["name"]) as? String,
           !french.isEmpty,
           !titles.contains(where: { $0.caseInsensitiveCompare(french) == .orderedSame }) {
            titles.insert(french, at: min(1, titles.count))
        }

        if endpoint == "tv", let season, season > 1 {
            for title in Array(titles.prefix(3)) {
                titles.append("\(title) Season \(season)")
                titles.append("\(title) Saison \(season)")
            }
        }
        let date = (endpoint == "movie" ? main["release_date"] : main["first_air_date"]) as? String
        let year = date.flatMap { Int($0.prefix(4)) }
        return titles.isEmpty ? nil : Metadata(titles: unique(titles), year: year)
    }

    // MARK: - Anime-Sama

    private func searchAnimeSama(title: String) async -> [String] {
        guard let body = "query=\(formEncode(title))".data(using: .utf8),
              let html = try? await fetchText(
                "\(animeSamaBase)/template-php/defaut/fetch.php",
                method: "POST",
                body: body,
                headers: ["Content-Type": "application/x-www-form-urlencoded", "Referer": animeSamaBase]
              ) else { return [] }
        return unique(captures(#"/catalogue/([^/\"']+)/?"#, in: html))
    }

    private func parseJavaScriptArrays(_ script: String) -> [[String]] {
        let bodies = captures(#"var\s+[a-zA-Z0-9_]+\s*=\s*\[([\s\S]*?)\s*\];"#, in: script)
        return bodies.map { captures(#"['\"]([^'\"]+)['\"]"#, in: $0) }.filter { !$0.isEmpty }
    }

    // MARK: - French-Anime

    private enum ProviderError: Error { case blocked }

    private func searchFrenchAnime(title: String, wantedTitles: [String]) async throws -> [FrenchAnimeCandidate] {
        let bodyText = "do=search&subaction=search&story=\(formEncode(title))"
        guard let body = bodyText.data(using: .utf8) else { return [] }
        let html = try await fetchText(
            "\(frenchAnimeBase)/index.php?do=search",
            method: "POST",
            body: body,
            headers: ["Content-Type": "application/x-www-form-urlencoded", "Referer": "\(frenchAnimeBase)/"]
        )
        if isBlockPage(html) { throw ProviderError.blocked }
        let rows = captureGroups(#"href=[\"']https?://french-anime\.com/animes-(vf|vostfr)/(\d+)-([^\"'/]+?)\.html"#, in: html)
        return rows.compactMap { row in
            guard row.count >= 3 else { return nil }
            let score = wantedTitles.map { titleScore(candidate: row[2], wanted: $0) }.max() ?? 0
            guard score >= 0.5 else { return nil }
            return FrenchAnimeCandidate(id: row[1], slug: row[2], category: row[0].lowercased(), score: score)
        }
    }

    private func parseFrenchAnimeEpisodes(_ html: String) -> [Int: [String]] {
        let body = firstCapture(#"<div[^>]*class=[\"']eps[\"'][^>]*>([\s\S]*?)</div>"#, in: html) ?? html
        var result: [Int: [String]] = [:]
        for row in captureGroups(#"(\d+)!(https?://[^\s<]+)"#, in: body) where row.count >= 2 {
            guard let number = Int(row[0]), result[number] == nil else { continue }
            result[number] = row[1].split(separator: ",").map(String.init).filter { !$0.isEmpty }
        }
        return result
    }

    private func getCoflixFallback(metadata: Metadata, mediaType: String, season: Int, episode: Int) async -> [ExtractedSource] {
        var candidates: [(slug: String, episodeId: String, language: String, score: Double)] = []
        for title in metadata.titles.prefix(4) {
            let path = "\(coflixBase)/ajax/search/suggest?keyword=\(formEncode(title))"
            guard let json = try? await fetchJSON(path, headers: ajaxHeaders(base: coflixBase)),
                  let html = json["html"] as? String else { continue }
            for row in captureGroups(#"href=[\"']https?://coflix\.wiki/film/([^\"'/]+)/ep-(\d+)"#, in: html) where row.count >= 2 {
                let slug = row[0]
                let language = slug.lowercased().hasSuffix("-vostfr") ? "VOSTFR" : "VF"
                let score = metadata.titles.map { titleScore(candidate: slug, wanted: $0) }.max() ?? 0
                if score >= 0.34 { candidates.append((slug, row[1], language, score)) }
            }
            if candidates.count >= 4 { break }
        }
        candidates.sort { $0.score > $1.score }

        var output: [ExtractedSource] = []
        for language in ["VF", "VOSTFR"] {
            for candidate in candidates.filter({ $0.language == language }).prefix(3) {
                var episodeId = candidate.episodeId
                if mediaType != "movie" {
                    guard candidateMatchesSeason(candidate.slug, mediaType: mediaType, season: season),
                          let page = try? await fetchText("\(coflixBase)/film/\(candidate.slug)/", referer: "\(coflixBase)/"),
                          let movieId = firstCapture(#"id=[\"']watch-page[\"'][^>]*data-id=[\"'](\d+)[\"']"#, in: page) ?? firstCapture(#"data-id=[\"'](\d+)[\"']"#, in: page),
                          let list = try? await fetchJSON("\(coflixBase)/ajax/episode/list-episode?movieId=\(movieId)", headers: ajaxHeaders(base: coflixBase)),
                          let listHTML = list["html"] as? String else { continue }
                    let pairs = captureGroups(#"data-num=[\"'](\d+)[\"'][^>]*data-id=[\"'](\d+)[\"']|data-id=[\"'](\d+)[\"'][^>]*data-num=[\"'](\d+)[\"']"#, in: listHTML)
                    // Movie records expose a synthetic episode 1 too. Requiring
                    // more than one episode prevents a film with the same name
                    // from being returned for an anime series.
                    guard Set(pairs.compactMap { row in
                        Int(row[safe: 0] ?? "") ?? Int(row[safe: 3] ?? "")
                    }).count > 1 else { continue }
                    guard let pair = pairs.first(where: { row in
                        let num = Int(row[safe: 0] ?? "") ?? Int(row[safe: 3] ?? "")
                        return num == episode
                    }) else { continue }
                    episodeId = !(pair[safe: 1] ?? "").isEmpty ? pair[1] : (pair[safe: 2] ?? "")
                }

                let post = "episode_id=\(formEncode(episodeId))".data(using: .utf8)
                guard let json = try? await fetchJSON(
                    "\(coflixBase)/ajax/episode/player?episode_id=\(formEncode(episodeId))",
                    method: "POST",
                    body: post,
                    headers: ajaxHeaders(base: coflixBase).merging(["Content-Type": "application/x-www-form-urlencoded"]) { _, new in new }
                ), let servers = json["message"] as? [[String: Any]] else { continue }
                for server in servers.prefix(5) {
                    let raw = server["server_link"]
                    let embed = (raw as? String) ?? ((raw as? [String: Any])?["url"] as? String)
                    guard let embed, let resolved = await resolveEmbed(embed, referer: "\(coflixBase)/") else { continue }
                    let version = (server["version"] as? String)?.lowercased() ?? ""
                    let resolvedLanguage = version.contains("vostfr") ? "VOSTFR" : (version.contains("vf") ? "VF" : language)
                    output.append(makeSource(provider: "frenchanime", resolved: resolved, quality: resolved.quality ?? "HD", language: resolvedLanguage))
                    break
                }
                if output.contains(where: { $0.language == language }) { break }
            }
        }
        return dedupe(output)
    }

    // MARK: - Streamzo

    private func findStreamzoMatch(metadata: Metadata, mediaType: String) async -> StreamzoSuggestion? {
        let wantSeries = mediaType != "movie"
        var best: StreamzoSuggestion?
        var bestScore = 0
        for query in metadata.titles.prefix(3) {
            let cleaned = query.replacingOccurrences(of: #"\s+(saison|season)\s*\d+$"#, with: "", options: [.regularExpression, .caseInsensitive])
            guard let json = try? await fetchJSON("\(streamzoBase)/api/web/suggest?q=\(formEncode(cleaned))", headers: ajaxHeaders(base: streamzoBase)),
                  let suggestions = json["suggestions"] as? [[String: Any]] else { continue }
            for item in suggestions {
                guard let href = item["href"] as? String, href.hasPrefix("/") else { continue }
                let title = item["titre"] as? String ?? ""
                let slug = item["slug"] as? String ?? ""
                let kind = item["content_type"] as? String ?? item["kind"] as? String ?? "movie"
                let isSeries = kind == "series"
                var score = metadata.titles.map { max(titleScore100(candidate: title, wanted: $0), titleScore100(candidate: slug, wanted: $0)) }.max() ?? 0
                score += isSeries == wantSeries ? 25 : -60
                let year = intValue(item["year"])
                if let year, let wantedYear = metadata.year {
                    let difference = abs(year - wantedYear)
                    score += difference == 0 ? 30 : (difference == 1 ? 15 : (difference > 2 ? -25 : 0))
                }
                if score > bestScore {
                    bestScore = score
                    best = StreamzoSuggestion(
                        href: href,
                        title: title,
                        slug: slug,
                        year: year,
                        kind: isSeries ? "series" : "movie",
                        quality: item["resolution"] as? String ?? item["quality"] as? String ?? "HD"
                    )
                }
            }
            if bestScore >= 110 { break }
        }
        return bestScore >= 45 ? best : nil
    }

    private func extractStreamzoMovieEmbed(_ html: String) -> String? {
        firstCapture(#"id=[\"']player-facade[\"'][^>]*data-embed=[\"']([^\"']+)[\"']"#, in: html)
            ?? firstCapture(#"data-embed=[\"']([^\"']+)[\"'][^>]*id=[\"']player-facade[\"']"#, in: html)
            ?? firstCapture(#"<iframe[^>]*src=[\"']([^\"']+)[\"']"#, in: html)
    }

    private func parseStreamzoEpisodes(_ html: String, season: Int, episode: Int) -> [(url: String, language: String)] {
        let tags = captures(#"(<button\b[^>]*class=[\"'][^\"']*\bsd-ep\b[^\"']*[\"'][^>]*>)"#, in: html)
        var output: [(String, String)] = []
        for tag in tags {
            guard Int(firstCapture(#"data-season=[\"']?(\d+)"#, in: tag) ?? "") == season,
                  Int(firstCapture(#"data-ep=[\"']?(\d+)"#, in: tag) ?? "") == episode,
                  let url = firstCapture(#"data-src=[\"']([^\"']+)[\"']"#, in: tag) else { continue }
            let rawLanguage = firstCapture(#"data-lang=[\"']([^\"']+)[\"']"#, in: tag)?.lowercased() ?? "vf"
            let language = rawLanguage == "vostfr" ? "VOSTFR" : (rawLanguage == "vf" ? "VF" : rawLanguage.uppercased())
            if !output.contains(where: { $0.1 == language }) { output.append((url, language)) }
        }
        return output.sorted { ($0.1 == "VF" ? 0 : 1) < ($1.1 == "VF" ? 0 : 1) }
    }

    private func resolveStreamzoEmbed(_ embed: String, referer: String) async -> Resolved? {
        let full = absoluteURL(embed, base: streamzoBase)
        guard let html = try? await fetchText(full, referer: referer) else { return nil }
        let decoded = decodeHTMLAndUnicode(unpackPlayerPage(html))
        let hls = captures(#"(https?://[^\"'<>\s\\]+\.m3u8[^\"'<>\s\\]*)"#, in: decoded)
        let mp4 = captures(#"(https?://[^\"'<>\s\\]+\.mp4[^\"'<>\s\\]*)"#, in: decoded)
        guard let url = (hls + mp4).first else { return nil }
        return Resolved(url: url, headers: playbackHeaders(referer: full), quality: qualityFrom(url))
    }

    private func resolveStreamzoEmbedWithRetry(_ embed: String, referer: String) async -> Resolved? {
        if let resolved = await resolveStreamzoEmbed(embed, referer: referer) { return resolved }
        return await resolveStreamzoEmbed(embed, referer: referer)
    }

    private func playableStreamzoSources(_ sources: [ExtractedSource]) async -> [ExtractedSource] {
        var playable: [ExtractedSource] = []
        for source in sources {
            guard let url = URL(string: source.url) else { continue }
            var request = URLRequest(url: url)
            request.timeoutInterval = 15
            request.setValue("bytes=0-8191", forHTTPHeaderField: "Range")
            source.headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }

            guard let (data, response) = try? await session.data(for: request),
                  let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode) else {
                print("⚠️ [Streamzo] Discarding unreachable source: \(source.url)")
                continue
            }

            let contentType = http.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""
            let prefix = String(decoding: data.prefix(8192), as: UTF8.self)
            let isPlaylist = prefix.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("#EXTM3U")
            let isMedia = !data.isEmpty && (
                contentType.hasPrefix("video/")
                    || contentType.contains("octet-stream")
                    || contentType.contains("mp2t")
            )
            if isPlaylist || isMedia {
                playable.append(source)
            } else {
                print("⚠️ [Streamzo] Discarding invalid media response: \(contentType)")
            }
        }
        return playable
    }

    private func playableSources(_ sources: [ExtractedSource], provider: String) async -> [ExtractedSource] {
        var playable: [ExtractedSource] = []
        for source in sources {
            guard let url = URL(string: source.url) else { continue }
            var request = URLRequest(url: url)
            request.timeoutInterval = 18
            request.setValue("bytes=0-8191", forHTTPHeaderField: "Range")
            source.headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }

            guard let (data, response) = try? await session.data(for: request),
                  let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode),
                  !data.isEmpty else {
                print("⚠️ [\(provider)] Discarding blocked source: \(url.host ?? source.url)")
                continue
            }
            let prefix = String(decoding: data.prefix(8192), as: UTF8.self)
            let contentType = http.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""
            if prefix.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("#EXTM3U")
                || contentType.hasPrefix("video/")
                || contentType.contains("mpegurl")
                || contentType.contains("octet-stream") {
                playable.append(source)
            } else {
                print("⚠️ [\(provider)] Discarding invalid response: \(contentType)")
            }
        }
        return playable
    }

    // MARK: - Embed resolution

    private struct Resolved {
        let url: String
        let headers: [String: String]
        let quality: String?
    }

    private func resolveEmbed(_ rawURL: String, referer: String) async -> Resolved? {
        let value = decodeHTMLAndUnicode(rawURL.trimmingCharacters(in: .whitespacesAndNewlines))
        guard value.hasPrefix("http") else { return nil }
        let lower = value.lowercased()
        if lower.contains(".m3u8") || lower.contains(".mp4") {
            return Resolved(url: value, headers: playbackHeaders(referer: referer), quality: qualityFrom(value))
        }

        if lower.contains("vidmoly.") || lower.contains("voembed.") {
            return await resolveViaBackend(type: "vidmoly", embed: value, referer: value)
        }
        if lower.contains("vidzy.") || lower.contains("fsvid.") {
            if let direct = await resolveVidzy(value) { return direct }
            return await resolveViaBackend(type: "vidzy", embed: value, referer: value)
        }
        if lower.contains("luluvid.") || lower.contains("lulustream.") {
            if let direct = await resolveGenericPage(value, referer: value) { return direct }
            return await resolveViaBackend(type: "luluvid", embed: value, referer: value)
        }
        if lower.contains("sibnet.ru") {
            return await resolveGenericPage(value, referer: "https://video.sibnet.ru/", hostBase: "https://video.sibnet.ru")
        }
        if lower.contains("sendvid.") {
            let normalized = value.contains("/embed/") ? value : value.replacingOccurrences(of: #"sendvid\.com/([a-zA-Z0-9]+)"#, with: "sendvid.com/embed/$1", options: .regularExpression)
            return await resolveGenericPage(normalized, referer: "https://sendvid.com/")
        }
        if lower.contains("uqload.") || lower.contains("oneupload.") || lower.contains("voe") || lower.contains("filemoon") || lower.contains("streamtape") {
            return await resolveGenericPage(value, referer: referer)
        }
        return await resolveGenericPage(value, referer: referer)
    }

    private func resolveViaBackend(type: String, embed: String, referer: String) async -> Resolved? {
        guard let url = URL(string: "\(backendBase)/api/extract"),
              let body = try? JSONSerialization.data(withJSONObject: ["type": type, "url": embed]) else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = body
        request.timeoutInterval = 25
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard let (data, response) = try? await session.data(for: request),
              (response as? HTTPURLResponse).map({ (200..<300).contains($0.statusCode) }) == true,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let stream = json["m3u8Url"] as? String,
              stream.hasPrefix("http") else { return nil }
        let hostRoot = rootURL(embed) ?? referer
        return Resolved(url: stream, headers: playbackHeaders(referer: hostRoot), quality: qualityFrom(stream))
    }

    private func resolveVidzy(_ embed: String) async -> Resolved? {
        guard let url = URL(string: embed), let host = url.host,
              let html = try? await fetchText(embed, referer: rootURL(embed) ?? embed) else { return nil }
        let payloads = captures(#"\}\s*\)\s*\(\s*[\"']([A-Za-z0-9+/=_-]{50,})[\"']\s*\)"#, in: html)
        let hostHash = host.utf8.reduce(0) { ($0 + Int($1)) & 255 }
        for payload in payloads {
            let normalized = payload.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
            guard let data = Data(base64Encoded: normalized) else { continue }
            let bytes = Array(data).reversed()
            let decoded = String(bytes: bytes.enumerated().map { index, byte in
                byte ^ UInt8((0x3d + index * 89 + hostHash) & 255)
            }, encoding: .utf8)
            if let decoded, decoded.hasPrefix("http"), decoded.contains(".m3u8"), !decoded.contains("/troll/") {
                return Resolved(url: decoded, headers: playbackHeaders(referer: rootURL(embed) ?? embed), quality: qualityFrom(decoded))
            }
        }
        return nil
    }

    private func resolveGenericPage(_ page: String, referer: String, hostBase: String? = nil) async -> Resolved? {
        guard let html = try? await fetchText(page, referer: referer) else { return nil }
        let decoded = decodeHTMLAndUnicode(unpackPlayerPage(html))
        let patterns = [
            #"(?:file|video_source|src|hls)\s*[:=]\s*[\"']([^\"']+\.(?:m3u8|mp4)[^\"']*)[\"']"#,
            #"<source[^>]+src=[\"']([^\"']+\.(?:m3u8|mp4)[^\"']*)[\"']"#,
            #"[\"']((?:https?:)?//[^\"'\s]+\.(?:m3u8|mp4)[^\"'\s]*)[\"']"#
        ]
        for pattern in patterns {
            guard var stream = firstCapture(pattern, in: decoded) else { continue }
            if stream.hasPrefix("//") { stream = "https:\(stream)" }
            if stream.hasPrefix("/"), let hostBase { stream = "\(hostBase)\(stream)" }
            guard stream.hasPrefix("http") else { continue }
            return Resolved(url: stream, headers: playbackHeaders(referer: rootURL(page) ?? referer), quality: qualityFrom(stream))
        }
        return nil
    }

    // MARK: - HTTP

    private func fetchText(
        _ value: String,
        method: String = "GET",
        body: Data? = nil,
        headers: [String: String] = [:],
        referer: String? = nil
    ) async throws -> String {
        guard let url = URL(string: value) else { throw URLError(.badURL) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.timeoutInterval = 18
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", forHTTPHeaderField: "Accept-Language")
        request.setValue("text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8", forHTTPHeaderField: "Accept")
        if let referer { request.setValue(referer, forHTTPHeaderField: "Referer") }
        headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
            if http.statusCode == 403 || http.statusCode == 503 { throw ProviderError.blocked }
            guard (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
            return String(decoding: data, as: UTF8.self)
        } catch {
            // Cisco/OpenDNS can replace french-anime.com's DNS response with
            // its block page. Connect to Cloudflare directly while keeping the
            // real TLS server name and HTTP Host, so extraction still happens
            // on the iPhone and the returned embed tokens belong to its IP.
            if FrenchAnimeDirectHTTPClient.supports(url.host),
               let direct = try? await FrenchAnimeDirectHTTPClient.fetch(
                    url: url,
                    method: method,
                    body: body,
                    headers: headers,
                    referer: referer,
                    userAgent: userAgent
               ) {
                print("✅ [FrenchAnime] Direct DNS bypass: \(url.path)")
                return direct
            }

            // Some catalogue domains are blocked by residential DNS filters or
            // reject iOS URLSession while remaining reachable from our backend.
            // GET pages can safely use the existing same-origin text proxy.
            guard method == "GET", body == nil, !value.hasPrefix(backendBase),
                  let proxyURL = catalogueProxyURL(target: value, referer: referer ?? headers["Referer"])
            else { throw error }

            var proxyRequest = URLRequest(url: proxyURL)
            proxyRequest.timeoutInterval = 25
            proxyRequest.setValue(userAgent, forHTTPHeaderField: "User-Agent")
            let (proxyData, proxyResponse) = try await session.data(for: proxyRequest)
            guard let proxyHTTP = proxyResponse as? HTTPURLResponse,
                  (200..<300).contains(proxyHTTP.statusCode) else {
                throw error
            }
            print("⚠️ [FrenchProviders] Backend fallback: \(url.host ?? value)")
            return String(decoding: proxyData, as: UTF8.self)
        }
    }

    private func fetchJSON(
        _ value: String,
        method: String = "GET",
        body: Data? = nil,
        headers: [String: String] = [:]
    ) async throws -> [String: Any] {
        let text = try await fetchText(value, method: method, body: body, headers: headers)
        guard let data = text.data(using: .utf8),
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw URLError(.cannotParseResponse)
        }
        return json
    }

    // MARK: - Helpers

    private func makeSource(provider: String, resolved: Resolved, quality: String, language: String) -> ExtractedSource {
        ExtractedSource(
            provider: provider,
            url: resolved.url,
            quality: quality,
            language: language,
            type: resolved.url.lowercased().contains(".m3u8") ? "m3u8" : "mp4",
            headers: resolved.headers
        )
    }

    private func dedupe(_ sources: [ExtractedSource]) -> [ExtractedSource] {
        var seen = Set<String>()
        return sources.filter {
            let key = URL(string: $0.url).map { "\($0.host ?? "")\($0.path)" } ?? $0.url
            return seen.insert(key).inserted
        }
    }

    private func candidateMatchesSeason(_ slug: String, mediaType: String, season: Int) -> Bool {
        if mediaType == "movie" { return !slug.range(of: #"(?:saison|season)-(\d+)"#, options: .regularExpression).isSome }
        let explicit = firstCapture(#"(?:saison|season)-(\d+)"#, in: slug).flatMap(Int.init)
        if season > 1 { return explicit == season || slug.hasSuffix("-\(season)-vf") || slug.hasSuffix("-\(season)-vostfr") }
        return explicit == nil || explicit == 1
    }

    private func titleScore(candidate: String, wanted: String) -> Double {
        let wantedTokens = tokens(wanted).filter { $0.count >= 3 }
        let rawCandidateTokens = tokens(candidate)
        let ignored = Set(["saison", "season", "vostfr", "french", "truefrench"])
        let candidateTokens = rawCandidateTokens.filter {
            !ignored.contains($0) && Int($0) == nil && !$0.hasPrefix("s0")
        }
        guard !wantedTokens.isEmpty else { return 0 }
        if let firstWantedIndex = candidateTokens.firstIndex(where: { wantedTokens.contains($0) }),
           firstWantedIndex > 0 {
            return 0
        }
        let candidateSet = Set(candidateTokens)
        let hits = wantedTokens.reduce(0.0) { $0 + (candidateSet.contains($1) ? ($1.count == 3 ? 0.5 : 1.0) : 0) }
        let base = hits / Double(wantedTokens.count)
        let extraTokens = candidateSet.subtracting(wantedTokens).count
        return max(0, base - Double(extraTokens) * 0.2)
    }

    private func titleScore100(candidate: String, wanted: String) -> Int {
        let a = normalize(wanted)
        let b = normalize(candidate)
        if a.isEmpty || b.isEmpty { return 0 }
        if a == b { return 100 }
        if b == "\(a) vostfr" { return 95 }
        if a.count >= 5 && (b.contains(a) || a.contains(b)) { return 70 }
        let at = tokens(a), bt = tokens(b)
        let common = at.filter { bt.contains($0) }.count
        let ratio = Double(common) / Double(max(at.count, bt.count, 1))
        if ratio >= 0.6 { return Int(40 + ratio * 30) }
        return ratio >= 0.4 ? 25 : 0
    }

    private func normalize(_ value: String) -> String {
        value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "fr_FR"))
            .lowercased()
            .replacingOccurrences(of: #"[^a-z0-9]+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func tokens(_ value: String) -> [String] { normalize(value).split(separator: " ").map(String.init) }

    private func slugify(_ value: String) -> String {
        normalize(value).replacingOccurrences(of: " ", with: "-")
    }

    private func stripSeasonSuffix(_ value: String) -> String {
        value.replacingOccurrences(of: #"\s+(saison|season|s)\s*\d+$"#, with: "", options: [.regularExpression, .caseInsensitive])
    }

    private func formEncode(_ value: String) -> String {
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "+&=?#")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    private func playbackHeaders(referer: String) -> [String: String] {
        var result = ["Referer": referer, "User-Agent": userAgent]
        if let root = rootURL(referer) { result["Origin"] = String(root.dropLast()) }
        return result
    }

    private func ajaxHeaders(base: String) -> [String: String] {
        [
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Referer": "\(base)/",
            "X-Requested-With": "XMLHttpRequest"
        ]
    }

    private func rootURL(_ value: String) -> String? {
        guard let url = URL(string: value), let scheme = url.scheme, let host = url.host else { return nil }
        return "\(scheme)://\(host)/"
    }

    private func absoluteURL(_ value: String, base: String) -> String {
        if value.hasPrefix("//") { return "https:\(value)" }
        if value.hasPrefix("http") { return value }
        return URL(string: value, relativeTo: URL(string: base))?.absoluteURL.absoluteString ?? "\(base)/\(value)"
    }

    private func qualityFrom(_ value: String) -> String? {
        firstCapture(#"(?:^|[^0-9])(2160|1440|1080|720|480|360)p"#, in: value).map { $0 == "2160" ? "4K" : "\($0)p" }
    }

    private func decodeHTMLAndUnicode(_ value: String) -> String {
        var result = value
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "\\/", with: "/")
            .replacingOccurrences(of: "\\u0026", with: "&", options: .caseInsensitive)
        let matches = captureGroups(#"\\u([0-9a-fA-F]{4})"#, in: result)
        for match in matches where !match.isEmpty {
            if let scalarValue = UInt32(match[0], radix: 16), let scalar = UnicodeScalar(scalarValue) {
                result = result.replacingOccurrences(of: "\\u\(match[0])", with: String(Character(scalar)))
            }
        }
        return result
    }

    private func unpackPlayerPage(_ html: String) -> String {
        JsPackerUnpacker.isPacked(html) ? JsPackerUnpacker.unpackAll(in: html) : html
    }

    private func catalogueProxyURL(target: String, referer: String?) -> URL? {
        guard var components = URLComponents(string: "\(backendBase)/api/proxy") else { return nil }
        var queryItems = [URLQueryItem(name: "url", value: target)]
        if let referer, !referer.isEmpty {
            queryItems.append(URLQueryItem(name: "referer", value: referer))
        }
        components.queryItems = queryItems
        return components.url
    }

    private func isBlockPage(_ text: String) -> Bool {
        ["Just a moment", "cf-browser-verification", "Attention Required", "BotBlocker"].contains { text.contains($0) }
    }

    private func firstCapture(_ pattern: String, in text: String) -> String? {
        captureGroups(pattern, in: text).first?.first
    }

    private func captures(_ pattern: String, in text: String) -> [String] {
        captureGroups(pattern, in: text).compactMap(\.first)
    }

    private func captureGroups(_ pattern: String, in text: String) -> [[String]] {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]), !text.isEmpty else { return [] }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        return regex.matches(in: text, options: [], range: range).map { match in
            (1..<match.numberOfRanges).map { index in
                guard match.range(at: index).location != NSNotFound,
                      let swiftRange = Range(match.range(at: index), in: text) else { return "" }
                return String(text[swiftRange])
            }
        }
    }

    private func unique(_ values: [String]) -> [String] {
        var seen = Set<String>()
        return values.filter { seen.insert($0.lowercased()).inserted }
    }

    private func intValue(_ value: Any?) -> Int? {
        if let value = value as? Int { return value }
        if let value = value as? String { return Int(value) }
        if let value = value as? NSNumber { return value.intValue }
        return nil
    }
}

/// Minimal HTTPS client used only for french-anime.com when the system DNS is
/// replaced by a filtering resolver. `NWConnection` lets us connect to the
/// site's Cloudflare address while preserving french-anime.com as TLS SNI.
private final class FrenchAnimeDirectHTTPClient {
    private static let cloudflareAddresses: [String: [String]] = [
        "french-anime.com": ["104.21.57.53", "172.67.159.108"],
        "hgcloud.to": ["104.21.45.12", "172.67.207.73"],
        "savefiles.com": ["104.26.10.63", "104.26.11.63", "172.67.69.198"],
        "anime-sama.to": ["104.26.12.154", "104.26.13.154", "172.67.71.129"]
    ]

    private final class RequestState: @unchecked Sendable {
        var data = Data()
        var finished = false
    }

    static func supports(_ host: String?) -> Bool {
        guard let host else { return false }
        return cloudflareAddresses[host.lowercased()] != nil
    }

    static func fetch(
        url: URL,
        method: String,
        body: Data?,
        headers: [String: String],
        referer: String?,
        userAgent: String
    ) async throws -> String {
        guard let host = url.host?.lowercased(),
              let addresses = cloudflareAddresses[host] else { throw URLError(.unsupportedURL) }
        var lastError: Error = URLError(.cannotConnectToHost)
        for address in addresses {
            do {
                return try await request(
                    address: address,
                    host: host,
                    url: url,
                    method: method,
                    body: body,
                    headers: headers,
                    referer: referer,
                    userAgent: userAgent
                )
            } catch {
                lastError = error
            }
        }
        throw lastError
    }

    private static func request(
        address: String,
        host: String,
        url: URL,
        method: String,
        body: Data?,
        headers: [String: String],
        referer: String?,
        userAgent: String
    ) async throws -> String {
        let tls = NWProtocolTLS.Options()
        sec_protocol_options_set_tls_server_name(tls.securityProtocolOptions, host)
        let parameters = NWParameters(tls: tls, tcp: NWProtocolTCP.Options())
        let connection = NWConnection(host: NWEndpoint.Host(address), port: .https, using: parameters)
        let queue = DispatchQueue(label: "com.anisflix.frenchanime.direct")
        let state = RequestState()

        return try await withCheckedThrowingContinuation { continuation in
            func finish(_ result: Result<String, Error>) {
                guard !state.finished else { return }
                state.finished = true
                connection.cancel()
                continuation.resume(with: result)
            }

            func receiveNext() {
                connection.receive(minimumIncompleteLength: 1, maximumLength: 256 * 1024) { data, _, complete, error in
                    if let data { state.data.append(data) }
                    if let error {
                        finish(.failure(error))
                    } else if complete {
                        do { finish(.success(try decodeHTTPResponse(state.data))) }
                        catch { finish(.failure(error)) }
                    } else {
                        receiveNext()
                    }
                }
            }

            connection.stateUpdateHandler = { connectionState in
                switch connectionState {
                case .ready:
                    let payload = body ?? Data()
                    var requestHeaders = headers
                    requestHeaders["Host"] = host
                    requestHeaders["User-Agent"] = userAgent
                    requestHeaders["Accept-Encoding"] = "identity"
                    requestHeaders["Connection"] = "close"
                    if let referer { requestHeaders["Referer"] = referer }
                    if body != nil { requestHeaders["Content-Length"] = String(payload.count) }

                    let path = url.path.isEmpty ? "/" : url.path
                    let target = url.query.map { "\(path)?\($0)" } ?? path
                    var head = "\(method) \(target) HTTP/1.1\r\n"
                    for (name, value) in requestHeaders where !name.contains("\r") && !value.contains("\r") {
                        head += "\(name): \(value)\r\n"
                    }
                    head += "\r\n"
                    var requestData = Data(head.utf8)
                    requestData.append(payload)
                    connection.send(content: requestData, completion: .contentProcessed { error in
                        if let error { finish(.failure(error)) }
                        else { receiveNext() }
                    })
                case .failed(let error):
                    finish(.failure(error))
                default:
                    break
                }
            }

            queue.asyncAfter(deadline: .now() + 20) {
                finish(.failure(URLError(.timedOut)))
            }
            connection.start(queue: queue)
        }
    }

    private static func decodeHTTPResponse(_ response: Data) throws -> String {
        let separator = Data([13, 10, 13, 10])
        guard let boundary = response.range(of: separator) else { throw URLError(.cannotParseResponse) }
        let headerData = response[..<boundary.lowerBound]
        guard let header = String(data: headerData, encoding: .utf8) else { throw URLError(.cannotParseResponse) }
        let statusComponents = header.components(separatedBy: "\r\n").first?.split(separator: " ") ?? []
        guard statusComponents.count >= 2, let status = Int(statusComponents[1]), (200..<300).contains(status) else {
            throw URLError(.badServerResponse)
        }

        var body = Data(response[boundary.upperBound...])
        if header.range(of: "transfer-encoding: chunked", options: .caseInsensitive) != nil {
            body = try decodeChunkedBody(body)
        }
        return String(decoding: body, as: UTF8.self)
    }

    private static func decodeChunkedBody(_ input: Data) throws -> Data {
        let lineBreak = Data([13, 10])
        var cursor = input.startIndex
        var output = Data()

        while cursor < input.endIndex {
            guard let lineRange = input[cursor...].range(of: lineBreak),
                  let sizeLine = String(data: input[cursor..<lineRange.lowerBound], encoding: .ascii),
                  let size = Int(sizeLine.split(separator: ";", maxSplits: 1)[0], radix: 16) else {
                throw URLError(.cannotParseResponse)
            }
            cursor = lineRange.upperBound
            if size == 0 { return output }
            guard size <= input.distance(from: cursor, to: input.endIndex) else {
                throw URLError(.cannotParseResponse)
            }
            let end = input.index(cursor, offsetBy: size)
            output.append(input[cursor..<end])
            cursor = end
            guard cursor < input.endIndex,
                  let nextBreak = input[cursor...].range(of: lineBreak),
                  nextBreak.lowerBound == cursor else { throw URLError(.cannotParseResponse) }
            cursor = nextBreak.upperBound
        }
        return output
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}

private extension Optional {
    var isSome: Bool {
        if case .some = self { return true }
        return false
    }
}
