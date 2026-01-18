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
        
        // Build headers based on provider
        let headers: String
        switch provider.lowercased() {
        case "vidzy":
            headers = "Referer: https://vidzy.org/\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        case "luluvid", "lulustream":
            // Luluvid URLs are extracted to CDN domains (tnmr.org, etc.)
            // Use the CDN domain as Referer instead of luluvid.com to avoid 403
            let urlComponents = URLComponents(string: url)
            let refererDomain = urlComponents?.host ?? "luluvid.com"
            let refererScheme = urlComponents?.scheme ?? "https"
            headers = "Referer: \(refererScheme)://\(refererDomain)/\\r\\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        default:
            headers = "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15\\r\\nAccept: */*\\r\\n"
        }
        
        // FFmpeg command: download HLS with custom headers
        let command = "-headers '\(headers)' -i \"\(url)\" -c copy -bsf:a aac_adtstoasc \"\(outputPath)\""
        
        print("📝 [VidzyFFmpeg] Command: ffmpeg \(command)")
        
        // Track download duration for progress estimation
        var totalDuration: Int64 = 0
        
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
            withLogCallback: { log in
                // Optional: parse logs for debugging
                if let message = log?.getMessage() {
                    if message.contains("Duration:") {
                        // Try to extract total duration for better progress
                        // Format: "Duration: HH:MM:SS.ms"
                        // This is complex parsing, skip for now
                    }
                if let message = log?.getMessage() {
                    // Filter out verbose progress logs (frame=, speed=, etc.) to keep console clean
                    if !message.contains("frame=") && !message.contains("speed=") {
                         print("📋 [FFmpeg Log]: \(message)")
                    }
                }
                }
            },
            withStatisticsCallback: { statistics in
                guard let stats = statistics else { return }
                
                let time = stats.getTime() // Current position in milliseconds
                let size = stats.getSize() // Downloaded size in bytes
                
                // Progress estimation based on time (if we knew duration)
                // For now, just report that download is in progress
                if time > 0 {
                    // Rough estimate: assume 2 hour max video = 7200000 ms
                    let estimatedProgress = min(Double(time) / 7200000.0, 0.99)
                    progress(estimatedProgress)
                    
                    // Log every 10 seconds
                    if time.truncatingRemainder(dividingBy: 10000) < 1000 {
                        print("⏱️ [VidzyFFmpeg] Progress: \(time)ms, \(size) bytes")
                    }
                }
            }
        )
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
