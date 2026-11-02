import Cocoa
import FlutterMacOS

class MainFlutterWindow: NSWindow {
  private var nativeSources: NativeSourceBridge?
  override func awakeFromNib() {
    let flutterViewController = FlutterViewController()
    let windowFrame = NSRect(x: self.frame.origin.x, y: self.frame.origin.y, width: 1280, height: 800)
    self.minSize = NSSize(width: 480, height: 600)
    self.contentViewController = flutterViewController
    self.setFrame(windowFrame, display: true)
    self.title = "AnisFlix"
    self.center()

    RegisterGeneratedPlugins(registry: flutterViewController)
    nativeSources = NativeSourceBridge(messenger: flutterViewController.engine.binaryMessenger)

    super.awakeFromNib()
  }
}
