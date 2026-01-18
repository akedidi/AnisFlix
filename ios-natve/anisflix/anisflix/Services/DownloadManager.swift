//
//  DownloadManager.swift
//  anisflix
//
//  Created by AI Assistant on 03/12/2025.
//

import Foundation
import Combine
import AVFoundation
import UIKit // For UIImage/JPEG conversion if needed, but we'll just save data

enum DownloadState: String, Codable {
    case queued
    case waiting
    case downloading
    case paused
    case completed
    case failed
}

struct LocalSubtitle: Codable, Hashable {
    let url: URL
    let language: String
    let label: String
    let code: String
    let flag: String
}

struct DownloadItem: Identifiable, Codable, Hashable {
    let id: String
    let mediaId: Int
    let title: String
    let posterPath: String?
    let backdropPath: String?
    let overview: String?
    let rating: Double?
    let videoUrl: String
    let quality: String
    let language: String
    var sourceId: String? // To track which source triggered the download
    
    var retryCount: Int = 0 // Track number of retries
    
    // For Series
    let season: Int?
    let episode: Int?
    
    var state: DownloadState = .waiting
    var progress: Double = 0.0
    var localVideoUrl: URL?
    var localSubtitles: [LocalSubtitle] = []
    var localPosterPath: String? // Relative path
    var localBackdropPath: String? // Relative path
    var isHLS: Bool = false
    var relativePath: String? // For HLS persistence
    var downloadSpeed: String? // Speed display (e.g. "2.5 MB/s")
    
    var headers: [String: String]? // Custom headers for download
    var provider: String? // Source provider (e.g. "vidzy", "vidmoly")
    
    var isSeries: Bool {
        return season != nil && episode != nil
    }
    
    var displayName: String {
        if let s = season, let e = episode {
            return "\(title) - S\(s) E\(e)"
        }
        return title
    }
}

class DownloadManager: NSObject, ObservableObject {
    static let shared = DownloadManager()
    
    @Published var downloads: [DownloadItem] = []
    
    // Standard downloads (mp4, subtitles)
    private var urlSession: URLSession!
    private var downloadTasks: [String: URLSessionDownloadTask] = [:]
    private var resumeDataMap: [String: Data] = [:]
    
    // HLS downloads
    private var assetDownloadSession: AVAssetDownloadURLSession!
    private var activeAssetDownloads: [String: AVAssetDownloadTask] = [:]
    
    // FFmpeg-based downloads (for Vidzy with custom headers)
    private var ffmpegDownloaders: [String: VidzyFFmpegDownloader] = [:]
    
    // Separate error persistence to avoid breaking DownloadItem schema
    @Published var downloadErrors: [String: String] = [:]
    private let errorsKey = "saved_download_errors"
    
    private let downloadsKey = "saved_downloads"
    private let maxRetries = 3
    private let maxConcurrentDownloads = 2
    
    // Speed Calculation
    private var speedTimer: Timer?
    private var lastBytesReceived: [String: Int64] = [:]
    private let byteFormatter = ByteCountFormatter()
    @Published var globalProgress: Double = 0.0
    
    // Background Completion (Crucial for finish in background)
    var backgroundCompletionHandler: (() -> Void)?
    
    private var resumeDataDirectory: URL {
        let dir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0].appendingPathComponent("Application Support/ResumeData")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }
    
    override init() {
        super.init()
        
        // Formatter setup
        byteFormatter.allowedUnits = [.useMB, .useKB]
        byteFormatter.countStyle = .file
        
        // Standard Session
        let config = URLSessionConfiguration.background(withIdentifier: "com.anisflix.backgroundDownload.v7") // v7 ID
        config.isDiscretionary = false
        config.sessionSendsLaunchEvents = true
        urlSession = URLSession(configuration: config, delegate: self, delegateQueue: OperationQueue.main)
        
        // HLS Session
        let assetConfig = URLSessionConfiguration.background(withIdentifier: "com.anisflix.assetDownload.v7") // v7 ID
        assetConfig.isDiscretionary = false
        assetConfig.sessionSendsLaunchEvents = true
        assetDownloadSession = AVAssetDownloadURLSession(configuration: assetConfig, assetDownloadDelegate: self, delegateQueue: OperationQueue.main)
        
        loadDownloads()
        
        // Re-attach standard tasks
        urlSession.getAllTasks { tasks in
            for task in tasks {
                if let downloadTask = task as? URLSessionDownloadTask,
                   let desc = downloadTask.taskDescription {
                    self.downloadTasks[desc] = downloadTask
                }
            }
        }
        
        
        // Re-attach HLS tasks
        assetDownloadSession.getAllTasks { tasks in
            for task in tasks {
                if let assetTask = task as? AVAssetDownloadTask,
                   let desc = assetTask.taskDescription {
                    self.activeAssetDownloads[desc] = assetTask
                }
            }
        }
        
        startSpeedTimer()
        // Initial queue processing after a short delay to allow UI to settle
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.loadErrors()
            self.processQueue()
        }
    }
    
    // MARK: - Queue Management
    
    func processQueue() {
        var downloadingCount = downloads.filter { $0.state == .downloading }.count
        
        while downloadingCount < maxConcurrentDownloads {
            // Find next queued item
            if let nextIndex = downloads.firstIndex(where: { $0.state == .queued }) {
                let item = downloads[nextIndex]
                print("🚀 Queue: Starting download for \(item.title) (Slots: \(downloadingCount)/\(maxConcurrentDownloads))")
                
                // Change status to downloading
                downloads[nextIndex].state = .downloading
                saveDownloads()
                
                // Start or Resume
                resumeTaskInternally(for: item)
                
                downloadingCount += 1
            } else {
                // No more items in queue
                break
            }
        }
    }
    
    // MARK: - Persistence Helpers
    
    private func saveResumeData(_ data: Data, for id: String) {
        let fileURL = resumeDataDirectory.appendingPathComponent(id)
        do {
            try data.write(to: fileURL)
            print("💾 Persisted resume data for \(id) to disk")
        } catch {
            print("❌ Failed to persist resume data: \(error)")
        }
    }
    
    private func loadResumeData(for id: String) -> Data? {
        let fileURL = resumeDataDirectory.appendingPathComponent(id)
        return try? Data(contentsOf: fileURL)
    }
    
    private func deleteResumeData(for id: String) {
        let fileURL = resumeDataDirectory.appendingPathComponent(id)
        try? FileManager.default.removeItem(at: fileURL)
    }
    
    // MARK: - Public API
    
    func startDownload(source: StreamingSource, media: Media, season: Int? = nil, episode: Int? = nil, extractedUrl: String? = nil) {
        let id = UUID().uuidString
        let finalUrl = extractedUrl ?? source.url
        
        // Detect HLS
        var isHLS = finalUrl.contains(".m3u8") || 
                    source.type == "hls" ||
                    source.provider == "vidmoly" || 
                    source.provider == "vidzy" ||
                    source.provider == "vixsrc"
        // Note: Luluvid downloads are blocked at UI level due to iOS HLS header limitation
        
        // Initialize as queued
        let item = DownloadItem(
            id: id,
            mediaId: media.id,
            title: media.title,
            posterPath: media.posterPath,
            backdropPath: media.backdropPath,
            overview: media.overview,
            rating: media.rating,
            videoUrl: finalUrl,
            quality: source.quality,
            language: source.language,
            sourceId: source.id,
            season: season,
            episode: episode,
            state: .queued, // Start as queued
            progress: 0.0,
            isHLS: isHLS,
            headers: source.headers,
            provider: source.provider
        )
        
        downloads.append(item)
        saveDownloads()
        
        // Trigger queue processing
        processQueue()
        
        // Download Metadata (Images & Subtitles)
        Task {
            await downloadImages(for: item)
            downloadSubtitle(for: item)
        }
    }
    
    private func downloadImages(for item: DownloadItem) async {
        // Download Poster
        if let posterPath = item.posterPath {
            let urlString = "https://image.tmdb.org/t/p/w500\(posterPath)"
            if let localPath = await downloadImage(from: urlString, id: item.id, type: "poster") {
                await MainActor.run {
                    if let index = self.downloads.firstIndex(where: { $0.id == item.id }) {
                        self.downloads[index].localPosterPath = localPath
                        self.saveDownloads()
                    }
                }
            }
        }
        
        // Download Backdrop
        if let backdropPath = item.backdropPath {
            let urlString = "https://image.tmdb.org/t/p/w780\(backdropPath)"
            if let localPath = await downloadImage(from: urlString, id: item.id, type: "backdrop") {
                await MainActor.run {
                    if let index = self.downloads.firstIndex(where: { $0.id == item.id }) {
                        self.downloads[index].localBackdropPath = localPath
                        self.saveDownloads()
                    }
                }
            }
        }
    }
    
    private func downloadImage(from urlString: String, id: String, type: String) async -> String? {
        guard let url = URL(string: urlString) else { return nil }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let documentsURL = getDocumentsDirectory()
            let filename = "\(id)_\(type).jpg"
            let destinationURL = documentsURL.appendingPathComponent(filename)
            
            try data.write(to: destinationURL)
            print("✅ Downloaded \(type) image to: \(filename)")
            return filename // Return relative path (filename)
        } catch {
            print("❌ Failed to download \(type) image: \(error)")
            return nil
        }
    }
    
    private func downloadSubtitle(for item: DownloadItem) {
        Task {
            // 1. Fetch IMDB ID
            guard let imdbId = await fetchImdbId(for: item) else {
                print("⚠️ Could not find IMDB ID for subtitle download")
                return
            }
            
            // 2. Fetch available subtitles
            let subtitles = await StreamingService.shared.getSubtitles(imdbId: imdbId, season: item.season, episode: item.episode)
            
            guard !subtitles.isEmpty else {
                print("⚠️ No subtitles found for download")
                return
            }
            
            print("📥 Downloading \(subtitles.count) subtitles...")
            
            var downloadedSubtitles: [LocalSubtitle] = []
            
            // 3. Download each subtitle
            for sub in subtitles {
                guard let url = URL(string: sub.url) else { continue }
                
                do {
                    let (data, _) = try await URLSession.shared.data(from: url)
                    
                    // 4. Save
                    let documentsURL = getDocumentsDirectory()
                    let ext = url.pathExtension.isEmpty ? "srt" : url.pathExtension
                    // Unique filename: {itemId}_{langCode}_{label}.srt
                    // Sanitize label to be safe for filename
                    let safeLabel = sub.label.components(separatedBy: .init(charactersIn: "/\\?%*|\"<>:")).joined()
                    let filename = "\(item.id)_\(sub.code)_\(safeLabel).\(ext)"
                    let destinationURL = documentsURL.appendingPathComponent(filename)
                    
                    try data.write(to: destinationURL)
                    
                    downloadedSubtitles.append(LocalSubtitle(
                        url: destinationURL,
                        language: sub.lang,
                        label: sub.label,
                        code: sub.code,
                        flag: sub.flag
                    ))
                    
                    print("✅ Subtitle downloaded: \(sub.label) -> \(filename)")
                } catch {
                    print("❌ Failed to download subtitle \(sub.label): \(error)")
                }
            }
            
            // 5. Update Item
            if !downloadedSubtitles.isEmpty {
                await MainActor.run {
                    if let index = self.downloads.firstIndex(where: { $0.id == item.id }) {
                        self.downloads[index].localSubtitles = downloadedSubtitles
                        self.saveDownloads()
                        print("✅ All subtitles saved for item: \(item.title)")
                    }
                }
            }
        }
    }
    
    private func fetchImdbId(for item: DownloadItem) async -> String? {
        do {
            if item.isSeries {
                let details = try await TMDBService.shared.fetchSeriesDetails(seriesId: item.mediaId, language: "en-US")
                return details.externalIds?.imdbId
            } else {
                let details = try await TMDBService.shared.fetchMovieDetails(movieId: item.mediaId)
                return details.externalIds?.imdbId
            }
        } catch {
            print("❌ Error fetching IMDB ID for download: \(error)")
            return nil
        }
    }
    
    func pauseDownload(id: String) {
        guard let index = downloads.firstIndex(where: { $0.id == id }) else { return }
        let item = downloads[index]
        
        if item.isHLS {
            if let task = activeAssetDownloads[id] {
                task.suspend()
            }
        } else {
            if let task = downloadTasks[id] {
                print("⏸ Pausing task \(id)...")
                task.cancel(byProducingResumeData: { resumeData in
                    if let data = resumeData {
                        print("💾 Resume data produced for paused task \(id)")
                        DispatchQueue.main.async {
                            self.resumeDataMap[id] = data
                            self.saveResumeData(data, for: id) // Persist to disk
                        }
                    } else {
                        print("⚠️ No resume data produced for paused task \(id)")
                    }
                })
                downloadTasks.removeValue(forKey: id)
            }
        }
        
        downloads[index].state = .paused
        saveDownloads()
        
        // Slot freed up, check queue
        processQueue()
    }
    
    func resumeDownload(id: String) {
        guard let index = downloads.firstIndex(where: { $0.id == id }) else { return }
        
        // Reset to queued, let processQueue handle start/concurrency
        downloads[index].state = .queued
        saveDownloads()
        
        processQueue()
        
        // Clear error on manual resume
        clearError(for: id)
    }
    
    // Internal Resume (actually starts the task)
    private func resumeTaskInternally(for item: DownloadItem) {
        let id = item.id
        
        if item.isHLS {
            if let task = activeAssetDownloads[id] {
                task.resume()
            } else {
                // Restart HLS download if task is gone
                startHLSDownload(for: item)
            }
        } else {
            // Check memory first, then disk
            var dataToResume = resumeDataMap[id]
            if dataToResume == nil {
                dataToResume = loadResumeData(for: id)
                if dataToResume != nil {
                     print("📂 Loaded resume data from disk for \(id)")
                }
            }
            
            if let resumeData = dataToResume {
                let task = urlSession.downloadTask(withResumeData: resumeData)
                task.taskDescription = id
                task.resume()
                downloadTasks[id] = task
                // Don't remove from disk/map immediately until finished? 
                // Actually safer to keep until success, but standard practice is to consume it.
                // If it fails again, we get new resume data.
                resumeDataMap.removeValue(forKey: id)
                // We keep disk copy? No, consuming it invalidates it usually? 
                // Resume data is usually one-time use.
                deleteResumeData(for: id)
            } else {
                print("⚠️ No resume data found, restarting fresh.")
                startDownloadTask(for: item)
            }
        }
    }
    
    func restartDownload(id: String) {
        guard let index = downloads.firstIndex(where: { $0.id == id }) else { return }
        
        // 1. Cancel running tasks if any (though usually called when failed/paused)
        if let task = listActiveTask(for: id) {
            task.cancel()
        }
        
        var item = downloads[index]
        
        // 2. Delete partial files
        if let localUrl = item.localVideoUrl {
            try? FileManager.default.removeItem(at: localUrl)
        }
        // Also clean hls assets if HLS
        if item.isHLS {
             if let task = activeAssetDownloads[id] {
                activeAssetDownloads.removeValue(forKey: id)
            }
        } else {
             if let task = downloadTasks[id] {
                downloadTasks.removeValue(forKey: id)
            }
            // Clear resume data
            resumeDataMap.removeValue(forKey: id)
        }
        
                        // 3. Reset Item State
        item.progress = 0.0
        item.state = .queued // Join queue instead of forcing start
        item.retryCount = 0
        item.localVideoUrl = nil
        // Keep metadata images/subs as they are likely fine
        
        // Clear error
        clearError(for: id)
        
        downloads[index] = item
        saveDownloads()
        
        print("🔄 Restarting download from scratch (queued): \(item.title)")
        
        // 4. Trigger Queue
        processQueue()
    }
    
    func getError(for id: String) -> String? {
        return downloadErrors[id]
    }
    
    private func setError(_ error: String, for id: String) {
        downloadErrors[id] = error
        saveErrors()
    }
    
    private func clearError(for id: String) {
        downloadErrors.removeValue(forKey: id)
        saveErrors()
    }
    
    private func saveErrors() {
        if let data = try? JSONEncoder().encode(downloadErrors) {
            UserDefaults.standard.set(data, forKey: errorsKey)
        }
    }
    
    private func loadErrors() {
        if let data = UserDefaults.standard.data(forKey: errorsKey),
           let errors = try? JSONDecoder().decode([String: String].self, from: data) {
            downloadErrors = errors
        }
    }
    
    // Helper to find task generic
    private func listActiveTask(for id: String) -> URLSessionTask? {
        if let t = downloadTasks[id] { return t }
        if let t = activeAssetDownloads[id] { return t }
        return nil
    }
    
    // MARK: - Speed Calculation Logic
    
    private func startSpeedTimer() {
        speedTimer?.invalidate()
        speedTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.calculateSpeed()
        }
    }
    
    private func calculateSpeed() {
        // Collect all active tasks
        var activeTasks: [URLSessionTask] = []
        // Explicit cast needed because Swift collections are invariant
        activeTasks.append(contentsOf: downloadTasks.values.map { $0 as URLSessionTask })
        activeTasks.append(contentsOf: activeAssetDownloads.values.map { $0 as URLSessionTask })
        
        var activeIds: Set<String> = []
        
        for task in activeTasks {
            guard let id = task.taskDescription else { continue }
            activeIds.insert(id)
            
            let currentBytes = task.countOfBytesReceived
            let previousBytes = lastBytesReceived[id] ?? 0
            
            // Calculate delta
            // Note: countOfBytesReceived accumulates.
            // If it resets (re-launch), previousBytes might be > currentBytes, so handle that.
            var delta = currentBytes - previousBytes
            if delta < 0 { delta = currentBytes } // Reset
            
            // Update last bytes
            lastBytesReceived[id] = currentBytes
            
            DispatchQueue.main.async {
                if let index = self.downloads.firstIndex(where: { $0.id == id }) {
                    // Only update if state is downloading
                    if self.downloads[index].state == .downloading {
                        // Format speed
                        let speed = self.byteFormatter.string(fromByteCount: delta) + "/s"
                        
                        // Optimize updates to avoid too many refreshes if string hasn't changed?
                        if self.downloads[index].downloadSpeed != speed {
                            self.objectWillChange.send()
                            self.downloads[index].downloadSpeed = speed
                        }
                    } else {
                        if self.downloads[index].downloadSpeed != nil {
                            self.objectWillChange.send()
                            self.downloads[index].downloadSpeed = nil
                        }
                    }
                }
            }
        }
        
        // Cleanup lastBytes for finished tasks
        for id in lastBytesReceived.keys {
            if !activeIds.contains(id) {
                lastBytesReceived.removeValue(forKey: id)
            }
        }
        
        // Update Global Progress
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let downloadingItems = self.downloads.filter { $0.state == .downloading }
            if downloadingItems.isEmpty {
                if self.globalProgress != 0 { self.globalProgress = 0 }
            } else {
                let totalProgress = downloadingItems.reduce(0.0) { $0 + $1.progress }
                let avg = totalProgress / Double(downloadingItems.count)
                if abs(self.globalProgress - avg) > 0.01 { // Reduce churn
                    self.globalProgress = avg
                }
            }
        }
    }
    
    func cancelDownload(id: String) {
        guard let index = downloads.firstIndex(where: { $0.id == id }) else { return }
        let item = downloads[index]
        
        if item.isHLS {
            if let task = activeAssetDownloads[id] {
                task.cancel()
                activeAssetDownloads.removeValue(forKey: id)
            }
            // Delete HLS asset
            if let localUrl = item.localVideoUrl {
                 try? FileManager.default.removeItem(at: localUrl)
            }
        } else {
            if let task = downloadTasks[id] {
                task.cancel()
                downloadTasks.removeValue(forKey: id)
            }
            if let localUrl = item.localVideoUrl {
                try? FileManager.default.removeItem(at: localUrl)
            }
        }
        
        // Delete local images
        let documentsURL = getDocumentsDirectory()
        if let posterPath = item.localPosterPath {
             try? FileManager.default.removeItem(at: documentsURL.appendingPathComponent(posterPath))
        }
        if let backdropPath = item.localBackdropPath {
             try? FileManager.default.removeItem(at: documentsURL.appendingPathComponent(backdropPath))
        }
        // Delete local subtitles
        // Delete local subtitles
        for sub in item.localSubtitles {
            try? FileManager.default.removeItem(at: sub.url)
        }
        
        // Delete persistent resume data
        deleteResumeData(for: id)
        resumeDataMap.removeValue(forKey: id)
        
        downloads.remove(at: index)
        saveDownloads()
        
        // Slot freed up
        processQueue()
    }
    
    func deleteDownload(id: String) {
        cancelDownload(id: id)
    }
    
    func isDownloading(mediaId: Int, season: Int?, episode: Int?, sourceId: String? = nil) -> Bool {
        return downloads.contains { item in
            item.mediaId == mediaId &&
            item.season == season &&
            item.episode == episode &&
            (sourceId == nil || item.sourceId == sourceId) &&
            (item.state == .downloading || item.state == .waiting || item.state == .queued)
        }
    }
    
    func getDownload(mediaId: Int, season: Int?, episode: Int?, sourceId: String? = nil, language: String? = nil) -> DownloadItem? {
        return downloads.first { item in
            item.mediaId == mediaId &&
            item.season == season &&
            item.episode == episode &&
            (sourceId == nil || item.sourceId == sourceId) &&
            (language == nil || item.language.lowercased().contains(language!.lowercased()))
        }
    }
    
    // MARK: - Private Helpers
    
    private func startDownloadTask(for item: DownloadItem) {
        guard let url = URL(string: item.videoUrl) else { return }
        
        var request = URLRequest(url: url)
        
        // Add custom headers if available
        if let headers = item.headers {
            for (key, value) in headers {
                request.setValue(value, forHTTPHeaderField: key)
            }
            print("📥 [DownloadManager] Starting download with custom headers: \(headers.keys)")
        }
        
        let task = urlSession.downloadTask(with: request)
        task.taskDescription = item.id
        task.resume()
        
        downloadTasks[item.id] = task
        
        updateState(for: item.id, state: .downloading)
    }
    
    private func startHLSDownload(for item: DownloadItem) {
        guard let url = URL(string: item.videoUrl) else { return }
        
        print("📥 [DownloadManager] Starting HLS download for: \(item.title)")
        print("   - URL: \(url)")
        print("   - Provider: \(item.provider ?? "unknown")")
        
        // Check if Vidzy - use FFmpeg instead of AVAssetDownloadTask
        if url.host?.contains("vidzy") == true {
            print("🎬 [DownloadManager] Detected Vidzy, using FFmpeg downloader")
            startVidzyFFmpegDownload(for: item)
            return
        }
        
        
        var options: [String: Any]? = nil
        if let headers = item.headers {
            options = ["AVURLAssetHTTPHeaderFieldsKey": headers]
            print("   - Headers: \(headers.keys)")
        }
        
        let asset = AVURLAsset(url: url, options: options)
        
        // Create an AVAssetDownloadTask
        if let task = assetDownloadSession.makeAssetDownloadTask(asset: asset, assetTitle: item.title, assetArtworkData: nil, options: nil) {
            task.taskDescription = item.id
            task.resume()
            activeAssetDownloads[item.id] = task
            updateState(for: item.id, state: .downloading)
            print("✅ [DownloadManager] AVAssetDownloadTask created successfully")
        } else {
            print("❌ [DownloadManager] Failed to create AVAssetDownloadTask")
            updateState(for: item.id, state: .failed)
        }
    }

    private func startVidzyFFmpegDownload(for item: DownloadItem) {
        let downloader = VidzyFFmpegDownloader()
        ffmpegDownloaders[item.id] = downloader
        
        // Get output path
        let outputPath = getDocumentsDirectory().appendingPathComponent("\(item.id).mp4").path
        
        updateState(for: item.id, state: .downloading)
        
        downloader.downloadVidzy(url: item.videoUrl, outputPath: outputPath,
            progress: { [weak self] progress in
                DispatchQueue.main.async {
                    self?.updateProgress(for: item.id, progress: progress)
                }
            },
            completion: { [weak self] result in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    
                    switch result {
                    case .success(let url):
                        if let index = self.downloads.firstIndex(where: { $0.id == item.id }) {
                            self.objectWillChange.send()
                            self.downloads[index].state = .completed
                            self.downloads[index].progress = 1.0
                            self.downloads[index].localVideoUrl = url
                            self.downloads[index].relativePath = url.relativePath
                            self.saveDownloads()
                            self.processQueue()
                        }
                        
                    case .failure(let error):
                        print("❌ [DownloadManager] Vidzy FFmpeg download failed: \(error)")
                        if let index = self.downloads.firstIndex(where: { $0.id == item.id }) {
                            self.objectWillChange.send()
                            self.downloads[index].state = .failed
                            self.downloadErrors[item.id] = error.localizedDescription
                            self.saveDownloads()
                        }
                        self.processQueue()
                    }
                    
                    // Cleanup
                    self.ffmpegDownloaders.removeValue(forKey: item.id)
                }
            }
        )
    }

    
    private func updateState(for id: String, state: DownloadState) {
        if let index = downloads.firstIndex(where: { $0.id == id }) {
            downloads[index].state = state
            saveDownloads()
        }
    }
    
    private func saveDownloads() {
        if let data = try? JSONEncoder().encode(downloads) {
            UserDefaults.standard.set(data, forKey: downloadsKey)
        }
    }
    
    private func loadDownloads() {
        if let data = UserDefaults.standard.data(forKey: downloadsKey),
           let items = try? JSONDecoder().decode([DownloadItem].self, from: data) {
            downloads = items
            
            // Fixup paths for HLS if needed (reconstruct from relative path)
            // For now, we rely on the saved URL, but in a real app we'd use relative paths.
            // Since we are in simulator/dev, we might need to handle this later.
        }
    }
    
    private func getDocumentsDirectory() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
}

// MARK: - URLSessionTaskDelegate (Shared)

// MARK: - URLSessionTaskDelegate (Shared)

extension DownloadManager: URLSessionTaskDelegate {
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let id = task.taskDescription,
              let index = downloads.firstIndex(where: { $0.id == id }) else { return }
        
        if let error = error {
            print("❌ Download error (Task: \(id)): \(error)")
            
            // Capture resume data if available
            // Using exact string key to be safe
            var capturedResumeData: Data? = nil
            if let resumeData = (error as NSError).userInfo["NSURLSessionDownloadTaskResumeData"] as? Data {
                capturedResumeData = resumeData
            } else if let resumeData = (error as NSError).userInfo[NSURLSessionDownloadTaskResumeData] as? Data {
                capturedResumeData = resumeData
            }
            
            if let resumeData = capturedResumeData {
                print("💾 Captured resume data for task: \(id) (\(ByteCountFormatter.string(fromByteCount: Int64(resumeData.count), countStyle: .file)))")
                DispatchQueue.main.async {
                    self.resumeDataMap[id] = resumeData
                    self.saveResumeData(resumeData, for: id) // Persist to disk
                }
            } else {
                 print("⚠️ No resume data found in error info.")
            }
            
            if (error as NSError).code != NSURLErrorCancelled {
                // Record error
                DispatchQueue.main.async {
                    self.setError(error.localizedDescription, for: id)
                }
                
                DispatchQueue.main.async {
                    // Auto-Retry Logic - STRICT: Only if we have resume data
                    // User complained about "restarting from beginning", so we prevent that by checking for resume data
                    let hasResumeData = self.resumeDataMap[id] != nil || capturedResumeData != nil
                    
                    if hasResumeData && self.downloads[index].retryCount < self.maxRetries {
                        self.downloads[index].retryCount += 1
                        let retryDelay: TimeInterval = Double(self.downloads[index].retryCount) * 5.0
                        
                        print("🔄 Auto-retrying task \(id) in \(retryDelay)s (Attempt \(self.downloads[index].retryCount)/\(self.maxRetries))")
                        
                        DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay) {
                            if self.downloads[index].state != .paused {
                                self.resumeDownload(id: id)
                            }
                        }
                        self.saveDownloads()
                    } else {
                        if !hasResumeData {
                            print("🚫 No resume data available. Cannot auto-retry without restarting. Marking as failed.")
                        } else {
                            print("🚫 Max retries reached for task \(id). Marking as failed.")
                        }
                        self.downloads[index].state = .failed
                        self.saveDownloads()
                    }
                }
            }
        } else {
             print("✅ Task finished successfully: \(id)")
        }
    }
    
    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async {
            if let completionHandler = self.backgroundCompletionHandler {
                self.backgroundCompletionHandler = nil
                completionHandler()
            }
        }
    }
}

// MARK: - URLSessionDownloadDelegate (Standard)

extension DownloadManager: URLSessionDownloadDelegate {
    
    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let id = downloadTask.taskDescription else { return }
        
        // Move file to permanent location
        let fileManager = FileManager.default
        let documentsURL = getDocumentsDirectory()
        let filename = "\(id).mp4"
        let destinationURL = documentsURL.appendingPathComponent(filename)
        
        do {
            if fileManager.fileExists(atPath: destinationURL.path) {
                try fileManager.removeItem(at: destinationURL)
            }
            try fileManager.moveItem(at: location, to: destinationURL)
            
            DispatchQueue.main.async {
                // Determine index safely on main thread to avoid race conditions
                if let index = self.downloads.firstIndex(where: { $0.id == id }) {
                    self.objectWillChange.send()
                    
                    self.downloads[index].state = .completed
                    self.downloads[index].progress = 1.0
                    self.downloads[index].localVideoUrl = destinationURL
                    self.downloadTasks.removeValue(forKey: id)
                    self.saveDownloads()
                    
                    // Task finished, process queue for next item
                    self.processQueue()
                }
            }
        } catch {
            print("File move error: \(error)")
            DispatchQueue.main.async {
                if let index = self.downloads.firstIndex(where: { $0.id == id }) {
                    self.objectWillChange.send()
                    self.downloads[index].state = .failed
                    self.saveDownloads()
                }
            }
        }
    }
    
    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        guard let id = downloadTask.taskDescription else { return }
        
        let progress = Double(totalBytesWritten) / Double(totalBytesExpectedToWrite)
        
        DispatchQueue.main.async {
            // Safe index lookup
            if let index = self.downloads.firstIndex(where: { $0.id == id }) {
                if abs(self.downloads[index].progress - progress) > 0.01 {
                    self.downloads[index].progress = progress
                }
            }
        }
    }
}

// MARK: - AVAssetDownloadDelegate (HLS)

extension DownloadManager: AVAssetDownloadDelegate {
    
    func urlSession(_ session: URLSession, assetDownloadTask: AVAssetDownloadTask, didFinishDownloadingTo location: URL) {
        guard let id = assetDownloadTask.taskDescription else { return }
        
        print("✅ HLS Download finished to: \(location)")
        
        DispatchQueue.main.async {
            if let index = self.downloads.firstIndex(where: { $0.id == id }) {
                self.objectWillChange.send()
                
                self.downloads[index].state = .completed
                self.downloads[index].progress = 1.0
                self.downloads[index].localVideoUrl = location
                // Store relative path if needed for persistence across launches
                self.downloads[index].relativePath = location.relativePath
                
                self.activeAssetDownloads.removeValue(forKey: id)
                self.saveDownloads()
                
                // Process queue to start next download
                self.processQueue()
            }
        }
    }
    
    func urlSession(_ session: URLSession, assetDownloadTask: AVAssetDownloadTask, didLoad timeRange: CMTimeRange, totalTimeRangesLoaded loadedTimeRanges: [NSValue], timeRangeExpectedToLoad: CMTimeRange) {
        guard let id = assetDownloadTask.taskDescription else { return }
        
        var percentComplete = 0.0
        for value in loadedTimeRanges {
            let loadedTimeRange = value.timeRangeValue
            percentComplete += CMTimeGetSeconds(loadedTimeRange.duration) / CMTimeGetSeconds(timeRangeExpectedToLoad.duration)
        }
        
        DispatchQueue.main.async {
            if let index = self.downloads.firstIndex(where: { $0.id == id }) {
                if abs(self.downloads[index].progress - percentComplete) > 0.01 {
                    self.downloads[index].progress = percentComplete
                }
            }
        }
    }
}
