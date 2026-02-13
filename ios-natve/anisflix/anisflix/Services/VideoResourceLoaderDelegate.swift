//
//  VideoResourceLoaderDelegate.swift
//  anisflix
//
//  Created by AI Assistant on 08/12/2025.
//

import Foundation
import AVFoundation

class VideoResourceLoaderDelegate: NSObject, AVAssetResourceLoaderDelegate {
    private let session: URLSession
    private var activeTasks: [Int: URLSessionDataTask] = [:]
    private let subtitleUrl: URL?
    
    // Store the original base URL (directory containing master.m3u8) for Vidzy
    // This is needed because AVPlayer corrupts relative paths through its URL resolution
    private static var originalVidzyBaseURL: String?
    
    /// Call this to reset the stored base URL when starting a new video
    static func resetVidzyBaseURL() {
        originalVidzyBaseURL = nil
    }
    
    init(subtitleUrl: URL? = nil) {
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.session = URLSession(configuration: config)
        self.subtitleUrl = subtitleUrl
        super.init()
    }
    
    func resourceLoader(_ resourceLoader: AVAssetResourceLoader, shouldWaitForLoadingOfRequestedResource loadingRequest: AVAssetResourceLoadingRequest) -> Bool {
        guard let url = loadingRequest.request.url else { return false }
        
        // Determine the provider type
        let isVidMoly = url.scheme == "vidmoly-custom"
        let isVidzy = url.scheme == "vidzy-custom"
        let isAirPlaySubs = url.scheme == "airplay-subs"
        let isAirPlayMp4Wrapper = url.scheme == "airplay-mp4-wrapper"
        let providerName = isVidMoly ? "VidMoly" : (isVidzy ? "Vidzy" : (isAirPlaySubs || isAirPlayMp4Wrapper ? "AirPlaySubs" : "Unknown"))
        
        // Convert custom scheme back to https
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        components?.scheme = "https"
        
        guard let realUrl = components?.url else { return false }
        
        var cleanUrl = realUrl // Default to realUrl (HTTPS)
        
        // [NEW] Handle Virtual HLS Wrapper for Direct MP4 Files
        if isAirPlayMp4Wrapper {
            // Check if this is a playlist request (ends in .m3u8 or has query param)
            let isWrapperRequest = url.pathExtension == "m3u8" || url.absoluteString.contains(".m3u8")
            
            if isWrapperRequest {
                // If it's the Variant Playlist request (we name it variant.m3u8 in the Master)
                if url.lastPathComponent == "variant.m3u8" {
                     // 2. VARIANT PLAYLIST
                     var target = "video.mp4"
                     if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                        let items = components.queryItems,
                        let targetItem = items.first(where: { $0.name == "target" })?.value {
                         target = targetItem
                     }
                     
                     print("📝 [ResourceLoader] Generating Virtual Variant Playlist for target: \(target)")
                     
                     let variantPlaylist = """
                     #EXTM3U
                     #EXT-X-VERSION:3
                     #EXT-X-TARGETDURATION:10800
                     #EXT-X-MEDIA-SEQUENCE:0
                     #EXTINF:10800.0,
                     \(target)
                     #EXT-X-ENDLIST
                     """
                     
                     if let data = variantPlaylist.data(using: .utf8) {
                         let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
                             "Content-Type": "application/vnd.apple.mpegurl",
                             "Content-Length": "\(data.count)"
                         ])
                         loadingRequest.contentInformationRequest?.contentType = "com.apple.m3u-playlist"
                         loadingRequest.contentInformationRequest?.isByteRangeAccessSupported = true
                         loadingRequest.contentInformationRequest?.contentLength = Int64(data.count)
                         loadingRequest.response = response
                         loadingRequest.dataRequest?.respond(with: data)
                         loadingRequest.finishLoading()
                         return true
                     }
                } else {
                    // 1. MASTER PLAYLIST (default for initial .m3u8 request)
                    print("📝 [ResourceLoader] Generating Virtual Master Playlist")
                    
                    let groupId = "subs"
                    let subName = "External Subtitles"
                    let subUri = self.subtitleUrl?.absoluteString ?? ""
                    
                    let targetFile = realUrl.lastPathComponent.replacingOccurrences(of: ".m3u8", with: "")
                    
                    var masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n"
                    
                    // Inject Subtitles
                    if let _ = self.subtitleUrl {
                        masterPlaylist += "#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"\(groupId)\",NAME=\"\(subName)\",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE=\"en\",URI=\"\(subUri)\"\n"
                    }
                    
                    // Point to Virtual Variant Playlist
                    let subtitlesAttr = (self.subtitleUrl != nil) ? ",SUBTITLES=\"\(groupId)\"" : ""
                    masterPlaylist += "#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080\(subtitlesAttr)\n"
                    masterPlaylist += "variant.m3u8?target=\(targetFile)\n"
                    
                    if let data = masterPlaylist.data(using: .utf8) {
                        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
                            "Content-Type": "application/vnd.apple.mpegurl",
                            "Content-Length": "\(data.count)"
                        ])
                        loadingRequest.contentInformationRequest?.contentType = "com.apple.m3u-playlist"
                        loadingRequest.contentInformationRequest?.isByteRangeAccessSupported = true
                        loadingRequest.contentInformationRequest?.contentLength = Int64(data.count)
                        loadingRequest.response = response
                        loadingRequest.dataRequest?.respond(with: data)
                        loadingRequest.finishLoading()
                        return true
                    }
                }
            }
            // If not a playlist request, fall through to standard loading
        }
        
        // ... existing valid logic handles the rest

        let urlString = realUrl.absoluteString
        
        // Check if URL contains "&virtual=" or "?virtual="
        if let virtualRange = urlString.range(of: "&virtual=") ?? urlString.range(of: "?virtual=") {
            // Get the base URL (before virtual param)
            let baseString = String(urlString[..<virtualRange.lowerBound])
            
            // Get the virtual value (after "virtual=")
            let afterVirtual = String(urlString[virtualRange.upperBound...])
            
            // CRITICAL FIX: The virtual parameter can become chained as AVPlayer navigates:
            // .m3u8 -> .m3u8/index-v1-a1.m3u8 -> .m3u8/index-v1-a1.m3u8/seg-1-v1-a1.ts
            // We need to extract the LAST actual file (the one being requested now).
            
            // Find all media file paths in the chained value
            // Look for the LAST occurrence of a known media file pattern
            var virtualPath = ""
            
            // Split by common delimiters that appear in the chained path
            let segments = afterVirtual.components(separatedBy: CharacterSet(charactersIn: "?/")).filter { !$0.isEmpty }
            
            // Find the last segment that looks like a media file
            for segment in segments.reversed() {
                if segment.hasSuffix(".ts") || segment.hasSuffix(".m3u8") || segment.hasSuffix(".mp4") || segment.hasSuffix(".aac") || segment.hasSuffix(".vtt") {
                    virtualPath = segment
                    break
                }
            }
            
            // If no media file found, try the old logic (first path before ?)
            if virtualPath.isEmpty {
                virtualPath = afterVirtual
                if let queryStart = afterVirtual.range(of: "?") {
                    virtualPath = String(afterVirtual[..<queryStart.lowerBound])
                }
                virtualPath = virtualPath.removingPercentEncoding ?? virtualPath
                
                // Strip leading ".m3u8/" artifact
                if virtualPath.hasPrefix(".m3u8/") {
                    virtualPath = String(virtualPath.dropFirst(".m3u8/".count))
                }
            }
            
            print("   - Extracted file from virtual: \(virtualPath)")
            
            // STRATEGY: Use stored base URL for Vidzy to avoid AVPlayer path corruption
            // On first request (master.m3u8), store the base directory
            // On subsequent requests, use stored base + extracted filename
            
            if isVidzy {
                // Check if this is the first request (master.m3u8)
                if virtualPath == ".m3u8" || virtualPath.isEmpty {
                    // First request - store the base URL (directory containing master.m3u8)
                    if var components = URLComponents(string: baseString) {
                        // Remove the filename from path, keep directory
                        let path = components.path
                        if let lastSlash = path.lastIndex(of: "/") {
                            components.path = String(path[...lastSlash])
                        }
                        // Store without query params (we'll add the correct ones each time)
                        VideoResourceLoaderDelegate.originalVidzyBaseURL = "\(components.scheme ?? "https")://\(components.host ?? "")\(components.path)"
                        print("   - Stored Vidzy base URL: \(VideoResourceLoaderDelegate.originalVidzyBaseURL ?? "nil")")
                    }
                    // Use baseString directly for this request (it's already correct for master.m3u8)
                    if let url = URL(string: baseString) {
                        cleanUrl = url
                    }
                } else if let storedBase = VideoResourceLoaderDelegate.originalVidzyBaseURL {
                    // Subsequent request - use stored base + extracted filename
                    // Extract query params from baseString to preserve the token
                    var queryString = ""
                    if let qRange = baseString.range(of: "?") {
                        // Get only the first set of query params (before virtual)
                        let afterQ = String(baseString[qRange.upperBound...])
                        if let virtualIdx = afterQ.range(of: "&virtual=") {
                            queryString = "?" + String(afterQ[..<virtualIdx.lowerBound])
                        } else {
                            queryString = "?" + afterQ
                        }
                    }
                    
                    let reconstructedUrl = storedBase + virtualPath + queryString
                    print("   - Reconstructed URL: \(reconstructedUrl)")
                    if let url = URL(string: reconstructedUrl) {
                        cleanUrl = url
                    }
                } else {
                    // Fallback: no stored base, use old logic
                    if let url = URL(string: baseString) {
                        cleanUrl = url
                    }
                }
            } else {
                // Non-Vidzy: use original logic
                var baseComponents = URLComponents(string: baseString)
                let isBaseM3u8 = baseComponents?.path.hasSuffix(".m3u8") == true
                let isRedundantSuffix = (virtualPath == ".m3u8" || virtualPath == "/.m3u8") && isBaseM3u8
                
                if !virtualPath.isEmpty && !isRedundantSuffix && (virtualPath.hasPrefix(".") || virtualPath.hasPrefix("/") || virtualPath.contains(".m3u8") || virtualPath.contains(".ts")) {
                    if baseComponents != nil {
                        var currentPath = baseComponents!.path
                        if currentPath.hasSuffix("/") && virtualPath.hasPrefix("/") {
                            virtualPath = String(virtualPath.dropFirst())
                        } else if !currentPath.hasSuffix("/") && !virtualPath.hasPrefix("/") && !virtualPath.hasPrefix(".") {
                            currentPath += "/"
                        }
                        baseComponents!.path = currentPath + virtualPath
                        
                        if let newUrl = baseComponents!.url {
                            cleanUrl = newUrl
                            print("   - Virtual path appended: \(virtualPath)")
                        }
                    }
                } else {
                    if let url = URL(string: baseString) {
                        cleanUrl = url
                    }
                }
            }
        }
        
        print("🔄 [\(providerName)Loader] Intercepting request: \(realUrl)")
        print("   - Cleaned URL for network: \(cleanUrl)")
        
        // request.allHTTPHeaderFields = loadingRequest.request.allHTTPHeaderFields // Avoid copying all headers blindly
        
        var request = URLRequest(url: cleanUrl)
        
        // Check if it is a playlist (m3u8)
        // Sending Range headers for m3u8 playlists often causes HTTP 400/416 errors
        let isPlaylist = cleanUrl.pathExtension.lowercased() == "m3u8" || cleanUrl.absoluteString.contains(".m3u8")
        
        let dataRequest = loadingRequest.dataRequest
        if let dataRequest = dataRequest, !isPlaylist { // Only send Range for non-playlist files (segments)
            if dataRequest.requestedLength > 0 {
                let lower = dataRequest.requestedOffset
                let upper = lower + Int64(dataRequest.requestedLength) - 1
                let rangeHeader = "bytes=\(lower)-\(upper)"
                request.setValue(rangeHeader, forHTTPHeaderField: "Range")
                print("   - Requesting Range: \(rangeHeader)")
            }
        }
        
        // Ensure we send a browser-like User-Agent to avoid blocking
        // Match DownloadManager: "Mozilla/5.0 (iPhone...)"
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15", forHTTPHeaderField: "User-Agent")
        request.setValue("*/*", forHTTPHeaderField: "Accept")
        
        // Add Referer header matching DownloadManager (which works)
        if isVidzy {
            request.setValue("https://vidzy.org/", forHTTPHeaderField: "Referer")
            // request.setValue("https://vidzy.org", forHTTPHeaderField: "Origin") // Optional, mostly Referer matters
        }
        
        let task = session.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ [\(providerName)Loader] Error: \(error.localizedDescription) for \(realUrl.lastPathComponent)")
                loadingRequest.finishLoading(with: error)
                return
            }
            
            if let response = response as? HTTPURLResponse, let data = data {
                print("📥 [\(providerName)Loader] Received response: \(response.statusCode) for \(realUrl.lastPathComponent)")
                print("   - Data size: \(data.count) bytes")
                
                // CRITICAL DEBUG: Print error body
                if response.statusCode >= 400, let bodyString = String(data: data, encoding: .utf8) {
                    print("❌ [\(providerName)Loader] Error Body: \(bodyString)")
                }
                
                // Sanitize headers
                var headers = response.allHeaderFields as? [String: String] ?? [:]
                
                // Log problematic headers if present
                if let enc = headers["Content-Encoding"] ?? headers["content-encoding"] {
                    print("   ⚠️ [VidMolyLoader] Found Content-Encoding: \(enc) - Removing it")
                }
                
                headers.removeValue(forKey: "Content-Encoding")
                headers.removeValue(forKey: "Content-Length")
                headers.removeValue(forKey: "content-encoding")
                headers.removeValue(forKey: "content-length")
                
                var finalData = data
                let statusCode = response.statusCode
                
                let responseContentType = headers["Content-Type"] ?? headers["content-type"] ?? ""

                if responseContentType.contains("mpegurl") || responseContentType.contains("m3u8") || realUrl.absoluteString.contains(".m3u8") {
                    if var playlistContent = String(data: data, encoding: .utf8) {
                        // 1. Remove EXT-X-I-FRAME-STREAM-INF lines to prevent parsing errors
                        var lines = playlistContent.components(separatedBy: .newlines)
                        lines = lines.filter { !($0.contains("EXT-X-I-FRAME-STREAM-INF")) }
                        playlistContent = lines.joined(separator: "\n")
                        
                        // 2. VidMoly: Clean up playlist for AVPlayer
                        // Proxy already returns absolute HTTPS URLs - no modification needed
                        
                        // Remove HDR VIDEO-RANGE tags that might confuse the player or simulator
                        playlistContent = playlistContent.replacingOccurrences(of: ",VIDEO-RANGE=PQ", with: "")
                        playlistContent = playlistContent.replacingOccurrences(of: ",VIDEO-RANGE=SDR", with: "")
                        
                        // DO NOT rewrite URLs in VidMoly playlists
                        // The proxy already returns URLs as https://anisflix.vercel.app/api/vidmoly?url=...
                        // which AVPlayer can load normally. ResourceLoader only needs to intercept
                        // the initial master.m3u8 request (which uses vidmoly-custom:// scheme)
                        
                        // Vidzy Specific Logic
                        // Convert relative URLs to Absolute HTTPS, then rewrite ONLY .m3u8 to custom scheme
                        if realUrl.absoluteString.lowercased().contains("vidzy") {
                            // Use stored base URL (set from master.m3u8 request) instead of corrupted realUrl
                            let baseUrl = VideoResourceLoaderDelegate.originalVidzyBaseURL ?? cleanUrl.deletingLastPathComponent().absoluteString
                            var vidzyLines = [String]()
                            
                            playlistContent.enumerateLines { line, _ in
                                if line.trimmingCharacters(in: .whitespaces).isEmpty || line.hasPrefix("#") {
                                    vidzyLines.append(line)
                                    return
                                }
                                
                                // It's a URL path
                                var absoluteUrl = line
                                if !line.lowercased().hasPrefix("http") {
                                    // Handle logic for relative path
                                    if line.hasPrefix("/") {
                                        // Root relative - complex to guess root from simple baseUrl, 
                                        // but usually HLS is relative to current folder.
                                        // Let's assume standard relative for now.
                                        // Actually, fetching root domain from realUrl is safer if starts with /
                                        if let scheme = realUrl.scheme, let host = realUrl.host {
                                             absoluteUrl = "\(scheme)://\(host)\(line)"
                                        } else {
                                             absoluteUrl = baseUrl + line
                                        }
                                    } else {
                                        absoluteUrl = baseUrl + "/" + line
                                    }
                                }
                                
                                // Rewrite scheme ONLY for playlists
                                if absoluteUrl.contains(".m3u8") {
                                    let rewritten = absoluteUrl.replacingOccurrences(of: "https://", with: "vidzy-custom://")
                                                               .replacingOccurrences(of: "http://", with: "vidzy-custom://")
                                    vidzyLines.append(rewritten)
                                } else {
                                    // Segments go direct HTTPS
                                    vidzyLines.append(absoluteUrl)
                                }
                            }
                            playlistContent = vidzyLines.joined(separator: "\n")
                        }
                        
                        // 3. Inject AirPlay Subtitles if URL is present and it is a Master Playlist
                        if let subUrl = self.subtitleUrl, playlistContent.contains("#EXT-X-STREAM-INF") {
                            print("📝 [ResourceLoader] Injecting AirPlay Subtitles: \(subUrl.lastPathComponent)")
                            
                            // Define the subtitle Group ID
                            let groupId = "subs"
                            let subName = "External Subtitles"
                            
                            // Create the Subtitle Media Tag
                            // IMPORTANT: TYPE=SUBTITLES, GROUP-ID="subs", NAME="Custom", DEFAULT=YES, AUTOSELECT=YES, URI="..."
                            let mediaTag = "#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"\(groupId)\",NAME=\"\(subName)\",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE=\"en\",URI=\"\(subUrl.absoluteString)\""
                            
                            // Insert Media Tag after #EXTM3U
                            if let m3uIndex = playlistContent.range(of: "#EXTM3U")?.upperBound {
                                playlistContent.insert(contentsOf: "\n" + mediaTag, at: m3uIndex)
                            } else {
                                playlistContent = mediaTag + "\n" + playlistContent
                            }
                            
                            // Add SUBTITLES="subs" to all EXT-X-STREAM-INF tags
                            var modifiedLines = [String]()
                            playlistContent.enumerateLines { line, _ in
                                if line.contains("#EXT-X-STREAM-INF") && !line.contains("SUBTITLES=") {
                                    modifiedLines.append("\(line),SUBTITLES=\"\(groupId)\"")
                                } else {
                                    modifiedLines.append(line)
                                }
                            }
                            playlistContent = modifiedLines.joined(separator: "\n")
                        }
                        
                        if let modifiedData = playlistContent.data(using: .utf8) {
                            finalData = modifiedData
                            headers["Content-Length"] = "\(modifiedData.count)"
                            print("   ✅ [ResourceLoader] Playlist processed: URLs rewritten, I-Frames removed & Subtitles injected")
                        }
                    }
                }
                
                // Ensure headers are consistent for the rewritten content
                if finalData.count != data.count {
                    headers["Content-Length"] = "\(finalData.count)"
                }
                
                // Determine UTI and Content-Type logic EARLY to fix headers
                var uti = "public.data"
                var finalMimeType = headers["Content-Type"] ?? headers["content-type"] ?? "application/octet-stream"
                
                // 1. Try to guess from CLEANED URL extension first (most reliable)
                // CRITICAL: Use cleanUrl, NOT realUrl! realUrl contains ".m3u8" in virtual param for ALL files
                let cleanUrlString = cleanUrl.absoluteString
                let cleanPathExt = cleanUrl.pathExtension.lowercased()
                
                if cleanPathExt == "ts" || cleanUrlString.hasSuffix(".ts") || (cleanUrlString.contains(".ts?") && !cleanUrlString.contains(".m3u8?")) {
                    uti = "public.mpeg-2-transport-stream"
                    finalMimeType = "video/mp2t"
                } else if cleanPathExt == "m3u8" || cleanUrlString.contains(".m3u8") {
                    uti = "com.apple.m3u-playlist"
                    finalMimeType = "application/vnd.apple.mpegurl"
                }
                
                // 2. If ambiguous, check server Content-Type
                if uti == "public.data" {
                     if let serverMime = headers["Content-Type"] ?? headers["content-type"] {
                         if serverMime.contains("m3u8") || serverMime.contains("mpegurl") {
                             uti = "com.apple.m3u-playlist"
                             finalMimeType = "application/vnd.apple.mpegurl"
                         } else if serverMime.contains("video/mp2t") {
                             uti = "public.mpeg-2-transport-stream"
                             finalMimeType = "video/mp2t"
                         }
                     }
                }
                
                // 3. Fallback: Query param check
                if uti == "public.data" {
                    if let components = URLComponents(url: realUrl, resolvingAgainstBaseURL: false),
                       let queryItems = components.queryItems,
                       let targetUrl = queryItems.first(where: { $0.name == "url" })?.value {
                        if targetUrl.contains(".m3u8") {
                            uti = "com.apple.m3u-playlist"
                            finalMimeType = "application/vnd.apple.mpegurl"
                        } else if targetUrl.contains(".ts") {
                            uti = "public.mpeg-2-transport-stream"
                            finalMimeType = "video/mp2t"
                        }
                    }
                }

                // FORCE the correct Content-Type in headers
                headers["Content-Type"] = finalMimeType

                if let sanitizedResponse = HTTPURLResponse(url: loadingRequest.request.url ?? realUrl,
                                                         statusCode: statusCode,
                                                         httpVersion: "HTTP/1.1",
                                                         headerFields: headers) {
                    
                    // Explicitly set the ContentInformationRequest if available
                    if let contentInfoRequest = loadingRequest.contentInformationRequest {
                        contentInfoRequest.isByteRangeAccessSupported = true
                        contentInfoRequest.contentLength = Int64(finalData.count)
                        contentInfoRequest.contentType = uti
                        print("   ℹ️ [VidMolyLoader] set Content-Type: \(finalMimeType) / UTI: \(uti)")
                    }

                    loadingRequest.response = sanitizedResponse
                    
                    if let dataRequest = loadingRequest.dataRequest {
                        // For playlists, ALWAYS return full content regardless of range request
                        // This prevents AVPlayer from making follow-up requests that might bypass ResourceLoader
                        if isPlaylist {
                            dataRequest.respond(with: finalData)
                            print("   📄 [VidMolyLoader] Playlist: returning FULL content (\(finalData.count) bytes)")
                        } else if statusCode == 200 && dataRequest.requestedLength < Int64(finalData.count) {
                            // Slicing logic for segments: Server returned full content (200), but player asked for a Range
                            // We must slice the data to match the request
                            let offset = Int(dataRequest.requestedOffset)
                            let length = Int(dataRequest.requestedLength)
                            
                            // Only if the data covers the requested range
                            if offset < finalData.count {
                                let end = min(offset + length, finalData.count)
                                let slice = finalData[offset..<end]
                                dataRequest.respond(with: Data(slice))
                                print("   ✂️ [VidMolyLoader] Sliced data: requested \(dataRequest.requestedOffset)-\(dataRequest.requestedOffset + Int64(length)), provided \(offset)-\(end) from \(finalData.count) bytes")
                            } else {
                                // Request is out of bounds of received data
                                print("   ❌ [VidMolyLoader] Range out of bounds: requested \(offset) but data size is \(finalData.count)")
                            }
                        } else {
                            // Use data as is (200 matching full request, or 206 Partial Content)
                             dataRequest.respond(with: finalData)
                        }
                    }
                    
                    loadingRequest.finishLoading()
                    print("✅ [VidMolyLoader] Request sanitized and passed to player")
                } else {
                    print("❌ [VidMolyLoader] Failed to create sanitized response")
                    loadingRequest.finishLoading(with: NSError(domain: "ResourceLoader", code: -1, userInfo: nil))
                }
            } else {
                print("❌ [VidMolyLoader] Invalid response or no data")
                loadingRequest.finishLoading(with: NSError(domain: "ResourceLoader", code: -2, userInfo: nil))
            }
            
            // Cleanup task
            // In a real implementation we might map tasks to requests to support cancellation
        }
        
        task.resume()
        return true
    }
    
    func resourceLoader(_ resourceLoader: AVAssetResourceLoader, didCancel loadingRequest: AVAssetResourceLoadingRequest) {
        // Handle cancellation if needed (track tasks by request)
    }
}
