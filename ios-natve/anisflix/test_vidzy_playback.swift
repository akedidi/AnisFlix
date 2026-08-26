import Foundation
import AVFoundation

class ResourceLoaderDelegate: NSObject, AVAssetResourceLoaderDelegate {
    func resourceLoader(_ resourceLoader: AVAssetResourceLoader, shouldWaitForLoadingOfRequestedResource loadingRequest: AVAssetResourceLoadingRequest) -> Bool {
        guard let url = loadingRequest.request.url else { return false }
        print("Player requested: \(url.absoluteString)")
        
        // If the player asks for a custom scheme, we fetch the real URL.
        // But for this test, we just want to see if the player even starts downloading TS files!
        return false
    }
}

let delegate = ResourceLoaderDelegate()

// The master M3U8 URL we extracted
let m3u8UrlString = "https://u14.vidzy.cc/hls2/05/00059/,9w6slgidwp4j_n,.urlset/master.m3u8?t=JiMpZbDWPiz6IgYa4gJyadi8qXD-ZShK70a6FqVbFlI&s=1787518252&e=172800&f=297332&i=0.0&sp=0&fr=9w6slgidwp4j"

// We use AVURLAsset with a custom scheme so our delegate is called.
// BUT Vidzy needs a referer! AVURLAsset can take headers!
let headers: [String: String] = [
    "Referer": "https://vidzy.cc/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]

let asset = AVURLAsset(url: URL(string: m3u8UrlString)!, options: ["AVURLAssetHTTPHeaderFieldsKey": headers])
// asset.resourceLoader.setDelegate(delegate, queue: DispatchQueue.main) // Not needed if we pass headers directly

let playerItem = AVPlayerItem(asset: asset)
let player = AVPlayer(playerItem: playerItem)

var observer: NSKeyValueObservation?
observer = playerItem.observe(\.status, options: [.new, .old]) { item, change in
    if item.status == .readyToPlay {
        print("✅ SUCCESS: Player is ready to play!")
        exit(0)
    } else if item.status == .failed {
        print("❌ FAILED: \(String(describing: item.error))")
        exit(1)
    }
}

print("Starting player test...")
// Start a runloop so AVFoundation can work
RunLoop.main.run(until: Date(timeIntervalSinceNow: 15))
print("Timeout waiting for player.")
exit(1)
