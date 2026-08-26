import Foundation

func fetchVidzy(tmdbId: String) {
    let semaphore = DispatchSemaphore(value: 0)
    
    // First we need to get the media ID from Vidzy
    let embedUrl = URL(string: "https://vidzy.cc/embed/movie/\(tmdbId)")!
    var req = URLRequest(url: embedUrl)
    req.setValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")
    
    URLSession.shared.dataTask(with: req) { data, res, err in
        guard let data = data, let html = String(data: data, encoding: .utf8) else {
            print("Failed to get HTML")
            semaphore.signal()
            return
        }
        
        let pattern = "file:\"(https://[^\"]+)\""
        let regex = try! NSRegularExpression(pattern: pattern)
        if let match = regex.firstMatch(in: html, range: NSRange(html.startIndex..., in: html)),
           let range = Range(match.range(at: 1), in: html) {
            let m3u8Url = String(html[range])
            print("M3U8: \(m3u8Url)")
            
            // Now fetch the M3U8
            var m3u8Req = URLRequest(url: URL(string: m3u8Url)!)
            m3u8Req.setValue("https://vidzy.cc/", forHTTPHeaderField: "Referer")
            URLSession.shared.dataTask(with: m3u8Req) { m3u8Data, _, _ in
                if let d = m3u8Data, let m3Str = String(data: d, encoding: .utf8) {
                    print("--- MASTER M3U8 ---")
                    print(m3Str)
                }
                semaphore.signal()
            }.resume()
        } else {
            print("No match found")
            semaphore.signal()
        }
    }.resume()
    
    semaphore.wait()
}

fetchVidzy(tmdbId: "1504358")
