import UIKit
import SwiftUI

/// Helper to force screen rotation programmatically
struct ScreenRotator {
    
    static func lockOrientation(_ orientation: UIInterfaceOrientationMask) {
        print("🔒 [ScreenRotator] lockOrientation called with: \(orientationName(orientation))")
        AppDelegate.orientationLock = orientation
        
        // Notify the system that supported orientations have changed
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first(where: { $0.isKeyWindow }),
           let rootViewController = window.rootViewController {
            rootViewController.setNeedsUpdateOfSupportedInterfaceOrientations()
            print("🔒 [ScreenRotator] Called setNeedsUpdateOfSupportedInterfaceOrientations")
        }
    }
    
    static func rotate(to orientation: UIInterfaceOrientationMask) {
        print("🔄 [ScreenRotator] rotate(to:) called with: \(orientationName(orientation))")
        
        // Update the lock first
        lockOrientation(orientation)
        
        // Find the active window scene and root view controller
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first(where: { $0.isKeyWindow }),
              let rootViewController = window.rootViewController else {
            print("❌ [ScreenRotator] Could not find window scene or root view controller")
            return
        }
        
        // Tell the system that supported orientations have changed
        rootViewController.setNeedsUpdateOfSupportedInterfaceOrientations()
        
        // Then request rotation
        if #available(iOS 16.0, *) {
            print("🔄 [ScreenRotator] Requesting geometry update for iOS 16+")
            windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: orientation)) { error in
                print("❌ [ScreenRotator] Geometry update failed: \(error)")
            }
            print("✅ [ScreenRotator] Geometry update requested successfully")
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
    
    private static func orientationName(_ orientation: UIInterfaceOrientationMask) -> String {
        switch orientation {
        case .portrait: return "portrait"
        case .landscape: return "landscape"
        case .landscapeLeft: return "landscapeLeft"
        case .landscapeRight: return "landscapeRight"
        case .allButUpsideDown: return "allButUpsideDown"
        case .all: return "all"
        default: return "unknown(\(orientation.rawValue))"
        }
    }
}
