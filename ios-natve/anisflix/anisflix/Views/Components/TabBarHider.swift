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
            // Robust lookup for TabBarController
            var targetTabBarController: UITabBarController? = uiViewController.tabBarController
            
            // Fallback: Traverse from window root if not found
            if targetTabBarController == nil {
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let window = windowScene.windows.first(where: { $0.isKeyWindow }) {
                    var currentVC = window.rootViewController
                    while let vc = currentVC {
                        if let tbc = vc as? UITabBarController {
                            targetTabBarController = tbc
                            break
                        }
                        if let tbc = vc.tabBarController {
                            targetTabBarController = tbc
                            break
                        }
                        // Check children if navigation controller
                        if let nav = vc as? UINavigationController {
                            currentVC = nav.topViewController
                            continue
                        }
                        // Check presented
                        if let presented = vc.presentedViewController {
                            currentVC = presented
                            continue
                        }
                        // Check children
                        if !vc.children.isEmpty {
                            currentVC = vc.children.first
                            continue
                        }
                        break
                    }
                }
            }
            
            guard let tabBarController = targetTabBarController else {
                print("⚠️ TabBarHider: Could not find UITabBarController")
                return
            }
            
            // Force hide/show with animation for reliability
            if shouldHide {
                if !tabBarController.tabBar.isHidden || tabBarController.tabBar.alpha > 0 {
                    print("📉 Hiding TabBar (Alpha 0)")
                    UIView.animate(withDuration: 0.3) {
                        tabBarController.tabBar.alpha = 0
                    } completion: { _ in
                        tabBarController.tabBar.isHidden = true
                    }
                }
            } else {
                if tabBarController.tabBar.isHidden || tabBarController.tabBar.alpha < 1 {
                    print("📈 Showing TabBar (Alpha 1)")
                    tabBarController.tabBar.isHidden = false
                    UIView.animate(withDuration: 0.3) {
                        tabBarController.tabBar.alpha = 1
                    }
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
