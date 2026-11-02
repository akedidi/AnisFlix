import Cocoa
import FlutterMacOS

class MainFlutterWindow: NSWindow {
  private var updatesChannel: FlutterMethodChannel?
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

    updatesChannel = FlutterMethodChannel(name: "com.anisflix.reconstructed/updates", binaryMessenger: flutterViewController.engine.binaryMessenger)
    updatesChannel?.setMethodCallHandler { call, reply in
      guard call.method == "install", let args = call.arguments as? [String: Any],
            let path = args["path"] as? String else { reply(FlutterMethodNotImplemented); return }
      let url = URL(fileURLWithPath: path).standardizedFileURL.resolvingSymlinksInPath()
      let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent(Bundle.main.bundleIdentifier!).standardizedFileURL.resolvingSymlinksInPath()
      guard url.deletingLastPathComponent().path == cache.appendingPathComponent("app-updates").path, url.pathExtension == "zip",
            FileManager.default.fileExists(atPath: url.path) else {
        reply(FlutterError(code: "invalid_package", message: "Archive de mise à jour invalide.", details: nil)); return
      }
      NSWorkspace.shared.activateFileViewerSelecting([url])
      reply("finder")
    }
    super.awakeFromNib()
  }
}
