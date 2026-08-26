import Foundation
import AVFoundation

// Since we can't easily compile GCDWebServer in a standalone script without SPM,
// let's create a minimal URLProtocol to intercept and rewrite requests!

class VidzyProxyProtocol: URLProtocol {
    static let referer = "https://vidzy.cc/"
    static let userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    override class func canInit(with request: URLRequest) -> Bool {
        guard let scheme = request.url?.scheme else { return false }
        return scheme == "vidzy-proxy"
    }
    
    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }
    
    override func startLoading() {
        guard let url = request.url else { return }
        
        // Convert vidzy-proxy://... back to https://...
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.scheme = "https"
        
        var newRequest = URLRequest(url: components.url!)
        newRequest.setValue(VidzyProxyProtocol.referer, forHTTPHeaderField: "Referer")
        newRequest.setValue(VidzyProxyProtocol.userAgent, forHTTPHeaderField: "User-Agent")
        
        let task = URLSession.shared.dataTask(with: newRequest) { data, response, error in
            if let error = error {
                self.client?.urlProtocol(self, didFailWithError: error)
                return
            }
            if let response = response as? HTTPURLResponse, let data = data {
                // If it's an m3u8, rewrite the URLs!
                var finalData = data
                if response.mimeType?.contains("mpegurl") == true || response.url?.pathExtension == "m3u8" {
                    if let str = String(data: data, encoding: .utf8) {
                        let rewritten = str.components(separatedBy: .newlines).map { line -> String in
                            if line.hasPrefix("#") {
                                // Simple rewrite for EXT-X-MEDIA
                                let uriRegex = try! NSRegularExpression(pattern: "URI=\"([^\"]+)\"")
                                if let match = uriRegex.firstMatch(in: line, options: [], range: NSRange(location: 0, length: line.utf16.count)) {
                                    let range = Range(match.range(at: 1), in: line)!
                                    let originalUri = String(line[range])
                                    if let resolvedUrl = URL(string: originalUri, relativeTo: response.url) {
                                        var comp = URLComponents(url: resolvedUrl, resolvingAgainstBaseURL: true)!
                                        comp.scheme = "vidzy-proxy"
                                        return line.replacingOccurrences(of: originalUri, with: comp.url!.absoluteString)
                                    }
                                }
                                return line
                            } else if !line.isEmpty {
                                // It's a URI
                                if let resolvedUrl = URL(string: line, relativeTo: response.url) {
                                    var comp = URLComponents(url: resolvedUrl, resolvingAgainstBaseURL: true)!
                                    comp.scheme = "vidzy-proxy"
                                    return comp.url!.absoluteString
                                }
                            }
                            return line
                        }.joined(separator: "\n")
                        finalData = rewritten.data(using: .utf8)!
                    }
                }
                
                self.client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                self.client?.urlProtocol(self, didLoad: finalData)
                self.client?.urlProtocolDidFinishLoading(self)
            }
        }
        task.resume()
    }
    
    override func stopLoading() {
    }
}

URLProtocol.registerClass(VidzyProxyProtocol.self)

// The master M3U8 URL we extracted
let originalUrl = "https://u14.vidzy.cc/hls2/05/00059/,9w6slgidwp4j_n,.urlset/master.m3u8?t=JiMpZbDWPiz6IgYa4gJyadi8qXD-ZShK70a6FqVbFlI&s=1787518252&e=172800&f=297332&i=0.0&sp=0&fr=9w6slgidwp4j"
var comps = URLComponents(string: originalUrl)!
comps.scheme = "vidzy-proxy"

let asset = AVURLAsset(url: comps.url!)
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

print("Starting player test via proxy scheme...")
RunLoop.main.run(until: Date(timeIntervalSinceNow: 15))
print("Timeout waiting for player.")
exit(1)
