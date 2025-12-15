import SwiftUI
import Combine

// MARK: - Fullscreen Player Context

struct FullscreenPlayerContext: Identifiable {
    let id = UUID()
    let url: URL
    let title: String
    let posterUrl: String?
    let subtitles: [Subtitle]
    let mediaId: Int?
    let season: Int?
    let episode: Int?
    let playerVM: PlayerViewModel
}

// MARK: - Fullscreen Player Presenter Environment

class FullscreenPlayerPresenterEnv: ObservableObject {
    @Published var isPresented = false
    @Published var playerContext: FullscreenPlayerContext?
    
    func present(context: FullscreenPlayerContext) {
        self.playerContext = context
        self.isPresented = true
    }
    
    func dismiss() {
        self.isPresented = false
        // Don't clear context immediately to avoid flash
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.playerContext = nil
        }
    }
}

struct FullscreenPlayerPresenterKey: EnvironmentKey {
    static let defaultValue = FullscreenPlayerPresenterEnv()
}

extension EnvironmentValues {
    var fullscreenPlayerPresenter: FullscreenPlayerPresenterEnv {
        get { self[FullscreenPlayerPresenterKey.self] }
        set { self[FullscreenPlayerPresenterKey.self] = newValue }
    }
}
