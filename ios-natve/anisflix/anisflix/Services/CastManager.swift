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
    
    private let appId = "CC1AD845" // Default Media Receiver
    private var sessionManager: GCKSessionManager?
    
    override init() {
        super.init()
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
    
    // MARK: - GCKSessionManagerListener
    
    func sessionManager(_ sessionManager: GCKSessionManager, didStart session: GCKSession) {
        print("✅ [CastManager] Cast Session Started with device: \(session.device.friendlyName ?? "Unknown")")
        isConnected = true
        isConnecting = false
        deviceName = session.device.friendlyName
        
        if let remoteMediaClient = session.remoteMediaClient {
            print("📢 [CastManager] RemoteMediaClient attached")
            remoteMediaClient.add(self)
        }
    }
    
    func sessionManager(_ sessionManager: GCKSessionManager, didEnd session: GCKSession, withError error: Error?) {
        print("❌ [CastManager] Cast Session Ended. Error: \(error?.localizedDescription ?? "None")")
        isConnected = false
        isConnecting = false
        deviceName = nil
        mediaStatus = nil
        currentMediaUrl = nil
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
    
    func loadMedia(url: URL, title: String, posterUrl: URL?, subtitles: [Subtitle] = [], activeSubtitleUrl: String? = nil, startTime: TimeInterval = 0, isLive: Bool = false, subtitleOffset: Double = 0) {
        print("📢 [CastManager] Request to load media: \(title)")
        print("📢 [CastManager] URL: \(url.absoluteString)")
        print("📢 [CastManager] isLive: \(isLive)")
        
        self.currentMediaUrl = url
        
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
        
        let mediaInfo = mediaInfoBuilder.build()
        
        let loadOptions = GCKMediaLoadOptions()
        loadOptions.playPosition = startTime
        loadOptions.autoplay = true
        loadOptions.activeTrackIDs = activeTrackIds
        
        print("📢 [CastManager] Sending load request...")
        remoteMediaClient.loadMedia(mediaInfo, with: loadOptions)
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
    
    // MARK: - GCKRemoteMediaClientListener
    
    func remoteMediaClient(_ client: GCKRemoteMediaClient, didUpdate mediaStatus: GCKMediaStatus?) {
        self.mediaStatus = mediaStatus
        if let status = mediaStatus {
            print("📢 [CastManager] Media Status Update: State=\(status.playerState.rawValue), IdleReason=\(status.idleReason.rawValue)")
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
    
    func loadMedia(url: URL, title: String, posterUrl: URL?, subtitles: [Subtitle] = [], activeSubtitleUrl: String? = nil, startTime: TimeInterval = 0, isLive: Bool = false, subtitleOffset: Double = 0) {
        print("⚠️ Google Cast SDK not available. Cannot load media.")
    }
    
    func seek(to time: TimeInterval) {}
    func play() {}
    func pause() {}
    func getApproximateStreamPosition() -> TimeInterval { return 0 }
}
#endif
