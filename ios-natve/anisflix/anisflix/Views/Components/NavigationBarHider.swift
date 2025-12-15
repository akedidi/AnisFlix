import SwiftUI
import UIKit

struct NavigationBarHider: UIViewControllerRepresentable {
    let shouldHide: Bool
    
    func makeUIViewController(context: Context) -> UIViewController {
        let vc = UIViewController()
        vc.view.backgroundColor = .clear
        return vc
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        // Use async to ensure hierarchy is established
        DispatchQueue.main.async {
            // Traverse up the hierarchy and find ALL navigation controllers
            var currentVC: UIViewController? = uiViewController
            while let vc = currentVC {
                if let navController = vc.navigationController {
                    if navController.isNavigationBarHidden != shouldHide {
                        navController.setNavigationBarHidden(shouldHide, animated: true)
                    }
                }
                currentVC = vc.parent
            }
        }
    }
    
    static func dismantleUIViewController(_ uiViewController: UIViewController, coordinator: ()) {
        // Ensure NavigationBars are visible when this view is removed
        DispatchQueue.main.async {
            var currentVC: UIViewController? = uiViewController
            while let vc = currentVC {
                vc.navigationController?.setNavigationBarHidden(false, animated: true)
                currentVC = vc.parent
            }
        }
    }
}
