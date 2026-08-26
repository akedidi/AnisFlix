import Foundation

let originalUrl = "https://u14.vidzy.cc/hls2/index.m3u8?t=ABC&s=123"
let allowed = originalUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
let proxyUrl = "http://localhost:8080/manifest?url=\(allowed)"
print("Proxy URL: \(proxyUrl)")
if let comps = URLComponents(string: proxyUrl) {
    for item in comps.queryItems ?? [] {
        print("Query Item: \(item.name) = \(item.value ?? "")")
    }
}
