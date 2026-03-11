import Foundation

print("🎬 Testing Hakunaymatata (MOB) server Byte-Range support...")

let urlString = "https://bcdn2.hakunaymatata.com/resource/65b6926f5358a1c3e4507e39129c3cd2.mp4?sign=ac8bad40df17f86af4a22f582818f841&t=1772897370"
guard let url = URL(string: urlString) else {
    print("❌ Invalid URL")
    exit(1)
}

var request = URLRequest(url: url)
request.setValue("https://api.inmoviebox.com", forHTTPHeaderField: "Referer")
request.setValue("com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)", forHTTPHeaderField: "User-Agent")

// Request exactly 10KB from the middle of the file
let rangeHeader = "bytes=5000000-5010000"
request.setValue(rangeHeader, forHTTPHeaderField: "Range")

let semaphore = DispatchSemaphore(value: 0)

let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let error = error {
        print("❌ Request failed: \(error.localizedDescription)")
        exit(1)
    }
    
    guard let httpResponse = response as? HTTPURLResponse else {
        print("❌ Invalid response type")
        exit(1)
    }
    
    print("\n✅ Server Response Status: \(httpResponse.statusCode)")
    print("✅ Headers Received:")
    if let contentRange = httpResponse.allHeaderFields["Content-Range"] as? String {
        print("   - Content-Range: \(contentRange)")
    } else {
        print("   ❌ Missing Content-Range!")
    }
    if let acceptRanges = httpResponse.allHeaderFields["Accept-Ranges"] as? String {
        print("   - Accept-Ranges: \(acceptRanges)")
    }
    if let contentLength = httpResponse.allHeaderFields["Content-Length"] as? String {
        print("   - Content-Length: \(contentLength)")
    }
    
    if let data = data {
        print("\n✅ Downloaded chunk size: \(data.count) bytes")
        if data.count == 10001 {
            print("🎉 SUCCESS: The server perfectly supports our chunk proxy request!")
        } else {
            print("⚠️ The server returned a different size than requested.")
        }
    }
    
    semaphore.signal()
}

task.resume()
semaphore.wait()
