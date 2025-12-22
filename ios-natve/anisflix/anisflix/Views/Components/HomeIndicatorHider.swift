//
//  HomeIndicatorHider.swift
//  anisflix
//
//  Created to hide iOS home indicator when player controls are hidden in fullscreen
//

import SwiftUI
import UIKit

/// A view that hides the iOS Home Indicator (white bar at bottom) when needed
struct HomeIndicatorHider: UIViewControllerRepresentable {
    var shouldHide: Bool
    
    func makeUIViewController(context: Context) -> HomeIndicatorHiderViewController {
        return HomeIndicatorHiderViewController()
    }
    
    func updateUIViewController(_ uiViewController: HomeIndicatorHiderViewController, context: Context) {
        uiViewController.shouldHideHomeIndicator = shouldHide
    }
}

class HomeIndicatorHiderViewController: UIViewController {
    var shouldHideHomeIndicator: Bool = false {
        didSet {
            setNeedsUpdateOfHomeIndicatorAutoHidden()
            setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
        }
    }
    
    override var prefersHomeIndicatorAutoHidden: Bool {
        return shouldHideHomeIndicator
    }
    
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge {
        return shouldHideHomeIndicator ? .bottom : []
    }
    
    override var prefersStatusBarHidden: Bool {
        return shouldHideHomeIndicator
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = false
    }
}
