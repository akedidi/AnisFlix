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
    
    // Manifest Cache (URL -> Rewritten Content) for VOD streams to prevent token expiration during Chromecast
    private var manifestCache: [String: String] = [:]
    
    // DASH proxy session storage (session ID → session info)
    var dashSessions: [String: DashSession] = [:]
    
    // TLS-bypassing URLSession for CDNs with invalid/untrusted certificates (e.g. megaup.cc)
    private let tlsBypassDelegate = TLSBypassDelegate()
    private lazy var insecureSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        return URLSession(configuration: config, delegate: tlsBypassDelegate, delegateQueue: nil)
    }()
    
    private static let tlsUntrustedDomains = ["megaup.cc", "megacdn"]
    
    private func needsTLSBypass(url: URL) -> Bool {
        let host = url.host?.lowercased() ?? ""
        return Self.tlsUntrustedDomains.contains(where: { host.contains($0) })
    }
    
    /// Returns the appropriate URLSession: insecure for domains with bad certs, standard otherwise.
    private func session(for url: URL) -> URLSession {
        return needsTLSBypass(url: url) ? insecureSession : URLSession.shared
    }
    
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
    
    // Helper to safely parse query without '+' being converted to space
    private func extractQuery(from request: GCDWebServerRequest) -> [String: String] {
        let items = URLComponents(url: request.url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        return items.reduce(into: [String: String]()) { result, item in
            result[item.name] = item.value ?? ""
        }
    }
    
    /// Applies headers to a URLRequest using the proxy-level headers.
    /// NOTE: The `?headers={"referer":"videostr.net"}` query param in Vidlink URLs is for the CDN proxy's 
    /// INTERNAL routing, NOT for our HTTP requests. We must always use `vidlink.pro` as Referer.
    private func applyHeaders(to request: inout URLRequest, targetUrl: URL, referer: String?, origin: String?, userAgent: String?, cookie: String?) {
        let defaultUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        request.setValue(userAgent ?? defaultUA, forHTTPHeaderField: "User-Agent")
        
        if let referer = referer {
            request.setValue(referer, forHTTPHeaderField: "Referer")
        }
        if let origin = origin {
            request.setValue(origin, forHTTPHeaderField: "Origin")
        }
        if let cookie = cookie {
            request.setValue(cookie, forHTTPHeaderField: "Cookie")
        }
    }
    
    private func setupRoutes() {
        // 0. Stream Handler (For large MP4 streaming via HTTP byte ranges)
        webServer.addHandler(forMethod: "GET", path: "/stream", request: GCDWebServerRequest.self) { [weak self] request, completion in
            guard let self = self else {
                completion(GCDWebServerDataResponse(statusCode: 500))
                return
            }
            let query = self.extractQuery(from: request)
            
            var targetUrlString = query["url"]
            if let url64 = query["url64"], let data = Data(base64Encoded: url64), let str = String(data: data, encoding: .utf8) {
                targetUrlString = str
            }
            
            guard let validUrlString = targetUrlString,
                  let targetUrl = URL(string: validUrlString) else {
                completion(GCDWebServerDataResponse(statusCode: 400))
                return
            }
            
            // Extract Headers from Query
            let referer = query["referer"] as? String
            let origin = query["origin"] as? String
            let defaultUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            let userAgent = query["user_agent"] as? String ?? defaultUA
            let cookie = query["cookie"] as? String
            
            var urlRequest = URLRequest(url: targetUrl)
            self.applyHeaders(to: &urlRequest, targetUrl: targetUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
            
            // VERY IMPORTANT: Forward Range header exactly as requested by AVPlayer
            if let rangeHeader = request.headers["Range"] {
                urlRequest.setValue(rangeHeader, forHTTPHeaderField: "Range")
                print("🌊 [LocalServer] Streaming request: \(targetUrl.lastPathComponent) (Range: \(rangeHeader))")
            } else {
                print("🌊 [LocalServer] Streaming request: \(targetUrl.lastPathComponent) (No Range req)")
            }
            
            // Setup URLSession with streaming delegate (TLS bypass for untrusted CDNs)
            let config = URLSessionConfiguration.default
            let delegate = StreamingSessionDelegate()
            delegate.bypassTLS = self.needsTLSBypass(url: targetUrl)
            let session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
            let task = session.dataTask(with: urlRequest)
            
            delegate.onResponse = { response in
                guard let httpResponse = response as? HTTPURLResponse else {
                    completion(GCDWebServerDataResponse(statusCode: 502))
                    return
                }
                
                let statusCode = httpResponse.statusCode
                let contentType = httpResponse.mimeType ?? "video/mp4"
                
                // AVPlayer is extremely picky about Content-Length vs Expected Content Length vs Extracted Range
                let contentLengthStr = httpResponse.allHeaderFields["Content-Length"] as? String
                let contentLength = UInt(contentLengthStr ?? "0") ?? UInt(httpResponse.expectedContentLength > 0 ? httpResponse.expectedContentLength : 0)
                
                let streamResponse = GCDWebServerStreamedResponse(
                    contentType: contentType,
                    asyncStreamBlock: { asyncCompletion in
                        delegate.readNextChunk { data, error in
                            if let error = error {
                                print("❌ [LocalServer] Stream chunk error: \(error)")
                                asyncCompletion(nil, error)
                            } else if let data = data, !data.isEmpty {
                                asyncCompletion(data, nil)
                            } else {
                                asyncCompletion(Data(), nil) // EOF
                            }
                        }
                    }
                )
                
                // Mirror all essential headers for AVPlayer (CRITICAL FOR MP4)
                if let contentRange = httpResponse.allHeaderFields["Content-Range"] as? String {
                    streamResponse.setValue(contentRange, forAdditionalHeader: "Content-Range")
                    streamResponse.statusCode = 206 // Partial Content
                } else if statusCode == 200 {
                    streamResponse.statusCode = 200
                } else {
                    streamResponse.statusCode = statusCode
                }
                
                if let acceptRanges = httpResponse.allHeaderFields["Accept-Ranges"] as? String {
                    streamResponse.setValue(acceptRanges, forAdditionalHeader: "Accept-Ranges")
                } else {
                    streamResponse.setValue("bytes", forAdditionalHeader: "Accept-Ranges")
                }
                
                // Set explicit Content-Length so GCDWebServer doesn't use chunked transfer encoding (which breaks MP4 AVPlayer seek)
                streamResponse.contentLength = contentLength
                
                self.addCorsHeaders(streamResponse)
                completion(streamResponse)
            }
            
            task.resume()
        }
        
        // 1. Manifest Handler (Rewrites M3U8)
        webServer.addHandler(forMethod: "GET", path: "/manifest", request: GCDWebServerRequest.self) { [weak self] request in
            guard let self = self else { return GCDWebServerDataResponse(statusCode: 500) }
            
            let query = self.extractQuery(from: request)
            print("📥 [LocalServer] Incoming /manifest request keys: \(query.keys)")
            
            var targetUrlString = query["url"]
            if let url64 = query["url64"], let data = Data(base64Encoded: url64), let str = String(data: data, encoding: .utf8) {
                targetUrlString = str
            }
            
            guard let validUrlString = targetUrlString,
                  let targetUrl = URL(string: validUrlString) else {
                return GCDWebServerDataResponse(statusCode: 400)
            }
            
            // Check Cache
            if let cachedManifest = self.manifestCache[validUrlString] {
                print("♻️ [LocalServer] Serving cached manifest for: \(targetUrl.lastPathComponent)")
                let resp = GCDWebServerDataResponse(text: cachedManifest)
                resp?.contentType = "application/vnd.apple.mpegurl"
                if let r = resp { self.addCorsHeaders(r) }
                return resp
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
                if let r = resp { self.addCorsHeaders(r) }
                return resp
            }
            
            // Fetch original manifest
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseError: Error?
            
            print("📥 [LocalServer] Fetching manifest: \(targetUrl.lastPathComponent)")
            
            var urlRequest = URLRequest(url: targetUrl)
            self.applyHeaders(to: &urlRequest, targetUrl: targetUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: query["cookie"])
            
            let fetchSession = self.session(for: targetUrl)
            let task = fetchSession.dataTask(with: urlRequest) { data, response, error in
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
            
            // Validate: if upstream returned HTML instead of M3U8, it's a Cloudflare/error page
            if !content.contains("#EXTM3U") && !content.contains("#EXT-X-") {
                print("❌ [LocalServer] Upstream returned non-M3U8 content (likely Cloudflare challenge):")
                print("   First 200 chars: \(content.prefix(200))")
                let errorResp = GCDWebServerDataResponse(statusCode: 502)
                return errorResp
            }
            
            // Extract Query Items from original URL to persist them (e.g. headers, host for Vidlink)
            let originalQueryItems = URLComponents(url: targetUrl, resolvingAgainstBaseURL: false)?.queryItems
            
            // Rewrite Manifest
            let rewrittenContent = self.rewriteManifest(content: content, originalUrl: targetUrl, queryItemsToPersist: originalQueryItems, subtitleUrl: subtitleUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
            
            // Cache VOD schemas and Master playlists. Live stream variant playlists continuously update so they are not cached.
            let isVODOrMaster = content.contains("#EXT-X-ENDLIST") || content.contains("#EXT-X-STREAM-INF")
            if isVODOrMaster {
                self.manifestCache[validUrlString] = rewrittenContent
                print("💾 [LocalServer] Cached manifest for: \(targetUrl.lastPathComponent)")
            }
            
            print("📝 [LocalServer] Rewritten Manifest Preview:\n" + rewrittenContent.split(separator: "\n").prefix(5).joined(separator: "\n") + "\n... (truncated)")
            
            let resp = GCDWebServerDataResponse(text: rewrittenContent)
            resp?.contentType = "application/vnd.apple.mpegurl" // Force HLS mime type
            if let r = resp { self.addCorsHeaders(r) }
            return resp
        }
        
        // 2. Proxy Handler (For Segments & Keys)
        webServer.addHandler(forMethod: "GET", path: "/proxy", request: GCDWebServerRequest.self) { [weak self] request in
            guard let self = self else { return GCDWebServerDataResponse(statusCode: 500) }
            let query = self.extractQuery(from: request)
            
            var targetUrlString = query["url"]
            if let url64 = query["url64"], let data = Data(base64Encoded: url64), let str = String(data: data, encoding: .utf8) {
                targetUrlString = str
            }
            
            guard let validUrlString = targetUrlString,
                  let targetUrl = URL(string: validUrlString) else {
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
            print("🚀 [LocalServer] Executing proxy request to: \(targetUrl.absoluteString)")
            self.applyHeaders(to: &urlRequest, targetUrl: targetUrl, referer: referer, origin: origin, userAgent: userAgent, cookie: query["cookie"])
            
            let fetchSession = self.session(for: targetUrl)
            let task = fetchSession.dataTask(with: urlRequest) { data, response, error in
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
                var contentType = responseResponse?.mimeType ?? "application/octet-stream"
                let statusCode = (responseResponse as? HTTPURLResponse)?.statusCode ?? 200
                
                // The upstream server sometimes returns incorrect MIME types (e.g., image/jpg for video segments).
                // Vidlink obscurs filenames with base64, so we decode it to check the real extension.
                let segmentName = targetUrl.lastPathComponent
                var decodedSegmentName = segmentName
                if let decodedData = Data(base64Encoded: segmentName), let decodedString = String(data: decodedData, encoding: .utf8) {
                    decodedSegmentName = decodedString
                }
                
                let ext = targetUrl.pathExtension.lowercased()
                let decodedExt = (decodedSegmentName as NSString).pathExtension.lowercased()
                let checkExt = ext.isEmpty ? decodedExt : ext
                
                let fakeExtensions = ["ts", "jpg", "jpeg", "png", "webp", "ico", "woff", "woff2", "html", "js", "css", "txt"]
                let isVideoSegment = fakeExtensions.contains(checkExt) || 
                                     segmentName.contains("seg-") || 
                                     decodedSegmentName.contains("seg-") || 
                                     data.count > 10000 // Segments are usually large (>10KB), keys are ~16 bytes
                
                if isVideoSegment && (contentType.contains("image/") || contentType.contains("text/") || contentType.contains("application/")) {
                    contentType = "video/mp2t"
                }
                
                print("✅ [LocalServer] Proxy success for \(segmentName) (Status: \(statusCode), \(data.count) bytes, effective: \(contentType))")
                
                // If the response is small and HTML, it might be an error page (e.g. 403 Forbidden, 404)
                if contentType.contains("text/html") && data.count < 2000 {
                    if let stringContent = String(data: data, encoding: .utf8) {
                        print("⚠️ [LocalServer] Suspicious HTML response for segment: \(stringContent)")
                    }
                }
                
                let resp = GCDWebServerDataResponse(data: data, contentType: contentType)
                self.addCorsHeaders(resp)
                return resp
            }
            
            return GCDWebServerDataResponse(statusCode: 404)
        }
        
        // 3. Subtitle Converter Handler (SRT -> WebVTT)
        webServer.addHandler(forMethod: "GET", path: "/subtitles", request: GCDWebServerRequest.self) { [weak self] request in
            guard let self = self else { return GCDWebServerDataResponse(statusCode: 500) }
            
            let query = self.extractQuery(from: request)
            guard let targetUrlString = query["url"],
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
            if let r = resp { self.addCorsHeaders(r) }
            return resp
        }
        
        // 4. DASH Proxy Handler (Rewrites MPD manifests so segments go through /stream with cookies)
        // Solves: VLC's DASH demuxer doesn't propagate http-cookies to segment sub-requests
        webServer.addHandler(forMethod: "GET", path: "/dash-proxy", request: GCDWebServerRequest.self) { [weak self] request in
            guard let self = self else { return GCDWebServerDataResponse(statusCode: 500) }
            
            let query = self.extractQuery(from: request)
            
            var targetUrlString = query["url"]
            if let url64 = query["url64"], let data = Data(base64Encoded: url64), let str = String(data: data, encoding: .utf8) {
                targetUrlString = str
            }
            
            guard let validUrlString = targetUrlString,
                  let targetUrl = URL(string: validUrlString) else {
                return GCDWebServerDataResponse(statusCode: 400)
            }
            
            let cookie = query["cookie"]
            let referer = query["referer"]
            let userAgent = query["user_agent"]
            let defaultUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
            
            print("📦 [LocalServer] DASH Proxy: Fetching MPD from \(targetUrl.lastPathComponent)")
            
            // Fetch the original MPD manifest with auth headers
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseError: Error?
            
            var urlRequest = URLRequest(url: targetUrl)
            urlRequest.setValue(userAgent ?? defaultUA, forHTTPHeaderField: "User-Agent")
            if let r = referer { urlRequest.setValue(r, forHTTPHeaderField: "Referer") }
            if let c = cookie { urlRequest.setValue(c, forHTTPHeaderField: "Cookie") }
            
            let fetchSession = self.session(for: targetUrl)
            let task = fetchSession.dataTask(with: urlRequest) { data, response, error in
                responseData = data
                responseError = error
                semaphore.signal()
            }
            task.resume()
            semaphore.wait()
            
            if let error = responseError {
                print("❌ [LocalServer] DASH Proxy MPD fetch error: \(error)")
                return GCDWebServerDataResponse(statusCode: 502)
            }
            
            guard let data = responseData, var mpdContent = String(data: data, encoding: .utf8) else {
                return GCDWebServerDataResponse(statusCode: 502)
            }
            
            // Rewrite segment URLs in the MPD to go through /stream
            // DASH uses SegmentTemplate with initialization="init-stream$RepresentationID$.m4s" 
            // and media="chunk-stream$RepresentationID$-$Number%05d$.m4s"
            // We need to rewrite these relative URLs to absolute /stream URLs
            
            let baseUrl = targetUrl.deletingLastPathComponent().absoluteString
            let serverHost = self.webServer.serverURL?.host ?? "127.0.0.1"
            let serverPort = Int(self.webServer.port)
            
            // Build query params for /stream
            var streamParams = [String]()
            // We'll use a placeholder BASE_URL that we'll prepend to each segment path
            if let c = cookie { streamParams.append("cookie=\(c.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? c)") }
            if let r = referer { streamParams.append("referer=\(r.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? r)") }
            if let ua = userAgent { streamParams.append("user_agent=\(ua.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ua)") }
            let extraParams = streamParams.joined(separator: "&")
            
            // Insert a <BaseURL> pointing to our /stream proxy
            // This makes all relative URLs in the MPD resolve through our proxy
            // We encode the base URL in url64 format inside a special BaseURL
            
            // Instead of BaseURL (which doesn't work with query params), we rewrite the SegmentTemplate attributes
            // Replace initialization="X" with initialization="http://localhost:8080/stream?url64=BASE64(baseUrl+X)&cookie=..."
            // Replace media="X" with media="http://localhost:8080/stream?url64=BASE64(baseUrl+X)&cookie=..."
            
            // Helper to build proxied URL for a segment path pattern
            func proxySegmentUrl(_ segmentPath: String) -> String {
                // The segment path may contain DASH template vars like $RepresentationID$ and $Number%05d$
                // We need to preserve these, so we encode the base URL + path pattern
                let fullPath = baseUrl + segmentPath
                if let encoded = fullPath.data(using: .utf8)?.base64EncodedString() {
                    return "http://\(serverHost):\(serverPort)/stream?url64=\(encoded)\(extraParams.isEmpty ? "" : "&\(extraParams)")"
                }
                return segmentPath
            }
            
            // Rewrite initialization="..." attributes
            if let regex = try? NSRegularExpression(pattern: #"initialization="([^"]+)""#, options: []) {
                let range = NSRange(mpdContent.startIndex..., in: mpdContent)
                let matches = regex.matches(in: mpdContent, options: [], range: range)
                // Process in reverse to preserve ranges
                for match in matches.reversed() {
                    if let pathRange = Range(match.range(at: 1), in: mpdContent) {
                        let originalPath = String(mpdContent[pathRange])
                        // For templates with $vars$, we can't pre-encode them
                        // Instead, we'll use a different approach: add a BaseURL
                    }
                }
            }
            
            // SIMPLER APPROACH: Add a <BaseURL> element that points to our /stream proxy
            // But BaseURL doesn't support query params in standard DASH...
            // BEST APPROACH: Serve segments via a new /dash-segment endpoint that resolves the template
            
            // ACTUALLY THE SIMPLEST: Just add <BaseURL> with the original base + use /proxy endpoint
            // that forwards Cookie. BUT /proxy loads entire file into RAM...
            
            // REAL SOLUTION: Instead of rewriting the MPD, serve segments via a dedicated path
            // that automatically adds the cookie. Add a catch-all route under /dash-seg/
            
            // For now, let's try the BaseURL approach (simplest, and segments are small ~200KB):
            // We DON'T need /stream for small segments. /proxy works fine for 200KB chunks.
            
            // Actually wait - the SIMPLEST approach that definitely works:
            // Just inject <BaseURL> with the original CDN base URL
            // And pass cookie via VLC http-cookies (which DOES work for the MPD URL itself)
            // The issue is that BaseURL makes segment URLs absolute, but VLC still won't pass cookies
            
            // OK, definitive approach: Add a pattern-based route /dash-seg/* 
            // that proxies any segment request with the stored cookie
            
            // For THIS MPD, we know the structure. Let's just do it properly:
            // Replace the SegmentTemplate initialization/media to point to /proxy with url64
            
            // The DASH template variables ($RepresentationID$, $Number%05d$) must stay in the URL
            // because VLC resolves them at playback time. We can't pre-encode these.
            // So we need a route like /dash-seg/<path> that proxies to baseUrl/<path> with cookie.
            
            print("📦 [LocalServer] DASH Proxy: Injecting BaseURL into MPD")
            
            // Create a local base URL that maps to the CDN + cookie
            // Store the mapping for the dash-seg handler
            let mappingId = UUID().uuidString.prefix(8)
            let encodedBase = baseUrl.data(using: .utf8)?.base64EncodedString() ?? ""
            let dashSegBase = "http://\(serverHost):\(serverPort)/proxy?url64_prefix=\(encodedBase)&\(extraParams)&seg="
            
            // Actually, the cleanest way: rewrite the MPD to use absolute URLs through /proxy
            // For DASH templates, we need to keep the template variables.
            // VLC will resolve $RepresentationID$ etc. BEFORE making the HTTP request.
            // So we can put them in the URL as-is — they'll be resolved first, then the HTTP call happens.
            
            // Approach: wrap each segment template path through our proxy
            // initialization="init-stream$RepresentationID$.m4s" 
            // → initialization="http://host:port/proxy?url=BASE_URL/init-stream$RepresentationID$.m4s&cookie=..."
            // VLC resolves the $vars$ first, then makes the HTTP call to our proxy. Our proxy fetches with Cookie.
            
            // But URL encoding of $vars$ might break... Let's just use BaseURL instead.
            // <BaseURL>http://host:port/proxy?url=BASE_URL_ENCODED/</BaseURL>
            // No, that doesn't work because BaseURL is prepended to relative segment paths,
            // resulting in something like "http://host:port/proxy?url=BASE/init-stream0.m4s"
            // which our /proxy handler wouldn't parse correctly.
            
            // CLEANEST SOLUTION: A catch-all /dash/* route
            // <BaseURL>http://host:port/dash/SESSION_ID/</BaseURL>
            // Then /dash/SESSION_ID/init-stream0.m4s → proxy to CDN_BASE/init-stream0.m4s with cookie
            
            // Store session info
            self.dashSessions[String(mappingId)] = DashSession(baseUrl: baseUrl, cookie: cookie, referer: referer, userAgent: userAgent)
            
            // Inject BaseURL into MPD (after <Period ...> tag)
            let localBaseUrl = "http://\(serverHost):\(serverPort)/dash/\(mappingId)/"
            
            if let periodRange = mpdContent.range(of: "<Period", options: .caseInsensitive) {
                // Find the closing > of the <Period ...> tag
                if let closeRange = mpdContent.range(of: ">", options: [], range: periodRange.upperBound..<mpdContent.endIndex) {
                    let insertPoint = mpdContent.index(after: closeRange.lowerBound)
                    mpdContent.insert(contentsOf: "\n\t\t<BaseURL>\(localBaseUrl)</BaseURL>", at: insertPoint)
                }
            }
            
            print("📦 [LocalServer] DASH Proxy: Rewritten MPD with BaseURL → \(localBaseUrl)")
            print("📦 [LocalServer] DASH Proxy: Session \(mappingId) → \(baseUrl)")
            
            let resp = GCDWebServerDataResponse(text: mpdContent)
            resp?.contentType = "application/dash+xml"
            if let r = resp { self.addCorsHeaders(r) }
            return resp
        }
        
        // 5. DASH Segment Proxy (catch-all for /dash/SESSION_ID/segment.m4s)
        webServer.addHandler(forMethod: "GET", pathRegex: "/dash/.*", request: GCDWebServerRequest.self) { [weak self] request in
            guard let self = self else { return GCDWebServerDataResponse(statusCode: 500) }
            
            let path = request.path // e.g. /dash/ABC123/init-stream0.m4s
            let components = path.split(separator: "/") // ["dash", "ABC123", "init-stream0.m4s"]
            
            guard components.count >= 3,
                  let dashSession = self.dashSessions[String(components[1])] else {
                print("❌ [LocalServer] DASH Segment: Invalid session for path \(path)")
                return GCDWebServerDataResponse(statusCode: 404)
            }
            
            // Reconstruct segment path (everything after /dash/SESSION_ID/)
            let segmentPath = components[2...].joined(separator: "/")
            let segmentUrl = dashSession.baseUrl + segmentPath
            
            guard let targetUrl = URL(string: segmentUrl) else {
                return GCDWebServerDataResponse(statusCode: 400)
            }
            
            // Fetch segment with cookie
            let semaphore = DispatchSemaphore(value: 0)
            var responseData: Data?
            var responseError: Error?
            
            var urlRequest = URLRequest(url: targetUrl)
            let defaultUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
            urlRequest.setValue(dashSession.userAgent ?? defaultUA, forHTTPHeaderField: "User-Agent")
            if let r = dashSession.referer { urlRequest.setValue(r, forHTTPHeaderField: "Referer") }
            if let c = dashSession.cookie { urlRequest.setValue(c, forHTTPHeaderField: "Cookie") }
            
            let fetchSession = self.session(for: targetUrl)
            let task = fetchSession.dataTask(with: urlRequest) { data, response, error in
                responseData = data
                responseError = error
                semaphore.signal()
            }
            task.resume()
            semaphore.wait()
            
            if let error = responseError {
                print("❌ [LocalServer] DASH Segment error: \(error)")
                return GCDWebServerDataResponse(statusCode: 502)
            }
            
            if let data = responseData {
                let contentType = "video/mp4" // m4s segments
                let resp = GCDWebServerDataResponse(data: data, contentType: contentType)
                self.addCorsHeaders(resp)
                return resp
            }
            
            return GCDWebServerDataResponse(statusCode: 404)
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
    
    private func rewriteManifest(content: String, originalUrl: URL, queryItemsToPersist: [URLQueryItem]?, subtitleUrl: URL?, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
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
                // e.g. #EXT-X-KEY:METHOD=AES-128,URI="..." or #EXT-X-I-FRAME-STREAM-INF:URI="..."
                if line.hasPrefix("#EXT-X-KEY") || line.hasPrefix("#EXT-X-MAP") || line.hasPrefix("#EXT-X-I-FRAME-STREAM-INF") {
                    newLines.append(rewriteLine(line, baseUrl: baseUrl, queryItemsToPersist: queryItemsToPersist, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie))
                } else {
                    newLines.append(line)
                }
            } else if !line.isEmpty {
                // This is a URL (Segment or Playlist)
                let rewritten = rewriteUrl(line, baseUrl: baseUrl, queryItemsToPersist: queryItemsToPersist, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
                newLines.append(rewritten)
            } else {
                newLines.append(line)
            }
        }
        
        return newLines.joined(separator: "\n")
    }
    
    private func rewriteLine(_ line: String, baseUrl: URL, queryItemsToPersist: [URLQueryItem]?, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
        // Simple regex or string manipulation to find URI="..."
        guard let range = line.range(of: "URI=\"") else { return line }
        
        let prefix = line[..<range.upperBound]
        let remainder = line[range.upperBound...]
        
        guard let endQuote = remainder.firstIndex(of: "\"") else { return line }
        
        let uri = String(remainder[..<endQuote])
        let suffix = remainder[remainder.index(after: endQuote)...]
        
        let rewrittenUri = rewriteUrl(uri, baseUrl: baseUrl, queryItemsToPersist: queryItemsToPersist, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
        
        return String(prefix) + rewrittenUri + "\"" + String(suffix)
    }
    
    private func rewriteUrl(_ original: String, baseUrl: URL, queryItemsToPersist: [URLQueryItem]?, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
        // Resolve relative URL
        guard var resolved = URL(string: original, relativeTo: baseUrl) else { return original }
        
        // PERSIST QUERY PARAMETERS (Important for Vidlink extraction proxies)
        // If the original URL was relative, resolved.absoluteString will lose the query params from baseUrl.
        // We re-attach them if they were present in the targetUrl (manifest URL).
        if let items = queryItemsToPersist, !items.isEmpty {
            if var comps = URLComponents(url: resolved, resolvingAgainstBaseURL: true) {
                var currentItems = comps.queryItems ?? []
                // Add items from base URL if they are missing in the resolved URL
                for item in items {
                    if !currentItems.contains(where: { $0.name == item.name }) {
                        currentItems.append(item)
                    }
                }
                comps.queryItems = currentItems
                if let newUrl = comps.url {
                    resolved = newUrl
                }
            }
        }
        
        // Construct Proxy URL
        let isPlaylist = resolved.pathExtension.lowercased() == "m3u8" || resolved.absoluteString.lowercased().contains(".m3u8")
        // Use /proxy for segments (buffers into RAM, better for Chromecast), /stream for big MP4 files
        // Manifest rewriting is only used for HLS, where everything except the playlist is small segments or keys
        let endpoint = isPlaylist ? "/manifest" : "/proxy"
        
        var components = URLComponents()
        components.scheme = "http"
        components.host = self.webServer.serverURL?.host // Use actual IP
        components.port = Int(self.webServer.port)
        components.path = endpoint
        
        var queryItems = [URLQueryItem]()
        
        if let urlData = resolved.absoluteString.data(using: .utf8) {
            queryItems.append(URLQueryItem(name: "url64", value: urlData.base64EncodedString()))
        } else {
            queryItems.append(URLQueryItem(name: "url", value: resolved.absoluteString))
        }
        
        if let referer = referer {
             queryItems.append(URLQueryItem(name: "referer", value: referer))
        }
        if let origin = origin {
             queryItems.append(URLQueryItem(name: "origin", value: origin))
        }
        if let ua = userAgent, !ua.isEmpty {
            queryItems.append(URLQueryItem(name: "user_agent", value: ua))
        }
        if let c = cookie {
            queryItems.append(URLQueryItem(name: "cookie", value: c))
        }
        
        components.queryItems = queryItems
        
        return components.url?.absoluteString ?? resolved.absoluteString
    }
    
    private func generateVirtualPlaylist(targetUrl: URL, subtitleUrl: URL?, referer: String?, origin: String?, userAgent: String?, cookie: String?) -> String {
        // Construct Proxy URL for the segment
        // We use /proxy endpoint to serve the MP4 content with headers
        let segmentProxyUrl = rewriteUrl(targetUrl.absoluteString, baseUrl: targetUrl, queryItemsToPersist: nil, referer: referer, origin: origin, userAgent: userAgent, cookie: cookie)
        
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
    
    private func addCorsHeaders(_ response: GCDWebServerResponse) {
        response.setValue("*", forAdditionalHeader: "Access-Control-Allow-Origin")
        response.setValue("GET, HEAD, OPTIONS", forAdditionalHeader: "Access-Control-Allow-Methods")
        response.setValue("Range, Content-Type, Origin, Accept", forAdditionalHeader: "Access-Control-Allow-Headers")
    }
}

// Standalone delegate that accepts untrusted TLS certificates (used by insecureSession)
class TLSBypassDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let trust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}

// Helper class for URLSession streaming
class StreamingSessionDelegate: NSObject, URLSessionDataDelegate {
    var onResponse: ((URLResponse) -> Void)?
    var buffer: Data = Data()
    var readCallback: ((Data?, Error?) -> Void)?
    var isFinished = false
    var error: Error?
    let queue = DispatchQueue(label: "com.anisflix.streaming")
    var bypassTLS = false
    
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if bypassTLS,
           challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let trust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
    
    func readNextChunk(completion: @escaping (Data?, Error?) -> Void) {
        queue.async {
            if self.buffer.count > 0 {
                let bytesToRead = min(self.buffer.count, 64 * 1024)
                let chunk = self.buffer.prefix(bytesToRead)
                self.buffer.removeFirst(bytesToRead)
                completion(chunk, nil)
            } else if self.isFinished {
                completion(self.error != nil ? nil : Data(), self.error)
            } else {
                self.readCallback = completion
            }
        }
    }
    
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        onResponse?(response)
        completionHandler(.allow)
    }
    
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        queue.async {
            self.buffer.append(data)
            if let callback = self.readCallback {
                self.readCallback = nil
                self.readNextChunk(completion: callback)
            }
        }
    }
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        queue.async {
            self.isFinished = true
            self.error = error
            if let callback = self.readCallback {
                self.readCallback = nil
                self.readNextChunk(completion: callback)
            }
        }
    }
}

// DASH Proxy Session Info
struct DashSession {
    let baseUrl: String
    let cookie: String?
    let referer: String?
    let userAgent: String?
}
