import Foundation
let str = "https://storm.vodvidl.site/proxy/file2.m3u8?headers={\"referer\":\"https://videostr.net/\",\"origin\":\"https://videostr.net\"}&host=https://thunderleaf12.online"
let url = URL(string: str)!

var comps = URLComponents()
comps.scheme = "http"
comps.host = "192.168.1.12"
comps.port = 8080
comps.path = "/manifest"

comps.queryItems = [URLQueryItem(name: "url", value: url.absoluteString)]

print("1. Proxy URL:")
print(comps.url!.absoluteString)

let proxyUrlString = comps.url!.absoluteString

// Now simulate LocalStreamingServer receiving it
let requestComps = URLComponents(string: proxyUrlString)!
let decodedItems = requestComps.queryItems ?? []
print("2. Decoded URL from Proxy Server:")
for item in decodedItems {
    print("\(item.name) = \(item.value!)")
}

