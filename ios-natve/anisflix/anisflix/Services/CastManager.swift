//
//  CastManager.swift
//  anisflix
//
//  Created by AI Assistant on 03/12/2025.
//

import Foundation
import Combine
#if canImport(GoogleCast)
import GoogleCast

class CastManager: NSObject, ObservableObject, GCKSessionManagerListener, GCKRemoteMediaClientListener {
    static let shared = CastManager()
    
    @Published var isConnected = false
    @Published var isConnecting = false
    @Published var deviceName: String?
    @Published var mediaStatus: GCKMediaStatus? 
    @Published var currentMediaUrl: URL?
    @Published var currentTitle: String? // Added for UI binding without GoogleCast imports
    @Published var currentArtwork: UIImage?
    @Published var currentPosterUrl: URL? // Stored for reloads
    @Published var currentSubtitles: [Subtitle] = [] // Moved declaration up // Stored for reloads

    // True when there's actually media loaded on the Chromecast
    var hasMediaLoaded: Bool {
        // Check if we have media URL or if the Chromecast reports having media
        return currentMediaUrl != nil || mediaStatus?.mediaInformation != nil
    }
    
    
    // UI Helpers (Facade to avoid importing GoogleCast in Views)
    var isPlaying: Bool {
        return mediaStatus?.playerState == .playing
    }
    


    // MARK: - Subtitle Config Helper
    func updateSubtitleConfig(activeUrl: String?, offset: Double) {
        guard let url = currentMediaUrl, let title = currentTitle else { return }
        var currentTime = getApproximateStreamPosition()
        
        // Fallback to last saved time if current time is 0 (likely due to buffering/loading state)
        if currentTime < 1.0 && lastSavedTime > 1.0 {
            print("⚠️ [CastManager] Current time is 0, using last saved time: \(Int(lastSavedTime))s")
            currentTime = lastSavedTime
        } else {
            print("🔄 [CastManager] Reloading media at: \(Int(currentTime))s")
        }
        
        loadMedia(
            url: url,
            title: title,
            posterUrl: currentPosterUrl,
            subtitles: currentSubtitles,
            activeSubtitleUrl: activeUrl,
            startTime: currentTime,
            isLive: false,
            subtitleOffset: offset,
            mediaId: currentMediaId,
            season: currentSeason,
            episode: currentEpisode
        )
    }
    
    var isBuffering: Bool {
        return mediaStatus?.playerState == .buffering
    }
    
    var currentDuration: TimeInterval {
        return mediaStatus?.mediaInformation?.streamDuration ?? 0
    }
    
    private let appId = "CC1AD845" // Default Media Receiver
    private var sessionManager: GCKSessionManager?
    


    
    // Add artwork download helper
    func downloadArtwork(from urlString: String) async {
        guard let url = URL(string: urlString) else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let image = UIImage(data: data) {
                await MainActor.run {
                    self.currentArtwork = image
                }
            }
        } catch {
            print("❌ [CastManager] Failed to download artwork: \(error)")
        }
    }
    
    // Fetch poster AND title from TMDB for session recovery
    func fetchMediaInfoFromTMDB(mediaId: Int, season: Int?, episode: Int?) async {
        print("🖼️ [CastManager] Fetching media info from TMDB for mediaId: \(mediaId), season: \(String(describing: season)), episode: \(String(describing: episode))")
        
        // Determine if it's a movie or TV show based on season/episode presence
        let isMovie = (season == nil && episode == nil)
        
        do {
            if isMovie {
                // Fetch movie details
                let endpoint = "movie/\(mediaId)"
                let urlString = "https://anisflix.vercel.app/api/tmdb-proxy?endpoint=\(endpoint)"
                guard let url = URL(string: urlString) else {
                    print("❌ [CastManager] Invalid movie TMDB URL")
                    return
                }
                
                print("📡 [CastManager] Fetching movie from: \(urlString)")
                let (data, _) = try await URLSession.shared.data(from: url)
                
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    print("📡 [CastManager] Movie response: \(json)")
                    
                    // Get title
                    if let title = json["title"] as? String {
                        await MainActor.run {
                            self.currentTitle = title
                            print("✅ [CastManager] Set movie title: \(title)")
                        }
                    }
                    
                    // Get poster
                    if let posterPath = json["poster_path"] as? String {
                        let posterUrl = "https://image.tmdb.org/t/p/w500\(posterPath)"
                        print("🖼️ [CastManager] Downloading movie poster: \(posterUrl)")
                        await downloadArtwork(from: posterUrl)
                    }
                }
            } else {
                // Fetch TV show details for title
                let tvEndpoint = "tv/\(mediaId)"
                let tvUrlString = "https://anisflix.vercel.app/api/tmdb-proxy?endpoint=\(tvEndpoint)"
                guard let tvUrl = URL(string: tvUrlString) else {
                    print("❌ [CastManager] Invalid TV TMDB URL")
                    return
                }
                
                print("📡 [CastManager] Fetching TV show from: \(tvUrlString)")
                let (tvData, _) = try await URLSession.shared.data(from: tvUrl)
                
                var showName = "Unknown Show"
                var posterPath: String? = nil
                
                if let tvJson = try JSONSerialization.jsonObject(with: tvData) as? [String: Any] {
                    print("📡 [CastManager] TV show response keys: \(tvJson.keys)")
                    
                    if let name = tvJson["name"] as? String {
                        showName = name
                    }
                    posterPath = tvJson["poster_path"] as? String
                }
                
                // Fetch episode details if we have season and episode
                var episodeName: String? = nil
                if let s = season, let e = episode {
                    let episodeEndpoint = "tv/\(mediaId)/season/\(s)/episode/\(e)"
                    let episodeUrlString = "https://anisflix.vercel.app/api/tmdb-proxy?endpoint=\(episodeEndpoint)"
                    
                    if let episodeUrl = URL(string: episodeUrlString) {
                        print("📡 [CastManager] Fetching episode from: \(episodeUrlString)")
                        let (episodeData, _) = try await URLSession.shared.data(from: episodeUrl)
                        
                        if let episodeJson = try JSONSerialization.jsonObject(with: episodeData) as? [String: Any] {
                            print("📡 [CastManager] Episode response keys: \(episodeJson.keys)")
                            episodeName = episodeJson["name"] as? String
                            
                            // Episode might have its own still image, but we prefer show poster
                        }
                    }
                }
                
                // Construct title as "ShowName - S1E5" or "ShowName - S1E5 - EpisodeName"
                var fullTitle = showName
                if let s = season, let e = episode {
                    fullTitle += " - S\(s)E\(e)"
                    if let epName = episodeName, !epName.isEmpty {
                        fullTitle += " - \(epName)"
                    }
                }
                
                await MainActor.run {
                    self.currentTitle = fullTitle
                    print("✅ [CastManager] Set TV show title: \(fullTitle)")
                }
                
                // Download poster
                if let path = posterPath {
                    let posterUrl = "https://image.tmdb.org/t/p/w500\(path)"
                    print("🖼️ [CastManager] Downloading TV poster: \(posterUrl)")
                    await downloadArtwork(from: posterUrl)
                }
            }
        } catch {
            print("❌ [CastManager] Failed to fetch from TMDB: \(error)")
        }
    }
    
    // Keep old method for backward compatibility but redirect to new one
    func fetchPosterFromTMDB(mediaId: Int, season: Int?, episode: Int?) async {
        await fetchMediaInfoFromTMDB(mediaId: mediaId, season: season, episode: episode)
    }
    
    // Fetch ONLY the poster, don't overwrite title (used during recovery when title is already set)
    func fetchPosterOnlyFromTMDB(mediaId: Int, season: Int?) async {
        print("🖼️ [CastManager] Fetching poster only from TMDB for mediaId: \(mediaId)")
        
        let isMovie = (season == nil)
        let endpoint = isMovie ? "movie/\(mediaId)" : "tv/\(mediaId)"
        let urlString = "https://anisflix.vercel.app/api/tmdb-proxy?endpoint=\(endpoint)"
        
        guard let url = URL(string: urlString) else {
            print("❌ [CastManager] Invalid TMDB URL")
            return
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let posterPath = json["poster_path"] as? String {
                let posterUrl = "https://image.tmdb.org/t/p/w500\(posterPath)"
                print("🖼️ [CastManager] Downloaded poster from TMDB: \(posterUrl)")
                await downloadArtwork(from: posterUrl)
            } else {
                print("⚠️ [CastManager] No poster_path in TMDB response")
            }
        } catch {
            print("❌ [CastManager] Failed to fetch poster from TMDB: \(error)")
        }
    }
    
    // Progress Tracking
    private var progressTimer: Timer?
    private var currentMediaId: Int?
    private var currentSeason: Int?
    private var currentEpisode: Int?
    private var lastSavedTime: TimeInterval = 0
    
    override init() {
        super.init()
        setupLifecycleObservers()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    private func setupLifecycleObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillTerminate),
            name: UIApplication.willTerminateNotification,
            object: nil
        )
    }
    
    @objc private func appWillResignActive() {
        print("📢 [CastManager] App going to background, saving progress...")
        saveCurrentProgress()
    }
    
    @objc private func appDidBecomeActive() {
        print("📢 [CastManager] App returning to foreground")
        // Restart timer if casting is active
        if isConnected, let status = mediaStatus, status.playerState == .playing {
            startProgressTracking()
        }
    }
    
    @objc private func appWillTerminate() {
        print("📢 [CastManager] App terminating, saving final progress...")
        saveCurrentProgress()
    }
    
    func initialize() {
        print("📢 [CastManager] Initializing...")
        let criteria = GCKDiscoveryCriteria(applicationID: appId)
        let options = GCKCastOptions(discoveryCriteria: criteria)
        options.physicalVolumeButtonsWillControlDeviceVolume = true
        
        GCKCastContext.setSharedInstanceWith(options)
        
        sessionManager = GCKCastContext.sharedInstance().sessionManager
        sessionManager?.add(self)
        
        // Check initial state
        if sessionManager?.hasConnectedCastSession() == true {
            print("🚨🚨🚨 [CastManager] INIT: Found existing connected session! 🚨🚨🚨")
            self.isConnected = true
            self.deviceName = sessionManager?.currentCastSession?.device.friendlyName
            
            // Immediately try to recover if we have an existing session
            if let session = sessionManager?.currentCastSession {
                print("🚨 [CastManager] INIT: Triggering recovery for existing session")
                handleSessionConnection(session: session)
            }
        } else {
            print("📢 [CastManager] INIT: No existing session found")
        }
        
        startDiscovery()
    }
    
    // @Published var currentSubtitles: [Subtitle] = [] // Moved to top property declarations
    
    // Track if recovery was attempted
    private var recoveryAttempted = false
    
    // MARK: - GCKSessionManagerListener
    
    func sessionManager(_ sessionManager: GCKSessionManager, didStart session: GCKSession) {
        print("🚨🚨🚨 [CastManager] SESSION_STARTED with device: \(session.device.friendlyName ?? "Unknown") 🚨🚨🚨")
        recoveryAttempted = false
        handleSessionConnection(session: session)
    }
    
    func sessionManager(_ sessionManager: GCKSessionManager, didResumeSession session: GCKSession) {
        print("🚨🚨🚨 [CastManager] SESSION_RESUMED with device: \(session.device.friendlyName ?? "Unknown") 🚨🚨🚨")
        recoveryAttempted = false
        handleSessionConnection(session: session)
    }
    
    private func handleSessionConnection(session: GCKSession) {
        print("🚨 [CastManager] handleSessionConnection called")
        isConnected = true
        isConnecting = false
        deviceName = session.device.friendlyName
        
        // Reset recovery flag for a fresh attempt
        recoveryAttempted = false
        
        guard let remoteMediaClient = session.remoteMediaClient else {
            print("❌ [CastManager] RemoteMediaClient is nil!")
            return
        }
        
        print("📢 [CastManager] RemoteMediaClient attached, adding listener")
        remoteMediaClient.add(self)
        
        // Session Recovery: Check for existing media
        if let mediaStatus = remoteMediaClient.mediaStatus, let mediaInfo = mediaStatus.mediaInformation {
            print("🚨 [CastManager] RECOVERY: Found existing media!")
            print("   - Content URL: \(mediaInfo.contentURL?.absoluteString ?? "nil")")
            print("   - Player State: \(mediaStatus.playerState.rawValue)")
            attemptRecovery(mediaInfo: mediaInfo, mediaStatus: mediaStatus)
        } else {
            print("⚠️ [CastManager] RECOVERY: mediaStatus is nil or has no mediaInfo")
            print("   - mediaStatus: \(String(describing: remoteMediaClient.mediaStatus))")
            print("   - Requesting status update from Chromecast...")
            
            // Explicitly request status from Chromecast - this will trigger didUpdateMediaStatus callback
            remoteMediaClient.requestStatus()
        }
    }
    
    // Separate recovery logic so it can be called from status update callback too
    private func attemptRecovery(mediaInfo: GCKMediaInformation, mediaStatus: GCKMediaStatus) {
        guard !recoveryAttempted else {
            print("📢 [CastManager] Recovery already attempted, skipping")
            return
        }
        recoveryAttempted = true
        
        print("🚨 [CastManager] ATTEMPTING FULL RECOVERY...")
        self.mediaStatus = mediaStatus
                
                var artworkUrl: String? = nil
                var recoveredMediaId: Int? = nil
                
                // Recover Metadata for UI
                if let metadata = mediaInfo.metadata {
                    let recoveredTitle = metadata.string(forKey: kGCKMetadataKeyTitle)
                    print("   - Recovered Title from metadata: \(recoveredTitle ?? "nil")")
                    if let title = recoveredTitle, !title.isEmpty {
                        self.currentTitle = title
                    }
                    
                    // Recover Artwork URL from metadata images
                    if let images = metadata.images() as? [GCKImage], let image = images.first {
                        print("   - Found artwork URL in metadata: \(image.url)")
                        artworkUrl = image.url.absoluteString
                    }
                } else {
                    print("   - No metadata found in mediaInfo")
                }
                
                // Recover custom data (mediaId, season, episode, posterUrl, subtitles)
                if let customData = mediaInfo.customData as? [String: Any] {
                    print("   - Found customData: \(customData.keys)") // Print keys only to avoid spam
                    
                    if let mediaId = customData["mediaId"] as? Int {
                        self.currentMediaId = mediaId
                        recoveredMediaId = mediaId
                        print("   - Recovered mediaId: \(mediaId)")
                    }
                    if let season = customData["season"] as? Int {
                        self.currentSeason = season
                    }
                    if let episode = customData["episode"] as? Int {
                        self.currentEpisode = episode
                    }
                    
                    // Recover posterUrl
                    if let posterUrlString = customData["posterUrl"] as? String {
                        print("   - Found posterUrl in customData: \(posterUrlString)")
                        artworkUrl = posterUrlString
                    }
                    
                    // Recover Subtitles
                    if let subtitlesJson = customData["subtitles"] as? String {
                        print("   - Found subtitles JSON in customData")
                        if let data = subtitlesJson.data(using: .utf8) {
                            do {
                                let subtitles = try JSONDecoder().decode([Subtitle].self, from: data)
                                DispatchQueue.main.async {
                                    self.currentSubtitles = subtitles
                                    print("✅ [CastManager] Recovered \(subtitles.count) subtitles")
                                }
                            } catch {
                                print("❌ [CastManager] Failed to decode subtitles: \(error)")
                            }
                        }
                    }
                    
                    // Fallback 1: Local Cache
                    if self.currentSubtitles.isEmpty, let mediaId = recoveredMediaId {
                         print("⚠️ [CastManager] Subtitles checking local cache for mediaId: \(mediaId)")
                         if let cachedSubtitles = self.loadSubtitlesFromLocalCache(mediaId: mediaId) {
                             DispatchQueue.main.async {
                                 self.currentSubtitles = cachedSubtitles
                                 print("✅ [CastManager] Recovered \(cachedSubtitles.count) subtitles from LOCAL CACHE")
                             }
                         } else {
                             // Fallback 2: Re-fetch from API (IMDB ID resolution first)
                             print("⚠️ [CastManager] Local Cache empty. Attempting to fetch from API...")
                             let season = self.currentSeason
                             let episode = self.currentEpisode
                             
                             Task {
                                 // Determine type
                                 let type = (season != nil && episode != nil) ? "tv" : "movie"
                                 
                                 if let imdbId = await StreamingService.shared.fetchImdbId(tmdbId: mediaId, type: type) {
                                     print("✅ [CastManager] Resolved IMDB ID: \(imdbId)")
                                     let fetchedSubtitles = await StreamingService.shared.getSubtitles(imdbId: imdbId, season: season, episode: episode)
                                     
                                     if !fetchedSubtitles.isEmpty {
                                         DispatchQueue.main.async {
                                             self.currentSubtitles = fetchedSubtitles
                                             print("✅ [CastManager] Fetched \(fetchedSubtitles.count) subtitles from API")
                                             
                                             // Save to cache for next time
                                             self.saveSubtitlesToLocalCache(mediaId: mediaId, subtitles: fetchedSubtitles)
                                         }
                                     } else {
                                         print("⚠️ [CastManager] No subtitles found via API")
                                     }
                                 } else {
                                     print("❌ [CastManager] Could not resolve IMDB ID for TMDB: \(mediaId)")
                                 }
                             }
                         }
                    }
                } else {
                    print("   - No customData found (Default Receiver may not preserve it)")
                }
                
                // Now try to recover artwork
                // IMPORTANT: We already set currentTitle from metadata - don't overwrite it!
                Task {
                    // 1. First, try to download artwork from the URL we already have
                    if let urlString = artworkUrl {
                        print("🖼️ [CastManager] Downloading artwork from recovered URL: \(urlString)")
                        await downloadArtwork(from: urlString)
                    }
                    
                    // 2. If artwork is still nil AND we have mediaId, try TMDB poster only
                    let needsArtwork = await MainActor.run { self.currentArtwork == nil }
                    if needsArtwork, let mediaId = recoveredMediaId {
                        print("🖼️ [CastManager] Artwork still nil, fetching poster from TMDB for mediaId: \(mediaId)")
                        await fetchPosterOnlyFromTMDB(mediaId: mediaId, season: self.currentSeason)
                    }
                    
                    await MainActor.run {
                        print("✅ [CastManager] Recovery complete. Title: \(self.currentTitle ?? "nil"), Artwork: \(self.currentArtwork != nil ? "loaded" : "nil")")
                    }
                }
                
                // Resume Tracking
                if mediaStatus.playerState == .playing {
                    startProgressTracking()
                }
    }
    
    func sessionManager(_ sessionManager: GCKSessionManager, didEnd session: GCKSession, withError error: Error?) {
        print("❌ [CastManager] Cast Session Ended. Error: \(error?.localizedDescription ?? "None")")
        isConnected = false
        isConnecting = false
        deviceName = nil
        mediaStatus = nil
        currentMediaUrl = nil
        
        stopProgressTracking()
    }
    
    func sessionManager(_ sessionManager: GCKSessionManager, didFailToStart session: GCKSession, withError error: Error) {
        print("❌ [CastManager] Cast Session Failed to Start: \(error.localizedDescription)")
        isConnected = false
        isConnecting = false
        deviceName = nil
    }
    
    func sessionManager(_ sessionManager: GCKSessionManager, willStart session: GCKSession) {
        print("🔄 [CastManager] Cast Session Connecting to \(session.device.friendlyName ?? "Unknown")...")
        // Ensure we are on main thread
        DispatchQueue.main.async {
            self.isConnecting = true
        }
    }
    
    // MARK: - Media Control


    


    // MARK: - Media Control
    
    func loadMedia(url: URL, title: String, posterUrl: URL?, subtitles: [Subtitle] = [], activeSubtitleUrl: String? = nil, startTime: TimeInterval = 0, isLive: Bool = false, subtitleOffset: Double = 0, mediaId: Int? = nil, season: Int? = nil, episode: Int? = nil) {
        print("📢 [CastManager] Request to load media: \(title)")
        print("📢 [CastManager] URL: \(url.absoluteString)")
        print("📢 [CastManager] isLive: \(isLive)")
        
        self.currentMediaUrl = url
        self.currentTitle = title // Set explicitly from request
        self.currentPosterUrl = posterUrl
        self.currentMediaId = mediaId
        self.currentSeason = season
        self.currentEpisode = episode
        self.currentSubtitles = subtitles // Store for Control Sheet access
        
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else {
            print("⚠️ [CastManager] No active Cast session or RemoteMediaClient missing")
            return
        }
        
        print("📢 [CastManager] Loading media to device: \(session.device.friendlyName ?? "Unknown")")
        
        let metadata = GCKMediaMetadata(metadataType: .movie)
        metadata.setString(title, forKey: kGCKMetadataKeyTitle)
        
        if let posterUrl = posterUrl {
            metadata.addImage(GCKImage(url: posterUrl, width: 480, height: 720))
            // Trigger local download for MiniPlayer
            Task {
                await downloadArtwork(from: posterUrl.absoluteString)
            }
        }
        
        // Determine content type
        let contentType: String
        let streamType: GCKMediaStreamType
        
        if isLive {
            contentType = "application/x-mpegURL"
            streamType = .live
        } else if url.pathExtension == "m3u8" {
            contentType = "application/x-mpegURL"
            streamType = .buffered
        } else if url.pathExtension == "mpd" {
            contentType = "application/dash+xml"
            streamType = .buffered
        } else {
            contentType = "video/mp4"
            streamType = .buffered
        }
        
        print("📢 [CastManager] Content Type: \(contentType), Stream Type: \(streamType == .buffered ? "Buffered" : "Live")")
        
        // Configure Subtitles
        var tracks: [GCKMediaTrack] = []
        var activeTrackIds: [NSNumber] = []
        
        print("📢 [CastManager] Processing \(subtitles.count) subtitles")
        
        for (index, sub) in subtitles.enumerated() {
            // Construct Proxy URL
            // https://anisflix.vercel.app/api/media-proxy?type=subtitle&url=<ENCODED_URL>&offset=<OFFSET>
            var components = URLComponents(string: "https://anisflix.vercel.app/api/media-proxy")
            var queryItems = [
                URLQueryItem(name: "type", value: "subtitle"),
                URLQueryItem(name: "url", value: sub.url)
            ]
            if subtitleOffset != 0 {
                queryItems.append(URLQueryItem(name: "offset", value: String(subtitleOffset)))
            }
            components?.queryItems = queryItems
            
            guard let proxyUrl = components?.url else {
                print("⚠️ [CastManager] Failed to construct proxy URL for subtitle: \(sub.label)")
                continue
            }
            
            let trackId = index + 1
            if let track = GCKMediaTrack(
                identifier: trackId,
                contentIdentifier: proxyUrl.absoluteString,
                contentType: "text/vtt",
                type: .text,
                textSubtype: .subtitles,
                name: sub.label,
                languageCode: mapLanguageCode(sub.code),
                customData: nil
            ) {
                tracks.append(track)
                
                if let activeUrl = activeSubtitleUrl, activeUrl == sub.url {
                    print("📢 [CastManager] Activating subtitle: \(sub.label)")
                    activeTrackIds.append(NSNumber(value: trackId))
                }
            } else {
                print("⚠️ [CastManager] Failed to create GCKMediaTrack for subtitle: \(sub.label)")
            }
        }
        
        // Store custom data for session recovery (mediaId, season, episode, posterUrl)
        var customData: [String: Any] = [:]
        if let mediaId = mediaId {
            customData["mediaId"] = mediaId
            print("📢 [CastManager] Storing mediaId in customData: \(mediaId)")
        } else {
            print("⚠️ [CastManager] No mediaId provided - session recovery will be limited!")
        }
        if let season = season {
            customData["season"] = season
            print("📢 [CastManager] Storing season in customData: \(season)")
        }
        if let episode = episode {
            customData["episode"] = episode
            print("📢 [CastManager] Storing episode in customData: \(episode)")
        }
        if let posterUrl = posterUrl {
            customData["posterUrl"] = posterUrl.absoluteString
            print("📢 [CastManager] Storing posterUrl in customData: \(posterUrl.absoluteString)")
        }
        
        // Encode and store subtitles
        if !subtitles.isEmpty {
            do {
                let data = try JSONEncoder().encode(subtitles)
                if let jsonString = String(data: data, encoding: .utf8) {
                    customData["subtitles"] = jsonString
                    print("📢 [CastManager] Stored \(subtitles.count) subtitles in customData")
                }
            } catch {
                print("❌ [CastManager] Failed to encode subtitles for customData: \(error)")
            }
            
            // Also save to local cache as backup
            if let mediaId = mediaId {
                saveSubtitlesToLocalCache(mediaId: mediaId, subtitles: subtitles)
            }
        }
        
        print("📢 [CastManager] Final customData keys: \(customData.keys)")
        
        let mediaInfoBuilder = GCKMediaInformationBuilder(contentURL: url)
        mediaInfoBuilder.streamType = streamType
        mediaInfoBuilder.contentType = contentType
        mediaInfoBuilder.metadata = metadata
        mediaInfoBuilder.mediaTracks = tracks
        mediaInfoBuilder.customData = customData.isEmpty ? nil : customData
        
        // CRITICAL: Set HLS segment format to TS.
        // This is required for correct playback and enables TV remote control (HDMI-CEC) on some receivers.
        if contentType == "application/x-mpegURL" || contentType == "application/vnd.apple.mpegurl" {
            mediaInfoBuilder.hlsSegmentFormat = .TS
        }
        
        let mediaInfo = mediaInfoBuilder.build()
        
        let loadOptions = GCKMediaLoadOptions()
        loadOptions.playPosition = startTime
        loadOptions.autoplay = true
        loadOptions.activeTrackIDs = activeTrackIds
        
        print("📢 [CastManager] Sending load request...")
        remoteMediaClient.loadMedia(mediaInfo, with: loadOptions)
        
        // Failsafe: If no tracks selected, explicitly disable again after a short delay
        // This fixes the issue where Default Receiver might auto-enable the first track
        if activeTrackIds.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                print("📢 [CastManager] Failsafe: Ensuring subtitles are disabled...")
                remoteMediaClient.setActiveTrackIDs([])
            }
        }
    }
    
    func seek(to time: TimeInterval) {
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else { return }
        
        let seekOptions = GCKMediaSeekOptions()
        seekOptions.interval = time
        seekOptions.resumeState = .play
        remoteMediaClient.seek(with: seekOptions)
    }
    
    func play() {
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else { return }
        remoteMediaClient.play()
    }
    
    func pause() {
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else { return }
        remoteMediaClient.pause()
    }
    
    func getApproximateStreamPosition() -> TimeInterval {
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else { return 0 }
        return remoteMediaClient.approximateStreamPosition()
    }

    func setActiveTrack(url: String?) {
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else { return }
        
        if let url = url {
            // New logic: Find track by NAME (Label) first to avoid URL/Offset mismatches
            // 1. Find the subtitle object for this URL
            if let subtitle = currentSubtitles.first(where: { $0.url == url }) {
                print("📢 [CastManager] Looking for track with name: \(subtitle.label)")
                
                if let tracks = remoteMediaClient.mediaStatus?.mediaInformation?.mediaTracks,
                   let track = tracks.first(where: { $0.name == subtitle.label }) {
                    
                    print("✅ [CastManager] Found track by name: \(track.name ?? "Unknown") (ID: \(track.identifier))")
                    remoteMediaClient.setActiveTrackIDs([NSNumber(value: track.identifier)])
                    return
                }
            }
            
            // Fallback: Try strict URL matching (Old logic)
            var components = URLComponents(string: "https://anisflix.vercel.app/api/media-proxy")
            components?.queryItems = [
                URLQueryItem(name: "type", value: "subtitle"),
                URLQueryItem(name: "url", value: url)
            ]
            
            if let proxyUrl = components?.url?.absoluteString,
               let tracks = remoteMediaClient.mediaStatus?.mediaInformation?.mediaTracks {
                
                // Fuzzy match: check if contentIdentifier CONTAINS the proxy base URL (ignoring offset)
                if let track = tracks.first(where: { $0.contentIdentifier?.contains(url) == true }) {
                     print("✅ [CastManager] Found track by fuzzy URL match: \(track.name ?? "Unknown")")
                     remoteMediaClient.setActiveTrackIDs([NSNumber(value: track.identifier)])
                     return
                }
            }
        }
        
        // If url is nil or not found, disable subtitles
        print("📢 [CastManager] Disabling subtitles (url or track not found)")
        remoteMediaClient.setActiveTrackIDs([])
    }
    
    func sendSubtitleFontSize(_ fontSize: Double) {
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else { return }
        
        print("🔤 [CastManager] Updating subtitle font size to: \(Int(fontSize))%")
        
        // Create text track style with updated font scale
        let textTrackStyle = GCKMediaTextTrackStyle.createDefault()
        textTrackStyle.fontScale = CGFloat(fontSize / 100.0) // Convert percentage to scale (e.g., 120% -> 1.2)
        textTrackStyle.foregroundColor = GCKColor.white()
        textTrackStyle.backgroundColor = GCKColor.init(uiColor: UIColor.black.withAlphaComponent(0.7))
        textTrackStyle.edgeType = .dropShadow
        textTrackStyle.edgeColor = GCKColor.black()
        
        // Apply the text track style
        remoteMediaClient.setTextTrackStyle(textTrackStyle)
    }
    
    // Get currently active subtitle based on active tracks
    func getActiveSubtitle() -> Subtitle? {
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient,
              let activeTrackIDs = remoteMediaClient.mediaStatus?.activeTrackIDs as? [NSNumber],
              let tracks = remoteMediaClient.mediaStatus?.mediaInformation?.mediaTracks else {
            return nil
        }
        
        // Find the active track ID
        for trackIdValue in activeTrackIDs {
             if let track = tracks.first(where: { $0.identifier == trackIdValue.intValue && $0.type == .text }) {
                 // Found active text track
                 let contentId = track.contentIdentifier
                 print("🔍 [CastManager] Active active text track: \(track.name ?? "Unknown") (ID: \(contentId ?? "nil"))")
                 
                 // Decode contentId (proxy URL) to find original URL
                 // Format: https://anisflix.vercel.app/api/media-proxy?type=subtitle&url=<ENCODED_URL>...
                 if let contentId = contentId, let components = URLComponents(string: contentId),
                    let items = components.queryItems,
                    let originalUrl = items.first(where: { $0.name == "url" })?.value {
                     
                     // Find matching subtitle in currentSubtitles
                     return currentSubtitles.first { $0.url == originalUrl }
                 }
             }
        }
        return nil
    }
    
    // MARK: - GCKRemoteMediaClientListener
    
    func remoteMediaClient(_ client: GCKRemoteMediaClient, didUpdate mediaStatus: GCKMediaStatus?) {
        self.mediaStatus = mediaStatus
        if let status = mediaStatus {
            print("📢 [CastManager] Media Status Update: State=\(status.playerState.rawValue), IdleReason=\(status.idleReason.rawValue)")
            
            // Trigger recovery if we haven't done it yet and we now have media info
            if !recoveryAttempted, let mediaInfo = status.mediaInformation {
                print("🚨 [CastManager] STATUS_UPDATE: Triggering delayed recovery!")
                attemptRecovery(mediaInfo: mediaInfo, mediaStatus: status)
            }
            
            // Always save progress on status update (works in background too)
            saveCurrentProgress()
            
            if status.playerState == .playing {
                startProgressTracking()
            } else {
                if status.playerState != .buffering {
                     stopProgressTracking()
                }
            }
        }
    }
    
    // MARK: - Progress Tracking
    
    private func startProgressTracking() {
        if progressTimer == nil {
            print("⏱️ [CastManager] Starting progress tracking (background-safe)")
            let timer = Timer(timeInterval: 5.0, repeats: true) { [weak self] _ in
                self?.saveCurrentProgress()
            }
            // Add to common RunLoop mode so it works in background
            RunLoop.current.add(timer, forMode: .common)
            progressTimer = timer
        }
    }
    
    private func stopProgressTracking() {
        if progressTimer != nil {
            print("⏱️ [CastManager] Stopping progress tracking")
            progressTimer?.invalidate()
            progressTimer = nil
        }
    }
    
    private func saveCurrentProgress() {
        guard let mediaId = currentMediaId else { return }
        guard let session = sessionManager?.currentCastSession,
              let remoteMediaClient = session.remoteMediaClient else { return }
        
        let currentTime = remoteMediaClient.approximateStreamPosition()
        let duration = remoteMediaClient.mediaStatus?.mediaInformation?.streamDuration ?? 0
        
        // Debounce: only save if time changed by at least 2 seconds
        if currentTime > 0 && duration > 0 && abs(currentTime - lastSavedTime) >= 2.0 {
            lastSavedTime = currentTime
            WatchProgressManager.shared.saveProgress(
                mediaId: mediaId,
                season: currentSeason,
                episode: currentEpisode,
                currentTime: currentTime,
                duration: duration
            )
            print("⏱️ [CastManager] Saved progress: \(Int(currentTime))/\(Int(duration))s (ID: \(mediaId))")
        }
    }
    
    // MARK: - Device Discovery
    
    @Published var discoveredDevices: [GCKDevice] = []
    
    func startDiscovery() {
        print("📢 [CastManager] Starting discovery...")
        
        // Ensure we are on main thread
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            GCKCastContext.sharedInstance().discoveryManager.add(self)
            GCKCastContext.sharedInstance().discoveryManager.startDiscovery()
            GCKCastContext.sharedInstance().discoveryManager.passiveScan = false // Force active scan
            
            // Initialize with current devices
            if GCKCastContext.sharedInstance().discoveryManager.deviceCount > 0 {
                let count = GCKCastContext.sharedInstance().discoveryManager.deviceCount
                print("📢 [CastManager] Found \(count) existing devices")
                self.discoveredDevices = (0..<count).compactMap { GCKCastContext.sharedInstance().discoveryManager.device(at: $0) }
            } else {
                print("📢 [CastManager] No existing devices found at start")
                self.discoveredDevices = []
            }
        }
    }
    
    func restartDiscovery() {
        print("🔄 [CastManager] Restarting discovery...")
        stopDiscovery()
        // Clear list to force refresh UI
        self.discoveredDevices = []
        startDiscovery()
    }
    
    func stopDiscovery() {
        GCKCastContext.sharedInstance().discoveryManager.remove(self)
        GCKCastContext.sharedInstance().discoveryManager.stopDiscovery()
    }
    
    func connect(to device: GCKDevice) {
        print("📢 [CastManager] Connecting to device: \(device.friendlyName ?? "Unknown")")
        sessionManager?.startSession(with: device)
    }
    
    func disconnect() {
        print("📢 [CastManager] Disconnecting...")
        sessionManager?.endSessionAndStopCasting(true)
    }
    
    // MARK: - GCKDiscoveryManagerListener
    
    func discoveryManager(_ discoveryManager: GCKDiscoveryManager, didInsert device: GCKDevice, at index: UInt) {
        print("📢 [CastManager] Discovered device: \(device.friendlyName ?? "Unknown")")
        DispatchQueue.main.async {
            if !self.discoveredDevices.contains(where: { $0.deviceID == device.deviceID }) {
                self.discoveredDevices.append(device)
            }
        }
    }
    
    func discoveryManager(_ discoveryManager: GCKDiscoveryManager, didRemove device: GCKDevice, at index: UInt) {
        print("📢 [CastManager] Removed device: \(device.friendlyName ?? "Unknown")")
        DispatchQueue.main.async {
            self.discoveredDevices.removeAll(where: { $0.deviceID == device.deviceID })
        }
    }
    
    func discoveryManager(_ discoveryManager: GCKDiscoveryManager, didUpdate device: GCKDevice, at index: UInt) {
        print("📢 [CastManager] Updated device: \(device.friendlyName ?? "Unknown")")
        DispatchQueue.main.async {
            if let idx = self.discoveredDevices.firstIndex(where: { $0.deviceID == device.deviceID }) {
                self.discoveredDevices[idx] = device
            }
        }
    }

    // MARK: - Helpers
    
    private func mapLanguageCode(_ code: String) -> String {
        switch code.lowercased() {
        case "fre", "fra": return "fr"
        case "eng": return "en"
        case "spa": return "es"
        case "ger", "deu": return "de"
        case "ita": return "it"
        case "por": return "pt"
        case "rus": return "ru"
        case "ara": return "ar"
        case "chi", "zho": return "zh"
        case "jpn": return "ja"
        case "kor": return "ko"
        case "tur": return "tr"
        default: return code
        }
    }
    
    // MARK: - Local Cache Helpers
    
    private func saveSubtitlesToLocalCache(mediaId: Int, subtitles: [Subtitle]) {
        do {
            let data = try JSONEncoder().encode(subtitles)
            UserDefaults.standard.set(data, forKey: "cast_subtitles_\(mediaId)")
            print("💾 [CastManager] Cached \(subtitles.count) subtitles locally for mediaId: \(mediaId)")
        } catch {
            print("❌ [CastManager] Failed to cache subtitles locally: \(error)")
        }
    }
    
    private func loadSubtitlesFromLocalCache(mediaId: Int) -> [Subtitle]? {
        guard let data = UserDefaults.standard.data(forKey: "cast_subtitles_\(mediaId)") else {
            return nil
        }
        do {
            let subtitles = try JSONDecoder().decode([Subtitle].self, from: data)
            return subtitles
        } catch {
            print("❌ [CastManager] Failed to decode cached subtitles: \(error)")
            return nil
        }
    }
}

extension CastManager: GCKDiscoveryManagerListener {}
#else
// Dummy implementation for when GoogleCast SDK is missing

enum GCKMediaPlayerState {
    case paused
    case playing
    case buffering
    case idle
    case unknown
}

struct GCKMediaInformation {
    var streamDuration: TimeInterval = 0
}

struct GCKMediaStatus {
    var playerState: GCKMediaPlayerState = .unknown
    var mediaInformation: GCKMediaInformation?
}

class CastManager: NSObject, ObservableObject {
    static let shared = CastManager()
    
    @Published var isConnected = false
    @Published var isConnecting = false
    @Published var deviceName: String?
    @Published var mediaStatus: GCKMediaStatus?
    @Published var currentMediaUrl: URL?
    
    override init() {
        super.init()
    }
    
    func initialize() {
        print("⚠️ Google Cast SDK not available. Casting disabled.")
    }
    
    func loadMedia(url: URL, title: String, posterUrl: URL?, subtitles: [Subtitle] = [], activeSubtitleUrl: String? = nil, startTime: TimeInterval = 0, isLive: Bool = false, subtitleOffset: Double = 0, mediaId: Int? = nil, season: Int? = nil, episode: Int? = nil) {
        print("⚠️ Google Cast SDK not available. Cannot load media.")
    }
    
    func seek(to time: TimeInterval) {}
    func play() {}
    func pause() {}
    func getApproximateStreamPosition() -> TimeInterval { return 0 }
    func sendSubtitleFontSize(_ fontSize: Double) {}
}
#endif
