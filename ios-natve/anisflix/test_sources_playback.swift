import Foundation

// MARK: - Vidzy Test
func testVidzy(url: String) async {
    print("====================================")
    print("🎬 TEST VIDZY: \(url)")
    print("====================================")
    
    let apiUrl = URL(string: "https://anisflix.vercel.app/api/extract")!
    var req = URLRequest(url: apiUrl)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: String] = ["type": "vidzy", "url": url]
    req.httpBody = try? JSONEncoder().encode(body)
    
    do {
        let (data, res) = try await URLSession.shared.data(for: req)
        guard let httpRes = res as? HTTPURLResponse, httpRes.statusCode == 200 else {
            print("❌ Vidzy API Error. Status: \((res as? HTTPURLResponse)?.statusCode ?? 0)")
            return
        }
        
        if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
           let m3u8 = json["m3u8"] as? String {
            print("✅ Vidzy successfully extracted.")
            print("👉 M3U8 URL: \(m3u8)")
            
            // Fetch M3U8 content
            var m3u8Req = URLRequest(url: URL(string: m3u8)!)
            m3u8Req.setValue("https://vidzy.cc/", forHTTPHeaderField: "Referer")
            m3u8Req.setValue("vidzy.cc", forHTTPHeaderField: "Origin")
            
            let (mData, _) = try await URLSession.shared.data(for: m3u8Req)
            if let mString = String(data: mData, encoding: .utf8) {
                print("\n📄 Master Manifest Content Preview:\n\(mString.prefix(500))...\n")
            }
        } else {
            print("❌ Vidzy JSON structure invalid: \(String(data: data, encoding: .utf8) ?? "")")
        }
    } catch {
        print("❌ Vidzy Request Failed: \(error)")
    }
}


// MARK: - HiAnime Test (Megaplay)
func testHiAnime() async {
    print("====================================")
    print("🎬 TEST HIANIME (MegaPlay)")
    print("====================================")
    
    let malId = 21 // One Piece
    let episode = 1000
    let type = "sub"
    let megaplayBase = "https://megaplay.buzz"
    let megaUrl = "\(megaplayBase)/stream/mal/\(malId)/\(episode)/\(type)"
    
    print("🌐 Fetching Megaplay URL: \(megaUrl)")
    
    do {
        var req1 = URLRequest(url: URL(string: megaUrl)!)
        req1.setValue(megaUrl, forHTTPHeaderField: "Referer")
        
        let (htmlData, _) = try await URLSession.shared.data(for: req1)
        guard let html = String(data: htmlData, encoding: .utf8) else {
            print("❌ Megaplay HTML failed")
            return
        }
        
        let idRegex = try! NSRegularExpression(pattern: "id=\"megaplay-player\"[^>]*data-id=\"([^\"]+)\"", options: [])
        let nsRange = NSRange(html.startIndex..<html.endIndex, in: html)
        
        var dataId: String?
        if let match = idRegex.firstMatch(in: html, options: [], range: nsRange), let r = Range(match.range(at: 1), in: html) {
            dataId = String(html[r])
        }
        
        guard let validDataId = dataId else {
            print("❌ Megaplay data-id not found in HTML. Check HTML preview:")
            print(html.prefix(500))
            return
        }
        
        print("✅ Found Megaplay data-id: \(validDataId)")
        
        let apiUrl = "\(megaplayBase)/stream/getSources?id=\(validDataId)&id=\(validDataId)"
        print("🌐 Fetching sources from: \(apiUrl)")
        
        var req2 = URLRequest(url: URL(string: apiUrl)!)
        req2.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")
        req2.setValue(megaUrl, forHTTPHeaderField: "Referer")
        
        let (jsonData, _) = try await URLSession.shared.data(for: req2)
        if let json = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            
            var file: String? = nil
            if let sourcesObj = json["sources"] as? [String: Any] {
                file = sourcesObj["file"] as? String
            } else if let sourcesArr = json["sources"] as? [[String: Any]], let first = sourcesArr.first {
                file = first["file"] as? String
            }
            
            if let f = file {
                print("✅ HiAnime successfully extracted.")
                print("👉 M3U8 URL: \(f)")
                
                if let tracks = json["tracks"] as? [[String: Any]] {
                    print("\n📝 Subtitles Found:")
                    for t in tracks {
                        if let file = t["file"] as? String, let kind = t["kind"] as? String, kind == "captions" {
                            print("   - [\(t["label"] as? String ?? "Unknown")] \(file)")
                        }
                    }
                }
                
                // Fetch M3U8
                var m3u8Req = URLRequest(url: URL(string: f)!)
                m3u8Req.setValue(megaUrl, forHTTPHeaderField: "Referer")
                let (mData, _) = try await URLSession.shared.data(for: m3u8Req)
                if let mString = String(data: mData, encoding: .utf8) {
                    print("\n📄 Master Manifest Content Preview:\n\(mString.prefix(500))...\n")
                }
                
            } else {
                print("❌ HiAnime: No 'file' found in JSON response")
            }
        }
    } catch {
        print("❌ HiAnime Request Failed: \(error)")
    }
}

let group = DispatchGroup()
group.enter()

Task {
    // Arcane Ep 1 on Vidzy
    await testVidzy(url: "https://vidzy.cc/embed/tv/94605/1/1")
    print("\n\n")
    // One Piece Ep 1000 on HiAnime
    await testHiAnime()
    
    group.leave()
}

group.wait()
