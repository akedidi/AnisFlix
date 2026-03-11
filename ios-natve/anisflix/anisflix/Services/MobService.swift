import Foundation
import CryptoKit

class MobService {
    static let shared = MobService()
    
    // Core URLs & Configurations
    private let apiBase = "https://api.inmoviebox.com"
    private let keyB64Default = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw=="
    private let keyB64Alt = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ=="
    
    private let headersBase = [
        "User-Agent": "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)",
        "Connection": "keep-alive",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-client-info": "{\"package_name\":\"com.community.mbox.in\",\"version_name\":\"3.0.03.0529.03\",\"version_code\":50020042,\"os\":\"android\",\"os_version\":\"16\",\"device_id\":\"da2b99c821e6ea023e4be55b54d5f7d8\",\"install_store\":\"ps\",\"gaid\":\"d7578036d13336cc\",\"brand\":\"google\",\"model\":\"sdk_gphone64_x86_64\",\"system_language\":\"en\",\"net\":\"NETWORK_WIFI\",\"region\":\"IN\",\"timezone\":\"Asia/Calcutta\",\"sp_code\":\"\"}",
        "x-client-status": "0"
    ]
    
    private lazy var secretKeyDefault: Data = {
        guard let data1 = Data(base64Encoded: keyB64Default),
              let string1 = String(data: data1, encoding: .utf8),
              let data2 = Data(base64Encoded: string1) else {
            fatalError("Failed to decode MOB keys")
        }
        return data2
    }()
    
    private lazy var secretKeyAlt: Data = {
        guard let data1 = Data(base64Encoded: keyB64Alt),
              let string1 = String(data: data1, encoding: .utf8),
              let data2 = Data(base64Encoded: string1) else {
            fatalError("Failed to decode alternative MOB keys")
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
    
    // MARK: - API Core Request
    
    private func mobRequest(method: String, urlString: String, body: String? = nil, useAltKey: Bool = false) async throws -> Data {
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        let xClientToken = generateXClientToken(timestamp: timestamp)
        let accept = "application/json"
        let contentType = "application/json"
        
        let xTrSignature = generateXTrSignature(method: method, accept: accept, contentType: contentType, url: urlString, body: body, useAltKey: useAltKey, timestamp: timestamp)
        
        var request = URLRequest(url: url)
        request.httpMethod = method.uppercased()
        
        request.setValue(accept, forHTTPHeaderField: "Accept")
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.setValue(xClientToken, forHTTPHeaderField: "x-client-token")
        request.setValue(xTrSignature, forHTTPHeaderField: "x-tr-signature")
        for (key, value) in headersBase {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        if let body = body {
            request.httpBody = Data(body.utf8)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        if !(200...299).contains(httpResponse.statusCode) {
            let bodyStr = String(data: data, encoding: .utf8) ?? ""
            print("❌ [MOB] HTTP \(httpResponse.statusCode): \(bodyStr)")
            throw URLError(.badServerResponse)
        }
        return data
    }
    
    // MARK: - Main Scrape Flow
    
    func fetchSources(tmdbId: Int, type: String, season: Int = 0, episode: Int = 0) async throws -> [StreamingSource] {
        print("🔍 [MOB] Start fetchSources for TMDB ID: \(tmdbId), Type: \(type)")
        let tmdbInfo = try await fetchTmdbDetails(tmdbId: tmdbId, type: type)
        print("🔍 [MOB] TMDB Info fetched - Title: \(tmdbInfo.title), Original: \(tmdbInfo.originalTitle), Year: \(tmdbInfo.year)")
        
        let searchResults = try await search(query: tmdbInfo.title)
        print("🔍 [MOB] Search returned \(searchResults.count) results for query: '\(tmdbInfo.title)'")
        
        var bestMatch = findBestMatch(results: searchResults, targetTitle: tmdbInfo.title, targetYear: tmdbInfo.year, isMovie: type == "movie")
        
        if bestMatch == nil {
            print("📦 [MOB] No match found for title: \(tmdbInfo.title)")
            if tmdbInfo.originalTitle != tmdbInfo.title {
                let originalResults = try await search(query: tmdbInfo.originalTitle)
                bestMatch = findBestMatch(results: originalResults, targetTitle: tmdbInfo.originalTitle, targetYear: tmdbInfo.year, isMovie: type == "movie")
            }
        }
        
        guard let finalMatch = bestMatch else {
            print("❌ [MOB] No match found or invalid subjectId")
            return []
        }
        
        print("✅ [MOB] Matched: \(finalMatch.title) (ID: \(finalMatch.subjectId))")
        
        return try await getStreamLinks(subjectIdStr: finalMatch.subjectId, season: season, episode: episode, title: tmdbInfo.title, type: type)
    }
    
    // MARK: - TMDB Mapping Helpers
    
    private func fetchTmdbDetails(tmdbId: Int, type: String) async throws -> (title: String, originalTitle: String, year: String) {
        let tmdbApiKey = "d131017ccc6e5462a81c9304d21476de"
        let urlString = "https://api.themoviedb.org/3/\(type)/\(tmdbId)?api_key=\(tmdbApiKey)&append_to_response=external_ids"
        guard let url = URL(string: urlString) else { throw URLError(.badURL) }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        let title = (type == "movie" ? json?["title"] as? String : json?["name"] as? String) ?? ""
        let originalTitle = (type == "movie" ? json?["original_title"] as? String : json?["original_name"] as? String) ?? title
        let dateString = (type == "movie" ? json?["release_date"] as? String : json?["first_air_date"] as? String) ?? ""
        let year = String(dateString.prefix(4))
        
        return (title.isEmpty ? originalTitle : title, originalTitle, year)
    }
    
    // MARK: - Searching & Matching
    
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
    
    private func normalizeTitle(_ s: String) -> String {
        let cleaned = s.lowercased()
            .replacingOccurrences(of: "\\[.*?\\]", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\(.*?\\)", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\\b", with: " ", options: .regularExpression)
            .replacingOccurrences(of: ":", with: " ")
            .replacingOccurrences(of: "[^\\w\\s]", with: " ", options: .regularExpression)
        
        return cleaned.components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }
    
    private func findBestMatch(results: [[String: Any]], targetTitle: String, targetYear: String, isMovie: Bool) -> (subjectId: String, title: String)? {
        let normTarget = normalizeTitle(targetTitle)
        let targetType = isMovie ? 1 : 2
        
        var bestId: String?
        var bestTitle: String?
        var bestScore = 0
        
        for item in results {
            guard let subjectType = item["subjectType"] as? Int, subjectType == targetType,
                  let title = item["title"] as? String else { continue }
            
            var subjectIdStr = ""
            if let idInt = item["subjectId"] as? Int {
                subjectIdStr = String(idInt)
            } else if let idNum = item["subjectId"] as? NSNumber {
                subjectIdStr = idNum.stringValue
            } else if let idStr = item["subjectId"] as? String {
                subjectIdStr = idStr
            } else {
                continue
            }
            
            let normTitle = normalizeTitle(title)
            let year = (item["year"] as? Int).map { String($0) } ?? (item["releaseDate"] as? String).map { String($0.prefix(4)) } ?? ""
            
            var score = 0
            if normTitle == normTarget { score += 50 }
            else if normTitle.contains(normTarget) || normTarget.contains(normTitle) { score += 15 }
            
            if !targetYear.isEmpty && !year.isEmpty && targetYear == year { score += 35 }
            
            if score > bestScore {
                bestScore = score
                bestId = subjectIdStr
                bestTitle = title
            }
        }
        
        if bestScore >= 40, let id = bestId, let t = bestTitle {
            return (id, t)
        }
        return nil
    }
    
    private func normalizeQuality(_ q: String) -> String {
        let qLower = q.lowercased()
        if qLower.contains("1080") { return "1080p" }
        if qLower.contains("720") { return "720p" }
        if qLower.contains("480") { return "480p" }
        if qLower.contains("360") { return "360p" }
        return q
    }
    
    // MARK: - Stream Fetching
    
    private func getStreamLinks(subjectIdStr: String, season: Int, episode: Int, title: String, type: String) async throws -> [StreamingSource] {
        print("🎬 [MOB] getStreamLinks for subjectId: \(subjectIdStr)")
        let subjectUrl = "\(apiBase)/wefeed-mobile-bff/subject-api/get?subjectId=\(subjectIdStr)"
        let data = try await mobRequest(method: "GET", urlString: subjectUrl)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        var subjectIds: [(id: String, lang: String)] = []
        var mappedOriginalLang = "VO"
        
        if let dataDict = json?["data"] as? [String: Any], let dubs = dataDict["dubs"] as? [[String: Any]] {
            print("🎬 [MOB] Found \(dubs.count) dub items in metadata")
            for dub in dubs {
                var dIdStr = ""
                if let idInt = dub["subjectId"] as? Int { dIdStr = String(idInt) }
                else if let idNum = dub["subjectId"] as? NSNumber { dIdStr = idNum.stringValue }
                else if let idStr = dub["subjectId"] as? String { dIdStr = idStr }
                
                if !dIdStr.isEmpty, let lang = dub["lanName"] as? String {
                    let l = lang.lowercased()
                    var mappedLang = ""
                    
                    if l.contains("original") {
                        mappedLang = "VO"
                    } else if l.contains("french") || l.contains("français") || l == "fr" || l == "vf" {
                        mappedLang = "VF"
                    } else {
                        // Ignore other dubs (Hindi, Arabic, etc.) to save requests and clutter
                        continue
                    }
                    
                    if dIdStr == subjectIdStr {
                        mappedOriginalLang = mappedLang
                    } else {
                        subjectIds.append((dIdStr, mappedLang))
                    }
                }
            }
        }
        
        // Ensure the base subjectId holds its mapped track
        subjectIds.insert((subjectIdStr, mappedOriginalLang), at: 0)
        
        // Remove duplicate subjectIds safely
        var uniqueIds = [(id: String, lang: String)]()
        var seen = Set<String>()
        for item in subjectIds {
            if !seen.contains(item.id) {
                seen.insert(item.id)
                uniqueIds.append(item)
            }
        }
        subjectIds = uniqueIds
        
        print("🎬 [MOB] Total language tracks to fetch: \(subjectIds.count)")
        for track in subjectIds {
            print("   - \(track.lang) (ID: \(track.id))")
        }
        
        return await withTaskGroup(of: [StreamingSource].self) { group in
            for item in subjectIds {
                group.addTask {
                    var localSources: [StreamingSource] = []
                    let playUrl = "\(self.apiBase)/wefeed-mobile-bff/subject-api/play-info?subjectId=\(item.id)&se=\(season)&ep=\(episode)"
                    print("🎬 [MOB] Fetching play-info for lang: \(item.lang)")
                    do {
                        let playData = try await self.mobRequest(method: "GET", urlString: playUrl)
                        let playJson = try JSONSerialization.jsonObject(with: playData) as? [String: Any]
                        
                        if let pData = playJson?["data"] as? [String: Any], let streams = pData["streams"] as? [[String: Any]] {
                            for stream in streams {
                                if let url = stream["url"] as? String {
                                    let qualityField = stream["resolutions"] as? String ?? stream["quality"] as? String ?? "720p"
                                    let quality = self.normalizeQuality(qualityField)
                                    
                                    // item.lang is now safely pre-mapped to "VO" or "VF"
                                    let mappedLanguage = item.lang
                                    
                                    var headers: [String: String] = [
                                        "Referer": self.apiBase,
                                        "User-Agent": self.headersBase["User-Agent"]!
                                    ]
                                    
                                    if let cookie = stream["signCookie"] as? String {
                                        headers["Cookie"] = cookie
                                    }
                                    let streamType = url.contains(".mpd") ? "dash" : (url.contains(".m3u8") ? "hls" : "mp4")
                                    
                                    let source = StreamingSource(
                                        url: url,
                                        quality: quality,
                                        type: streamType,
                                        provider: "mob",
                                        language: mappedLanguage,
                                        origin: "mob",
                                        headers: headers
                                    )
                                    localSources.append(source)
                                }
                            }
                            print("✅ [MOB] Successfully extracted \(localSources.count) streams for \(item.lang)")
                        } else {
                            print("⚠️ [MOB] No streams array found in play-info for \(item.lang)")
                        }
                    } catch {
                        print("❌ [MOB] Failed to get play info for \(item.id): \(error)")
                    }
                    return localSources
                }
            }
            
            var allSources: [StreamingSource] = []
            for await sources in group {
                allSources.append(contentsOf: sources)
            }
            return allSources
        }
    }
}
