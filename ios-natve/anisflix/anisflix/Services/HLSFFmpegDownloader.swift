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
    private var progressPollTask: Task<Void, Never>?
    private var isCancelled = false

    private struct ResolvedHLSDownload {
        let videoURL: String
        let audioURL: String?
    }

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
                  isDASH: Bool = false,
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

        lastReportedProgress = 0
        estimatedDurationMs = 0
        expectedBytes = 0
        isCancelled = false
        progressPollTask?.cancel()

        Task { [weak self] in
            guard let self else { return }

            // Show activity immediately while the master playlist is being resolved.
            self.reportProgress(0.01, progress: progress)

            let isLoopback = url.contains("127.0.0.1") || url.contains("localhost") || url.contains(":8080/")
            let usesLocalStream = url.contains("/stream") && isLoopback
            let usesLocalManifest = url.contains("/manifest") && isLoopback

            if isDASH || url.lowercased().contains(".mpd") {
                print("📦 [HLSFFmpeg] DASH input detected; FFmpeg will mux video and audio into MP4")
                self.runFFmpegCopy(
                    inputURL: url,
                    outputPath: outputPath,
                    headerBlock: Self.ffmpegHeaderBlock(provider: provider, url: url, customHeaders: customHeaders),
                    isMP4Copy: false,
                    progress: progress,
                    completion: completion
                )
                return
            }

            if usesLocalStream {
                self.runFFmpegCopy(
                    inputURL: url,
                    outputPath: outputPath,
                    headerBlock: nil,
                    isMP4Copy: true,
                    progress: progress,
                    completion: completion
                )
                return
            }

            let resolveHeaders = (usesLocalManifest || isLoopback) ? nil : customHeaders
            let resolved = await Self.resolveHLSForDownload(urlString: url, headers: resolveHeaders)
            let videoURL = resolved.videoURL
            let audioURL = resolved.audioURL
            if videoURL != url {
                print("📺 [HLSFFmpeg] Using media playlist instead of master")
            }
            if let audioURL {
                print("🔊 [HLSFFmpeg] Separate audio playlist (will mux after TS download)")
                print("   - Audio: \(audioURL.prefix(120))…")
            }

            let tmpDir = URL(fileURLWithPath: outputPath).deletingLastPathComponent()
            let videoTS = tmpDir.appendingPathComponent("\(UUID().uuidString)_v.ts").path
            let audioTS = tmpDir.appendingPathComponent("\(UUID().uuidString)_a.ts").path

            do {
                var videoTotal = 1
                let videoCount = try await self.downloadPlaylistSegments(
                    playlistURL: videoURL,
                    outputPath: videoTS,
                    label: "video",
                    headers: resolveHeaders
                ) { done, total in
                    videoTotal = max(total, 1)
                    let raw = 0.01 + 0.90 * (Double(done) / Double(videoTotal + (audioURL == nil ? 0 : videoTotal)))
                    self.reportProgress(raw, progress: progress)
                }
                print("📦 [HLSFFmpeg] Video TS: \(videoCount) segments")

                var audioCount = 0
                if let audioURL {
                    audioCount = try await self.downloadPlaylistSegments(
                        playlistURL: audioURL,
                        outputPath: audioTS,
                        label: "audio",
                        headers: resolveHeaders
                    ) { done, total in
                        let allTotal = max(videoCount + total, 1)
                        let raw = 0.01 + 0.90 * (Double(videoCount + done) / Double(allTotal))
                        self.reportProgress(raw, progress: progress)
                    }
                    print("📦 [HLSFFmpeg] Audio TS: \(audioCount) segments")
                }

                if self.isCancelled {
                    try? FileManager.default.removeItem(atPath: videoTS)
                    try? FileManager.default.removeItem(atPath: audioTS)
                    self.cleanup()
                    completion(.failure(NSError(
                        domain: "VidzyFFmpegDownloader",
                        code: -999,
                        userInfo: [NSLocalizedDescriptionKey: "Cancelled"]
                    )))
                    return
                }

                self.reportProgress(0.93, progress: progress)
                let muxOK = await self.muxLocalTS(
                    videoTS: videoTS,
                    audioTS: audioCount > 0 ? audioTS : nil,
                    outputPath: outputPath
                )
                try? FileManager.default.removeItem(atPath: videoTS)
                try? FileManager.default.removeItem(atPath: audioTS)

                if muxOK {
                    print("✅ [HLSFFmpeg] Mux complete")
                    progress(1.0)
                    completion(.success(URL(fileURLWithPath: outputPath)))
                } else {
                    completion(.failure(NSError(
                        domain: "VidzyFFmpegDownloader",
                        code: -1,
                        userInfo: [NSLocalizedDescriptionKey: "FFmpeg mux failed"]
                    )))
                }
                self.cleanup()
            } catch {
                try? FileManager.default.removeItem(atPath: videoTS)
                try? FileManager.default.removeItem(atPath: audioTS)
                print("❌ [HLSFFmpeg] Segment download failed: \(error)")
                completion(.failure(error))
                self.cleanup()
            }
        }
    }

    private func reportProgress(_ value: Double, progress: @escaping (Double) -> Void) {
        let clamped = min(max(value, 0), 0.99)
        guard clamped > lastReportedProgress + 0.001 else { return }
        lastReportedProgress = clamped
        print("⏱️ [HLSFFmpeg] UI progress \(Int((clamped * 100).rounded()))%")
        progress(clamped)
    }

    // MARK: - Native HLS segment download (FFmpeg dual-HLS through LocalServer deadlocks)

    private func downloadPlaylistSegments(
        playlistURL: String,
        outputPath: String,
        label: String,
        headers: [String: String]?,
        onProgress: @escaping (Int, Int) -> Void
    ) async throws -> Int {
        guard let url = URL(string: playlistURL),
              let text = await Self.fetchPlaylistText(url: url, headers: headers) else {
            throw NSError(domain: "HLSFFmpegDownloader", code: -2,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to fetch \(label) playlist"])
        }
        let segments = Self.mediaSegmentURLs(in: text, base: url)
        guard !segments.isEmpty else {
            throw NSError(domain: "HLSFFmpegDownloader", code: -3,
                          userInfo: [NSLocalizedDescriptionKey: "No segments in \(label) playlist"])
        }
        print("📥 [HLSFFmpeg] Downloading \(segments.count) \(label) segments")

        FileManager.default.createFile(atPath: outputPath, contents: nil)
        let handle = try FileHandle(forWritingTo: URL(fileURLWithPath: outputPath))
        defer { try? handle.close() }

        for (index, segURL) in segments.enumerated() {
            if isCancelled {
                throw NSError(domain: "HLSFFmpegDownloader", code: -999,
                              userInfo: [NSLocalizedDescriptionKey: "Cancelled"])
            }
            let data = try await Self.fetchSegmentData(segURL, headers: headers)
            handle.write(data)
            onProgress(index + 1, segments.count)
            if (index + 1) % 10 == 0 || index == 0 {
                print("📥 [HLSFFmpeg] \(label) \(index + 1)/\(segments.count)")
            }
        }
        return segments.count
    }

    private static func mediaSegmentURLs(in playlist: String, base: URL) -> [URL] {
        var urls: [URL] = []
        if let mapRange = playlist.range(of: "#EXT-X-MAP:"),
           let uri = mediaAttributeURI(String(playlist[mapRange.lowerBound...])),
           let mapURL = URL(string: uri, relativeTo: base)?.absoluteURL {
            urls.append(mapURL)
        }
        for line in playlist.components(separatedBy: .newlines) {
            let s = line.trimmingCharacters(in: .whitespaces)
            if s.isEmpty || s.hasPrefix("#") { continue }
            if let u = URL(string: s, relativeTo: base)?.absoluteURL {
                urls.append(u)
            }
        }
        return urls
    }

    private static func fetchSegmentData(_ url: URL, headers: [String: String]?) async throws -> Data {
        var lastError: Error?
        for attempt in 1...3 {
            var request = URLRequest(url: url)
            request.timeoutInterval = 45
            request.setValue("*/*", forHTTPHeaderField: "Accept")
            headers?.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                let code = (response as? HTTPURLResponse)?.statusCode ?? 0
                if (200..<300).contains(code), data.count > 200 {
                    return data
                }
                lastError = NSError(domain: "HLSFFmpegDownloader", code: code,
                                    userInfo: [NSLocalizedDescriptionKey: "Segment HTTP \(code) \(data.count)B"])
            } catch {
                lastError = error
            }
            if attempt < 3 {
                try await Task.sleep(nanoseconds: 400_000_000)
            }
        }
        throw lastError ?? NSError(domain: "HLSFFmpegDownloader", code: -4,
                                   userInfo: [NSLocalizedDescriptionKey: "Segment download failed"])
    }

    private func muxLocalTS(videoTS: String, audioTS: String?, outputPath: String) async -> Bool {
        let command: String
        if let audioTS {
            command = "-y -fflags +genpts -i \"\(videoTS)\" -i \"\(audioTS)\" -map 0:v:0 -map 1:a:0 -c copy -bsf:a aac_adtstoasc -shortest \"\(outputPath)\""
        } else {
            command = "-y -fflags +genpts -i \"\(videoTS)\" -c copy -bsf:a aac_adtstoasc \"\(outputPath)\""
        }
        print("📝 [HLSFFmpeg] Mux: ffmpeg \(command)")
        var ok = await executeFFmpeg(command)
        if !ok, audioTS == nil {
            print("⚠️ [HLSFFmpeg] Mux retry without audio bsf")
            ok = await executeFFmpeg("-y -fflags +genpts -i \"\(videoTS)\" -c copy \"\(outputPath)\"")
        }
        return ok
    }

    private func executeFFmpeg(_ command: String) async -> Bool {
        await withCheckedContinuation { continuation in
            currentSession = FFmpegKit.executeAsync(command, withCompleteCallback: { session in
                let code = session?.getReturnCode()
                let ok = ReturnCode.isSuccess(code)
                if !ok {
                    print("❌ [HLSFFmpeg] ffmpeg exit \(code?.getValue() ?? -1)")
                    print(session?.getAllLogsAsString() ?? "")
                }
                continuation.resume(returning: ok)
            })
        }
    }

    private func runFFmpegCopy(
        inputURL: String,
        outputPath: String,
        headerBlock: String?,
        isMP4Copy: Bool,
        progress: @escaping (Double) -> Void,
        completion: @escaping (Result<URL, Error>) -> Void
    ) {
        let command = Self.buildFFmpegCommand(
            videoURL: inputURL,
            audioURL: nil,
            outputPath: outputPath,
            headerBlock: headerBlock,
            isMP4Copy: isMP4Copy
        )
        print("📝 [VidzyFFmpeg] Command: ffmpeg \(command)")
        reportProgress(0.01, progress: progress)
        currentSession = FFmpegKit.executeAsync(command,
            withCompleteCallback: { [weak self] session in
                guard let self else { return }
                if ReturnCode.isSuccess(session?.getReturnCode()) {
                    progress(1.0)
                    completion(.success(URL(fileURLWithPath: outputPath)))
                } else {
                    let logs = session?.getAllLogsAsString() ?? "No logs"
                    print("❌ [VidzyFFmpeg] Download failed\n   - Logs: \(logs)")
                    completion(.failure(NSError(
                        domain: "VidzyFFmpegDownloader",
                        code: Int(session?.getReturnCode()?.getValue() ?? -1),
                        userInfo: [NSLocalizedDescriptionKey: "FFmpeg failed"]
                    )))
                }
                self.cleanup()
            },
            withLogCallback: { [weak self] log in
                guard let self, let message = log?.getMessage() else { return }
                if let ms = Self.parseTimeEqualsFromFFmpegLog(message), self.estimatedDurationMs > 0 {
                    self.reportProgress(min(Double(ms) / Double(self.estimatedDurationMs), 0.97), progress: progress)
                }
            },
            withStatisticsCallback: { [weak self] statistics in
                guard let self, let stats = statistics else { return }
                let size = stats.getSize()
                if self.expectedBytes > 0, size > 0 {
                    self.reportProgress(min(Double(size) / Double(self.expectedBytes), 0.97), progress: progress)
                } else if size > 0 {
                    let mb = Double(size) / 1_000_000.0
                    self.reportProgress(min(0.85, mb / (mb + 80.0)), progress: progress)
                }
            }
        )
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
        return parseHMS(timeToken)
    }

    private static func parseTimeEqualsFromFFmpegLog(_ message: String) -> Int64? {
        guard let range = message.range(of: "time=") else { return nil }
        let after = message[range.upperBound...].trimmingCharacters(in: .whitespaces)
        let token = after.split(separator: " ").first.map(String.init) ?? ""
        return parseHMS(token)
    }

    private static func parseHMS(_ timeToken: String) -> Int64? {
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

    /// Same as the test script: FFmpeg must get a media playlist, not a Vidzy/HiAnime master
    /// with separate AUDIO groups (that path hangs at 0% / never produces stats).
    static func resolveMediaPlaylistURL(_ urlString: String, headers: [String: String]?) async -> String {
        let resolved = await resolveHLSForDownload(urlString: urlString, headers: headers)
        return resolved.videoURL
    }

    private static func resolveHLSForDownload(urlString: String, headers: [String: String]?) async -> ResolvedHLSDownload {
        guard let url = URL(string: urlString) else {
            return ResolvedHLSDownload(videoURL: urlString, audioURL: nil)
        }
        guard let text = await fetchPlaylistText(url: url, headers: headers) else {
            return ResolvedHLSDownload(videoURL: urlString, audioURL: nil)
        }
        if text.contains("#EXTINF:") && !text.contains("#EXT-X-STREAM-INF") {
            return ResolvedHLSDownload(videoURL: urlString, audioURL: nil)
        }
        guard text.contains("#EXT-X-STREAM-INF"),
              let variant = bestVariantURL(in: text, base: url) else {
            return ResolvedHLSDownload(videoURL: urlString, audioURL: nil)
        }
        print("📺 [HLSFFmpeg] Master → variant: \(variant.lastPathComponent)")
        let audio = defaultAudioURL(in: text, base: url)
        let video = await resolveMediaPlaylist(url: variant, headers: headers, depth: 1)
        return ResolvedHLSDownload(videoURL: video, audioURL: audio?.absoluteString)
    }

    private static func defaultAudioURL(in master: String, base: URL) -> URL? {
        var fallback: URL?
        for line in master.split(separator: "\n", omittingEmptySubsequences: false) {
            let s = String(line).trimmingCharacters(in: .whitespaces)
            guard s.hasPrefix("#EXT-X-MEDIA:"), s.contains("TYPE=AUDIO") else { continue }
            guard let uri = mediaAttributeURI(s),
                  let url = URL(string: uri, relativeTo: base)?.absoluteURL else { continue }
            if s.contains("DEFAULT=YES") { return url }
            if fallback == nil { fallback = url }
        }
        return fallback
    }

    private static func mediaAttributeURI(_ line: String) -> String? {
        guard let r = line.range(of: "URI=\"") else { return nil }
        let rest = line[r.upperBound...]
        guard let end = rest.firstIndex(of: "\"") else { return nil }
        return String(rest[..<end])
    }

    private static func buildFFmpegCommand(
        videoURL: String,
        audioURL: String?,
        outputPath: String,
        headerBlock: String?,
        isMP4Copy: Bool
    ) -> String {
        if isMP4Copy {
            print("📡 [HLSFFmpeg] Using LocalServer /stream proxy (MP4 copy)")
            return "-i \"\(videoURL)\" -c copy \"\(outputPath)\""
        }

        var cmd = "-hide_banner -loglevel info -analyzeduration 2000000 -probesize 2000000"
        if let headerBlock {
            cmd += " -headers '\(headerBlock)'"
        }
        cmd += " -i \"\(videoURL)\""
        if let audioURL, !audioURL.isEmpty {
            if let headerBlock {
                cmd += " -headers '\(headerBlock)'"
            }
            cmd += " -i \"\(audioURL)\" -map 0:v:0 -map 1:a:0 -shortest -c copy -bsf:a aac_adtstoasc"
            print("📡 [HLSFFmpeg] HLS video+audio mux via LocalServer")
        } else {
            cmd += " -c copy -bsf:a aac_adtstoasc"
            print("📡 [HLSFFmpeg] HLS video copy via LocalServer")
        }
        cmd += " \"\(outputPath)\""
        return cmd
    }

    private static func resolveMediaPlaylist(url: URL, headers: [String: String]?, depth: Int) async -> String {
        guard depth < 4 else { return url.absoluteString }
        guard let text = await fetchPlaylistText(url: url, headers: headers) else {
            return url.absoluteString
        }
        if text.contains("#EXTINF:") && !text.contains("#EXT-X-STREAM-INF") {
            return url.absoluteString
        }
        guard text.contains("#EXT-X-STREAM-INF"),
              let variant = bestVariantURL(in: text, base: url) else {
            return url.absoluteString
        }
        print("📺 [HLSFFmpeg] Master → variant: \(variant.lastPathComponent)")
        return await resolveMediaPlaylist(url: variant, headers: headers, depth: depth + 1)
    }

    private static func fetchPlaylistText(url: URL, headers: [String: String]?) async -> String? {
        var request = URLRequest(url: url)
        request.timeoutInterval = 25
        request.setValue("application/vnd.apple.mpegurl,*/*", forHTTPHeaderField: "Accept")
        headers?.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse,
              (200..<400).contains(http.statusCode),
              let text = String(data: data, encoding: .utf8),
              text.contains("#EXT") else { return nil }
        if text.prefix(200).lowercased().contains("<html") { return nil }
        return text
    }

    private static func bestVariantURL(in master: String, base: URL) -> URL? {
        var bestURL: URL?
        var bestBw = -1
        var pendingBw = 0
        var pendingStreamInf = false
        var pendingAudioOnly = false
        for line in master.split(separator: "\n", omittingEmptySubsequences: false) {
            let s = String(line).trimmingCharacters(in: .whitespaces)
            if s.hasPrefix("#EXT-X-STREAM-INF") {
                pendingStreamInf = true
                pendingBw = 0
                pendingAudioOnly = isAudioOnlyStreamInf(s)
                if let r = s.range(of: "BANDWIDTH=") {
                    let rest = s[r.upperBound...]
                    pendingBw = Int(rest.prefix(while: { $0.isNumber })) ?? 0
                }
                continue
            }
            if pendingStreamInf, !s.isEmpty, !s.hasPrefix("#"),
               !pendingAudioOnly,
               let u = URL(string: s, relativeTo: base)?.absoluteURL {
                if pendingBw >= bestBw {
                    bestBw = pendingBw
                    bestURL = u
                }
            }
            pendingStreamInf = false
            pendingAudioOnly = false
        }
        return bestURL
    }

    private static func isAudioOnlyStreamInf(_ line: String) -> Bool {
        guard let r = line.range(of: "CODECS=\"") else { return false }
        let rest = line[r.upperBound...]
        guard let end = rest.firstIndex(of: "\"") else { return false }
        let codecs = String(rest[..<end]).lowercased()
        let hasVideo = codecs.contains("avc") || codecs.contains("hvc") || codecs.contains("hev")
            || codecs.contains("vp") || codecs.contains("av01")
        let hasAudio = codecs.contains("mp4a") || codecs.contains("ac-3") || codecs.contains("ec-3")
        return hasAudio && !hasVideo
    }

    private static func fetchPlaylistDurationMs(url: URL, depth: Int) async -> Int64 {
        guard depth < 4 else { return 0 }
        guard let text = await fetchPlaylistText(url: url, headers: nil) else { return 0 }

        if let durationMs = parseHLSDurationMs(from: text) {
            return durationMs
        }

        guard text.contains("#EXT-X-STREAM-INF"),
              let variantURL = bestVariantURL(in: text, base: url) else { return 0 }
        return await fetchPlaylistDurationMs(url: variantURL, depth: depth + 1)
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
            return "Referer: https://vidzy.cc/\\r\\nOrigin: https://vidzy.cc\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "hianime":
            return "Referer: https://megaplay.buzz/\\r\\nOrigin: https://megaplay.buzz\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
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
        default:
            return "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        }
    }

    /// Cancel ongoing download
    func cancel() {
        print("🛑 [VidzyFFmpeg] Canceling download")
        isCancelled = true
        currentSession?.cancel()
        cleanup()
    }

    private func cleanup() {
        progressPollTask?.cancel()
        progressPollTask = nil
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
        currentSession = nil
    }
}
