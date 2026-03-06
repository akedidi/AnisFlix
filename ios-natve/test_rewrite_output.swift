import Foundation

func syncFetch(url: URL, headers: [String: String] = [:]) -> (Data?, HTTPURLResponse?) {
    let sem = DispatchSemaphore(value: 0)
    var d: Data?; var r: HTTPURLResponse?
    var req = URLRequest(url: url)
    for (k,v) in headers { req.setValue(v, forHTTPHeaderField: k) }
    URLSession.shared.dataTask(with: req) { data, resp, _ in d = data; r = resp as? HTTPURLResponse; sem.signal() }.resume()
    sem.wait()
    return (d, r)
}

let HEADERS = ["User-Agent": "Mozilla/5.0", "Referer": "https://vidlink.pro/", "Origin": "https://vidlink.pro"]

// Get playlist URL
let (encData, _) = syncFetch(url: URL(string: "https://enc-dec.app/api/enc-vidlink?text=1242898")!)
let encId = (try! JSONSerialization.jsonObject(with: encData!) as! [String: Any])["result"] as! String
let (apiData, _) = syncFetch(url: URL(string: "https://vidlink.pro/api/b/movie/\(encId)")!, headers: HEADERS)
let stream = (try! JSONSerialization.jsonObject(with: apiData!) as! [String: Any])["stream"] as! [String: Any]
let playlistUrl = URL(string: stream["playlist"] as! String)!

// Fetch media playlist (this is what VidlinkService returns as individual quality URL)
// First get master, then get first quality
let (masterData, _) = syncFetch(url: playlistUrl, headers: HEADERS)
let masterContent = String(data: masterData!, encoding: .utf8)!
var qualityUrl: URL? = nil
for line in masterContent.components(separatedBy: "\n") {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.isEmpty || t.hasPrefix("#") { continue }
    qualityUrl = URL(string: t, relativeTo: playlistUrl)
    break
}

let mediaUrl = qualityUrl!
print("Media playlist URL: \(mediaUrl.absoluteString.prefix(100))...")

// Fetch the media playlist
let (mediaData, _) = syncFetch(url: mediaUrl, headers: HEADERS)
let mediaContent = String(data: mediaData!, encoding: .utf8)!
print("Media playlist size: \(mediaData!.count) bytes, lines: \(mediaContent.components(separatedBy: "\n").count)")

// Simulate LocalStreamingServer.rewriteManifest
let baseUrl = mediaUrl.deletingLastPathComponent()
let originalQueryItems = URLComponents(url: mediaUrl, resolvingAgainstBaseURL: false)?.queryItems

var rewrittenLines: [String] = []
for line in mediaContent.components(separatedBy: "\n") {
    if line.hasPrefix("#") || line.isEmpty {
        rewrittenLines.append(line)
        continue
    }
    
    // Simulate rewriteUrl
    guard var resolved = URL(string: line, relativeTo: baseUrl) else {
        rewrittenLines.append(line)
        continue
    }
    
    // Persist query items
    if let items = originalQueryItems, !items.isEmpty {
        if var comps = URLComponents(url: resolved, resolvingAgainstBaseURL: true) {
            var currentItems = comps.queryItems ?? []
            for item in items {
                if !currentItems.contains(where: { $0.name == item.name }) {
                    currentItems.append(item)
                }
            }
            comps.queryItems = currentItems
            if let newUrl = comps.url { resolved = newUrl }
        }
    }
    
    // Check isPlaylist
    let isPlaylist = resolved.pathExtension == "m3u8"
    let endpoint = isPlaylist ? "/manifest" : "/proxy"
    
    // Base64 encode
    let b64 = resolved.absoluteString.data(using: .utf8)!.base64EncodedString()
    let proxyUrl = "http://192.168.1.12:8080\(endpoint)?url64=\(b64)&referer=https%3A%2F%2Fvidlink.pro%2F&origin=https%3A%2F%2Fvidlink.pro"
    rewrittenLines.append(proxyUrl)
}

let rewritten = rewrittenLines.joined(separator: "\n")
print("\n=== REWRITTEN MANIFEST (first 20 lines) ===")
for (i, line) in rewrittenLines.prefix(20).enumerated() {
    print("[\(i)] \(line.prefix(150))")
}

// Check: are pathExtension checks correct for segments?
print("\n=== URL PATH EXTENSION CHECK ===")
for line in mediaContent.components(separatedBy: "\n").prefix(20) {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.isEmpty || t.hasPrefix("#") { continue }
    if let resolved = URL(string: t, relativeTo: baseUrl) {
        print("pathExt: '\(resolved.pathExtension)', isM3U8: \(resolved.pathExtension == "m3u8"), line: \(t.prefix(80))...")
    }
}
