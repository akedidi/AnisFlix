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
            
            // Force hide/show with animation for reliability
            if shouldHide && !tabBarController.tabBar.isHidden {
                UIView.animate(withDuration: 0.2) {
                    tabBarController.tabBar.alpha = 0
                }
                tabBarController.tabBar.isHidden = true
            } else if !shouldHide && tabBarController.tabBar.isHidden {
                tabBarController.tabBar.isHidden = false
                UIView.animate(withDuration: 0.2) {
                    tabBarController.tabBar.alpha = 1
                }
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
