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
    
    override init() {
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.session = URLSession(configuration: config)
        super.init()
    }
    
    func resourceLoader(_ resourceLoader: AVAssetResourceLoader, shouldWaitForLoadingOfRequestedResource loadingRequest: AVAssetResourceLoadingRequest) -> Bool {
        guard let url = loadingRequest.request.url else { return false }
        
        // Convert custom scheme back to https
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        components?.scheme = "https"
        
        guard let realUrl = components?.url else { return false }
        
        // Strip the virtual suffix (used only for AVPlayer detection) before making request
        var cleanUrl = realUrl
        if var cleanComponents = URLComponents(url: realUrl, resolvingAgainstBaseURL: false),
           var items = cleanComponents.queryItems {
            // Remove 'virtual' param
            items.removeAll { $0.name == "virtual" }
            cleanComponents.queryItems = items.isEmpty ? nil : items
            if let url = cleanComponents.url {
                 cleanUrl = url
            }
        }
        
        print("🔄 [VidMolyLoader] Intercepting request: \(realUrl)")
        print("   - Cleaned URL for network: \(cleanUrl)")
        
        // request.allHTTPHeaderFields = loadingRequest.request.allHTTPHeaderFields // Avoid copying all headers blindly
        
        var request = URLRequest(url: cleanUrl)
        
        let dataRequest = loadingRequest.dataRequest
        if let dataRequest = dataRequest {
            if dataRequest.requestedLength > 0 {
                let lower = dataRequest.requestedOffset
                let upper = lower + Int64(dataRequest.requestedLength) - 1
                let rangeHeader = "bytes=\(lower)-\(upper)"
                request.setValue(rangeHeader, forHTTPHeaderField: "Range")
                print("   - Requesting Range: \(rangeHeader)")
            }
        }
        
        // Ensure we send a browser-like User-Agent to avoid blocking
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        
        let task = session.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ [VidMolyLoader] Error: \(error.localizedDescription) for \(realUrl.lastPathComponent)")
                loadingRequest.finishLoading(with: error)
                return
            }
            
            if let response = response as? HTTPURLResponse, let data = data {
                print("📥 [VidMolyLoader] Received response: \(response.statusCode) for \(realUrl.lastPathComponent)")
                print("   - Data size: \(data.count) bytes")
                
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
                        
                        // 2. Rewrite URLs
                        // Goal: Force ALL VidMoly URLs (both .m3u8 playlists AND .ts segments)
                        // through the ResourceLoader to ensure proper headers are sent
                        
                        // First, ensure all relative paths are absolute HTTPS
                        playlistContent = playlistContent.replacingOccurrences(
                            of: "/api/vidmoly?",
                            with: "https://anisflix.vercel.app/api/vidmoly?"
                        )
                        
                        // Remove HDR VIDEO-RANGE tags that might confuse the player or simulator
                        playlistContent = playlistContent.replacingOccurrences(of: ",VIDEO-RANGE=PQ", with: "")
                        playlistContent = playlistContent.replacingOccurrences(of: ",VIDEO-RANGE=SDR", with: "")
                        
                        // Rewrite ALL VidMoly URLs to custom scheme (not just .m3u8)
                        // This ensures segments also pass through ResourceLoader with proper headers
                        var finalLines = [String]()
                        playlistContent.enumerateLines { line, _ in
                            if line.contains("anisflix.vercel.app/api/vidmoly") {
                                let text = line.replacingOccurrences(of: "https://", with: "vidmoly-custom://")
                                finalLines.append(text)
                            } else {
                                finalLines.append(line)
                            }
                        }
                        playlistContent = finalLines.joined(separator: "\n")
                        
                        if let modifiedData = playlistContent.data(using: .utf8) {
                            finalData = modifiedData
                            headers["Content-Length"] = "\(modifiedData.count)"
                            print("   ✅ [VidMolyLoader] Playlist processed: URLs rewritten & I-Frames removed")
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
                
                // 1. Try to guess from URL extension first (most reliable for our rewritten URLs)
                if realUrl.absoluteString.contains(".m3u8") || realUrl.pathExtension == "m3u8" {
                    uti = "com.apple.m3u-playlist"
                    finalMimeType = "application/vnd.apple.mpegurl"
                } else if realUrl.absoluteString.contains(".ts") || realUrl.pathExtension == "ts" {
                    uti = "public.mpeg-2-transport-stream"
                    finalMimeType = "video/mp2t"
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
                        if statusCode == 200 && dataRequest.requestedLength < Int64(finalData.count) {
                            // Slicing logic: Server returned full content (200), but player asked for a Range
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
