import Foundation

let TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49"
let MEGAPLAY_BASE = "https://megaplay.buzz"
let VIDWISH_BASE = "https://vidwish.live"
let MEGACLOUD_BASE = "https://megacloud.bloggy.click"
let DEFAULT_HEADERS = [
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Connection": "keep-alive"
]

func fetch(url: String, headers: [String: String] = [:]) async throws -> (Data, HTTPURLResponse) {
    guard let u = URL(string: url) else { throw URLError(.badURL) }
    var req = URLRequest(url: u)
    for (k, v) in DEFAULT_HEADERS { req.setValue(v, forHTTPHeaderField: k) }
    for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
    let (data, res) = try await URLSession.shared.data(for: req)
    return (data, res as! HTTPURLResponse)
}

func getImdbId(tmdbId: String, mediaType: String) async throws -> String? {
    let url = "https://api.themoviedb.org/3/\(mediaType)/\(tmdbId)/external_ids?api_key=\(TMDB_API_KEY)"
    let (data, _) = try await fetch(url: url)
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    return json?["imdb_id"] as? String
}

func getTmdbShowTitle(tmdbId: String, mediaType: String) async throws -> String? {
    let url = "https://api.themoviedb.org/3/\(mediaType)/\(tmdbId)?api_key=\(TMDB_API_KEY)"
    let (data, _) = try await fetch(url: url)
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    return (json?["name"] as? String) ?? (json?["title"] as? String) ?? (json?["original_title"] as? String)
}

func resolveMapping(imdbId: String, season: Int, episode: Int) async throws -> (Int, Int)? {
    let url = "https://id-mapping-api-malid.hf.space/api/resolve?id=\(imdbId)&s=\(season)&e=\(episode)"
    let (data, _) = try await fetch(url: url)
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    if json?["error"] != nil { return nil }
    if let malId = json?["mal_id"] as? Int {
        let ep = (json?["mal_episode"] as? Int) ?? episode
        return (malId, ep)
    }
    return nil
}

func searchMalId(title: String, mediaType: String) async throws -> Int? {
    let type = mediaType == "movie" ? "movie" : "tv"
    let url = "https://api.jikan.moe/v4/anime?q=\(title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&type=\(type)&limit=1"
    let (data, _) = try await fetch(url: url)
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    if let dataArr = json?["data"] as? [[String: Any]], let first = dataArr.first {
        return first["mal_id"] as? Int
    }
    return nil
}

func extractSources(apiUrl: String, referer: String, origin: String, serverName: String, animeTitle: String, episodeNum: Int, type: String) async throws -> [[String: Any]] {
    let (data, _) = try await fetch(url: apiUrl, headers: [
        "X-Requested-With": "XMLHttpRequest",
        "Referer": referer,
        "Origin": origin
    ])
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    
    let file = (json?["sources"] as? [String: Any])?["file"] as? String
    if file == nil { return [] }
    let streamTitle = "\(animeTitle) - Episode \(episodeNum) (\(type.uppercased()))"
    
    var stream: [String: Any] = [
        "name": "HiAnime [\(serverName)] (\(type.uppercased()))",
        "title": streamTitle,
        "url": file!,
        "quality": "Auto",
        "headers": [
            "User-Agent": DEFAULT_HEADERS["User-Agent"],
            "Accept": DEFAULT_HEADERS["Accept"],
            "Connection": DEFAULT_HEADERS["Connection"],
            "Referer": "\(origin)/",
            "Origin": origin
        ],
        "provider": "hianime",
        "type": "m3u8"
    ]
    
    if let tracks = json?["tracks"] as? [[String: Any]] {
        var subtitles: [[String: String]] = []
        for t in tracks {
            if let f = t["file"] as? String, let k = t["kind"] as? String, k == "captions" {
                let l = t["label"] as? String ?? "English"
                subtitles.append([
                    "url": f,
                    "name": l,
                    "language": String(l.prefix(3)).lowercased()
                ])
            }
        }
        stream["subtitles"] = subtitles
    }
    return [stream]
}

func extractDataIds(html: String) -> (String?, String?) {
    let idRegex = try? NSRegularExpression(pattern: "id=\"megaplay-player\"[^>]*data-id=\"([^\"]+)\"", options: [])
    let realIdRegex = try? NSRegularExpression(pattern: "id=\"megaplay-player\"[^>]*data-realid=\"([^\"]+)\"", options: [])
    
    var dataId: String?
    var realId: String?
    let nsRange = NSRange(html.startIndex..<html.endIndex, in: html)
    
    if let match = idRegex?.firstMatch(in: html, options: [], range: nsRange), let r = Range(match.range(at: 1), in: html) {
        dataId = String(html[r])
    }
    
    if let match = realIdRegex?.firstMatch(in: html, options: [], range: nsRange), let r = Range(match.range(at: 1), in: html) {
        realId = String(html[r])
    }
    
    return (dataId, realId)
}

func scrapeType(malId: Int, episode: Int, type: String, animeTitle: String) async throws -> [[String: Any]] {
    let megaUrl = "\(MEGAPLAY_BASE)/stream/mal/\(malId)/\(episode)/\(type)"
    let (data, _) = try await fetch(url: megaUrl, headers: ["Referer": megaUrl])
    let html = String(data: data, encoding: .utf8) ?? ""
    
    let (dataId, realId) = extractDataIds(html: html)
    var streams: [[String: Any]] = []
    
    if let dataId = dataId {
        let apiUrl = "\(MEGAPLAY_BASE)/stream/getSources?id=\(dataId)&id=\(dataId)"
        if let extractions = try? await extractSources(apiUrl: apiUrl, referer: megaUrl, origin: MEGAPLAY_BASE, serverName: "MegaPlay", animeTitle: animeTitle, episodeNum: episode, type: type) {
            streams.append(contentsOf: extractions)
        }
    }
    
    if let realId = realId {
        let vidPage = "\(VIDWISH_BASE)/stream/s-2/\(realId)/\(type)"
        if let (vidData, _) = try? await fetch(url: vidPage, headers: ["Referer": megaUrl]), let vidHtml = String(data: vidData, encoding: .utf8) {
            let (vDataId, _) = extractDataIds(html: vidHtml)
            if let vDataId = vDataId {
                let apiUrl = "\(VIDWISH_BASE)/stream/getSources?id=\(vDataId)&id=\(vDataId)"
                let ext = try? await extractSources(apiUrl: apiUrl, referer: vidPage, origin: VIDWISH_BASE, serverName: "Vidwish", animeTitle: animeTitle, episodeNum: episode, type: type)
                if let ext = ext { streams.append(contentsOf: ext) }
            }
        }
        
        let megacloudPage = "\(MEGACLOUD_BASE)/stream/s-3/\(realId)/\(type)"
        if let (mcData, _) = try? await fetch(url: megacloudPage, headers: ["Referer": megaUrl]), let mcHtml = String(data: mcData, encoding: .utf8) {
            let (mDataId, _) = extractDataIds(html: mcHtml)
            if let mDataId = mDataId {
                let apiUrl = "\(MEGACLOUD_BASE)/stream/getSources?id=\(mDataId)&id=\(mDataId)"
                let ext = try? await extractSources(apiUrl: apiUrl, referer: megacloudPage, origin: MEGACLOUD_BASE, serverName: "MegaCloud", animeTitle: animeTitle, episodeNum: episode, type: type)
                if let ext = ext { streams.append(contentsOf: ext) }
            }
        }
    }
    
    return streams
}

func getStreams(tmdbId: String, mediaType: String = "tv", season: Int = 1, episode: Int = 1) async throws -> [[String: Any]] {
    guard let imdbId = try await getImdbId(tmdbId: tmdbId, mediaType: mediaType) else { return [] }
    let showTitle = try await getTmdbShowTitle(tmdbId: tmdbId, mediaType: mediaType) ?? (mediaType == "movie" ? "Movie" : "Anime")
    
    var malId: Int?
    var mappedEp = episode
    
    if mediaType == "movie" {
        malId = try await searchMalId(title: showTitle, mediaType: "movie")
        mappedEp = 1
    } else {
        if let mapping = try await resolveMapping(imdbId: imdbId, season: season, episode: episode) {
            malId = mapping.0
            mappedEp = mapping.1
        }
    }
    
    guard let malId = malId else { return [] }
    
    print("Found MAL ID: \(malId), mapped Episode: \(mappedEp)")
    
    return try await scrapeType(malId: malId, episode: mappedEp, type: "sub", animeTitle: showTitle)
}

Task {
    do {
        print("Testing HiAnime fetcher...")
        let streams = try await getStreams(tmdbId: "61421", mediaType: "tv", season: 1, episode: 1)
        print("Streams found: \(streams.count)")
        for s in streams {
            print("- \(s["name"] ?? ""): \(s["url"] ?? "")")
            let d = try! JSONSerialization.data(withJSONObject: s, options: .prettyPrinted)
            print(String(data: d, encoding: .utf8)!)
        }
        exit(0)
    } catch {
        print("Error: \(error)")
        exit(1)
    }
}
RunLoop.main.run()
