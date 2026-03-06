import Foundation

let urlString = "https://anisflix.vercel.app/api/movix-proxy?path=vidlink&tmdbId=1242898&type=movie"
guard let url = URL(string: urlString) else {
    print("❌ Invalid API URL")
    exit(1)
}

var videoUrlString: String? = nil

let testGroup = DispatchGroup()
testGroup.enter()

Task {
    defer { testGroup.leave() }
    
    do {
        print("🌍 Fetching streams from Vercel API: \(urlString)")
        let (data, _) = try await URLSession.shared.data(from: url)
        
        // The Vercel movix-proxy API returns:
        // {"success": true, "streams": [{"name": "Vidlink - 1080p", "url": "https://anisflix.vercel.app/api/proxy?url=...", ...}, ...]}
        if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let streams = json["streams"] as? [[String: Any]] {
            for stream in streams {
                if let name = stream["name"] as? String, (name.contains("1080p") || name.contains("Auto")), let wrappedUrlStr = stream["url"] as? String {
                    // Unwrap the Vercel proxy URL to get the raw Vidlink URL
                    if let urlComponents = URLComponents(string: wrappedUrlStr),
                       let queryItems = urlComponents.queryItems,
                       let rawUrl = queryItems.first(where: { $0.name == "url" })?.value {
                        videoUrlString = rawUrl
                        print("✅ Extracted Raw Video URL: \(rawUrl)")
                        break
                    }
                }
            }
            
            if videoUrlString == nil, let first = streams.first, let wrappedUrlStr = first["url"] as? String {
                 if let urlComponents = URLComponents(string: wrappedUrlStr),
                    let queryItems = urlComponents.queryItems,
                    let rawUrl = queryItems.first(where: { $0.name == "url" })?.value {
                     videoUrlString = rawUrl
                     print("✅ Extracted Raw Video URL (Fallback): \(rawUrl)")
                 }
            }
        }
        
        guard let finalUrlStr = videoUrlString, let finalUrl = URL(string: finalUrlStr) else {
            print("❌ Invalid URL for deep test")
            return
        }
        
        print("\n🕳️ Performing deep segment retrieval test...")
        var request = URLRequest(url: finalUrl)
        request.addValue("https://vidlink.pro/", forHTTPHeaderField: "Referer")
        request.addValue("https://vidlink.pro", forHTTPHeaderField: "Origin")
        request.addValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", forHTTPHeaderField: "User-Agent")
        
        let (masterData, _) = try await URLSession.shared.data(for: request)
        if let masterM3u8 = String(data: masterData, encoding: .utf8) {
            print("📄 MASTER M3U8 FETCHED (\(masterData.count) bytes)")
            
            let lines = masterM3u8.components(separatedBy: .newlines)
            for line in lines {
                if line.hasPrefix("http") || (line.hasPrefix("/") && !line.isEmpty) || (line.hasSuffix(".m3u8")) || line.hasSuffix(".png") || line.hasSuffix(".jpg") || line.hasSuffix(".ts") {
                    
                    let segmentUrlStr = line.hasPrefix("/")
                        ? {
                            var comps = URLComponents(url: finalUrl, resolvingAgainstBaseURL: false)!
                            comps.path = line
                            if !line.contains("?") { comps.query = finalUrl.query }
                            return comps.url!.absoluteString
                        }()
                        : (!line.hasPrefix("http") ? finalUrl.deletingLastPathComponent().appendingPathComponent(line).absoluteString : line)
                    
                    print("🔗 Attempting to fetch segment WITHOUT headers: \(segmentUrlStr)")
                    var segReq = URLRequest(url: URL(string: segmentUrlStr)!)
                    // DELIBERATELY REMOVING HEADERS TO MIMIC AVPLAYER BEHAVIOR
                    // segReq.addValue("https://vidlink.pro/", forHTTPHeaderField: "Referer")
                    // segReq.addValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")
                    
                    let (segData, segResp) = try await URLSession.shared.data(for: segReq)
                    if let httpResp = segResp as? HTTPURLResponse {
                        print("📦 Segment HTTP Status: \(httpResp.statusCode)")
                        print("📦 Segment Size: \(segData.count) bytes")
                        print("📦 Segment MIME: \(httpResp.mimeType ?? "unknown")")
                        if httpResp.statusCode == 200 && segData.count > 1000 {
                            print("🎉 SUCCESS: We can read the segments natively!")
                        } else {
                            print("❌ FAILED: Segment fetch returned \(httpResp.statusCode)")
                        }
                    }
                    break
                }
            }
        }
    } catch {
        print("❌ Failed: \(error.localizedDescription)")
    }
}

testGroup.wait()
print("\n🎉 Test finished.")
