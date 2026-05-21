//
//  HLSFFmpegDownloader.swift
//  anisflix
//
//  Created for downloading HLS streams with custom headers using FFmpegKit
//  Supports: Vidzy, Luluvid, and other providers requiring custom headers
//

import Foundation
import UIKit
import ffmpegkit

class HLSFFmpegDownloader {
    
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
    private var currentSession: FFmpegSession?
    private var estimatedDurationMs: Int64 = 0
    private var expectedBytes: Int64 = 0
    private var lastReportedProgress: Double = 0
    
    /// Download HLS stream with custom headers
    /// - Parameters:
    ///   - url: The M3U8 URL to download
    ///   - outputPath: Full path where to save the downloaded file
    ///   - provider: Provider name ("vidzy", "luluvid", etc.)
    ///   - progress: Progress callback (0.0 to 1.0)
    ///   - completion: Completion handler with result
    func download(url: String,
                  outputPath: String,
                  provider: String,
                  customHeaders: [String: String]? = nil,
                  progress: @escaping (Double) -> Void,
                  completion: @escaping (Result<URL, Error>) -> Void) {
        
        // Request background execution time
        backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in
            self?.cleanup()
        }
        
        print("🎬 [HLSFFmpeg] Starting download")
        print("   - Provider: \(provider)")
        print("   - URL: \(url)")
        print("   - Output: \(outputPath)")
        
        // LocalStreamingServer injects Referer/Origin on upstream requests
        let isLoopback = url.contains("127.0.0.1") || url.contains("localhost") || url.contains(":8080/")
        let usesLocalStream = url.contains("/stream") && isLoopback
        let usesLocalManifest = url.contains("/manifest") && isLoopback
        
        let command: String
        if usesLocalStream {
            // Single MP4 via /stream (MovieBox, etc.) — not HLS
            command = "-i \"\(url)\" -c copy \"\(outputPath)\""
            print("📡 [HLSFFmpeg] Using LocalServer /stream proxy (MP4 copy)")
        } else if usesLocalManifest {
            command = "-i \"\(url)\" -c copy -bsf:a aac_adtstoasc \"\(outputPath)\""
            print("📡 [HLSFFmpeg] Using LocalServer /manifest proxy (HLS)")
        } else {
            let headers = Self.ffmpegHeaderBlock(provider: provider, url: url, customHeaders: customHeaders)
            command = "-headers '\(headers)' -i \"\(url)\" -c copy -bsf:a aac_adtstoasc \"\(outputPath)\""
        }
        
        print("📝 [VidzyFFmpeg] Command: ffmpeg \(command)")
        
        lastReportedProgress = 0
        estimatedDurationMs = 0
        expectedBytes = 0
        
        Task { [weak self] in
            guard let self else { return }
            if usesLocalStream {
                self.expectedBytes = await Self.probeContentLength(url: url)
            } else {
                self.estimatedDurationMs = await Self.probeHLSDurationMs(inputURL: url)
            }
            if self.estimatedDurationMs > 0 {
                print("⏱️ [HLSFFmpeg] Estimated duration: \(self.estimatedDurationMs) ms")
            } else if self.expectedBytes > 0 {
                print("⏱️ [HLSFFmpeg] Expected size: \(self.expectedBytes) bytes")
            }
        }
        
        // Execute FFmpeg asynchronously
        currentSession = FFmpegKit.executeAsync(command,
            withCompleteCallback: { [weak self] session in
                guard let self = self else { return }
                
                let returnCode = session?.getReturnCode()
                let state = session?.getState()
                
                print("🏁 [VidzyFFmpeg] Session completed")
                print("   - Return code: \(returnCode?.getValue() ?? -999)")
                print("   - State: \(String(describing: state?.rawValue ?? 0))")
                
                if ReturnCode.isSuccess(returnCode) {
                    print("✅ [VidzyFFmpeg] Download successful")
                    progress(1.0)
                    completion(.success(URL(fileURLWithPath: outputPath)))
                } else {
                    let logs = session?.getAllLogsAsString() ?? "No logs"
                    print("❌ [VidzyFFmpeg] Download failed")
                    print("   - Logs: \(logs)")
                    
                    let error = NSError(
                        domain: "VidzyFFmpegDownloader",
                        code: Int(returnCode?.getValue() ?? -1),
                        userInfo: [NSLocalizedDescriptionKey: "FFmpeg failed with code \(returnCode?.getValue() ?? -1)"]
                    )
                    completion(.failure(error))
                }
                
                self.cleanup()
            },
            withLogCallback: { [weak self] log in
                guard let message = log?.getMessage() else { return }
                
                if message.contains("Duration:"),
                   let self,
                   self.estimatedDurationMs <= 0,
                   let ms = Self.parseDurationFromFFmpegLog(message) {
                    self.estimatedDurationMs = ms
                    print("⏱️ [HLSFFmpeg] Duration from FFmpeg log: \(ms) ms")
                }
                
                if !message.contains("frame="),
                   !message.contains("speed="),
                   (message.contains("error") || message.contains("Error") || message.contains("failed")) {
                    print("📋 [HLSFFmpeg]: \(message)")
                }
            },
            withStatisticsCallback: { [weak self] statistics in
                guard let self, let stats = statistics else { return }
                
                let time = stats.getTime()
                let size = stats.getSize()
                
                let rawProgress: Double
                if self.estimatedDurationMs > 0, time > 0 {
                    rawProgress = min(Double(time) / Double(self.estimatedDurationMs), 0.97)
                } else if self.expectedBytes > 0, size > 0 {
                    rawProgress = min(Double(size) / Double(self.expectedBytes), 0.97)
                } else if size > 0 {
                    // Unknown total — smooth curve from bytes (caps ~85% until completion)
                    let mb = Double(size) / 1_000_000.0
                    rawProgress = min(0.85, mb / (mb + 80.0))
                } else {
                    return
                }
                
                self.reportProgress(rawProgress, progress: progress)
                
                if time > 0, time.truncatingRemainder(dividingBy: 10000) < 1000 {
                    print("⏱️ [VidzyFFmpeg] Progress: \(Int(rawProgress * 100))% (\(time)ms, \(size) bytes)")
                }
            }
        )
    }
    
    private func reportProgress(_ value: Double, progress: @escaping (Double) -> Void) {
        let clamped = min(max(value, 0), 0.99)
        guard clamped > lastReportedProgress + 0.005 else { return }
        lastReportedProgress = clamped
        progress(clamped)
    }
    
    // MARK: - Progress probes
    
    private static func parseHLSDurationMs(from playlist: String) -> Int64? {
        var totalSeconds: Double = 0
        for line in playlist.components(separatedBy: .newlines) {
            guard line.hasPrefix("#EXTINF:") else { continue }
            let payload = line.dropFirst("#EXTINF:".count)
            let durationPart = payload.split(separator: ",", maxSplits: 1).first
            if let part = durationPart, let seconds = Double(part) {
                totalSeconds += seconds
            }
        }
        guard totalSeconds > 0 else { return nil }
        return Int64(totalSeconds * 1000)
    }
    
    private static func parseDurationFromFFmpegLog(_ message: String) -> Int64? {
        guard let range = message.range(of: "Duration:") else { return nil }
        let after = message[range.upperBound...].trimmingCharacters(in: .whitespaces)
        let timeToken = after.split(separator: ",").first.map(String.init) ?? String(after.prefix(12))
        let parts = timeToken.split(separator: ":").map(String.init)
        guard parts.count == 3,
              let hours = Double(parts[0]),
              let minutes = Double(parts[1]),
              let seconds = Double(parts[2]) else { return nil }
        return Int64((hours * 3600 + minutes * 60 + seconds) * 1000)
    }
    
    private static func probeContentLength(url: String) async -> Int64 {
        guard let requestURL = URL(string: url) else { return 0 }
        var request = URLRequest(url: requestURL)
        request.httpMethod = "HEAD"
        request.timeoutInterval = 20
        guard let (_, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse,
              (200..<400).contains(http.statusCode) else { return 0 }
        if let length = http.value(forHTTPHeaderField: "Content-Length"),
           let bytes = Int64(length), bytes > 0 {
            return bytes
        }
        return http.expectedContentLength > 0 ? http.expectedContentLength : 0
    }
    
    private static func probeHLSDurationMs(inputURL: String) async -> Int64 {
        guard let url = URL(string: inputURL) else { return 0 }
        return await fetchPlaylistDurationMs(url: url, depth: 0)
    }
    
    private static func fetchPlaylistDurationMs(url: URL, depth: Int) async -> Int64 {
        guard depth < 4 else { return 0 }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = 25
        request.setValue("application/vnd.apple.mpegurl,*/*", forHTTPHeaderField: "Accept")
        
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse,
              (200..<400).contains(http.statusCode),
              let text = String(data: data, encoding: .utf8) else { return 0 }
        
        if let durationMs = parseHLSDurationMs(from: text) {
            return durationMs
        }
        
        guard text.contains("#EXT-X-STREAM-INF") else { return 0 }
        
        var pendingStreamInf = false
        for line in text.components(separatedBy: .newlines) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix("#EXT-X-STREAM-INF") {
                pendingStreamInf = true
                continue
            }
            if pendingStreamInf, !trimmed.isEmpty, !trimmed.hasPrefix("#") {
                guard let variantURL = URL(string: trimmed, relativeTo: url) else { return 0 }
                return await fetchPlaylistDurationMs(url: variantURL, depth: depth + 1)
            }
        }
        return 0
    }
    
    private static func ffmpegHeaderBlock(provider: String, url: String, customHeaders: [String: String]?) -> String {
        if let customHeaders, !customHeaders.isEmpty {
            var lines: [String] = []
            var referer = customHeaders["Referer"]
            if provider.lowercased() == "vidmoly",
               let r = referer, r.contains("embed") {
                referer = "https://vidmoly.net/"
            }
            if let referer { lines.append("Referer: \(referer)") }
            var origin = customHeaders["Origin"]
            if provider.lowercased() == "vidmoly", referer == "https://vidmoly.net/" {
                origin = "https://vidmoly.net"
            }
            if let origin { lines.append("Origin: \(origin)") }
            let ua = customHeaders["User-Agent"]
                ?? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
            lines.append("User-Agent: \(ua)")
            lines.append("Accept: */*")
            return lines.map { "\($0)\\r\\n" }.joined()
        }

        switch provider.lowercased() {
        case "vidzy":
            return "Referer: https://vidzy.org/\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "luluvid", "lulustream":
            let urlComponents = URLComponents(string: url)
            let refererDomain = urlComponents?.host ?? "luluvid.com"
            let refererScheme = urlComponents?.scheme ?? "https"
            return "Referer: \(refererScheme)://\(refererDomain)/\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "afterdark":
            return "Referer: https://afterdark.mom/\\r\\nOrigin: https://afterdark.mom\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "animepahe":
            return "Referer: https://kwik.cx/\\r\\nOrigin: https://kwik.cx\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "vidmoly":
            return "Referer: https://vidmoly.net/\\r\\nOrigin: https://vidmoly.net\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "vidlink":
            return "Referer: https://vidlink.pro/\\r\\nOrigin: https://vidlink.pro\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "yflix":
            if url.contains("rapidshare") || url.contains("prime37node") {
                return "Referer: https://rapidshare.cc/\\r\\nOrigin: https://rapidshare.cc\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
            }
            return "Referer: https://yflix.to/\\r\\nOrigin: https://yflix.to\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "moviebox":
            return "Referer: https://api.inmoviebox.com\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "animekai":
            return "Referer: https://animekai.to/\\r\\nOrigin: https://animekai.to\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        default:
            return "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        }
    }

    /// Cancel ongoing download
    func cancel() {
        print("🛑 [VidzyFFmpeg] Canceling download")
        currentSession?.cancel()
        cleanup()
    }
    
    private func cleanup() {
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
        currentSession = nil
    }
}
