import Foundation

// Copying rewriteUrl from LocalStreamingServer.swift
func rewriteUrl(_ urlString: String, baseUrl: URL, queryItemsToPersist: [URLQueryItem]?, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
    let preferLoopbackHost = true
    let webServerPort = 8080
    
    var resolved = URL(string: urlString) ?? baseUrl
    if urlString.starts(with: "/") {
        var comps = URLComponents(url: baseUrl, resolvingAgainstBaseURL: false)
        comps?.path = urlString
        if let newUrl = comps?.url { resolved = newUrl }
    } else if !urlString.starts(with: "http") {
        resolved = baseUrl.deletingLastPathComponent().appendingPathComponent(urlString)
    }
    
    let isPlaylist = resolved.pathExtension.lowercased() == "m3u8" || resolved.absoluteString.lowercased().contains(".m3u8")
    let endpoint = isPlaylist ? "/manifest" : "/stream"
    
    var components = URLComponents()
    components.scheme = "http"
    components.host = "127.0.0.1"
    components.port = 8080
    components.path = endpoint
    
    var queryItems = [URLQueryItem]()
    
    if let urlData = resolved.absoluteString.data(using: .utf8) {
        queryItems.append(URLQueryItem(name: "url64", value: urlData.base64EncodedString()))
    }
    if let referer = referer, let data = referer.data(using: .utf8) {
         queryItems.append(URLQueryItem(name: "referer64", value: data.base64EncodedString()))
    }
    if let origin = origin, let data = origin.data(using: .utf8) {
         queryItems.append(URLQueryItem(name: "origin64", value: data.base64EncodedString()))
    }
    if let ua = userAgent, !ua.isEmpty, let data = ua.data(using: .utf8) {
        queryItems.append(URLQueryItem(name: "ua64", value: data.base64EncodedString()))
    }
    
    components.queryItems = queryItems
    return components.url?.absoluteString ?? resolved.absoluteString
}

let m3u8 = """
#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2076121,RESOLUTION=1920x1080,FRAME-RATE=23.974,CODECS="avc1.640032,mp4a.40.2"
https://cdn.watching.onl/anime/abc/index-f1-v1-a1.m3u8
"""

// Rewrite logic
var rewrittenLines = [String]()
let lines = m3u8.components(separatedBy: .newlines)
for line in lines {
    if line.hasPrefix("#") || line.trimmingCharacters(in: .whitespaces).isEmpty {
        rewrittenLines.append(line)
        continue
    }
    let rw = rewriteUrl(line, baseUrl: URL(string: "https://cdn.watching.onl/anime/abc/master.m3u8")!, queryItemsToPersist: nil, referer: "https://megaplay.buzz/", origin: "https://megaplay.buzz", userAgent: "UA", cookie: nil)
    rewrittenLines.append(rw)
}

print(rewrittenLines.joined(separator: "\n"))
