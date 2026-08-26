import Foundation

let targetUrl = URL(string: "https://dkein.cloudbuzz.lol/anime/bca82e41ee7b0833588399b1fcd177c7/f80e83779b025c2e0032f029ff122ebf/seg-1-f1-v1-a1.jpg")!
var req = URLRequest(url: targetUrl)
req.setValue("https://megaplay.buzz/", forHTTPHeaderField: "Referer")
req.setValue("https://megaplay.buzz", forHTTPHeaderField: "Origin")
req.setValue("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", forHTTPHeaderField: "User-Agent")

let sem = DispatchSemaphore(value: 0)
URLSession.shared.dataTask(with: req) { data, res, err in
    if let err = err { print("Error: \(err)") }
    if let http = res as? HTTPURLResponse { print("Status: \(http.statusCode)") }
    if let data = data { print("Body length: \(data.count)") }
    sem.signal()
}.resume()
sem.wait()
