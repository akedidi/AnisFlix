import SwiftUI
import UIKit

/// A UIHostingController that forces landscape orientation.
class LandscapeHostingController<Content: View>: UIHostingController<Content> {
    
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .landscape
    }
    
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation {
        return .landscapeRight
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Critical: Allow the app to rotate so this controller's preference is respected
        AppDelegate.orientationLock = .allButUpsideDown
        
        // Force the orientation when the view loads
        if #available(iOS 16.0, *) {
            setNeedsUpdateOfSupportedInterfaceOrientations()
        } else {
            UIViewController.attemptRotationToDeviceOrientation()
        }
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Reinforce the rotation and lock
        AppDelegate.orientationLock = .allButUpsideDown
        
        if #available(iOS 16.0, *) {
            let windowScene = self.view.window?.windowScene
            windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: .landscape))
            setNeedsUpdateOfSupportedInterfaceOrientations()
        } else {
             UIDevice.current.setValue(UIInterfaceOrientation.landscapeRight.rawValue, forKey: "orientation")
             UIViewController.attemptRotationToDeviceOrientation()
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // Restore portrait lock when closing
        if isBeingDismissed || isMovingFromParent {
            AppDelegate.orientationLock = .portrait
            
            if #available(iOS 16.0, *) {
                let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene
                windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait))
            } else {
                UIDevice.current.setValue(UIInterfaceOrientation.portrait.rawValue, forKey: "orientation")
                UIViewController.attemptRotationToDeviceOrientation()
            }
        }
    }
    
    deinit {
        // Explicit deinit to work around Xcode 26 beta compiler crash
    }
}

/// A wrapper to present a SwiftUI view inside a LandscapeHostingController
struct LandscapeView<Content: View>: UIViewControllerRepresentable {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = LandscapeHostingController(rootView: content)
        controller.modalPresentationStyle = .fullScreen
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        if let hostingController = uiViewController as? UIHostingController<Content> {
            hostingController.rootView = content
        }
    }
}
