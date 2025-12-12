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
    
    private let downloadsKey = "saved_downloads"
    
    var backgroundCompletionHandler: (() -> Void)?
    
    override init() {
        super.init()
        
        // Standard Session
        let config = URLSessionConfiguration.background(withIdentifier: "com.anisflix.backgroundDownload")
        config.isDiscretionary = false
        config.sessionSendsLaunchEvents = true
        urlSession = URLSession(configuration: config, delegate: self, delegateQueue: OperationQueue.main)
        
        // HLS Session
        let assetConfig = URLSessionConfiguration.background(withIdentifier: "com.anisflix.assetDownload")
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
    }
    
    // MARK: - Public API
    
    func startDownload(source: StreamingSource, media: Media, season: Int? = nil, episode: Int? = nil, extractedUrl: String? = nil) {
        let id = UUID().uuidString
        let finalUrl = extractedUrl ?? source.url
        
        // Detect HLS
        let isHLS = finalUrl.contains(".m3u8") || 
                    source.type == "hls" ||
                    source.provider == "vidmoly" || 
                    source.provider == "vidzy" ||
                    source.provider == "vixsrc"
        
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
            state: .waiting,
            progress: 0.0,
            isHLS: isHLS
        )
        
        downloads.append(item)
        saveDownloads()
        
        if isHLS {
            startHLSDownload(for: item)
        } else {
            startDownloadTask(for: item)
        }
        
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
                task.cancel(byProducingResumeData: { resumeData in
                    if let data = resumeData {
                        self.resumeDataMap[id] = data
                    }
                })
                downloadTasks.removeValue(forKey: id)
            }
        }
        
        downloads[index].state = .paused
        saveDownloads()
    }
    
    func resumeDownload(id: String) {
        guard let index = downloads.firstIndex(where: { $0.id == id }) else { return }
        let item = downloads[index]
        
        if item.isHLS {
            if let task = activeAssetDownloads[id] {
                task.resume()
            } else {
                // Restart HLS download if task is gone (AVAssetDownloadTask supports resuming automatically if asset exists)
                startHLSDownload(for: item)
            }
        } else {
            if let resumeData = resumeDataMap[id] {
                let task = urlSession.downloadTask(withResumeData: resumeData)
                task.taskDescription = id
                task.resume()
                downloadTasks[id] = task
                resumeDataMap.removeValue(forKey: id)
            } else {
                startDownloadTask(for: item)
            }
        }
        
        downloads[index].state = .downloading
        saveDownloads()
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
        for sub in item.localSubtitles {
            try? FileManager.default.removeItem(at: sub.url)
        }
        
        downloads.remove(at: index)
        saveDownloads()
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
            (item.state == .downloading || item.state == .waiting)
        }
    }
    
    func getDownload(mediaId: Int, season: Int?, episode: Int?, sourceId: String? = nil) -> DownloadItem? {
        return downloads.first { item in
            item.mediaId == mediaId &&
            item.season == season &&
            item.episode == episode &&
            (sourceId == nil || item.sourceId == sourceId)
        }
    }
    
    // MARK: - Private Helpers
    
    private func startDownloadTask(for item: DownloadItem) {
        guard let url = URL(string: item.videoUrl) else { return }
        
        let task = urlSession.downloadTask(with: url)
        task.taskDescription = item.id
        task.resume()
        
        downloadTasks[item.id] = task
        
        updateState(for: item.id, state: .downloading)
    }
    
    private func startHLSDownload(for item: DownloadItem) {
        guard let url = URL(string: item.videoUrl) else { return }
        let asset = AVURLAsset(url: url)
        
        // Create an AVAssetDownloadTask
        // We use the item.id as the asset title for identification
        if let task = assetDownloadSession.makeAssetDownloadTask(asset: asset, assetTitle: item.title, assetArtworkData: nil, options: nil) {
            task.taskDescription = item.id
            task.resume()
            activeAssetDownloads[item.id] = task
            updateState(for: item.id, state: .downloading)
        }
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

extension DownloadManager: URLSessionTaskDelegate {
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let id = task.taskDescription,
              let index = downloads.firstIndex(where: { $0.id == id }) else { return }
        
        if let error = error {
            print("Download error (Task: \(id)): \(error)")
            if (error as NSError).code != NSURLErrorCancelled {
                DispatchQueue.main.async {
                    self.downloads[index].state = .failed
                    self.saveDownloads()
                }
            }
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
