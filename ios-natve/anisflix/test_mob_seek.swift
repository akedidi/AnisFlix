import Foundation
import AVFoundation

// Simple streaming proxy server simulation
class ProxyServer {
    var port: UInt16 = 8081
    
    // We cannot easily launch GCDWebServer in CLI script without linking the Pod,
    // so we'll test byte-range queries directly to Hakunaymatata to see if AVPlayer
    // drops headers on subsequent requests when running inside a proxy.
}

print("🎬 Testing AVPlayer seeking behavior with direct headers...")

let urlString = "https://bcdn2.hakunaymatata.com/resource/65b6926f5358a1c3e4507e39129c3cd2.mp4?sign=ac8bad40df17f86af4a22f582818f841&t=1772897370"
guard let url = URL(string: urlString) else { exit(1) }

let headers = [
    "Referer": "https://api.inmoviebox.com",
    "User-Agent": "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)"
]

let asset = AVURLAsset(url: url, options: ["AVURLAssetHTTPHeaderFieldsKey": headers])
let item = AVPlayerItem(asset: asset)
let player = AVPlayer(playerItem: item)

var observer: NSKeyValueObservation?
observer = item.observe(\.status, options: [.new]) { item, _ in
    if item.status == .readyToPlay {
        print("✅ AVPlayer ready. Duration: \(item.duration.seconds)s")
        print("⏭️ Simulating a seek to middle of file (Byte-Range request trigger)...")
        
        let targetTime = CMTime(seconds: 3000, preferredTimescale: 600)
        player.seek(to: targetTime) { finished in
            print("✅ Seek finished: \(finished)")
            
            // Wait 3 seconds to see if it buffers and drops connection
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                if let error = item.error {
                    print("❌ Error after seek: \(error.localizedDescription)")
                } else {
                    print("✅ Still playing! Time: \(item.currentTime().seconds)s") 
                }
                exit(0)
            }
        }
    }
}

player.play()
RunLoop.main.run()
