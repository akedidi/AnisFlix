import Foundation
import CryptoKit

/// Native MovieBox client used by iOS before falling back to the hosted proxy.
/// MovieBox rejects some datacenter IPs, while the same signed requests work from
/// the user's device network.
final class MovieBoxService {
    static let shared = MovieBoxService()

    private let apiBase = "https://api3.aoneroom.com"
    private let apiHosts = [
        "https://apig.inmoviebox.com",
        "https://api6.aoneroom.com",
        "https://api5.aoneroom.com",
        "https://api4.aoneroom.com",
        "https://api4sg.aoneroom.com",
        "https://api3.aoneroom.com"
    ]
    private let tokenURL = "https://apig.inmoviebox.com/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=4516404531735022304&page=1&perPage=1"
    private let tmdbAPIKey = "d131017ccc6e5462a81c9304d21476de"
    private let tmdbBaseURL = "https://api.themoviedb.org/3"
    private let cdnWorker = "https://anisflix.kedidi-anis.workers.dev"

    private let userAgent = "com.community.mbox.in/50020130 (Linux; U; Android 14; en_IN; MovieBox; Build/UD1A.230803.041; Cronet/145.0.7582.0)"
    private let clientInfo = "{\"package_name\":\"com.community.mbox.in\",\"version_name\":\"4.0.03.0920.03\",\"version_code\":50020130,\"os\":\"android\",\"os_version\":\"14\",\"device_id\":\"da2b99c821e6ea023e4be55b54d5f7d8\",\"install_store\":\"official\",\"gaid\":\"1b2212c1-dadf-43c3-a0c8-bd6ce48ae22d\",\"brand\":\"google\",\"model\":\"Pixel 8\",\"system_language\":\"en\",\"net\":\"NETWORK_WIFI\",\"region\":\"IN\",\"timezone\":\"Asia/Calcutta\",\"sp_code\":\"\"}"

    private let keyB64Default = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw=="
    private let tokenLock = NSLock()
    private var bearerToken: String?

    private lazy var session: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 20
        configuration.timeoutIntervalForResource = 45
        return URLSession(configuration: configuration, delegate: TLSBypassDelegate(), delegateQueue: nil)
    }()

    private lazy var secretKey: Data = {
        guard let firstPass = Data(base64Encoded: keyB64Default),
              let encodedKey = String(data: firstPass, encoding: .utf8),
              let key = Data(base64Encoded: encodedKey) else {
            fatalError("Failed to decode MovieBox key")
        }
        return key
    }()

    private init() {}

    // MARK: - Public API

    func fetchSources(tmdbId: Int, type: String, season: Int = 1, episode: Int = 1) async throws -> [StreamingSource] {
        print("📦 [MovieBox Native] Fetching \(type) \(tmdbId) S\(season)E\(episode)")
        let tmdb = try await fetchTmdbDetails(tmdbId: tmdbId, type: type)

        // MovieBox search is Latin-first — try EN/localized title before CJK original.
        // VO language is decided later via TMDB original_language, not search order.
        var searchQueries = [tmdb.title, tmdb.originalTitle]
            .filter { !$0.isEmpty && isSearchableMovieBoxTitle($0) }
        var seenQueries = Set<String>()
        searchQueries = searchQueries.filter { seenQueries.insert(normalizeTitle($0)).inserted }

        var match: (subjectId: String, title: String)?
        for query in searchQueries {
            let results = try await search(query: query)
            match = findBestMatch(results: results, targetTitle: query, targetYear: tmdb.year, isMovie: type == "movie")
                ?? findBestMatch(results: results, targetTitle: tmdb.title, targetYear: tmdb.year, isMovie: type == "movie")
            if match != nil { break }
        }

        guard let match else {
            print("⚠️ [MovieBox Native] No match for \(tmdb.title)")
            return []
        }

        print("✅ [MovieBox Native] Matched \(match.title) (\(match.subjectId)) origLang=\(tmdb.originalLanguage) runtime=\(tmdb.runtimeMinutes.map(String.init) ?? "?")m")
        let finalSeason = type == "movie" ? 0 : season
        let finalEpisode = type == "movie" ? 0 : episode
        return try await getStreamLinks(
            subjectId: match.subjectId,
            season: finalSeason,
            episode: finalEpisode,
            tmdbId: tmdbId,
            mediaType: type,
            originalLanguage: tmdb.originalLanguage,
            expectedMinutes: tmdb.runtimeMinutes
        )
    }

    /// MovieBox sometimes renumbers multi-part seasons differently from TMDB.
    /// Attack on Titan: Original/English use S4/S5/S6 while French keeps flat S4.
    private func movieBoxEpisodeCandidates(tmdbId: Int, mediaType: String, season: Int, episode: Int) -> [(se: Int, ep: Int)] {
        if mediaType != "tv" { return [(se: 0, ep: 0)] }
        var candidates: [(se: Int, ep: Int)] = [(se: season, ep: episode)]
        if tmdbId == 1429, season == 4 {
            if episode >= 17, episode <= 28 {
                candidates.insert((se: 5, ep: episode - 16), at: 0)
            } else if episode >= 29, episode <= 30 {
                candidates.insert((se: 6, ep: episode - 28), at: 0)
            }
        }
        var seen = Set<String>()
        return candidates.filter { candidate in
            seen.insert("\(candidate.se):\(candidate.ep)").inserted
        }
    }

    // MARK: - Signed requests

    private func md5(_ value: String) -> String {
        Insecure.MD5.hash(data: Data(value.utf8)).map { String(format: "%02hhx", $0) }.joined()
    }

    private func hmacMD5(_ value: String) -> String {
        let signature = HMAC<Insecure.MD5>.authenticationCode(
            for: Data(value.utf8),
            using: SymmetricKey(data: secretKey)
        )
        return Data(signature).base64EncodedString()
    }

    private func canonicalString(method: String, accept: String, contentType: String, url: String, body: String?, timestamp: Int64) -> String {
        guard let components = URLComponents(string: url) else { return "" }
        let grouped = Dictionary(grouping: components.queryItems ?? [], by: \.name)
        let query = grouped.keys.sorted().flatMap { key in
            (grouped[key] ?? []).map { "\(key)=\($0.value ?? "")" }
        }.joined(separator: "&")
        let canonicalURL = query.isEmpty ? components.path : "\(components.path)?\(query)"
        let bodyHash = body.map(md5) ?? ""
        let bodyLength = body.map { String(Data($0.utf8).count) } ?? ""
        return "\(method.uppercased())\n\(accept)\n\(contentType)\n\(bodyLength)\n\(timestamp)\n\(bodyHash)\n\(canonicalURL)"
    }

    private func currentToken() -> String? {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        guard let token = bearerToken, jwtExpiry(token) > Date().timeIntervalSince1970 + 60 else {
            bearerToken = nil
            return nil
        }
        return token
    }

    private func storeToken(_ token: String) {
        guard jwtExpiry(token) > Date().timeIntervalSince1970 + 60 else { return }
        tokenLock.lock()
        bearerToken = token
        tokenLock.unlock()
    }

    private func jwtExpiry(_ token: String) -> TimeInterval {
        let pieces = token.split(separator: ".")
        guard pieces.count > 1 else { return 0 }
        var payload = String(pieces[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload.append("=") }
        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let expiry = json["exp"] as? NSNumber else { return 0 }
        return expiry.doubleValue
    }

    private func getBearerToken() async -> String? {
        if let token = currentToken() { return token }
        do {
            _ = try await movieBoxRequest(method: "GET", urlString: tokenURL, isTokenFetch: true)
        } catch {
            print("⚠️ [MovieBox Native] Anonymous token request failed: \(error.localizedDescription)")
        }
        return currentToken()
    }

    private func movieBoxRequest(
        method: String,
        urlString: String,
        body: String? = nil,
        customHeaders: [String: String] = [:],
        isTokenFetch: Bool = false
    ) async throws -> Data {
        guard let originalURL = URL(string: urlString) else { throw URLError(.badURL) }

        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        let accept = customHeaders["Accept"] ?? "application/json"
        let contentType = customHeaders["Content-Type"] ?? (body == nil ? "application/json" : "application/json; charset=utf-8")
        let reversedTimestamp = String(String(timestamp).reversed())
        let clientToken = "\(timestamp),\(md5(reversedTimestamp))"
        let canonical = canonicalString(
            method: method,
            accept: accept,
            contentType: contentType,
            url: urlString,
            body: body,
            timestamp: timestamp
        )

        var headers: [String: String] = [
            "Accept": accept,
            "Content-Type": contentType,
            "x-client-token": clientToken,
            "x-tr-signature": "\(timestamp)|2|\(hmacMD5(canonical))",
            "User-Agent": userAgent,
            "x-client-info": clientInfo,
            "x-client-status": "0"
        ]
        customHeaders.forEach { headers[$0.key] = $0.value }
        if !isTokenFetch, let token = await getBearerToken() {
            headers["Authorization"] = "Bearer \(token)"
        }

        let knownHosts = Set(apiHosts.compactMap { URL(string: $0)?.host })
        let candidateHosts: [String]
        if let originalHost = originalURL.host, knownHosts.contains(originalHost) {
            candidateHosts = [originalHost] + knownHosts.filter { $0 != originalHost }
        } else {
            candidateHosts = [originalURL.host].compactMap { $0 }
        }

        var lastError: Error = URLError(.badServerResponse)
        for host in candidateHosts {
            guard var components = URLComponents(url: originalURL, resolvingAgainstBaseURL: false) else { continue }
            components.host = host
            guard let requestURL = components.url else { continue }

            var request = URLRequest(url: requestURL)
            request.httpMethod = method.uppercased()
            request.timeoutInterval = 20
            headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
            if let body { request.httpBody = Data(body.utf8) }

            do {
                let (data, response) = try await session.data(for: request)
                guard let http = response as? HTTPURLResponse,
                      (200..<300).contains(http.statusCode) else {
                    lastError = URLError(.badServerResponse)
                    continue
                }

                if let xUser = http.value(forHTTPHeaderField: "x-user"),
                   let xUserData = xUser.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: xUserData) as? [String: Any],
                   let token = json["token"] as? String {
                    storeToken(token)
                }

                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any], json["error"] != nil {
                    lastError = URLError(.cannotParseResponse)
                    continue
                }
                return data
            } catch {
                lastError = error
            }
        }
        throw lastError
    }

    // MARK: - Catalogue

    private func fetchTmdbDetails(tmdbId: Int, type: String) async throws -> (title: String, originalTitle: String, year: String, originalLanguage: String, runtimeMinutes: Int?) {
        guard let url = URL(string: "\(tmdbBaseURL)/\(type)/\(tmdbId)?api_key=\(tmdbAPIKey)") else { throw URLError(.badURL) }
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw URLError(.cannotParseResponse)
        }
        let title = type == "movie" ? (json["title"] as? String) : (json["name"] as? String)
        let original = type == "movie" ? (json["original_title"] as? String) : (json["original_name"] as? String)
        let date = type == "movie" ? (json["release_date"] as? String) : (json["first_air_date"] as? String)
        let originalLanguage = ((json["original_language"] as? String) ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let runtimeMinutes: Int?
        if type == "movie" {
            runtimeMinutes = (json["runtime"] as? NSNumber)?.intValue ?? (json["runtime"] as? Int)
        } else if let episodeRunTimes = json["episode_run_time"] as? [Int], let first = episodeRunTimes.first, first > 0 {
            runtimeMinutes = first
        } else if let episodeRunTimes = json["episode_run_time"] as? [NSNumber], let first = episodeRunTimes.first?.intValue, first > 0 {
            runtimeMinutes = first
        } else {
            runtimeMinutes = nil
        }
        let finalTitle = title ?? original ?? ""
        guard !finalTitle.isEmpty else { throw URLError(.cannotParseResponse) }
        return (finalTitle, original ?? finalTitle, String((date ?? "").prefix(4)), originalLanguage, runtimeMinutes)
    }

    /// MovieBox sometimes publishes a trailer/placeholder as the full stream.
    /// Match api/_services/moviebox `isPlausibleMovieBoxDuration`.
    private func isPlausibleMovieBoxDuration(_ value: Any?, expectedMinutes: Int?) -> Bool {
        guard let expectedMinutes, expectedMinutes >= 10 else { return true }
        guard let value else { return true }

        var declaredMinutes: Double?
        if let text = value as? String, text.contains(":") {
            let parts = text.split(separator: ":").compactMap { Double($0) }
            if parts.count == text.split(separator: ":").count, !parts.isEmpty {
                declaredMinutes = parts.reduce(0) { $0 * 60 + $1 } / 60
            }
        }
        if declaredMinutes == nil {
            let numeric: Double?
            if let number = value as? NSNumber {
                numeric = number.doubleValue
            } else if let intValue = value as? Int {
                numeric = Double(intValue)
            } else if let doubleValue = value as? Double {
                numeric = doubleValue
            } else if let text = value as? String {
                numeric = Double(text)
            } else {
                numeric = nil
            }
            guard let numeric, numeric > 0 else { return true }
            // Long values are seconds; small catalogue values are minutes.
            declaredMinutes = numeric <= Double(max(expectedMinutes * 2, 300)) ? numeric : numeric / 60
        }
        guard let declaredMinutes else { return true }
        return declaredMinutes >= Double(expectedMinutes) * 0.5
    }

    private func streamDurationValue(_ stream: [String: Any]) -> Any? {
        stream["duration"] ?? stream["durationSeconds"] ?? stream["videoDuration"] ?? stream["length"]
    }

    private func isBlockedMovieBoxPlaceholderURL(_ url: String) -> Bool {
        url.contains("b164fbfb4347792950bdfbfb563d39d9")
            || url.contains("/other/20")
    }

    /// Normalize MovieBox / TMDB language tokens. VO follows TMDB original_language.
    private func normalizeLangCode(_ value: String) -> String {
        let s = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if s.isEmpty { return "" }
        let patterns: [(String, String)] = [
            ("ja|jp|jpn|japanese|japonais", "ja"),
            ("ko|kor|korean|coréen|coreen", "ko"),
            ("zh|chi|cn|chinese|mandarin|cantonese|chinois", "zh"),
            ("en|eng|english|anglais", "en"),
            ("fr|fra|fre|french|français|francais", "fr"),
            ("es|spa|spanish|espagnol", "es"),
            ("de|ger|deu|german|allemand", "de"),
            ("it|ita|italian|italien", "it"),
            ("pt|por|portuguese|portugais", "pt"),
            ("hi|hin|hindi", "hi"),
            ("th|tha|thai", "th"),
            ("ar|ara|arabic|arabe", "ar"),
        ]
        for (pattern, code) in patterns {
            if s.range(of: "(^|\\b)(\(pattern))(\\b|$)", options: .regularExpression) != nil {
                return code
            }
        }
        if s.range(of: "^[a-z]{2,3}$", options: .regularExpression) != nil {
            return s == "jp" ? "ja" : String(s.prefix(2))
        }
        return ""
    }

    private func search(query: String) async throws -> [[String: Any]] {
        let object: [String: Any] = ["page": 1, "perPage": 20, "keyword": query, "restrictKid": 1]
        let bodyData = try JSONSerialization.data(withJSONObject: object)
        guard let body = String(data: bodyData, encoding: .utf8) else { return [] }
        let data = try await movieBoxRequest(
            method: "POST",
            urlString: "\(apiBase)/wefeed-mobile-bff/subject-api/search/v2",
            body: body
        )
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let root = json["data"] as? [String: Any],
              let groups = root["results"] as? [[String: Any]] else { return [] }
        return groups.flatMap { $0["subjects"] as? [[String: Any]] ?? [] }
    }

    private func identifier(_ value: Any?) -> String? {
        if let string = value as? String, !string.isEmpty { return string }
        if let number = value as? NSNumber { return number.stringValue }
        return nil
    }

    private func findBestMatch(results: [[String: Any]], targetTitle: String, targetYear: String, isMovie: Bool) -> (subjectId: String, title: String)? {
        let normalizedTarget = normalizeTitle(targetTitle)
        guard normalizedTarget.count >= 2 else { return nil }
        let targetType = isMovie ? 1 : 2
        var best: (subjectId: String, title: String)?
        var bestScore = 0

        for item in results {
            guard (item["subjectType"] as? NSNumber)?.intValue == targetType,
                  let subjectId = identifier(item["subjectId"]),
                  let title = item["title"] as? String else { continue }
            let normalizedTitle = normalizeTitle(title)
            guard normalizedTitle.count >= 2 else { continue }
            let year = (item["year"] as? NSNumber)?.stringValue
                ?? (item["releaseDate"] as? String).map { String($0.prefix(4)) }
                ?? ""
            var score = 0
            if normalizedTitle == normalizedTarget { score += 50 }
            else if normalizedTitle.contains(normalizedTarget) || normalizedTarget.contains(normalizedTitle) { score += 15 }
            if !targetYear.isEmpty, !year.isEmpty, targetYear == year { score += 35 }
            if score > bestScore {
                bestScore = score
                best = (subjectId, title)
            }
        }
        return bestScore >= 40 ? best : nil
    }

    private func normalizeTitle(_ value: String) -> String {
        let stripped = value
            .replacingOccurrences(of: "\\[.*?\\]", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\(.*?\\)", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\\b", with: " ", options: [.regularExpression, .caseInsensitive])
            .lowercased()
            .replacingOccurrences(of: ":", with: " ")
        // Keep letters from any script (CJK…) — ASCII-only stripping turned JP titles into " ".
        let scalars = stripped.unicodeScalars.map { scalar -> Character in
            if CharacterSet.alphanumerics.contains(scalar) || CharacterSet.whitespaces.contains(scalar) {
                return Character(scalar)
            }
            return " "
        }
        return String(scalars)
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
    }

    private func isSearchableMovieBoxTitle(_ title: String) -> Bool {
        let norm = normalizeTitle(title)
        guard norm.count >= 2 else { return false }
        if norm.range(of: "[a-z0-9]{2,}", options: .regularExpression) != nil { return true }
        // Allow pure CJK queries only when long enough (rarely useful on MovieBox).
        return title.count >= 2 && norm.range(of: "[a-z0-9]", options: .regularExpression) == nil
    }

    // MARK: - Streams

    private func getStreamLinks(
        subjectId: String,
        season: Int,
        episode: Int,
        tmdbId: Int = 0,
        mediaType: String = "tv",
        originalLanguage: String = "",
        expectedMinutes: Int? = nil
    ) async throws -> [StreamingSource] {
        let detailData = try await movieBoxRequest(
            method: "GET",
            urlString: "\(apiBase)/wefeed-mobile-bff/subject-api/get?subjectId=\(subjectId)"
        )
        guard let json = try JSONSerialization.jsonObject(with: detailData) as? [String: Any],
              let details = json["data"] as? [String: Any] else { return [] }

        let orig = normalizeLangCode(originalLanguage)
        let dubs = details["dubs"] as? [[String: Any]] ?? []
        var variants: [(id: String, language: String, label: String)] = []
        for dub in dubs {
            guard let id = identifier(dub["subjectId"]) else { continue }
            let name = (dub["lanName"] as? String) ?? ""
            let code = normalizeLangCode((dub["lanCode"] as? String) ?? "")
            let loweredName = name.lowercased()
            let labelCode = normalizeLangCode(name)
            let effectiveCode = code.isEmpty ? labelCode : code
            let isSubtitle = (dub["type"] as? NSNumber)?.intValue == 1
                || loweredName.contains("sub")
                || loweredName.contains("vostfr")
            let isPrimarySubject = id == subjectId
            let markedOriginal = (dub["original"] as? Bool) == true || loweredName.contains("original")
            let isFrench = effectiveCode == "fr"
                || loweredName.contains("french")
                || loweredName.contains("français")
                || loweredName.contains("francais")

            // Generic VO: match TMDB original_language; never treat EN dub as VO for ja/ko/…
            var isOriginalAudio = false
            if !orig.isEmpty, !effectiveCode.isEmpty {
                isOriginalAudio = effectiveCode == orig
            } else if markedOriginal {
                isOriginalAudio = true
            } else if effectiveCode.isEmpty && isPrimarySubject {
                isOriginalAudio = true
            }
            if !effectiveCode.isEmpty, !orig.isEmpty, effectiveCode != orig {
                isOriginalAudio = false
            }

            // Soft captions never decide the bucket. Skip subtitle-only dub rows.
            // EN/JA/… + French dub → VF; original audio → VO (FR original also mirrored to VF).
            let language: String?
            if isSubtitle {
                language = nil
            } else if isFrench && !orig.isEmpty && orig != "fr" {
                language = "VF"
            } else if isOriginalAudio {
                language = "VO"
            } else if isFrench {
                language = "VF"
            } else {
                language = nil
            }
            if let language { variants.append((id, language, name.isEmpty ? language : name)) }
        }
        if !variants.contains(where: { $0.language == "VO" }) {
            let matching = dubs.first { dub in
                guard identifier(dub["subjectId"]) != nil else { return false }
                let code = normalizeLangCode((dub["lanCode"] as? String) ?? (dub["lanName"] as? String) ?? "")
                let isSub = (dub["type"] as? NSNumber)?.intValue == 1
                return !orig.isEmpty && code == orig && !isSub
            }
            let voId = identifier(matching?["subjectId"]) ?? subjectId
            let voLabel = (matching?["lanName"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Original Audio"
            variants.insert((voId, "VO", voLabel), at: 0)
        }

        var seenVariants = Set<String>()
        variants = variants.filter { seenVariants.insert("\($0.id):\($0.language)").inserted }
        let episodeCandidates = movieBoxEpisodeCandidates(
            tmdbId: tmdbId,
            mediaType: mediaType,
            season: season,
            episode: episode
        )
        var output: [StreamingSource] = []
        let playbackHeaders: [String: String] = [
            "Origin": "https://moviebox.ph",
            "Referer": "https://moviebox.ph/",
            "User-Agent": userAgent,
            "x-request-lang": "en",
            "x-vip-restrict": "0",
            "x-no-high-risk-restrict": "0"
        ]

        for variant in variants {
            do {
                var root: [String: Any]?
                var usedSeason = season
                var usedEpisode = episode

                for candidate in episodeCandidates {
                    var components = URLComponents(string: "\(apiBase)/wefeed-mobile-bff/subject-api/play-info")!
                    components.queryItems = [
                        URLQueryItem(name: "subjectId", value: variant.id),
                        URLQueryItem(name: "se", value: String(candidate.se)),
                        URLQueryItem(name: "ep", value: String(candidate.ep)),
                        URLQueryItem(name: "streamSignType", value: "1"),
                        URLQueryItem(name: "supportCodecs[hevc]", value: "1"),
                        URLQueryItem(name: "supportCodecs[h264]", value: "1")
                    ]
                    guard let playURL = components.url?.absoluteString else { continue }
                    let playData = try await movieBoxRequest(
                        method: "GET",
                        urlString: playURL,
                        customHeaders: playbackHeaders
                    )
                    guard let playJSON = try JSONSerialization.jsonObject(with: playData) as? [String: Any],
                          let candidateRoot = playJSON["data"] as? [String: Any] else { continue }

                    let streams = candidateRoot["streams"] as? [[String: Any]] ?? []
                    let hasPlayable = streams.contains { stream in
                        guard let rawURL = (stream["url"] ?? stream["playUrl"] ?? stream["resourceLink"] ?? stream["streamUrl"]) as? String else {
                            return false
                        }
                        let signCookie = stream["signCookie"] as? String
                        let finalURL = extractPolicyResource(signCookie) ?? rawURL
                        if isBlockedMovieBoxPlaceholderURL(finalURL) {
                            return false
                        }
                        return isPlausibleMovieBoxDuration(streamDurationValue(stream), expectedMinutes: expectedMinutes)
                    }
                    let detectors = candidateRoot["resourceDetectors"] as? [[String: Any]] ?? []
                    let hasDetectors = detectors.contains { detector in
                        ((detector["resolutionList"] as? [[String: Any]]) ?? []).contains {
                            guard let link = $0["resourceLink"] as? String, !link.isEmpty else { return false }
                            return !isBlockedMovieBoxPlaceholderURL(link)
                                && isPlausibleMovieBoxDuration(streamDurationValue($0), expectedMinutes: expectedMinutes)
                        }
                    }
                    if hasPlayable || hasDetectors {
                        root = candidateRoot
                        usedSeason = candidate.se
                        usedEpisode = candidate.ep
                        if usedSeason != season || usedEpisode != episode {
                            print("📦 [MovieBox Native] \(variant.language): TMDB S\(season)E\(episode) → MB S\(usedSeason)E\(usedEpisode)")
                        }
                        break
                    }
                    if root == nil { root = candidateRoot }
                }

                guard let root else { continue }

                var hasValidStream = false
                var fallbackTracks: [Subtitle] = []
                var rejectedShortURLs = Set<String>()
                for stream in root["streams"] as? [[String: Any]] ?? [] {
                    guard let rawURL = (stream["url"] ?? stream["playUrl"] ?? stream["resourceLink"] ?? stream["streamUrl"]) as? String else { continue }
                    let signCookie = stream["signCookie"] as? String
                    let finalURL = extractPolicyResource(signCookie) ?? rawURL
                    if isBlockedMovieBoxPlaceholderURL(finalURL) {
                        continue
                    }
                    if !isPlausibleMovieBoxDuration(streamDurationValue(stream), expectedMinutes: expectedMinutes) {
                        rejectedShortURLs.insert(finalURL)
                        print("📦 [MovieBox Native] Rejected short stream (\(streamDurationValue(stream) ?? "nil") vs \(expectedMinutes.map(String.init) ?? "?") min)")
                        continue
                    }

                    var headers = playbackHeaders
                    if let signCookie, !signCookie.isEmpty {
                        let headerName = (stream["signHeaderKey"] as? String) ?? "Cookie"
                        headers[headerName] = signCookie
                    }

                    let streamId = identifier(stream["id"]) ?? "\(variant.id)|\(usedSeason)|\(usedEpisode)"
                    let tracks = await fetchSubtitles(
                        subjectId: variant.id,
                        streamId: streamId,
                        headers: playbackHeaders,
                        languageLabel: variant.label
                    )
                    if fallbackTracks.isEmpty, !tracks.isEmpty { fallbackTracks = tracks }
                    let qualities = parseQualities(stream["resolutions"] ?? stream["resolution"] ?? stream["quality"])
                    let finalQualities = qualities.isEmpty ? ["Auto"] : qualities.map { "\($0)p" }
                    let type = streamType(format: stream["format"] as? String, url: finalURL)
                    let publicURL = isMovieBoxCDN(finalURL)
                        ? buildCDNProxyURL(url: finalURL, referer: playbackHeaders["Referer"], cookie: signCookie)
                        : finalURL

                    for quality in finalQualities {
                        appendMovieBoxSource(
                            to: &output,
                            url: publicURL,
                            directUrl: finalURL,
                            quality: quality,
                            type: type,
                            language: variant.language,
                            tracks: tracks,
                            headers: headers,
                            originalLanguage: orig
                        )
                        hasValidStream = true
                    }
                }

                // Nuvio / Android TV / web API parity: when signed play-info streams are
                // missing or only short trailers, use public resourceDetectors CDN links.
                if !hasValidStream {
                    let detectors = (root["resourceDetectors"] as? [[String: Any]])
                        ?? (details["resourceDetectors"] as? [[String: Any]])
                        ?? []
                    print("📦 [MovieBox Native] \(variant.language): using \(detectors.count) resourceDetector(s)")
                    for detector in detectors {
                        guard let list = detector["resolutionList"] as? [[String: Any]] else { continue }
                        for video in list {
                            guard let resourceLink = video["resourceLink"] as? String else { continue }
                            if rejectedShortURLs.contains(resourceLink) { continue }
                            if isBlockedMovieBoxPlaceholderURL(resourceLink) { continue }
                            if !isPlausibleMovieBoxDuration(streamDurationValue(video), expectedMinutes: expectedMinutes) {
                                continue
                            }
                            let videoSeason = (video["se"] as? NSNumber)?.intValue ?? (video["se"] as? Int) ?? 0
                            let videoEpisode = (video["ep"] as? NSNumber)?.intValue ?? (video["ep"] as? Int) ?? 0
                            if (usedSeason > 0 || usedEpisode > 0),
                               (videoSeason != usedSeason || videoEpisode != usedEpisode) {
                                continue
                            }
                            let quality: String
                            if let resolution = video["resolution"] {
                                quality = "\(resolution)p"
                            } else {
                                quality = "Auto"
                            }
                            let type = streamType(format: nil, url: resourceLink)
                            // Detector CDN rejects Cookie/Referer/UA — bare direct URL like Android TV.
                            appendMovieBoxSource(
                                to: &output,
                                url: resourceLink,
                                directUrl: resourceLink,
                                quality: quality,
                                type: type,
                                language: variant.language,
                                tracks: fallbackTracks,
                                headers: [:],
                                originalLanguage: orig
                            )
                        }
                    }
                }
            } catch {
                print("⚠️ [MovieBox Native] \(variant.language) play-info failed: \(error.localizedDescription)")
            }
        }

        var seen = Set<String>()
        let unique = output.filter { seen.insert("\($0.language):\($0.quality):\($0.directUrl ?? $0.url)").inserted }
        print("✅ [MovieBox Native] Returning \(unique.count) stream(s)")
        return unique.sorted { qualityNumber($0.quality) > qualityNumber($1.quality) }
    }

    private func fetchSubtitles(subjectId: String, streamId: String, headers: [String: String], languageLabel: String) async -> [Subtitle] {
        var first = URLComponents(string: "\(apiBase)/wefeed-mobile-bff/subject-api/get-stream-captions")!
        first.queryItems = [URLQueryItem(name: "subjectId", value: subjectId), URLQueryItem(name: "streamId", value: streamId)]
        var second = URLComponents(string: "\(apiBase)/wefeed-mobile-bff/subject-api/get-ext-captions")!
        second.queryItems = [URLQueryItem(name: "subjectId", value: subjectId), URLQueryItem(name: "resourceId", value: streamId), URLQueryItem(name: "episode", value: "0")]
        let endpoints = [first.url?.absoluteString, second.url?.absoluteString].compactMap { $0 }
        var output: [Subtitle] = []
        for endpoint in endpoints {
            guard let data = try? await movieBoxRequest(method: "GET", urlString: endpoint, customHeaders: headers),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let root = json["data"] as? [String: Any],
                  let captions = root["extCaptions"] as? [[String: Any]] else { continue }
            for caption in captions {
                guard let rawURL = caption["url"] as? String else { continue }
                let rawLanguage = (caption["language"] ?? caption["lanName"] ?? caption["lan"]) as? String ?? "Unknown"
                let code = normalizedLanguageCode(rawLanguage)
                let finalURL = isMovieBoxCDN(rawURL)
                    ? buildCDNProxyURL(url: rawURL, referer: headers["Referer"], cookie: nil)
                    : rawURL
                output.append(Subtitle(
                    url: finalURL,
                    label: "\((caption["lanName"] as? String) ?? rawLanguage) (\(languageLabel))",
                    code: code,
                    flag: code == "fr" ? "🇫🇷" : (code == "en" ? "🇬🇧" : "🏳️")
                ))
            }
        }
        var seen = Set<String>()
        return output.filter { seen.insert($0.url).inserted }
    }

    private func normalizedLanguageCode(_ value: String) -> String {
        let language = value.lowercased()
        if ["fr", "fra"].contains(language) || language.contains("french") || language.contains("français") { return "fr" }
        if ["en", "eng"].contains(language) || language.contains("english") { return "en" }
        return language
    }

    private func extractPolicyResource(_ cookie: String?) -> String? {
        guard let cookie else { return nil }
        if let range = cookie.range(of: "CloudFront-Policy=") {
            let tail = cookie[range.upperBound...]
            let encoded = String(tail.prefix { $0 != ";" })
                .replacingOccurrences(of: "-", with: "+")
                .replacingOccurrences(of: "~", with: "/")
                .replacingOccurrences(of: "_", with: "=")
            var padded = encoded
            while padded.count % 4 != 0 { padded.append("=") }
            if let data = Data(base64Encoded: padded),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let statements = json["Statement"] as? [[String: Any]],
               let resource = statements.first?["Resource"] as? String {
                let trimmed = resource.trimmingCharacters(in: CharacterSet(charactersIn: "*/"))
                return trimmed.lowercased().hasSuffix(".mpd") ? trimmed : "\(trimmed)/index.mpd"
            }
        }
        if let range = cookie.range(of: "Edge-Cache-Cookie=urlprefix=") {
            let tail = cookie[range.upperBound...]
            var encoded = String(tail.prefix { $0 != ":" && $0 != ";" })
                .replacingOccurrences(of: "_", with: "/")
                .replacingOccurrences(of: "-", with: "+")
            while encoded.count % 4 != 0 { encoded.append("=") }
            if let data = Data(base64Encoded: encoded),
               let decoded = String(data: data, encoding: .utf8) {
                return "\(decoded.trimmingCharacters(in: CharacterSet(charactersIn: "/")))/index.mpd"
            }
        }
        return nil
    }

    private func parseQualities(_ value: Any?) -> [Int] {
        let raw = String(describing: value ?? "")
        let qualities = raw.split(whereSeparator: { !$0.isNumber }).compactMap { Int($0) }
            .filter { (144...4320).contains($0) }
        return Array(Set(qualities)).sorted(by: >)
    }

    private func qualityNumber(_ value: String) -> Int {
        Int(value.filter(\.isNumber)) ?? 0
    }

    private func streamType(format: String?, url: String) -> String {
        let lowerURL = url.lowercased()
        let lowerFormat = (format ?? "").lowercased()
        if lowerURL.contains(".mpd") || lowerFormat == "dash" { return "dash" }
        if lowerURL.contains(".m3u8") || lowerFormat == "hls" { return "hls" }
        if lowerURL.contains(".mkv") || lowerFormat == "mkv" { return "mkv" }
        return "mp4"
    }

    /// French original audio → VO + VF mirror (Android TV / API parity). Soft captions stay optional.
    private func appendMovieBoxSource(
        to output: inout [StreamingSource],
        url: String,
        directUrl: String,
        quality: String,
        type: String,
        language: String,
        tracks: [Subtitle],
        headers: [String: String],
        originalLanguage: String
    ) {
        let trackList: [Subtitle]? = tracks.isEmpty ? nil : tracks
        output.append(StreamingSource(
            url: url,
            directUrl: directUrl,
            quality: quality,
            type: type,
            provider: "moviebox",
            language: language,
            origin: "moviebox",
            tracks: trackList,
            headers: headers.isEmpty ? nil : headers
        ))
        if language == "VO", originalLanguage == "fr" {
            output.append(StreamingSource(
                url: url,
                directUrl: directUrl,
                quality: quality,
                type: type,
                provider: "moviebox",
                language: "VF",
                origin: "moviebox",
                tracks: trackList,
                headers: headers.isEmpty ? nil : headers
            ))
        }
    }

    private func isMovieBoxCDN(_ value: String) -> Bool {
        guard let host = URL(string: value)?.host?.lowercased() else { return false }
        return host.hasSuffix("hakunaymatata.com")
    }

    private func buildCDNProxyURL(url: String, referer: String?, cookie: String?) -> String {
        guard var components = URLComponents(string: cdnWorker) else { return url }
        var items = [
            URLQueryItem(name: "path", value: "moviebox-cdn"),
            URLQueryItem(name: "url", value: url),
            URLQueryItem(name: "referer", value: referer ?? apiBase),
            URLQueryItem(name: "ua", value: userAgent)
        ]
        if let cookie, !cookie.isEmpty { items.append(URLQueryItem(name: "cookie", value: cookie)) }
        components.queryItems = items
        return components.url?.absoluteString ?? url
    }
}
