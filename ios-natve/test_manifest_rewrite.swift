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

// Get encrypted ID
let (encData, _) = syncFetch(url: URL(string: "https://enc-dec.app/api/enc-vidlink?text=1242898")!)
let encJson = try! JSONSerialization.jsonObject(with: encData!) as! [String: Any]
let encId = encJson["result"] as! String

// Get playlist
let (apiData, _) = syncFetch(url: URL(string: "https://vidlink.pro/api/b/movie/\(encId)")!, headers: HEADERS)
let apiJson = try! JSONSerialization.jsonObject(with: apiData!) as! [String: Any]
let stream = apiJson["stream"] as! [String: Any]
let playlistUrl = stream["playlist"] as! String

let targetUrl = URL(string: playlistUrl)!

// Fetch master playlist
let (m3u8Data, _) = syncFetch(url: targetUrl, headers: HEADERS)
let content = String(data: m3u8Data!, encoding: .utf8)!

print("=== MASTER PLAYLIST ===")
print(content)

// Parse first sub-playlist URL
let lines = content.components(separatedBy: "\n")
for line in lines {
    let trimmed = line.trimmingCharacters(in: .whitespaces)
    if trimmed.isEmpty || trimmed.hasPrefix("#") { continue }
    
    // Resolve using URL(string:relativeTo:)
    guard let resolved = URL(string: trimmed, relativeTo: targetUrl) else {
        print("❌ Failed to resolve: \(trimmed.prefix(80))")
        continue
    }
    
    print("\n=== SUB-PLAYLIST (1080p) ===")
    print("URL: \(resolved.absoluteString.prefix(120))...")
    
    let (subData, subResp) = syncFetch(url: resolved, headers: HEADERS)
    let subContent = String(data: subData!, encoding: .utf8)!
    
    // Show first 10 lines
    let subLines = subContent.components(separatedBy: "\n")
    print("Lines: \(subLines.count)")
    for (i, sl) in subLines.prefix(15).enumerated() {
        print("[\(i)] \(sl.prefix(150))")
    }
    
    // Now simulate rewriteUrl for the first segment
    let subBaseUrl = resolved.deletingLastPathComponent()
    for sl in subLines {
        let s = sl.trimmingCharacters(in: .whitespaces)
        if s.isEmpty || s.hasPrefix("#") { continue }
        
        print("\n=== FIRST SEGMENT ===")
        print("Raw: \(s.prefix(120))")
        
        guard let segResolved = URL(string: s, relativeTo: subBaseUrl) else {
            print("❌ Failed to resolve segment")
            break
        }
        print("Resolved: \(segResolved.absoluteString.prefix(120))...")
        
        // Fetch segment WITH headers
        let (segData, segResp) = syncFetch(url: segResolved, headers: [
            "Referer": "https://videostr.net/",
            "Origin": "https://videostr.net",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
        ])
        print("Status: \(segResp?.statusCode ?? 0)")
        print("Size: \(segData?.count ?? 0) bytes")
        print("MIME: \(segResp?.mimeType ?? "nil")")
        
        // Check if it's valid MPEG-TS
        if let data = segData, data.count > 4 {
            let firstBytes = data.prefix(4).map { String(format: "%02X", $0) }.joined()
            print("First bytes: \(firstBytes)")
            if firstBytes.hasPrefix("47") {
                print("✅ Valid MPEG-TS sync byte (0x47)")
            } else {
                print("⚠️ NOT MPEG-TS! First 100 chars: \(String(data: data.prefix(100), encoding: .utf8) ?? "binary")")
            }
        }
        break
    }
    break
}
