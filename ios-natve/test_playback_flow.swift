import Foundation

// URL configurations (from previous tests)
let masterM3u8Url = "https://cdn.watching.onl/anime/bca82e41ee7b0833588399b1fcd177c7/f80e83779b025c2e0032f029ff122ebf/index-f1-v1-a1.m3u8"
let referer = "https://megaplay.buzz/"
let origin = "https://megaplay.buzz"
let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// Create base64 encoded params
let url64 = masterM3u8Url.data(using: .utf8)!.base64EncodedString()
let referer64 = referer.data(using: .utf8)!.base64EncodedString()
let origin64 = origin.data(using: .utf8)!.base64EncodedString()
let ua64 = ua.data(using: .utf8)!.base64EncodedString()

// 1. Fetch master playlist from proxy
let proxyUrl = URL(string: "http://172.20.7.199:8080/manifest?url64=\(url64)&referer64=\(referer64)&origin64=\(origin64)&ua64=\(ua64)")!

print("1. Fetching manifest from proxy: \(proxyUrl.absoluteString)")
let group = DispatchGroup()
group.enter()

var variantUrl: URL?

let task1 = URLSession.shared.dataTask(with: proxyUrl) { data, response, error in
    defer { group.leave() }
    
    if let error = error {
        print("Error fetching manifest: \(error)")
        return
    }
    
    guard let httpResponse = response as? HTTPURLResponse else { return }
    print("Manifest Status: \(httpResponse.statusCode)")
    
    guard let data = data, let str = String(data: data, encoding: .utf8) else { return }
    print("Manifest Body (first 200 chars): \n\(str.prefix(200))\n...")
    
    // Parse the first segment URL
    let lines = str.components(separatedBy: .newlines)
    for line in lines {
        if line.starts(with: "http") {
            variantUrl = URL(string: line)
            break
        }
    }
}
task1.resume()
group.wait()

guard let vUrl = variantUrl else {
    print("Could not find segment URL in manifest.")
    exit(1)
}

print("\n2. Fetching segment from proxy: \(vUrl.absoluteString)")
group.enter()

var request = URLRequest(url: vUrl)
// AVPlayer usually sends a Range request for segments
// request.setValue("bytes=0-1000", forHTTPHeaderField: "Range")

let task2 = URLSession.shared.dataTask(with: request) { data, response, error in
    defer { group.leave() }
    
    if let error = error {
        print("Error fetching segment: \(error)")
        return
    }
    
    guard let httpResponse = response as? HTTPURLResponse else { return }
    print("Segment Status: \(httpResponse.statusCode)")
    print("Segment Content-Type: \(httpResponse.value(forHTTPHeaderField: "Content-Type") ?? "none")")
    print("Segment Content-Length: \(httpResponse.value(forHTTPHeaderField: "Content-Length") ?? "none")")
    
    if let data = data {
        print("Segment Data length: \(data.count) bytes")
    }
}
task2.resume()
group.wait()
