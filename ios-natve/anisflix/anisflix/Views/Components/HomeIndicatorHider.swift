//
//  HomeIndicatorHider.swift
//  anisflix
//
//  Created to hide iOS home indicator when player controls are hidden in fullscreen
//

import SwiftUI
import UIKit
import Combine

/// Shared state for home indicator visibility
class HomeIndicatorState: ObservableObject {
    static let shared = HomeIndicatorState()
    @Published var shouldHide: Bool = false {
        didSet {
            NotificationCenter.default.post(name: .homeIndicatorVisibilityChanged, object: nil)
        }
    }
}

/// A view that hides the iOS Home Indicator (white bar at bottom) when needed
struct HomeIndicatorHider: UIViewControllerRepresentable {
    var shouldHide: Bool
    
    func makeUIViewController(context: Context) -> UIViewController {
        let vc = UIViewController()
        vc.view.backgroundColor = .clear
        vc.view.isUserInteractionEnabled = false
        return vc
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        // Update the shared state
        if HomeIndicatorState.shared.shouldHide != shouldHide {
            print("🏠 HomeIndicatorHider: Setting shared state shouldHide = \(shouldHide)")
            // Dispatch async to avoid view update cycles
            DispatchQueue.main.async {
                HomeIndicatorState.shared.shouldHide = shouldHide
            }
        }
    }
    
    static func dismantleUIViewController(_ uiViewController: UIViewController, coordinator: ()) {
        DispatchQueue.main.async {
            HomeIndicatorState.shared.shouldHide = false
        }
    }
}

extension Notification.Name {
    static let homeIndicatorVisibilityChanged = Notification.Name("homeIndicatorVisibilityChanged")
}
