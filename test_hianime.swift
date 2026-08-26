import Foundation

// Simulate HiAnime extraction
let megaUrl = "https://megaplay.buzz/stream/mal/22535/1/sub"
// Wait, I need a valid URL. Let's just use the one we already have for testing headers.
let m3u8Url = "https://cdn.watching.onl/anime/bca82e41ee7b0833588399b1fcd177c7/f80e83779b025c2e0032f029ff122ebf/master.m3u8"

func fetchM3U8() async {
    guard let url = URL(string: m3u8Url) else { return }
    var request = URLRequest(url: url)
    request.setValue("https://megaplay.buzz/", forHTTPHeaderField: "Referer")
    
    do {
        let (data, response) = try await URLSession.shared.data(for: request)
        if let httpResponse = response as? HTTPURLResponse {
            print("Status code: \(httpResponse.statusCode)")
            if httpResponse.statusCode == 200 {
                let text = String(data: data, encoding: .utf8) ?? ""
                print("Manifest Content:\n\(text)")
                
                // Now let's try to fetch one of the playlists inside
                let lines = text.components(separatedBy: "\n")
                if let nextPlaylist = lines.first(where: { $0.hasSuffix(".m3u8") }) {
                    let fullUrl = url.deletingLastPathComponent().appendingPathComponent(nextPlaylist).absoluteString
                    print("Fetching nested playlist: \(fullUrl)")
                    
                    var req2 = URLRequest(url: URL(string: fullUrl)!)
                    req2.setValue("https://megaplay.buzz/", forHTTPHeaderField: "Referer")
                    let (data2, res2) = try await URLSession.shared.data(for: req2)
                    let text2 = String(data: data2, encoding: .utf8) ?? ""
                    print("Nested Playlist Status: \((res2 as? HTTPURLResponse)?.statusCode ?? 0)")
                    print("Nested Playlist Content (first 5 lines):")
                    let nestedLines = text2.components(separatedBy: "\n").prefix(5)
                    print(nestedLines.joined(separator: "\n"))
                    
                    // Fetch a TS segment
                    if let tsLine = text2.components(separatedBy: "\n").first(where: { $0.hasSuffix(".ts") }) {
                        let tsUrl = URL(string: fullUrl)!.deletingLastPathComponent().appendingPathComponent(tsLine).absoluteString
                        print("Fetching TS segment: \(tsUrl)")
                        var req3 = URLRequest(url: URL(string: tsUrl)!)
                        req3.setValue("https://megaplay.buzz/", forHTTPHeaderField: "Referer")
                        let (data3, res3) = try await URLSession.shared.data(for: req3)
                        print("TS Segment Status: \((res3 as? HTTPURLResponse)?.statusCode ?? 0)")
                        print("TS Segment Size: \(data3.count) bytes")
                    }
                }
            } else {
                print("Error: HTTP \(httpResponse.statusCode)")
            }
        }
    } catch {
        print("Fetch failed: \(error)")
    }
}

Task {
    await fetchM3U8()
    exit(0)
}

RunLoop.main.run()
