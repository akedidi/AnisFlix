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

// Simulating extractEmbeddedHeaders
func extractEmbeddedHeaders(from url: URL) -> [String: String]? {
    guard let comps = URLComponents(url: url, resolvingAgainstBaseURL: false),
          let headersParam = comps.queryItems?.first(where: { $0.name == "headers" })?.value,
          let data = headersParam.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
        return nil
    }
    return json
}

let HEADERS = ["User-Agent": "Mozilla/5.0", "Referer": "https://vidlink.pro/", "Origin": "https://vidlink.pro"]

// Get a real segment URL
let (encData, _) = syncFetch(url: URL(string: "https://enc-dec.app/api/enc-vidlink?text=1242898")!)
let encId = (try! JSONSerialization.jsonObject(with: encData!) as! [String: Any])["result"] as! String
let (apiData, _) = syncFetch(url: URL(string: "https://vidlink.pro/api/b/movie/\(encId)")!, headers: HEADERS)
let stream = (try! JSONSerialization.jsonObject(with: apiData!) as! [String: Any])["stream"] as! [String: Any]
let playlistUrl = URL(string: stream["playlist"] as! String)!

// Fetch master M3U8
let (masterData, _) = syncFetch(url: playlistUrl, headers: HEADERS)
let masterContent = String(data: masterData!, encoding: .utf8)!

// Get first quality URL (1080p)
var subPlaylistUrl: URL? = nil
for line in masterContent.components(separatedBy: "\n") {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.isEmpty || t.hasPrefix("#") { continue }
    subPlaylistUrl = URL(string: t, relativeTo: playlistUrl)
    break
}
guard let subPlaylistUrl else { print("❌ No sub-playlist"); exit(1) }

// Fetch media playlist
let (mediaData, _) = syncFetch(url: subPlaylistUrl, headers: HEADERS)
let mediaContent = String(data: mediaData!, encoding: .utf8)!

// Get first segment URL
for line in mediaContent.components(separatedBy: "\n") {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.isEmpty || t.hasPrefix("#") { continue }
    
    guard let segUrl = URL(string: t, relativeTo: subPlaylistUrl) else { continue }
    
    print("🔗 Segment URL: \(segUrl.absoluteString.prefix(120))...")
    
    // Extract embedded CDN headers
    let cdnHeaders = extractEmbeddedHeaders(from: segUrl)
    print("📋 CDN embedded headers: \(cdnHeaders ?? [:])")
    
    // Test 1: Fetch with WRONG headers (vidlink.pro)
    print("\n❌ Test 1: Fetch with wrong Referer (vidlink.pro)...")
    let (d1, r1) = syncFetch(url: segUrl, headers: HEADERS)
    print("   Status: \(r1?.statusCode ?? 0), Size: \(d1?.count ?? 0), MIME: \(r1?.mimeType ?? "nil")")
    
    // Test 2: Fetch with CORRECT CDN headers
    print("\n✅ Test 2: Fetch with correct CDN headers (videostr.net)...")
    var correctHeaders = HEADERS
    if let cdn = cdnHeaders {
        for (k,v) in cdn { correctHeaders[k.capitalized] = v }
    }
    print("   Using: \(correctHeaders)")
    let (d2, r2) = syncFetch(url: segUrl, headers: correctHeaders)
    print("   Status: \(r2?.statusCode ?? 0), Size: \(d2?.count ?? 0), MIME: \(r2?.mimeType ?? "nil")")
    if let data = d2, data.count > 4 {
        let firstBytes = data.prefix(4).map { String(format: "%02X", $0) }.joined()
        print("   First 4 bytes: \(firstBytes)")
        if firstBytes.hasPrefix("47") {
            print("   🎉 Valid MPEG-TS!")
        }
    }
    break
}
print("\nDone!")
