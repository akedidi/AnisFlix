import Foundation
//
//  HiAnimeService.swift
//  anisflix
//

import Foundation

class HiAnimeService {
    static let shared = HiAnimeService()
    
    private let tmdbApiKey = "1865f43a0549ca50d341dd9ab8b29f49"
    private let megaplayBase = "https://megaplay.buzz"
    private let vidwishBase = "https://vidwish.live"
    private let megacloudBase = "https://megacloud.bloggy.click"
    private let defaultHeaders: [String: String] = [
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Connection": "keep-alive"
    ]
    
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
    
    private func fetch(url: String, headers: [String: String] = [:]) async throws -> (Data, HTTPURLResponse) {
        guard let u = URL(string: url) else { throw URLError(.badURL) }
        var req = URLRequest(url: u)
        for (k, v) in defaultHeaders { req.setValue(v, forHTTPHeaderField: k) }
        for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        return (data, res as! HTTPURLResponse)
    }

    private func getImdbId(tmdbId: Int, mediaType: String) async throws -> String? {
        let url = "https://api.themoviedb.org/3/\(mediaType)/\(tmdbId)/external_ids?api_key=\(tmdbApiKey)"
        let (data, _) = try await fetch(url: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return json?["imdb_id"] as? String
    }

    private func getTmdbShowTitle(tmdbId: Int, mediaType: String) async throws -> String? {
        let url = "https://api.themoviedb.org/3/\(mediaType)/\(tmdbId)?api_key=\(tmdbApiKey)"
        let (data, _) = try await fetch(url: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return (json?["name"] as? String) ?? (json?["title"] as? String) ?? (json?["original_title"] as? String)
    }

    private func resolveMapping(imdbId: String, season: Int, episode: Int) async throws -> (Int, Int)? {
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

    private func searchMalId(title: String, mediaType: String) async throws -> Int? {
        let type = mediaType == "movie" ? "movie" : "tv"
        let url = "https://api.jikan.moe/v4/anime?q=\(title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&type=\(type)&limit=1"
        let (data, _) = try await fetch(url: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if let dataArr = json?["data"] as? [[String: Any]], let first = dataArr.first {
            return first["mal_id"] as? Int
        }
        return nil
    }
    
    private func extractDataIds(html: String) -> (String?, String?) {
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

    private func extractSources(apiUrl: String, referer: String, origin: String, serverName: String, animeTitle: String, episodeNum: Int, type: String) async throws -> [ExtractedSource] {
        let (data, _) = try await fetch(url: apiUrl, headers: [
            "X-Requested-With": "XMLHttpRequest",
            "Referer": referer,
            "Origin": origin
        ])
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        
        let file = (json?["sources"] as? [String: Any])?["file"] as? String
        if file == nil { return [] }
        let streamTitle = "\(animeTitle) - Episode \(episodeNum) (\(type.uppercased()))"
        
        var customHeaders = defaultHeaders
        customHeaders["Referer"] = "\(origin)/"
        customHeaders["Origin"] = origin
        
        var subtitles: [Subtitle] = []
        if let tracks = json?["tracks"] as? [[String: Any]] {
            for t in tracks {
                if let f = t["file"] as? String, let k = t["kind"] as? String, k == "captions" {
                    let l = t["label"] as? String ?? "English"
                    subtitles.append(Subtitle(
                        url: f,
                        language: String(l.prefix(3)).lowercased(),
                        isDefault: l.lowercased() == "english"
                    ))
                }
            }
        }
        
        let source = ExtractedSource(
            name: "HiAnime [\(serverName)] (\(type.uppercased()))",
            url: file!,
            quality: "Auto",
            type: "m3u8",
            serverType: "hianime",
            subtitles: subtitles,
            headers: customHeaders,
            embedUrl: nil
        )
        return [source]
    }

    private func scrapeType(malId: Int, episode: Int, type: String, animeTitle: String) async throws -> [ExtractedSource] {
        let megaUrl = "\(megaplayBase)/stream/mal/\(malId)/\(episode)/\(type)"
        let (data, _) = try await fetch(url: megaUrl, headers: ["Referer": megaUrl])
        let html = String(data: data, encoding: .utf8) ?? ""
        
        let (dataId, realId) = extractDataIds(html: html)
        var streams: [ExtractedSource] = []
        
        if let dataId = dataId {
            let apiUrl = "\(megaplayBase)/stream/getSources?id=\(dataId)&id=\(dataId)"
            if let extractions = try? await extractSources(apiUrl: apiUrl, referer: megaUrl, origin: megaplayBase, serverName: "MegaPlay", animeTitle: animeTitle, episodeNum: episode, type: type), !extractions.isEmpty {
                streams.append(contentsOf: extractions)
                return streams // Return early if MegaPlay succeeds to prevent duplicate mirrors
            }
        }
        
        if let realId = realId {
            let vidPage = "\(vidwishBase)/stream/s-2/\(realId)/\(type)"
            if let (vidData, _) = try? await fetch(url: vidPage, headers: ["Referer": megaUrl]), let vidHtml = String(data: vidData, encoding: .utf8) {
                let (vDataId, _) = extractDataIds(html: vidHtml)
                if let vDataId = vDataId {
                    let apiUrl = "\(vidwishBase)/stream/getSources?id=\(vDataId)&id=\(vDataId)"
                    if let ext = try? await extractSources(apiUrl: apiUrl, referer: vidPage, origin: vidwishBase, serverName: "Vidwish", animeTitle: animeTitle, episodeNum: episode, type: type) {
                        streams.append(contentsOf: ext)
                    }
                }
            }
            
            let megacloudPage = "\(megacloudBase)/stream/s-3/\(realId)/\(type)"
            if let (mcData, _) = try? await fetch(url: megacloudPage, headers: ["Referer": megaUrl]), let mcHtml = String(data: mcData, encoding: .utf8) {
                let (mDataId, _) = extractDataIds(html: mcHtml)
                if let mDataId = mDataId {
                    let apiUrl = "\(megacloudBase)/stream/getSources?id=\(mDataId)&id=\(mDataId)"
                    if let ext = try? await extractSources(apiUrl: apiUrl, referer: megacloudPage, origin: megacloudBase, serverName: "MegaCloud", animeTitle: animeTitle, episodeNum: episode, type: type) {
                        streams.append(contentsOf: ext)
                    }
                }
            }
        }
        
        return streams
    }

    func getStreams(tmdbId: Int, mediaType: String = "tv", season: Int? = 1, episode: Int? = 1) async -> [ExtractedSource] {
        do {
            let safeSeason = season ?? 1
            let safeEpisode = episode ?? 1
            
            guard let imdbId = try await getImdbId(tmdbId: tmdbId, mediaType: mediaType) else { return [] }
            let showTitle = try await getTmdbShowTitle(tmdbId: tmdbId, mediaType: mediaType) ?? (mediaType == "movie" ? "Movie" : "Anime")
            
            var malId: Int?
            var mappedEp = safeEpisode
            
            if mediaType == "movie" {
                malId = try await searchMalId(title: showTitle, mediaType: "movie")
                mappedEp = 1
            } else {
                if let mapping = try await resolveMapping(imdbId: imdbId, season: safeSeason, episode: safeEpisode) {
                    malId = mapping.0
                    mappedEp = mapping.1
                }
            }
            
            guard let malId = malId else { return [] }
            print("🎌 [HiAnimeService] Found MAL ID: \(malId), mapped Episode: \(mappedEp) for \(showTitle)")
            
            // Only fetching sub
            let allStreams = try await scrapeType(malId: malId, episode: mappedEp, type: "sub", animeTitle: showTitle)
            
            var seen = Set<String>()
            var uniqueStreams = [ExtractedSource]()
            for s in allStreams {
                if !seen.contains(s.url) {
                    seen.insert(s.url)
                    uniqueStreams.append(s)
                }
            }
            return uniqueStreams
        } catch {
            print("❌ [HiAnimeService] Error: \(error.localizedDescription)")
            return []
        }
    }
}

let group = DispatchGroup()
group.enter()
Task {
    print("Testing HiAnimeService...")
    let streams = await HiAnimeService.shared.getStreams(tmdbId: 61421, mediaType: "tv", season: 1, episode: 1)
    print("Streams found: \(streams.count)")
    for s in streams {
        print("- \(s.name): \(s.url)")
    }
    group.leave()
}
group.wait()
