import Foundation
import CryptoKit

class MovieBoxService {
    static let shared = MovieBoxService()
    private init() {}
    
    private let apiBase = "https://api.inmoviebox.com"
    private let tmdbApiKey = "d131017ccc6e5462a81c9304d21476de"
    private let tmdbBaseUrl = "https://api.themoviedb.org/3"
    
    private let headersBase = [
        "User-Agent": "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)",
        "Connection": "keep-alive",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-client-info": "{\"package_name\":\"com.community.mbox.in\",\"version_name\":\"3.0.03.0529.03\",\"version_code\":50020042,\"os\":\"android\",\"os_version\":\"16\",\"device_id\":\"da2b99c821e6ea023e4be55b54d5f7d8\",\"install_store\":\"ps\",\"gaid\":\"d7578036d13336cc\",\"brand\":\"google\",\"model\":\"sdk_gphone64_x86_64\",\"system_language\":\"en\",\"net\":\"NETWORK_WIFI\",\"region\":\"IN\",\"timezone\":\"Asia/Calcutta\",\"sp_code\":\"\"}",
        "x-client-status": "0"
    ]
    
    private let keyB64Default = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw=="
    private let keyB64Alt = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ=="
    
    private lazy var secretKeyDefault: Data = {
        guard let data1 = Data(base64Encoded: keyB64Default),
              let string1 = String(data: data1, encoding: .utf8),
              let data2 = Data(base64Encoded: string1) else {
            fatalError("Failed to decode MovieBox keys")
        }
        return data2
    }()
    
    private lazy var secretKeyAlt: Data = {
        guard let data1 = Data(base64Encoded: keyB64Alt),
              let string1 = String(data: data1, encoding: .utf8),
              let data2 = Data(base64Encoded: string1) else {
            fatalError("Failed to decode MovieBox keys")
        }
        return data2
    }()
    
    // MARK: - Crypto Helpers
    
    private func md5(_ string: String) -> String {
        let data = Data(string.utf8)
        let hash = Insecure.MD5.hash(data: data)
        return hash.map { String(format: "%02hhx", $0) }.joined()
    }
    
    private func hmacMd5(key: Data, data: Data) -> String {
        let signature = HMAC<Insecure.MD5>.authenticationCode(for: data, using: SymmetricKey(data: key))
        return Data(signature).base64EncodedString()
    }
    
    private func generateXClientToken(timestamp: Int64) -> String {
        let ts = String(timestamp)
        let reversedTs = String(ts.reversed())
        let hash = md5(reversedTs)
        return "\(ts),\(hash)"
    }
    
    private func buildCanonicalString(method: String, accept: String?, contentType: String?, url: String, body: String?, timestamp: Int64) -> String {
        guard let urlComponents = URLComponents(string: url) else { return "" }
        let path = urlComponents.path
        
        var query = ""
        if let queryItems = urlComponents.queryItems {
            let sortedItems = queryItems.sorted { ($0.name, $0.value ?? "") < ($1.name, $1.value ?? "") }
            query = sortedItems.map { "\($0.name)=\($0.value ?? "")" }.joined(separator: "&")
        }
        
        let canonicalUrl = query.isEmpty ? path : "\(path)?\(query)"
        
        var bodyHash = ""
        var bodyLength = ""
        
        if let body = body {
            let bodyData = Data(body.utf8)
            bodyLength = String(bodyData.count)
            let hash = Insecure.MD5.hash(data: bodyData)
            bodyHash = hash.map { String(format: "%02hhx", $0) }.joined()
        }
        
        return "\(method.uppercased())\n" +
            "\(accept ?? "")\n" +
            "\(contentType ?? "")\n" +
            "\(bodyLength)\n" +
            "\(timestamp)\n" +
            "\(bodyHash)\n" +
            "\(canonicalUrl)"
    }
    
    private func generateXTrSignature(method: String, accept: String?, contentType: String?, url: String, body: String?, useAltKey: Bool = false, timestamp: Int64) -> String {
        let canonical = buildCanonicalString(method: method, accept: accept, contentType: contentType, url: url, body: body, timestamp: timestamp)
        let secret = useAltKey ? secretKeyAlt : secretKeyDefault
        let signatureB64 = hmacMd5(key: secret, data: Data(canonical.utf8))
        return "\(timestamp)|2|\(signatureB64)"
    }
    
    // MARK: - API Request
    
    private func mobRequest(method: String, urlString: String, body: String? = nil) async throws -> Data {
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        let xClientToken = generateXClientToken(timestamp: timestamp)
        let accept = "application/json"
        let contentType = "application/json"
        
        let xTrSignature = generateXTrSignature(method: method, accept: accept, contentType: contentType, url: urlString, body: body, timestamp: timestamp)
        
        var request = URLRequest(url: url)
        request.httpMethod = method.uppercased()
        
        request.setValue(accept, forHTTPHeaderField: "Accept")
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.setValue(xClientToken, forHTTPHeaderField: "x-client-token")
        request.setValue(xTrSignature, forHTTPHeaderField: "x-tr-signature")
        request.setValue(headersBase["User-Agent"], forHTTPHeaderField: "User-Agent")
        request.setValue(headersBase["x-client-info"], forHTTPHeaderField: "x-client-info")
        request.setValue(headersBase["x-client-status"], forHTTPHeaderField: "x-client-status")
        
        if let body = body {
            request.httpBody = Data(body.utf8)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            print("❌ [MovieBox] Non-OK status: \((response as? HTTPURLResponse)?.statusCode ?? -1)")
            throw URLError(.badServerResponse)
        }
        
        return data
    }
    
    // MARK: - Scraper Logic
    
    func fetchSources(tmdbId: Int, type: String, season: Int = 1, episode: Int = 1) async throws -> [StreamingSource] {
        print("📦 [MovieBox] Native fetch for \(type) \(tmdbId)")
        
        // Step 1: Search by title
        // In a real app, we'd get the title from StreamingService or TMDBService
        let tmdbInfo = try await fetchTmdbDetails(tmdbId: tmdbId, type: type)
        let searchResults = try await search(query: tmdbInfo.title)
        
        guard let bestMatch = findBestMatch(results: searchResults, targetTitle: tmdbInfo.title, targetYear: tmdbInfo.year, isMovie: type == "movie") else {
            print("📦 [MovieBox] No match found for title: \(tmdbInfo.title)")
            // Try original title if different
            if tmdbInfo.originalTitle != tmdbInfo.title {
                print("📦 [MovieBox] Trying original title: \(tmdbInfo.originalTitle)")
                let originalResults = try await search(query: tmdbInfo.originalTitle)
                if let bestOriginalMatch = findBestMatch(results: originalResults, targetTitle: tmdbInfo.originalTitle, targetYear: tmdbInfo.year, isMovie: type == "movie") {
                    return try await getStreamLinks(subjectId: bestOriginalMatch.subjectId, season: season, episode: episode, title: tmdbInfo.title, type: type)
                }
            }
            return []
        }
        
        print("✅ [MovieBox] Matched: \(bestMatch.title) (ID: \(bestMatch.subjectId))")
        
        return try await getStreamLinks(subjectId: bestMatch.subjectId, season: season, episode: episode, title: tmdbInfo.title, type: type)
    }
    
    private func fetchTmdbDetails(tmdbId: Int, type: String) async throws -> (title: String, originalTitle: String, year: String) {
        let urlString = "\(tmdbBaseUrl)/\(type)/\(tmdbId)?api_key=\(tmdbApiKey)"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        let title = (type == "movie" ? json?["title"] as? String : json?["name"] as? String) ?? ""
        let originalTitle = (type == "movie" ? json?["original_title"] as? String : json?["original_name"] as? String) ?? ""
        let date = (type == "movie" ? json?["release_date"] as? String : json?["first_air_date"] as? String) ?? ""
        let year = String(date.prefix(4))
        
        return (title, originalTitle, year)
    }
    
    private func search(query: String) async throws -> [[String: Any]] {
        let url = "\(apiBase)/wefeed-mobile-bff/subject-api/search/v2"
        let body = "{\"page\": 1, \"perPage\": 10, \"keyword\": \"\(query)\"}"
        
        let data = try await mobRequest(method: "POST", urlString: url, body: body)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        var allSubjects: [[String: Any]] = []
        if let results = json?["data"] as? [String: Any], let resultList = results["results"] as? [[String: Any]] {
            for group in resultList {
                if let subjects = group["subjects"] as? [[String: Any]] {
                    allSubjects.append(contentsOf: subjects)
                }
            }
        }
        return allSubjects
    }
    
    private func findBestMatch(results: [[String: Any]], targetTitle: String, targetYear: String, isMovie: Bool) -> (subjectId: Int, title: String)? {
        let normTarget = normalizeTitle(targetTitle)
        let targetType = isMovie ? 1 : 2
        
        var bestId: Int?
        var bestTitle: String?
        var bestScore = 0
        
        for item in results {
            guard let subjectType = item["subjectType"] as? Int, subjectType == targetType,
                  let subjectId = item["subjectId"] as? Int,
                  let title = item["title"] as? String else { continue }
            
            let normTitle = normalizeTitle(title)
            let year = (item["year"] as? Int).map { String($0) } ?? (item["releaseDate"] as? String).map { String($0.prefix(4)) } ?? ""
            
            var score = 0
            if normTitle == normTarget { score += 50 }
            else if normTitle.contains(normTarget) || normTarget.contains(normTitle) { score += 15 }
            
            if !targetYear.isEmpty && !year.isEmpty && targetYear == year { score += 35 }
            
            if score > bestScore {
                bestScore = score
                bestId = subjectId
                bestTitle = title
            }
        }
        
        if bestScore >= 40, let id = bestId, let t = bestTitle {
            return (id, t)
        }
        return nil
    }
    
    private func normalizeTitle(_ s: String) -> String {
        return s.lowercased()
            .replacingOccurrences(of: ":", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    private func getStreamLinks(subjectId: Int, season: Int, episode: Int, title: String, type: String) async throws -> [StreamingSource] {
        let subjectUrl = "\(apiBase)/wefeed-mobile-bff/subject-api/get?subjectId=\(subjectId)"
        let data = try await mobRequest(method: "GET", urlString: subjectUrl)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        var subjectIds: [(id: Int, lang: String)] = []
        var originalLang = "Original Audio"
        
        if let dataDict = json?["data"] as? [String: Any] {
            if let dubs = dataDict["dubs"] as? [[String: Any]] {
                for dub in dubs {
                    if let dId = dub["subjectId"] as? Int, let lang = dub["lanName"] as? String {
                        if dId == subjectId {
                            originalLang = lang
                        } else {
                            subjectIds.append((dId, lang))
                        }
                    }
                }
            }
        }
        
        // Add original subject first
        subjectIds.insert((subjectId, originalLang), at: 0)
        
        var sources: [StreamingSource] = []
        
        for item in subjectIds {
            let sNum = type == "movie" ? 0 : season
            let eNum = type == "movie" ? 0 : episode
            let playUrl = "\(apiBase)/wefeed-mobile-bff/subject-api/play-info?subjectId=\(item.id)&se=\(sNum)&ep=\(eNum)"
            
            do {
                let playData = try await mobRequest(method: "GET", urlString: playUrl)
                let playJson = try JSONSerialization.jsonObject(with: playData) as? [String: Any]
                
                if let pData = playJson?["data"] as? [String: Any], let streams = pData["streams"] as? [[String: Any]] {
                    for stream in streams {
                        if let url = stream["url"] as? String {
                            let qualityField = stream["resolutions"] as? String ?? stream["quality"] as? String ?? "720p"
                            let quality = normalizeQuality(qualityField)
                            
                            // Map languages according to user request
                            // "Original Audio" -> "VO", "French dub" -> "FR"
                            var mappedLanguage = "VO"
                            let l = item.lang.lowercased()
                            if l.contains("french") || l.contains("français") {
                                mappedLanguage = "FR"
                            } else if l.contains("original") {
                                mappedLanguage = "VO"
                            } else {
                                mappedLanguage = item.lang // Keep original label if unknown
                            }
                            
                            var headers: [String: String] = [
                                "Referer": "https://api.inmoviebox.com",
                                "User-Agent": headersBase["User-Agent"]!
                            ]
                            
                            if let cookie = stream["signCookie"] as? String {
                                headers["Cookie"] = cookie
                            }
                            
                            let streamType = url.contains(".mpd") ? "dash" : (url.contains(".m3u8") ? "hls" : "mp4")
                            
                            let source = StreamingSource(
                                url: url,
                                quality: "MovieBox (\(mappedLanguage)) \(quality)",
                                type: streamType,
                                provider: "moviebox",
                                language: mappedLanguage,
                                origin: "moviebox",
                                headers: headers
                            )
                            sources.append(source)
                        }
                    }
                }
            } catch {
                print("⚠️ [MovieBox] Failed to get play-info for \(item.id): \(error)")
            }
        }
        
        return sources
    }
    
    private func normalizeQuality(_ q: String) -> String {
        let qLower = q.lowercased()
        if qLower.contains("1080") { return "1080p" }
        if qLower.contains("720") { return "720p" }
        if qLower.contains("480") { return "480p" }
        if qLower.contains("360") { return "360p" }
        return q
    }
}

// MARK: - Legacy compatibility structs if needed
struct MovieBoxResponse: Codable {
    let success: Bool?
    let results: [StreamingSource]?
}
