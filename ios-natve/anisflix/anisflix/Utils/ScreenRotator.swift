import UIKit
import SwiftUI

/// Helper to force screen rotation programmatically
struct ScreenRotator {
    
    static func lockOrientation(_ orientation: UIInterfaceOrientationMask) {
        AppDelegate.orientationLock = orientation
        
        // Notify the system that supported orientations have changed
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first(where: { $0.isKeyWindow }),
           let rootViewController = window.rootViewController {
            rootViewController.setNeedsUpdateOfSupportedInterfaceOrientations()
        }
    }
    
    static func rotate(to orientation: UIInterfaceOrientationMask) {
        // Update the lock first
        lockOrientation(orientation)
        
        // Find the active window scene and root view controller
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first(where: { $0.isKeyWindow }),
              let rootViewController = window.rootViewController else {
            return
        }
        
        // Tell the system that supported orientations have changed
        rootViewController.setNeedsUpdateOfSupportedInterfaceOrientations()
        
        // Then request rotation
        if #available(iOS 16.0, *) {
            windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: orientation)) { error in
                print("❌ Geometry update failed: \(error)")
            }
        } else {
            // Legacy fallbacks
            if orientation == .landscape {
                UIDevice.current.setValue(UIInterfaceOrientation.landscapeRight.rawValue, forKey: "orientation")
            } else if orientation == .portrait {
                UIDevice.current.setValue(UIInterfaceOrientation.portrait.rawValue, forKey: "orientation")
            }
            // For .allButUpsideDown or others, just attempt rotation to match device
            UINavigationController.attemptRotationToDeviceOrientation()
        }
    }
}
