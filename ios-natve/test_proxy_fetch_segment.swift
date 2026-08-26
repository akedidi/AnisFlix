import Foundation

// A simple HTTP GET to see what happens
let proxyURLStr = "http://172.20.7.199:8080/manifest?url64=aHR0cHM6Ly9jZG4ud2F0Y2hpbmcub25sL2FuaW1lL2JjYTgyZTQxZWU3YjA4MzM1ODgzOTliMWZjZDE3N2M3L2Y4MGU4Mzc3OWIwMjVjMmUwMDMyZjAyOWZmMTIyZWJmL21hc3Rlci5tM3U4&referer=https://megaplay.buzz/&origin=https://megaplay.buzz&user_agent=Mozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/120.0.0.0%20Safari/537.36"

let sem = DispatchSemaphore(value: 0)

URLSession.shared.dataTask(with: URL(string: proxyURLStr)!) { data, res, err in
    let str1 = String(data: data!, encoding: .utf8)!
    let firstUrl = str1.components(separatedBy: "\n").first(where: { $0.hasPrefix("http") })!
    
    URLSession.shared.dataTask(with: URL(string: firstUrl)!) { d2, r2, e2 in
        let str2 = String(data: d2!, encoding: .utf8)!
        let firstTs = str2.components(separatedBy: "\n").first(where: { $0.hasPrefix("http") })!
        print("First TS URL:\n\(firstTs)")
        
        URLSession.shared.dataTask(with: URL(string: firstTs)!) { d3, r3, e3 in
            if let e3 = e3 { print("Error 3: \(e3)") }
            if let h3 = r3 as? HTTPURLResponse { print("Status 3: \(h3.statusCode)") }
            if let d3 = d3 { print("Body 3 length: \(d3.count)") }
            sem.signal()
        }.resume()
    }.resume()
}.resume()

sem.wait()
