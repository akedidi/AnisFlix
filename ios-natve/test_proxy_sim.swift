import Foundation

// Simulates the FULL pipeline: VidlinkService → LocalStreamingServer → upstream fetch

// ---- Step 1: Get a real stream URL from Vidlink API ----
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

print("🔐 Step 1: Get encrypted ID...")
let (encData, _) = syncFetch(url: URL(string: "https://enc-dec.app/api/enc-vidlink?text=1242898")!)
guard let encData, let encJson = try? JSONSerialization.jsonObject(with: encData) as? [String: Any],
      let encId = encJson["result"] as? String else { print("❌ Enc failed"); exit(1) }

print("📡 Step 2: Call Vidlink API...")
let (apiData, _) = syncFetch(url: URL(string: "https://vidlink.pro/api/b/movie/\(encId)")!, headers: HEADERS)
guard let apiData, let apiJson = try? JSONSerialization.jsonObject(with: apiData) as? [String: Any],
      let stream = apiJson["stream"] as? [String: Any], let playlistUrlStr = stream["playlist"] as? String else {
    print("❌ API failed"); exit(1)
}
print("✅ Got playlist URL: \(playlistUrlStr.prefix(80))...")

// ---- Step 2: Simulate CustomVideoPlayer Base64 encoding ----
print("\n🔧 Step 3: Simulating CustomVideoPlayer Base64 encoding...")
guard let targetUrl = URL(string: playlistUrlStr) else { print("❌ Can't parse playlist URL"); exit(1) }
let url64 = targetUrl.absoluteString.data(using: .utf8)!.base64EncodedString()
print("   url64: \(url64.prefix(60))...")

// ---- Step 3: Simulate LocalStreamingServer manifest handler ----
print("\n🖥️ Step 4: Simulating LocalStreamingServer /manifest handler...")
// Decode base64
let decodedUrlStr = String(data: Data(base64Encoded: url64)!, encoding: .utf8)!
guard let decodedUrl = URL(string: decodedUrlStr) else { print("❌ Can't create URL from decoded base64"); exit(1) }
print("   ✅ URL created: \(decodedUrl.host ?? "nil") - \(decodedUrl.lastPathComponent)")

// Check isM3U8
let isM3U8 = decodedUrl.pathExtension.lowercased() == "m3u8" || decodedUrl.absoluteString.contains(".m3u8")
print("   isM3U8: \(isM3U8)")

// Fetch manifest with headers
print("   Fetching manifest...")
let (manifestData, manifestResp) = syncFetch(url: decodedUrl, headers: HEADERS)
guard let manifestData, let manifestResp, manifestResp.statusCode == 200,
      let content = String(data: manifestData, encoding: .utf8) else {
    print("   ❌ Manifest fetch failed (status: \(manifestResp?.statusCode ?? 0))")
    exit(1)
}
print("   ✅ Manifest fetched: \(manifestData.count) bytes")
print("   Content preview:\n\(content.prefix(300))")

// ---- Step 4: Simulate rewriteManifest ----
print("\n📝 Step 5: Simulating rewriteManifest...")
let baseUrl = decodedUrl.deletingLastPathComponent()
let originalQueryItems = URLComponents(url: decodedUrl, resolvingAgainstBaseURL: false)?.queryItems

let lines = content.components(separatedBy: "\n")
for line in lines {
    if line.hasPrefix("#") || line.isEmpty { continue }
    
    // This is a URL line - simulate rewriteUrl
    print("   Processing line: \(line.prefix(80))...")
    
    // Resolve
    guard var resolved = URL(string: line, relativeTo: baseUrl) else {
        print("   ❌ Failed to resolve")
        continue
    }
    print("   resolved: \(resolved.absoluteString.prefix(100))...")
    print("   resolved.query: \(resolved.query?.prefix(60) ?? "nil")")
    
    // queryItemsToPersist
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
    
    print("   after persist: \(resolved.absoluteString.prefix(100))...")
    
    // Base64 encode for proxy
    let subB64 = resolved.absoluteString.data(using: .utf8)!.base64EncodedString()
    let subDecoded = String(data: Data(base64Encoded: subB64)!, encoding: .utf8)!
    if let subUrl = URL(string: subDecoded) {
        print("   ✅ Sub-URL round-trips correctly")
        
        // Actually fetch it!
        let (subData, subResp) = syncFetch(url: subUrl, headers: HEADERS)
        if let subResp {
            print("   📦 Sub-fetch: HTTP \(subResp.statusCode), \(subData?.count ?? 0) bytes")
            if subResp.statusCode == 200 {
                print("   🎉 SUCCESS!")
            } else {
                if let body = subData.flatMap({ String(data: $0, encoding: .utf8) }) {
                    print("   Body: \(body.prefix(200))")
                }
            }
        }
    } else {
        print("   ❌ Sub-URL round-trip FAILED")
        print("   decoded: \(subDecoded.prefix(150))")
    }
    
    break // Just test first entry
}

print("\n🎉 Full pipeline test complete!")
