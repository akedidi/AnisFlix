import Cocoa
import FlutterMacOS

class MainFlutterWindow: NSWindow, NSWindowDelegate {
  private var updatesChannel: FlutterMethodChannel?
  private var platformChannel: FlutterMethodChannel?
  private var nativeSources: NativeSourceBridge?
  private struct WindowState {
    let frame: NSRect
    let minSize: NSSize
    let maxSize: NSSize
    let aspectRatio: NSSize
    let level: NSWindow.Level
    let behavior: NSWindow.CollectionBehavior
    let movableByBackground: Bool
    let title: String
  }
  private var normalWindow: WindowState?
  private var pendingPip: FlutterResult?
  private var pictureInPictureTitle = "AnisFlix"
  override func awakeFromNib() {
    let flutterViewController = FlutterViewController()
    let windowFrame = NSRect(x: self.frame.origin.x, y: self.frame.origin.y, width: 1280, height: 800)
    self.minSize = NSSize(width: 480, height: 600)
    self.contentViewController = flutterViewController
    self.setFrame(windowFrame, display: true)
    self.title = "AnisFlix"
    self.delegate = self
    self.center()

    RegisterGeneratedPlugins(registry: flutterViewController)
    nativeSources = NativeSourceBridge(messenger: flutterViewController.engine.binaryMessenger)

    platformChannel = FlutterMethodChannel(name: "com.anisflix.reconstructed/platform", binaryMessenger: flutterViewController.engine.binaryMessenger)
    platformChannel?.setMethodCallHandler { [weak self] call, reply in
      guard let self = self else { reply(false); return }
      switch call.method {
      case "enterPictureInPicture":
        if self.pendingPip != nil { reply(false); return }
        self.pictureInPictureTitle = (call.arguments as? [String: Any])?["title"] as? String ?? "AnisFlix"
        if self.styleMask.contains(.fullScreen) {
          self.pendingPip = reply
          self.toggleFullScreen(nil)
        } else {
          self.enterPictureInPicture()
          reply(true)
        }
      case "exitPictureInPicture":
        self.exitPictureInPicture()
        reply(true)
      case "getPictureInPictureState":
        reply([
          "active": self.normalWindow != nil,
          "floating": self.level == .floating,
          "width": self.frame.width,
          "height": self.frame.height,
        ])
      case "setPlaybackActive":
        reply(nil)
      default:
        reply(FlutterMethodNotImplemented)
      }
    }

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

  // Keep the existing Flutter view and video texture: no second decoder or
  // stream URL is needed, including for downloads and authenticated streams.
  private func enterPictureInPicture() {
    guard normalWindow == nil else { return }
    normalWindow = WindowState(
      frame: frame, minSize: minSize, maxSize: maxSize,
      aspectRatio: contentAspectRatio, level: level,
      behavior: collectionBehavior, movableByBackground: isMovableByWindowBackground,
      title: title
    )
    minSize = NSSize(width: 240, height: 155)
    maxSize = NSSize(width: 960, height: 600)
    contentAspectRatio = NSSize(width: 16, height: 9)
    level = .floating
    collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
    isMovableByWindowBackground = true
    title = pictureInPictureTitle
    let visible = (screen ?? NSScreen.main)?.visibleFrame ?? frame
    let size = frameRect(forContentRect: NSRect(x: 0, y: 0, width: 400, height: 225)).size
    setFrame(NSRect(x: visible.maxX - size.width - 20, y: visible.minY + 20,
                    width: size.width, height: size.height), display: true)
    makeKeyAndOrderFront(nil)
    platformChannel?.invokeMethod("pictureInPictureChanged", arguments: true)
  }

  private func exitPictureInPicture() {
    pendingPip?(false)
    pendingPip = nil
    guard let saved = normalWindow else { return }
    normalWindow = nil
    contentAspectRatio = saved.aspectRatio
    minSize = saved.minSize
    maxSize = saved.maxSize
    level = saved.level
    collectionBehavior = saved.behavior
    isMovableByWindowBackground = saved.movableByBackground
    title = saved.title
    setFrame(saved.frame, display: true)
    makeKeyAndOrderFront(nil)
    platformChannel?.invokeMethod("pictureInPictureChanged", arguments: false)
  }

  func windowDidExitFullScreen(_ notification: Notification) {
    guard let reply = pendingPip else { return }
    pendingPip = nil
    enterPictureInPicture()
    reply(true)
  }

  func windowDidFailToExitFullScreen(_ window: NSWindow) {
    pendingPip?(false)
    pendingPip = nil
  }

  func windowShouldClose(_ sender: NSWindow) -> Bool {
    if normalWindow != nil {
      exitPictureInPicture()
      return false
    }
    return true
  }
}
