//
//  LocalStreamingServer.swift
//  anisflix
//
//  Created by AI Assistant on 13/02/2026.
//

import Foundation
import GCDWebServer

class LocalStreamingServer {
    static let shared = LocalStreamingServer()
    
    private let webServer = GCDWebServer()
    private var isRunning = false
    
    private init() {
        setupRoutes()
    }
    
    // MARK: - Public API
    
    func start() {
        if isRunning { return }
        
        do {
            try webServer.start(options: [
                GCDWebServerOption_Port: 8080,
                GCDWebServerOption_BindToLocalhost: false, // Must be accessible from LAN for AirPlay
                GCDWebServerOption_AutomaticallySuspendInBackground: false
            ])
            isRunning = true
            print("🚀 [LocalServer] Started on port 8080")
            print("   - LAN URL: \(webServer.serverURL?.absoluteString ?? "unknown")")
        } catch {
            print("❌ [LocalServer] Failed to start: \(error)")
        }
    }
    
    func stop() {
        if isRunning {
            webServer.stop()
            isRunning = false
            print("🛑 [LocalServer] Stopped")
        }
    }
    
    var serverUrl: URL? {
        return webServer.serverURL
    }
    
    // MARK: - Routing
    
    private func setupRoutes() {
        // 1. Manifest Handler (Rewrites M3U8)
        webServer.addHandler(forMethod: "GET", path: "/manifest", request: GCDWebServerRequest.self) { [weak self] request in
            guard let self = self else { return GCDWebServerDataResponse(statusCode: 500) }
            
            let query = request.query ?? [:]
            guard let targetUrlString = query["url"] as? String,
                  let targetUrl = URL(string: targetUrlString) else {
                return GCDWebServerDataResponse(statusCode: 400)
            }
            
            let subtitleUrlString = query["subs"] as? String
            let subtitleUrl = subtitleUrlString != nil ? URL(string: subtitleUrlString!) : nil
            
            // Extract Headers from Query
            let referer = query["referer"] as? String
            let origin = query["origin"] as? String
            let defaultUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            let userAgent = query["user_agent"] as? String ?? defaultUA
            
            // Check if it is HLS or MP4/Direct File
            let isM3U8 = targetUrl.pathExtension.lowercased() == "m3u8" || targetUrl.absoluteString.contains(".m3u8")
            
            if !isM3U8 {
                // Generate Virtual HLS for MP4
                print("📦 [LocalServer] Generating Virtual HLS for MP4: \(targetUrl.lastPathComponent)")
                let cookie = query["cookie"] as? String
                let playlist = self.generateVirtualPlaylist(targetUrl: targetUrl, subtitleUrl: subtitleUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
                let resp = GCDWebServerDataResponse(text: playlist)
                resp?.contentType = "application/vnd.apple.mpegurl"
                return resp
            }
            
            // Fetch original manifest
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseError: Error?
            
            print("📥 [LocalServer] Fetching manifest: \(targetUrl.lastPathComponent)")
            
            var urlRequest = URLRequest(url: targetUrl)
            urlRequest.setValue(userAgent, forHTTPHeaderField: "User-Agent")
            if let referer = referer {
                urlRequest.setValue(referer, forHTTPHeaderField: "Referer")
            }
            if let origin = origin {
                urlRequest.setValue(origin, forHTTPHeaderField: "Origin")
            }
            if let cookie = request.query?["cookie"] as? String {
                urlRequest.setValue(cookie, forHTTPHeaderField: "Cookie")
            }
            
            let task = URLSession.shared.dataTask(with: urlRequest) { data, response, error in
                responseData = data
                responseError = error
                semaphore.signal()
            }
            task.resume()
            semaphore.wait()
            
            if let error = responseError {
                print("❌ [LocalServer] Upstream error: \(error)")
                return GCDWebServerDataResponse(statusCode: 502)
            }
            
            guard let data = responseData, let content = String(data: data, encoding: .utf8) else {
                return GCDWebServerDataResponse(statusCode: 502)
            }
            
            // Extract Cookie
            let cookie = query["cookie"] as? String
            
            // Rewrite Manifest
            let rewrittenContent = self.rewriteManifest(content: content, originalUrl: targetUrl, subtitleUrl: subtitleUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
            
            let resp = GCDWebServerDataResponse(text: rewrittenContent)
            resp?.contentType = "application/vnd.apple.mpegurl" // Force HLS mime type
            return resp
        }
        
        // 2. Proxy Handler (For Segments & Keys)
        webServer.addHandler(forMethod: "GET", path: "/proxy", request: GCDWebServerRequest.self) { request in
            let query = request.query ?? [:]
            guard let targetUrlString = query["url"] as? String,
                  let targetUrl = URL(string: targetUrlString) else {
                return GCDWebServerDataResponse(statusCode: 400)
            }
            
            // Extract Headers from Query
            let referer = query["referer"] as? String
            let origin = query["origin"] as? String
            let defaultUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            let userAgent = query["user_agent"] as? String ?? defaultUA
            
            // Sync fetch (GCDWebServer handlers run on background threads)
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseResponse: URLResponse?
            var responseError: Error?
            
            var urlRequest = URLRequest(url: targetUrl)
            urlRequest.setValue(userAgent, forHTTPHeaderField: "User-Agent")
            if let referer = referer {
                urlRequest.setValue(referer, forHTTPHeaderField: "Referer")
            }
            if let origin = origin {
                urlRequest.setValue(origin, forHTTPHeaderField: "Origin")
            }
            if let cookie = query["cookie"] as? String {
                urlRequest.setValue(cookie, forHTTPHeaderField: "Cookie")
            }
            
            let task = URLSession.shared.dataTask(with: urlRequest) { data, response, error in
                responseData = data
                responseResponse = response
                responseError = error
                semaphore.signal()
            }
            task.resume()
            semaphore.wait()
            
            if let error = responseError {
                 print("❌ [LocalServer] Proxy error for \(targetUrl.lastPathComponent): \(error)")
                return GCDWebServerDataResponse(statusCode: 502)
            }
            
            if let data = responseData {
                let contentType = responseResponse?.mimeType ?? "application/octet-stream"
                return GCDWebServerDataResponse(data: data, contentType: contentType)
            }
            
            return GCDWebServerDataResponse(statusCode: 404)
        }
        
        // 3. Subtitle Converter Handler (SRT -> WebVTT)
        webServer.addHandler(forMethod: "GET", path: "/subtitles", request: GCDWebServerRequest.self) { [weak self] request in
            guard let self = self else { return GCDWebServerDataResponse(statusCode: 500) }
            
            let query = request.query ?? [:]
            guard let targetUrlString = query["url"] as? String,
                  let targetUrl = URL(string: targetUrlString) else {
                return GCDWebServerDataResponse(statusCode: 400)
            }
            
            print("📝 [LocalServer] Fetching & Converting Subtitles: \(targetUrl.lastPathComponent)")
            
            // Fetch original SRT/VTT
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseError: Error?
            
            let task = URLSession.shared.dataTask(with: targetUrl) { data, response, error in
                responseData = data
                responseError = error
                semaphore.signal()
            }
            task.resume()
            semaphore.wait()
            
            if let error = responseError {
                print("❌ [LocalServer] Subtitle fetch error: \(error)")
                return GCDWebServerDataResponse(statusCode: 502)
            }
            
            guard let data = responseData, let content = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .windowsCP1252) ?? String(data: data, encoding: .isoLatin1) else {
                return GCDWebServerDataResponse(statusCode: 502)
            }
            
            // Convert to WebVTT
            let vttContent = self.convertToWebVTT(content: content)
            
            let resp = GCDWebServerDataResponse(text: vttContent)
            resp?.contentType = "text/vtt"
            return resp
        }
    }
    
    // MARK: - Subtitle Formatting
    
    private func convertToWebVTT(content: String) -> String {
        // Check if already WebVTT
        if content.contains("WEBVTT") {
            return content
        }
        
        var vtt = "WEBVTT\n\n"
        
        // Split into lines
        let lines = content.components(separatedBy: .newlines)
        
        for line in lines {
            // Check for timestamp line (00:00:00,000 --> 00:00:00,000)
            if line.contains("-->") {
                // Replace commas with dots
                let fixedLine = line.replacingOccurrences(of: ",", with: ".")
                vtt += fixedLine + "\n"
            } else {
                vtt += line + "\n"
            }
        }
        
        return vtt
    }
    
    // MARK: - Manifest Rewriting
    
    private func rewriteManifest(content: String, originalUrl: URL, subtitleUrl: URL?, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
        var lines = content.components(separatedBy: .newlines)
        var newLines = [String]()
        
        // 1. Inject Subtitles (if Master Playlist)
        if content.contains("#EXT-X-STREAM-INF") {
             if let subUrl = subtitleUrl {
                 let groupId = "subs"
                 
                 // Construct Local Subtitle URL
                 var subComponents = URLComponents()
                 subComponents.scheme = "http"
                 subComponents.host = self.webServer.serverURL?.host
                 subComponents.port = Int(self.webServer.port)
                 subComponents.path = "/subtitles"
                 subComponents.queryItems = [URLQueryItem(name: "url", value: subUrl.absoluteString)]
                 
                 let localSubUrl = subComponents.url?.absoluteString ?? subUrl.absoluteString
                 
                 let subTag = "#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"\(groupId)\",NAME=\"External Subtitles\",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE=\"en\",URI=\"\(localSubUrl)\""
                 
                 // Insert after #EXTM3U
                 if let idx = lines.firstIndex(where: { $0.hasPrefix("#EXTM3U") }) {
                     lines.insert(subTag, at: idx + 1)
                 } else {
                     lines.insert(subTag, at: 0)
                 }
                 
                 // Add SUBTITLES attribute to STREAM-INF
                 for (i, line) in lines.enumerated() {
                     if line.hasPrefix("#EXT-X-STREAM-INF") && !line.contains("SUBTITLES=") {
                         lines[i] = line + ",SUBTITLES=\"\(groupId)\""
                     }
                 }
             }
        }
        
        // 2. Rewrite URLs (to point to /proxy or /manifest)
        let baseUrl = originalUrl.deletingLastPathComponent()
        
        for line in lines {
            if line.hasPrefix("#") {
                // Check for URI attributes in tags
                // e.g. #EXT-X-KEY:METHOD=AES-128,URI="..."
                if line.hasPrefix("#EXT-X-KEY") || line.hasPrefix("#EXT-X-MAP") {
                    newLines.append(rewriteLine(line, baseUrl: baseUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie))
                } else {
                    newLines.append(line)
                }
            } else if !line.isEmpty {
                // This is a URL (Segment or Playlist)
                let rewritten = rewriteUrl(line, baseUrl: baseUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
                newLines.append(rewritten)
            } else {
                newLines.append(line)
            }
        }
        
        return newLines.joined(separator: "\n")
    }
    
    private func rewriteLine(_ line: String, baseUrl: URL, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
        // Simple regex or string manipulation to find URI="..."
        guard let range = line.range(of: "URI=\"") else { return line }
        
        let prefix = line[..<range.upperBound]
        let remainder = line[range.upperBound...]
        
        guard let endQuote = remainder.firstIndex(of: "\"") else { return line }
        
        let uri = String(remainder[..<endQuote])
        let suffix = remainder[remainder.index(after: endQuote)...]
        
        let rewrittenUri = rewriteUrl(uri, baseUrl: baseUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
        
        return String(prefix) + rewrittenUri + "\"" + String(suffix)
    }
    
    private func rewriteUrl(_ original: String, baseUrl: URL, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
        // Resolve relative URL
        guard let resolved = URL(string: original, relativeTo: baseUrl) else { return original }
        
        // Construct Proxy URL
        let isPlaylist = resolved.pathExtension == "m3u8"
        let endpoint = isPlaylist ? "/manifest" : "/proxy"
        
        var components = URLComponents()
        components.scheme = "http"
        components.host = self.webServer.serverURL?.host // Use actual IP
        components.port = Int(self.webServer.port)
        components.path = endpoint
        
        var queryItems = [URLQueryItem(name: "url", value: resolved.absoluteString)]
        if let referer = referer {
             queryItems.append(URLQueryItem(name: "referer", value: referer))
        }
        if let origin = origin {
             queryItems.append(URLQueryItem(name: "origin", value: origin))
        }
        // Only append UA if it differs from default to save URL length, but safest is to always append if custom
        // For simplicity and correctness, let's append if provided
        if let ua = userAgent {
             queryItems.append(URLQueryItem(name: "user_agent", value: ua))
        }
        
        // Critical: Forward Cookie to segments
        if let cookie = cookie {
             queryItems.append(URLQueryItem(name: "cookie", value: cookie))
        }
        
        components.queryItems = queryItems
        
        return components.url?.absoluteString ?? original
    }
    
    private func generateVirtualPlaylist(targetUrl: URL, subtitleUrl: URL?, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
        // Construct Proxy URL for the segment
        // We use /proxy endpoint to serve the MP4 content with headers
        let segmentProxyUrl = rewriteUrl(targetUrl.absoluteString, baseUrl: targetUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
        
        var playlist = "#EXTM3U\n"
        playlist += "#EXT-X-VERSION:3\n"
        playlist += "#EXT-X-TARGETDURATION:10\n"
        playlist += "#EXT-X-MEDIA-SEQUENCE:0\n"
        
        // Define Subtitles if present
        var subtitlesAttribute = ""
        if let subUrl = subtitleUrl {
            let groupId = "subs"
            
            // Construct Local Subtitle URL for Virtual Playlist too
            var subComponents = URLComponents()
            subComponents.scheme = "http"
            subComponents.host = self.webServer.serverURL?.host
            subComponents.port = Int(self.webServer.port)
            subComponents.path = "/subtitles"
            subComponents.queryItems = [URLQueryItem(name: "url", value: subUrl.absoluteString)]
            
            let localSubUrl = subComponents.url?.absoluteString ?? subUrl.absoluteString
            
            playlist += "#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"\(groupId)\",NAME=\"External Subtitles\",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE=\"en\",URI=\"\(localSubUrl)\"\n"
            subtitlesAttribute = ",SUBTITLES=\"\(groupId)\""
        }
        
        // Add Stream Info pointing to the MP4 (via proxy)
        playlist += "#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=5000000\(subtitlesAttribute)\n"
        playlist += "\(segmentProxyUrl)\n"
        
        return playlist
    }
}
