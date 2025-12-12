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
        // Force the orientation when the view loads
        if #available(iOS 16.0, *) {
            setNeedsUpdateOfSupportedInterfaceOrientations()
        } else {
            UIDevice.current.setValue(UIInterfaceOrientation.landscapeRight.rawValue, forKey: "orientation")
            UIViewController.attemptRotationToDeviceOrientation()
        }
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Reinforce the rotation on appear
        if #available(iOS 16.0, *) {
            self.view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: .landscape))
        } else {
             UIDevice.current.setValue(UIInterfaceOrientation.landscapeRight.rawValue, forKey: "orientation")
        }
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
