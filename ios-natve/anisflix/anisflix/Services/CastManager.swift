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
    @Published var currentArtwork: UIImage? // Published for UI binding
    
    private let appId = "CC1AD845" // Default Media Receiver
    private var sessionManager: GCKSessionManager?
    
    // ... (Init/Deinit same as before)
    
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
            print("📢 [CastManager] Found existing connected session")
            self.isConnected = true
            self.deviceName = sessionManager?.currentCastSession?.device.friendlyName
        } else {
            print("📢 [CastManager] No existing session found")
        }
        
        startDiscovery()
    }
    
    @Published var currentSubtitles: [Subtitle] = []
    
    // MARK: - GCKSessionManagerListener
    
    func sessionManager(_ sessionManager: GCKSessionManager, didStart session: GCKSession) {
        print("✅ [CastManager] Cast Session Started with device: \(session.device.friendlyName ?? "Unknown")")
        handleSessionConnection(session: session)
    }
    
    func sessionManager(_ sessionManager: GCKSessionManager, didResumeSession session: GCKSession) {
        print("✅ [CastManager] Cast Session Resumed with device: \(session.device.friendlyName ?? "Unknown")")
        handleSessionConnection(session: session)
    }
    
    private func handleSessionConnection(session: GCKSession) {
        isConnected = true
        isConnecting = false
        deviceName = session.device.friendlyName
        
        if let remoteMediaClient = session.remoteMediaClient {
            print("📢 [CastManager] RemoteMediaClient attached")
            remoteMediaClient.add(self)
            
            // Session Recovery: Check for existing media
            if let mediaStatus = remoteMediaClient.mediaStatus, let mediaInfo = mediaStatus.mediaInformation {
                print("🔄 [CastManager] Recovered existing media session")
                self.mediaStatus = mediaStatus
                
                // Recover Metadata for UI
                if let metadata = mediaInfo.metadata {
                    print("   - Title: \(metadata.string(forKey: kGCKMetadataKeyTitle) ?? "Unknown")")
                    
                    // Recover Artwork
                    if let images = metadata.images() as? [GCKImage], let image = images.first {
                        Task {
                            await downloadArtwork(from: image.url.absoluteString)
                        }
                    }
                }
                
                // Resume Tracking
                if mediaStatus.playerState == .playing {
                    startProgressTracking()
                }
            }
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
    
    func loadMedia(url: URL, title: String, posterUrl: URL?, subtitles: [Subtitle] = [], activeSubtitleUrl: String? = nil, startTime: TimeInterval = 0, isLive: Bool = false, subtitleOffset: Double = 0, mediaId: Int? = nil, season: Int? = nil, episode: Int? = nil) {
        print("📢 [CastManager] Request to load media: \(title)")
        print("📢 [CastManager] URL: \(url.absoluteString)")
        print("📢 [CastManager] isLive: \(isLive)")
        
        self.currentMediaUrl = url
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
        
        let mediaInfoBuilder = GCKMediaInformationBuilder(contentURL: url)
        mediaInfoBuilder.streamType = streamType
        mediaInfoBuilder.contentType = contentType
        mediaInfoBuilder.metadata = metadata
        mediaInfoBuilder.mediaTracks = tracks
        
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
            // Find track ID for this URL
            // We need to reconstruct the proxy URL to match
            // https://anisflix.vercel.app/api/media-proxy?type=subtitle&url=<ENCODED_URL>
            var components = URLComponents(string: "https://anisflix.vercel.app/api/media-proxy")
            components?.queryItems = [
                URLQueryItem(name: "type", value: "subtitle"),
                URLQueryItem(name: "url", value: url)
            ]
            
            if let proxyUrl = components?.url?.absoluteString,
               let tracks = remoteMediaClient.mediaStatus?.mediaInformation?.mediaTracks {
                
                if let track = tracks.first(where: { $0.contentIdentifier == proxyUrl }) {
                    print("📢 [CastManager] Switching subtitle to: \(track.name ?? "Unknown") (ID: \(track.identifier))")
                    remoteMediaClient.setActiveTrackIDs([NSNumber(value: track.identifier)])
                    return
                }
            }
        }
        
        // If url is nil or not found, disable subtitles
        print("📢 [CastManager] Disabling subtitles")
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
    
    // MARK: - GCKRemoteMediaClientListener
    
    func remoteMediaClient(_ client: GCKRemoteMediaClient, didUpdate mediaStatus: GCKMediaStatus?) {
        self.mediaStatus = mediaStatus
        if let status = mediaStatus {
            print("📢 [CastManager] Media Status Update: State=\(status.playerState.rawValue), IdleReason=\(status.idleReason.rawValue)")
            
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
