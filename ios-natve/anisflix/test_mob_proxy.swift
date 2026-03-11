import Foundation
import AVFoundation

// Dummy test script to simulate the proxy behavior 
// Without GCDWebServer (since it requires full Xcode build context to link properly in a script)
// We will test if AVPlayerItem can load the remote URL natively with headers via AVURLAsset.
// The actual proxy test requires running the iOS app.

print("🎬 Testing AVPlayer with AVURLAsset headers for MOB Stream...")

let urlString = "https://bcdn2.hakunaymatata.com/resource/65b6926f5358a1c3e4507e39129c3cd2.mp4?sign=ac8bad40df17f86af4a22f582818f841&t=1772897370"
guard let url = URL(string: urlString) else {
    print("❌ Invalid URL")
    exit(1)
}

let headers = [
    "Referer": "https://api.inmoviebox.com",
    "User-Agent": "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)"
]

let asset = AVURLAsset(url: url, options: ["AVURLAssetHTTPHeaderFieldsKey": headers])
let item = AVPlayerItem(asset: asset)
let player = AVPlayer(playerItem: item)

print("⏳ Waiting for AVPlayer to load properties...")

var observer: NSKeyValueObservation?
observer = item.observe(\.status, options: [.new, .old]) { item, change in
    switch item.status {
    case .readyToPlay:
        print("✅ AVPlayer status: readyToPlay! Duration: \(item.duration.seconds)s")
        exit(0)
    case .failed:
        print("❌ AVPlayer status: failed!")
        if let error = item.error {
            print("   Error: \(error.localizedDescription)")
            let nsError = error as NSError
            print("   Domain: \(nsError.domain), Code: \(nsError.code)")
            if let underlying = nsError.userInfo[NSUnderlyingErrorKey] as? Error {
                print("   Underlying: \(underlying)")
            }
        }
        exit(1)
    case .unknown:
        print("⏸ AVPlayer status: unknown")
    @unknown default:
        break
    }
}

player.play()

// Keep script running
RunLoop.main.run()
