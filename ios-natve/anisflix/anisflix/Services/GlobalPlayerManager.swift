import Foundation
import Combine
import UIKit

class GlobalPlayerManager: ObservableObject {
    static let shared = GlobalPlayerManager()
    
    // Unified State
    @Published var isPlaying: Bool = false
    @Published var currentTitle: String?
    @Published var currentArtwork: UIImage?
    @Published var hasMedia: Bool = false
    @Published var isCasting: Bool = false
    @Published var isPresentingPlayer: Bool = false // Controls Global Player presentation from Mini Banner
    @Published var currentUrl: URL?
    
    // Metadata for transition & Resume
    var mediaId: Int?
    var season: Int?
    var episode: Int?
    var currentTime: Double = 0
    var duration: Double = 0
    
    private var subscribers = Set<AnyCancellable>()
    
    private init() {
        setupObservers()
    }
    
    private func setupObservers() {
        // Observe CastManager connection state
        CastManager.shared.$isConnected
            .sink { [weak self] connected in
                guard let self = self else { return }
                
                // Transition Logic: Cast -> Local
                if self.isCasting && !connected {
                    print("🔄 [GlobalPlayerManager] Cast disconnected. Syncing state to local.")
                    // When disconnecting, we want to capture the last known Cast state
                    // so the Mini Player shows the content ready to resume locally.
                    // However, CastManager might have already cleared some state.
                    // We rely on our own cached `currentTime` if we gathered it during playback.
                    
                    // We purposefully DON'T clear metadata here, so the banner remains.
                    self.isPlaying = false // Auto-pause when returning to local
                }
                
                self.isCasting = connected
                self.updateUnifiedState()
            }
            .store(in: &subscribers)
            
        // Observe CastManager media status to update UI while casting
        CastManager.shared.$mediaStatus
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateUnifiedState()
            }
            .store(in: &subscribers)
            
        CastManager.shared.$currentTitle
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.updateUnifiedState() }
            .store(in: &subscribers)
            
        CastManager.shared.$currentArtwork
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.updateUnifiedState() }
            .store(in: &subscribers)
    }
    
    // Called by CustomVideoPlayer to report local state
    func updateLocalStatus(isPlaying: Bool, title: String?, artwork: UIImage?, url: URL?, mediaId: Int?, season: Int?, episode: Int?, currentTime: Double, duration: Double) {
        // Only update local state if NOT casting
        if !isCasting {
            DispatchQueue.main.async {
                self.isPlaying = isPlaying
                self.currentTitle = title
                self.currentArtwork = artwork
                self.currentUrl = url // Tracking URL
                self.hasMedia = title != nil
                
                self.mediaId = mediaId
                self.season = season
                self.episode = episode
                self.currentTime = currentTime
                self.duration = duration
            }
        }
    }
    
    private func updateUnifiedState() {
        guard isCasting else { return }
        
        // While casting, source of truth is CastManager
        let cm = CastManager.shared
        DispatchQueue.main.async {
            self.isPlaying = cm.isPlaying || cm.isBuffering
            self.currentTitle = cm.currentTitle
            self.currentArtwork = cm.currentArtwork
            self.hasMedia = cm.hasMediaLoaded
            
            // Sync progress
            let time = cm.getApproximateStreamPosition()
            if time > 0 { self.currentTime = time }
            
            // Sync IDs if available (CastManager needs these props exposed or we infer them)
            // Ideally CastManager should expose mediaId/season/episode.
            if let mid = cm.currentMediaId { self.mediaId = mid }
            if let s = cm.currentSeason { self.season = s }
            if let e = cm.currentEpisode { self.episode = e }
        }
    }
    
    func togglePlayPause() {
        if isCasting {
            if CastManager.shared.isPlaying {
                CastManager.shared.pause()
            } else {
                CastManager.shared.play()
            }
        } else {
            // Local Control
            NotificationCenter.default.post(name: NSNotification.Name("TogglePlayPause"), object: nil)
        }
    }
}
