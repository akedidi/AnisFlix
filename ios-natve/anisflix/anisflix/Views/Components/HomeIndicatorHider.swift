//
//  HomeIndicatorHider.swift
//  anisflix
//
//  Created to hide iOS home indicator when player controls are hidden in fullscreen
//

import SwiftUI
import UIKit

struct HomeIndicatorHider: UIViewControllerRepresentable {
    let shouldHide: Bool
    
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = HomeIndicatorHidingController()
        controller.shouldHideIndicator = shouldHide
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let controller = uiViewController as? HomeIndicatorHidingController {
            controller.shouldHideIndicator = shouldHide
            controller.setNeedsUpdateOfHomeIndicatorAutoHidden()
        }
    }
}

class HomeIndicatorHidingController: UIViewController {
    var shouldHideIndicator: Bool = false
    
    override var prefersHomeIndicatorAutoHidden: Bool {
        return shouldHideIndicator
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = false
    }
}
