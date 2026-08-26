import Foundation

let masterUrl = "https://cdn.watching.onl/anime/bca82e41ee7b0833588399b1fcd177c7/f80e83779b025c2e0032f029ff122ebf/master.m3u8"
let headers = [
    "Referer": "https://megaplay.buzz/",
    "Origin": "https://megaplay.buzz",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*"
]

func fetch(url: String, hdrs: [String: String]) async throws -> (Data, HTTPURLResponse) {
    var req = URLRequest(url: URL(string: url)!)
    for (k, v) in hdrs { req.setValue(v, forHTTPHeaderField: k) }
    let (data, res) = try await URLSession.shared.data(for: req)
    return (data, res as! HTTPURLResponse)
}

Task {
    do {
        print("1. Fetching master playlist")
        let (mData, mRes) = try await fetch(url: masterUrl, hdrs: headers)
        print("Master Status: \(mRes.statusCode)")
        guard let masterStr = String(data: mData, encoding: .utf8) else { exit(1) }
        
        let variantUrl = "https://cdn.watching.onl/anime/bca82e41ee7b0833588399b1fcd177c7/f80e83779b025c2e0032f029ff122ebf/index-f1-v1-a1.m3u8"
        print("2. Fetching variant playlist")
        let (vData, vRes) = try await fetch(url: variantUrl, hdrs: headers)
        print("Variant Status: \(vRes.statusCode)")
        guard let variantStr = String(data: vData, encoding: .utf8) else { exit(1) }
        
        var segmentUrl: String?
        for line in variantStr.components(separatedBy: .newlines) {
            if line.hasSuffix(".jpg") || line.hasSuffix(".ts") {
                segmentUrl = "https://dkein.cloudbuzz.lol/anime/bca82e41ee7b0833588399b1fcd177c7/f80e83779b025c2e0032f029ff122ebf/" + line
                break
            }
        }
        
        guard let sUrl = segmentUrl else { print("No segment found"); exit(1) }
        print("3. Fetching segment: \(sUrl)")
        
        var req = URLRequest(url: URL(string: sUrl)!)
        for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
        req.setValue("bytes=0-1000", forHTTPHeaderField: "Range")
        
        let (sData, res) = try await URLSession.shared.data(for: req)
        let sRes = res as! HTTPURLResponse
        print("Segment Status: \(sRes.statusCode)")
        print("Segment Content-Length: \(sRes.value(forHTTPHeaderField: "Content-Length") ?? "none")")
        print("Segment Data length: \(sData.count) bytes")
        exit(0)
    } catch {
        print("Error: \(error)")
        exit(1)
    }
}
RunLoop.main.run()
