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

// Get a REAL segment URL from the full pipeline
let (encData, _) = syncFetch(url: URL(string: "https://enc-dec.app/api/enc-vidlink?text=1242898")!)
let encId = (try! JSONSerialization.jsonObject(with: encData!) as! [String: Any])["result"] as! String
let (apiData, _) = syncFetch(url: URL(string: "https://vidlink.pro/api/b/movie/\(encId)")!, headers: HEADERS)
let stream = (try! JSONSerialization.jsonObject(with: apiData!) as! [String: Any])["stream"] as! [String: Any]
let playlistUrl = URL(string: stream["playlist"] as! String)!

// Get master -> first quality -> media playlist -> first segment
let (masterData, _) = syncFetch(url: playlistUrl, headers: HEADERS)
let masterContent = String(data: masterData!, encoding: .utf8)!
var qualityUrl: URL? = nil
for line in masterContent.components(separatedBy: "\n") {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.isEmpty || t.hasPrefix("#") { continue }
    qualityUrl = URL(string: t, relativeTo: playlistUrl)
    break
}

let (mediaData, _) = syncFetch(url: qualityUrl!, headers: HEADERS)
let mediaContent = String(data: mediaData!, encoding: .utf8)!

// Get first 3 segment URLs
var segUrls: [URL] = []
for line in mediaContent.components(separatedBy: "\n") {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.isEmpty || t.hasPrefix("#") { continue }
    if let u = URL(string: t, relativeTo: qualityUrl!) { segUrls.append(u) }
    if segUrls.count >= 3 { break }
}

for (i, segUrl) in segUrls.enumerated() {
    print("=== SEGMENT \(i+1) ===")
    print("URL: \(segUrl.absoluteString.suffix(80))")
    
    let (segData, segResp) = syncFetch(url: segUrl, headers: HEADERS)
    guard let data = segData, let resp = segResp else { print("❌ Fetch failed"); continue }
    
    print("Status: \(resp.statusCode)")
    print("Size: \(data.count) bytes")
    print("MIME: \(resp.mimeType ?? "nil")")
    
    // Check MPEG-TS sync byte (0x47)
    if data.count >= 188 {
        let firstByte = data[0]
        print("First byte: 0x\(String(format: "%02X", firstByte)) (expected 0x47 for MPEG-TS)")
        
        // Check next sync bytes at 188-byte intervals
        var syncCount = 0
        for offset in stride(from: 0, to: min(data.count, 188*5), by: 188) {
            if data[offset] == 0x47 { syncCount += 1 }
        }
        print("Sync bytes found in first 5 packets: \(syncCount)/5")
        
        if firstByte == 0x47 && syncCount >= 3 {
            print("✅ VALID MPEG-TS!")
        } else {
            print("⚠️ NOT standard MPEG-TS")
            // Check for fMP4
            if data.count >= 8 {
                let header = String(data: data[4..<min(8, data.count)], encoding: .ascii) ?? ""
                print("fMP4 check (bytes 4-8): '\(header)' (expected 'ftyp' or 'moof' or 'styp')")
                if header == "ftyp" || header == "styp" {
                    print("✅ fMP4 (fragmented MP4) format detected!")
                } else if header == "moof" || header == "mdat" {
                    print("✅ fMP4 segment detected!")
                }
            }
            print("First 20 bytes hex: \(data.prefix(20).map { String(format: "%02X", $0) }.joined(separator: " "))")
            if let asString = String(data: data.prefix(50), encoding: .utf8) {
                print("As UTF-8: '\(asString)'")
            }
        }
    }
    print("")
}
