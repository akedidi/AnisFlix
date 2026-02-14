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
            var headers: [String: String] = [:]
            
            // 1. Try JSON Headers first
            if let jsonString = query["headers"] as? String,
               let jsonData = jsonString.data(using: .utf8),
               let decoded = try? JSONSerialization.jsonObject(with: jsonData) as? [String: String] {
                headers = decoded
            }
            
            // 2. Fallback / Merge Legacy Params (if not present in JSON)
            if let referer = query["referer"] as? String, headers["Referer"] == nil {
                headers["Referer"] = referer
            }
            if let origin = query["origin"] as? String, headers["Origin"] == nil {
                headers["Origin"] = origin
            }
            let defaultUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
            if let ua = query["user_agent"] as? String {
                 headers["User-Agent"] = ua
            } else if headers["User-Agent"] == nil {
                 headers["User-Agent"] = defaultUA
            }
            
            // Check if it is HLS or MP4/Direct File
            let isM3U8 = targetUrl.pathExtension.lowercased() == "m3u8" || targetUrl.absoluteString.contains(".m3u8")
            
            if !isM3U8 {
                // Generate Virtual HLS for MP4
                print("📦 [LocalServer] Generating Virtual HLS for MP4: \(targetUrl.lastPathComponent)")
                let playlist = self.generateVirtualPlaylist(targetUrl: targetUrl, subtitleUrl: subtitleUrl, headers: headers)
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
            for (key, value) in headers {
                urlRequest.setValue(value, forHTTPHeaderField: key)
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
            
            // Check for Media Playlist + Subtitles (Virtual Master Playlist)
            // If it's a Media Playlist (no STREAM-INF) and we have subtitles, we MUST wrap it
            // in a Master Playlist for AirPlay to recognize the subtitle track.
            if let subUrl = subtitleUrl, !content.contains("#EXT-X-STREAM-INF") {
                print("📦 [LocalServer] Detected Media Playlist with Subtitles -> Generating Virtual Master Playlist")
                let virtualMaster = self.generateVirtualMasterPlaylist(originalUrl: targetUrl, subtitleUrl: subUrl, headers: headers)
                let resp = GCDWebServerDataResponse(text: virtualMaster)
                resp?.contentType = "application/vnd.apple.mpegurl"
                return resp
            }
            
            // Rewrite Manifest
            let rewrittenContent = self.rewriteManifest(content: content, originalUrl: targetUrl, subtitleUrl: subtitleUrl, headers: headers)
            
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
            var headers: [String: String] = [:]
            if let jsonString = query["headers"] as? String,
               let jsonData = jsonString.data(using: .utf8),
               let decoded = try? JSONSerialization.jsonObject(with: jsonData) as? [String: String] {
                headers = decoded
            }
            
            // Fallback
            if let referer = query["referer"] as? String, headers["Referer"] == nil {
                headers["Referer"] = referer
            }
            if let origin = query["origin"] as? String, headers["Origin"] == nil {
                headers["Origin"] = origin
            }
            let defaultUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
            if let ua = query["user_agent"] as? String {
                 headers["User-Agent"] = ua
            } else if headers["User-Agent"] == nil {
                 headers["User-Agent"] = defaultUA
            }
            
            // Sync fetch (GCDWebServer handlers run on background threads)
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseResponse: URLResponse?
            var responseError: Error?
            
            var urlRequest = URLRequest(url: targetUrl)
            for (key, value) in headers {
                urlRequest.setValue(value, forHTTPHeaderField: key)
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
            
            let offsetString = query["offset"] as? String
            let offset = Double(offsetString ?? "0") ?? 0
            
            print("📝 [LocalServer] Fetching & Converting Subtitles: \(targetUrl.lastPathComponent) (Offset: \(offset)s)")
            
            // Fetch content
            // Assuming subtitles don't need complex headers but if they do, we can add them here too.
            // For now, simple fetch.
            // Ideally we should pass headers here too if VixSrc subtitles are protected.
            
            if let data = try? Data(contentsOf: targetUrl),
               let content = String(data: data, encoding: .utf8) {
                
                let vtt = self.convertToWebVTT(content: content, offset: offset)
                let resp = GCDWebServerDataResponse(text: vtt)
                resp?.contentType = "text/vtt"
                return resp
            }
            
            return GCDWebServerDataResponse(statusCode: 404)
        }
    }
    
    // MARK: - Subtitle Formatting
    
    private func convertToWebVTT(content: String, offset: Double) -> String {
        // Simple VTT conversion with optional time shift
        var vtt = "WEBVTT\n\n"
        
        // Split into lines
        // Handle varying newline formats
        let lines = content.components(separatedBy: .newlines)
        
        for line in lines {
            // Check for timestamp line (00:00:00,000 --> 00:00:00,000)
            // SRT format: 00:00:20,000 --> 00:00:24,400
            // WebVTT format: 00:00:20.000 --> 00:00:24.400
            if line.contains("-->") {
                // Parse and Shift Timestamps
                let parts = line.components(separatedBy: "-->")
                if parts.count == 2 {
                    let start = shiftTimestamp(parts[0].trimmingCharacters(in: .whitespaces), offset: offset)
                    let end = shiftTimestamp(parts[1].trimmingCharacters(in: .whitespaces), offset: offset)
                    vtt += "\(start) --> \(end)\n"
                } else {
                    // Fallback if parsing fails (shouldn't happen for valid SRT)
                    vtt += line.replacingOccurrences(of: ",", with: ".") + "\n"
                }
            } else {
                vtt += line + "\n"
            }
        }
        
        return vtt
    }
    
    private func shiftTimestamp(_ timestamp: String, offset: Double) -> String {
        // Format: HH:mm:ss,MMM or HH:mm:ss.MMM
        let cleanTs = timestamp.replacingOccurrences(of: ",", with: ".")
        
        let components = cleanTs.components(separatedBy: ":")
        guard components.count == 3 else { return cleanTs }
        
        let h = Double(components[0]) ?? 0
        let m = Double(components[1]) ?? 0
        let s = Double(components[2]) ?? 0
        
        var totalSeconds = (h * 3600) + (m * 60) + s
        totalSeconds += offset
        
        // Ensure non-negative
        if totalSeconds < 0 { totalSeconds = 0 }
        
        // Convert back to string
        let newH = Int(totalSeconds / 3600)
        let newM = Int((totalSeconds.truncatingRemainder(dividingBy: 3600)) / 60)
        let newS = totalSeconds.truncatingRemainder(dividingBy: 60)
        
        return String(format: "%02d:%02d:%06.3f", newH, newM, newS)
    }
    
    // MARK: - Manifest Rewriting
    
    private func rewriteManifest(content: String, originalUrl: URL, subtitleUrl: URL?, headers: [String: String]) -> String {
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
                 
                 // Add or Update SUBTITLES attribute to STREAM-INF
                 for (i, line) in lines.enumerated() {
                     if line.hasPrefix("#EXT-X-STREAM-INF") {
                         if line.contains("SUBTITLES=") {
                             // Replace existing SUBTITLES="..." with SUBTITLES="subs"
                             // Uses Regex to be safe
                             if let regex = try? NSRegularExpression(pattern: "SUBTITLES=\"[^\"]*\"", options: []) {
                                 let range = NSRange(location: 0, length: line.utf16.count)
                                 let newLine = regex.stringByReplacingMatches(in: line, options: [], range: range, withTemplate: "SUBTITLES=\"\(groupId)\"")
                                 lines[i] = newLine
                             }
                         } else {
                             // Append if missing
                             lines[i] = line + ",SUBTITLES=\"\(groupId)\""
                         }
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
                    newLines.append(rewriteLine(line, baseUrl: baseUrl, headers: headers))
                } else {
                    newLines.append(line)
                }
            } else if !line.isEmpty {
                // This is a URL (Segment or Playlist)
                let rewritten = rewriteUrl(line, baseUrl: baseUrl, headers: headers)
                newLines.append(rewritten)
            } else {
                newLines.append(line)
            }
        }
        
        return newLines.joined(separator: "\n")
    }
    
    private func rewriteLine(_ line: String, baseUrl: URL, headers: [String: String]) -> String {
        // Simple regex or string manipulation to find URI="..."
        guard let range = line.range(of: "URI=\"") else { return line }
        
        let prefix = line[..<range.upperBound]
        let remainder = line[range.upperBound...]
        
        guard let endQuote = remainder.firstIndex(of: "\"") else { return line }
        
        let uri = String(remainder[..<endQuote])
        let suffix = remainder[remainder.index(after: endQuote)...]
        
        let rewrittenUri = rewriteUrl(uri, baseUrl: baseUrl, headers: headers)
        
        return String(prefix) + rewrittenUri + "\"" + String(suffix)
    }
    
    private func rewriteUrl(_ original: String, baseUrl: URL, headers: [String: String]) -> String {
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
        
        // Serialize Headers into query param 'headers' for next request
        if !headers.isEmpty {
            if let jsonData = try? JSONSerialization.data(withJSONObject: headers, options: []),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                queryItems.append(URLQueryItem(name: "headers", value: jsonString))
            }
        }
        
        // Fallback for visual debugging (optional) or if serialization fails
        if let ua = headers["User-Agent"] {
             queryItems.append(URLQueryItem(name: "user_agent", value: ua))
        }
        
        components.queryItems = queryItems
        
        return components.url?.absoluteString ?? original
    }
    
    private func generateVirtualPlaylist(targetUrl: URL, subtitleUrl: URL?, headers: [String: String]) -> String {
        // Construct Proxy URL for the segment
        // We use /proxy endpoint to serve the MP4 content with headers
        let segmentProxyUrl = rewriteUrl(targetUrl.absoluteString, baseUrl: targetUrl, headers: headers)
        
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
    
    private func generateVirtualMasterPlaylist(originalUrl: URL, subtitleUrl: URL, headers: [String: String]) -> String {
        // This wraps a Media Playlist (the originalUrl) into a Master Playlist
        // The originalUrl here is the fetched manifest URL
        
        // IMPORTANT: We MUST NOT include 'subs' param here, otherwise we loop infinitely!
        var variantUrlComponents = URLComponents()
        variantUrlComponents.scheme = "http"
        variantUrlComponents.host = self.webServer.serverURL?.host
        variantUrlComponents.port = Int(self.webServer.port)
        variantUrlComponents.path = "/manifest"
        
        var queryItems = [URLQueryItem(name: "url", value: originalUrl.absoluteString)]
        
        // Serialize Headers into query param 'headers' for next request
        if !headers.isEmpty {
            if let jsonData = try? JSONSerialization.data(withJSONObject: headers, options: []),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                queryItems.append(URLQueryItem(name: "headers", value: jsonString))
            }
        }
        
        // Fallback for visual debugging (optional) or if serialization fails
        if let ua = headers["User-Agent"] {
             queryItems.append(URLQueryItem(name: "user_agent", value: ua))
        }
        
        variantUrlComponents.queryItems = queryItems
        let playlistProxyUrl = variantUrlComponents.url?.absoluteString ?? originalUrl.absoluteString
        
        var playlist = "#EXTM3U\n"
        playlist += "#EXT-X-VERSION:3\n"
        
        // Define Subtitles
        let groupId = "subs"
        
        // Construct Local Subtitle URL
        var subComponents = URLComponents()
        subComponents.scheme = "http"
        subComponents.host = self.webServer.serverURL?.host
        subComponents.port = Int(self.webServer.port)
        subComponents.path = "/subtitles"
        subComponents.queryItems = [URLQueryItem(name: "url", value: subtitleUrl.absoluteString)]
        
        let localSubUrl = subComponents.url?.absoluteString ?? subtitleUrl.absoluteString
        
        playlist += "#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"\(groupId)\",NAME=\"External Subtitles\",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE=\"en\",URI=\"\(localSubUrl)\"\n"
        
        playlist += "#EXT-X-STREAM-INF:BANDWIDTH=5000000,SUBTITLES=\"\(groupId)\"\n"
        playlist += "\(playlistProxyUrl)\n"
        
        return playlist
    }
}
