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
            
            // Check if it is HLS or MP4/Direct File
            let isM3U8 = targetUrl.pathExtension.lowercased() == "m3u8" || targetUrl.absoluteString.contains(".m3u8")
            
            if !isM3U8 {
                // Generate Virtual HLS for MP4
                print("📦 [LocalServer] Generating Virtual HLS for MP4: \(targetUrl.lastPathComponent)")
                let playlist = self.generateVirtualPlaylist(targetUrl: targetUrl, subtitleUrl: subtitleUrl, referer: query["referer"] as? String)
                let resp = GCDWebServerDataResponse(text: playlist)
                resp?.contentType = "application/vnd.apple.mpegurl"
                return resp
            }
            
            // Fetch original manifest
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseError: Error?
            var responseMimeType: String?
            
            print("📥 [LocalServer] Fetching manifest: \(targetUrl.lastPathComponent)")
            
            var urlRequest = URLRequest(url: targetUrl)
            // Add custom headers if needed (passed via query params? or hardcoded?)
            // For now, let's assume standard headers are enough or we add essential ones
            urlRequest.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
            if let referer = query["referer"] as? String {
                urlRequest.setValue(referer, forHTTPHeaderField: "Referer")
            }
            
            let task = URLSession.shared.dataTask(with: urlRequest) { data, response, error in
                responseData = data
                responseError = error
                responseMimeType = response?.mimeType
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
            
            // Rewrite Manifest
            let rewrittenContent = self.rewriteManifest(content: content, originalUrl: targetUrl, subtitleUrl: subtitleUrl, referer: query["referer"] as? String)
            
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
            
            // Sync fetch (GCDWebServer handlers run on background threads)
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseResponse: URLResponse?
            var responseError: Error?
            
            var urlRequest = URLRequest(url: targetUrl)
             urlRequest.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
            if let referer = query["referer"] as? String {
                urlRequest.setValue(referer, forHTTPHeaderField: "Referer")
            }
            if let origin = query["origin"] as? String {
                urlRequest.setValue(origin, forHTTPHeaderField: "Origin")
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
    }
    
    // MARK: - Manifest Rewriting
    
    private func rewriteManifest(content: String, originalUrl: URL, subtitleUrl: URL?, referer: String?) -> String {
        var lines = content.components(separatedBy: .newlines)
        var newLines = [String]()
        
        // 1. Inject Subtitles (if Master Playlist)
        if content.contains("#EXT-X-STREAM-INF") {
             if let subUrl = subtitleUrl {
                 let groupId = "subs"
                 let subTag = "#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"\(groupId)\",NAME=\"External Subtitles\",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE=\"en\",URI=\"\(subUrl.absoluteString)\""
                 
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
                    newLines.append(rewriteLine(line, baseUrl: baseUrl, referer: referer))
                } else {
                    newLines.append(line)
                }
            } else if !line.isEmpty {
                // This is a URL (Segment or Playlist)
                let rewritten = rewriteUrl(line, baseUrl: baseUrl, referer: referer)
                newLines.append(rewritten)
            } else {
                newLines.append(line)
            }
        }
        
        return newLines.joined(separator: "\n")
    }
    
    private func rewriteLine(_ line: String, baseUrl: URL, referer: String?) -> String {
        // Simple regex or string manipulation to find URI="..."
        // This is a naive implementation, assuming URI is usually double quoted
        guard let range = line.range(of: "URI=\"") else { return line }
        
        let prefix = line[..<range.upperBound]
        let remainder = line[range.upperBound...]
        
        guard let endQuote = remainder.firstIndex(of: "\"") else { return line }
        
        let uri = String(remainder[..<endQuote])
        let suffix = remainder[remainder.index(after: endQuote)...]
        
        let rewrittenUri = rewriteUrl(uri, baseUrl: baseUrl, referer: referer)
        
        return String(prefix) + rewrittenUri + "\"" + String(suffix)
    }
    
    private func rewriteUrl(_ original: String, baseUrl: URL, referer: String?) -> String {
        // Resolve relative URL
        guard let resolved = URL(string: original, relativeTo: baseUrl) else { return original }
        
        // Construct Proxy URL
        // If it's an M3U8, loop back to /manifest
        // If it's a segment/key, loop back to /proxy
        
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
        
        // Pass validation logic / headers if needed
        components.queryItems = queryItems
        
        return components.url?.absoluteString ?? original
    }
    private func generateVirtualPlaylist(targetUrl: URL, subtitleUrl: URL?, referer: String?) -> String {
        // Construct Proxy URL for the segment
        // We use /proxy endpoint to serve the MP4 content with headers
        let segmentProxyUrl = rewriteUrl(targetUrl.absoluteString, baseUrl: targetUrl, referer: referer)
        
        var playlist = "#EXTM3U\n"
        playlist += "#EXT-X-VERSION:3\n"
        playlist += "#EXT-X-TARGETDURATION:10\n"
        playlist += "#EXT-X-MEDIA-SEQUENCE:0\n"
        
        // Define Subtitles if present
        var subtitlesAttribute = ""
        if let subUrl = subtitleUrl {
            let groupId = "subs"
            playlist += "#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"\(groupId)\",NAME=\"External Subtitles\",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE=\"en\",URI=\"\(subUrl.absoluteString)\"\n"
            subtitlesAttribute = ",SUBTITLES=\"\(groupId)\""
        }
        
        // Add Stream Info pointing to the MP4 (via proxy)
        playlist += "#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=5000000\(subtitlesAttribute)\n"
        playlist += "\(segmentProxyUrl)\n"
        
        return playlist
    }
}
