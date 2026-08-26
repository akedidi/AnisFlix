import Foundation

// A simple HTTP GET to see what happens
let proxyURLStr = "http://172.20.7.199:8080/manifest?url64=aHR0cHM6Ly9jZG4ud2F0Y2hpbmcub25sL2FuaW1lL2JjYTgyZTQxZWU3YjA4MzM1ODgzOTliMWZjZDE3N2M3L2Y4MGU4Mzc3OWIwMjVjMmUwMDMyZjAyOWZmMTIyZWJmL21hc3Rlci5tM3U4&referer=https://megaplay.buzz/&origin=https://megaplay.buzz&user_agent=Mozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/120.0.0.0%20Safari/537.36"

guard let url = URL(string: proxyURLStr) else {
    print("Invalid URL")
    exit(1)
}

let sem = DispatchSemaphore(value: 0)

var req = URLRequest(url: url)
URLSession.shared.dataTask(with: req) { data, res, err in
    if let err = err { print("Error: \(err)") }
    if let http = res as? HTTPURLResponse { print("Status: \(http.statusCode)") }
    if let data = data, let str = String(data: data, encoding: .utf8) {
        print("Body:\n\(str)")
        
        // Let's parse the first rewritten URL
        let lines = str.components(separatedBy: "\n")
        if let firstUrlLine = lines.first(where: { $0.hasPrefix("http") }) {
            print("First rewritten URL:\n\(firstUrlLine)")
            
            if let firstUrl = URL(string: firstUrlLine) {
                var req2 = URLRequest(url: firstUrl)
                URLSession.shared.dataTask(with: req2) { d2, r2, e2 in
                    if let e2 = e2 { print("Error 2: \(e2)") }
                    if let h2 = r2 as? HTTPURLResponse { print("Status 2: \(h2.statusCode)") }
                    if let d2 = d2 { print("Body 2 length: \(d2.count)") }
                    sem.signal()
                }.resume()
            } else {
                print("Invalid first rewritten URL")
                sem.signal()
            }
        } else {
            sem.signal()
        }
    } else {
        sem.signal()
    }
}.resume()

sem.wait()
