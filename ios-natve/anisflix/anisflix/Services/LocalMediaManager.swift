import SwiftUI
import Combine

class LocalMediaManager: ObservableObject {
    static let shared = LocalMediaManager()
    
    @Published var isPlaying: Bool = false
    @Published var currentTitle: String?
    @Published var currentArtwork: UIImage?
    @Published var hasMedia: Bool = false
    
    private init() {}
    
    func updateStatus(isPlaying: Bool, title: String?, artwork: UIImage?) {
        DispatchQueue.main.async {
            self.isPlaying = isPlaying
            self.currentTitle = title
            self.currentArtwork = artwork
            self.hasMedia = title != nil
        }
    }
    
    func clear() {
        DispatchQueue.main.async {
            self.isPlaying = false
            self.currentTitle = nil
            self.currentArtwork = nil
            self.hasMedia = false
        }
    }
}
