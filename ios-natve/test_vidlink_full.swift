#!/usr/bin/env swift
// Full end-to-end Vidlink test: encrypt → API → M3U8 → segments
import Foundation

let semaphore = DispatchSemaphore(value: 0)

let ENC_DEC_API = "https://enc-dec.app/api"
let VIDLINK_API = "https://vidlink.pro/api/b"
let TMDB_ID = "1242898" // Predator: Badlands

let HEADERS: [String: String] = [
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Referer": "https://vidlink.pro/",
    "Origin": "https://vidlink.pro"
]

// Helpers
func syncFetch(url: URL, headers: [String: String] = [:]) -> (Data?, HTTPURLResponse?) {
    let sem = DispatchSemaphore(value: 0)
    var resultData: Data?
    var resultResp: HTTPURLResponse?
    var req = URLRequest(url: url)
    for (k,v) in headers { req.setValue(v, forHTTPHeaderField: k) }
    URLSession.shared.dataTask(with: req) { d, r, _ in
        resultData = d
        resultResp = r as? HTTPURLResponse
        sem.signal()
    }.resume()
    sem.wait()
    return (resultData, resultResp)
}

// ----- STEP 1: Encrypt TMDB ID -----
print("🔐 Step 1: Encrypting TMDB ID \(TMDB_ID)...")
guard let encUrl = URL(string: "\(ENC_DEC_API)/enc-vidlink?text=\(TMDB_ID)") else {
    print("❌ Bad enc URL"); exit(1)
}
let (encData, _) = syncFetch(url: encUrl)
guard let encData = encData,
      let encJson = try? JSONSerialization.jsonObject(with: encData) as? [String: Any],
      let encryptedId = encJson["result"] as? String else {
    print("❌ Encryption failed"); exit(1)
}
print("✅ Encrypted ID: \(encryptedId.prefix(30))...")

// ----- STEP 2: Fetch streams from Vidlink API -----
let vidlinkUrlStr = "\(VIDLINK_API)/movie/\(encryptedId)"
print("\n📡 Step 2: Calling Vidlink API: \(vidlinkUrlStr.prefix(60))...")
guard let vidlinkUrl = URL(string: vidlinkUrlStr) else {
    print("❌ Bad vidlink URL"); exit(1)
}
let (apiData, apiResp) = syncFetch(url: vidlinkUrl, headers: HEADERS)
guard let apiData = apiData, let apiResp = apiResp else {
    print("❌ API request failed"); exit(1)
}
print("📡 API HTTP Status: \(apiResp.statusCode)")

guard let apiJson = try? JSONSerialization.jsonObject(with: apiData) as? [String: Any] else {
    print("❌ Failed to parse API JSON")
    if let raw = String(data: apiData, encoding: .utf8) { print("Raw: \(raw.prefix(500))") }
    exit(1)
}

// Extract playlist URL
var playlistUrl: String? = nil
if let stream = apiJson["stream"] as? [String: Any] {
    if let pl = stream["playlist"] as? String {
        playlistUrl = pl
        print("✅ Found playlist URL")
    }
    if let qualities = stream["qualities"] as? [String: Any] {
        print("📊 Qualities found: \(qualities.keys.joined(separator: ", "))")
        for (key, val) in qualities {
            if let qd = val as? [String: Any], let qUrl = qd["url"] as? String {
                print("   \(key): \(qUrl.prefix(80))...")
                if playlistUrl == nil { playlistUrl = qUrl }
            }
        }
    }
}

guard let finalPlaylistUrl = playlistUrl else {
    print("❌ No playlist URL found in API response")
    print("📋 API Keys: \(apiJson.keys)")
    exit(1)
}

print("\n🎬 Playlist URL: \(finalPlaylistUrl)")

// ----- STEP 3: Parse the URL -----
print("\n🔍 Step 3: Analyzing URL...")
if let parsedUrl = URL(string: finalPlaylistUrl) {
    print("   ✅ URL(string:) succeeded")
    print("   scheme: \(parsedUrl.scheme ?? "nil")")
    print("   host: \(parsedUrl.host ?? "nil")")
    print("   path: \(parsedUrl.path)")
    print("   lastPathComponent: \(parsedUrl.lastPathComponent)")
    print("   query: \(parsedUrl.query?.prefix(100) ?? "nil")")
} else {
    print("   ❌ URL(string:) FAILED - trying with encoding...")
    if let encoded = finalPlaylistUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
       let parsedUrl = URL(string: encoded) {
        print("   ✅ URL works after encoding: \(parsedUrl.absoluteString.prefix(80))...")
    } else {
        print("   ❌ URL is completely broken")
        exit(1)
    }
}

// ----- STEP 4: Fetch M3U8 master playlist -----
print("\n📦 Step 4: Fetching M3U8 master playlist...")
guard let m3u8Url = URL(string: finalPlaylistUrl) else {
    print("❌ Cannot create URL from playlist"); exit(1)
}
let (m3u8Data, m3u8Resp) = syncFetch(url: m3u8Url, headers: HEADERS)
guard let m3u8Data = m3u8Data, let m3u8Resp = m3u8Resp else {
    print("❌ M3U8 fetch failed"); exit(1)
}
print("📦 M3U8 HTTP Status: \(m3u8Resp.statusCode)")
guard let m3u8Content = String(data: m3u8Data, encoding: .utf8) else {
    print("❌ Cannot decode M3U8 as UTF8"); exit(1)
}
print("📄 M3U8 Content (\(m3u8Data.count) bytes):\n\(m3u8Content.prefix(1000))")

// ----- STEP 5: Parse M3U8 and find sub-playlists or segments -----
print("\n🔗 Step 5: Parsing M3U8 entries...")
let lines = m3u8Content.components(separatedBy: .newlines)
var subUrls: [String] = []
for line in lines {
    let trimmed = line.trimmingCharacters(in: .whitespaces)
    if trimmed.isEmpty || trimmed.hasPrefix("#") { continue }
    subUrls.append(trimmed)
}

if subUrls.isEmpty {
    print("⚠️ No sub-URLs found in M3U8")
} else {
    print("📋 Found \(subUrls.count) entries")
    for (i, sub) in subUrls.prefix(3).enumerated() {
        print("   [\(i)] \(sub.prefix(120))")
    }
}

// ----- STEP 6: Resolve relative URLs -----
print("\n🔗 Step 6: Testing URL resolution for first entry...")
if let firstEntry = subUrls.first {
    let baseUrl = m3u8Url.deletingLastPathComponent()
    print("   Base URL: \(baseUrl.absoluteString.prefix(80))...")
    print("   Entry: \(firstEntry.prefix(100))")
    
    // Test appendingPathComponent (THE BUG):
    let buggyUrl = baseUrl.appendingPathComponent(firstEntry).absoluteString
    print("   ❌ appendingPathComponent: \(buggyUrl.prefix(120))...")
    if buggyUrl.contains("%3F") {
        print("   ⚠️ CONFIRMED BUG: ? was encoded to %3F by appendingPathComponent!")
    }
    
    // Test URL(string:relativeTo:) (THE FIX):
    if let fixedUrl = URL(string: firstEntry, relativeTo: baseUrl) {
        print("   ✅ URL(string:relativeTo:): \(fixedUrl.absoluteString.prefix(120))...")
        
        // ----- STEP 7: Actually fetch a sub-playlist/segment -----
        print("\n🚀 Step 7: Fetching resolved sub-URL with headers...")
        let (subData, subResp) = syncFetch(url: fixedUrl, headers: HEADERS)
        if let subResp = subResp {
            print("   HTTP Status: \(subResp.statusCode)")
            print("   Size: \(subData?.count ?? 0) bytes")
            print("   MIME: \(subResp.mimeType ?? "unknown")")
            if subResp.statusCode == 200 {
                print("   🎉 SUCCESS! Sub-resource fetched correctly!")
                if let content = subData.flatMap({ String(data: $0, encoding: .utf8) }) {
                    print("   Content preview: \(content.prefix(300))")
                }
            } else {
                print("   ❌ FAILED with status \(subResp.statusCode)")
                if let body = subData.flatMap({ String(data: $0, encoding: .utf8) }) {
                    print("   Body: \(body.prefix(200))")
                }
            }
        }
    } else {
        print("   ❌ URL(string:relativeTo:) also failed")
    }
}

print("\n🎉 Test complete!")
