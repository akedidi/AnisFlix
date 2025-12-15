import SwiftUI
import UIKit

struct TabBarHider: UIViewControllerRepresentable {
    let shouldHide: Bool
    
    func makeUIViewController(context: Context) -> UIViewController {
        let vc = UIViewController()
        vc.view.backgroundColor = .clear
        return vc
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        // Use async to ensure hierarchy is established
        DispatchQueue.main.async {
            guard let tabBarController = uiViewController.tabBarController else { return }
            // Only update if state is different to avoid side effects
            if tabBarController.tabBar.isHidden != shouldHide {
                tabBarController.tabBar.isHidden = shouldHide
            }
        }
    }
    
    static func dismantleUIViewController(_ uiViewController: UIViewController, coordinator: ()) {
        // Ensure TabBar is visible when this view is removed
        DispatchQueue.main.async {
            uiViewController.tabBarController?.tabBar.isHidden = false
        }
    }
}
