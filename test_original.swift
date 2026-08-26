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
    
    struct Subtitle {
        let url: String
        let language: String
        let isDefault: Bool
    }
    
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
    
    private func fetch(url: String, headers: [String: String] = [:]) async throws -> (Data, HTTPURLResponse) {
        guard let u = URL(string: url) else { throw URLError(.badURL) }
        var req = URLRequest(url: u)
        for (k, v) in defaultHeaders { req.setValue(v, forHTTPHeaderField: k) }
        for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        return (data, res as! HTTPURLResponse)
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
        if file == nil { 
            print("extractSources failed for \(serverName): file is nil. JSON: \(String(describing: json))")
            return [] 
        }
        
        print("extractSources success for \(serverName): file \(file!)")
        
        let streamTitle = "\(animeTitle) - Episode \(episodeNum) (\(type.uppercased()))"
        var customHeaders = defaultHeaders
        customHeaders["Referer"] = "\(origin)/"
        customHeaders["Origin"] = origin
        
        var subtitles: [Subtitle] = []
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

    func scrapeType(malId: Int, episode: Int, type: String, animeTitle: String) async throws -> [ExtractedSource] {
        let megaUrl = "\(megaplayBase)/stream/mal/\(malId)/\(episode)/\(type)"
        let (data, _) = try await fetch(url: megaUrl, headers: ["Referer": megaUrl])
        let html = String(data: data, encoding: .utf8) ?? ""
        
        let (dataId, realId) = extractDataIds(html: html)
        var streams: [ExtractedSource] = []
        
        if let dataId = dataId {
            let apiUrl = "\(megaplayBase)/stream/getSources?id=\(dataId)&id=\(dataId)"
            print("Calling Megaplay with dataId \(dataId)")
            if let extractions = try? await extractSources(apiUrl: apiUrl, referer: megaUrl, origin: megaplayBase, serverName: "MegaPlay", animeTitle: animeTitle, episodeNum: episode, type: type), !extractions.isEmpty {
                streams.append(contentsOf: extractions)
                return streams
            } else {
                print("Megaplay failed!")
            }
        }
        
        if let realId = realId {
            let vidPage = "\(vidwishBase)/stream/s-2/\(realId)/\(type)"
            print("Calling Vidwish with realId \(realId)")
            if let (vidData, _) = try? await fetch(url: vidPage, headers: ["Referer": megaUrl]), let vidHtml = String(data: vidData, encoding: .utf8) {
                let (vDataId, _) = extractDataIds(html: vidHtml)
                if let vDataId = vDataId {
                    let apiUrl = "\(vidwishBase)/stream/getSources?id=\(vDataId)&id=\(vDataId)"
                    if let ext = try? await extractSources(apiUrl: apiUrl, referer: vidPage, origin: vidwishBase, serverName: "Vidwish", animeTitle: animeTitle, episodeNum: episode, type: type) {
                        streams.append(contentsOf: ext)
                    }
                }
            }
        }
        return streams
    }
}

Task {
    do {
        // test with a more recent anime like Jujutsu Kaisen mal_id 40748 ep 1
        let streams = try await HiAnimeService.shared.scrapeType(malId: 40748, episode: 1, type: "sub", animeTitle: "JJK")
        print("Final streams: \(streams.map { $0.name })")
    } catch {
        print("Error: \(error)")
    }
    exit(0)
}
RunLoop.main.run()
