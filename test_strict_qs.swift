import Foundation

let originalUrl = "https://storm.vodvidl.site/proxy/file2%2FQS4.m3u8?headers={\"referer\":\"https://videostr.net/\",\"origin\":\"https://videostr.net\"}&host=https://thunderleaf12.online"

let allowedCharset = CharacterSet.urlQueryAllowed.subtracting(CharacterSet(charactersIn: "?&="))
let encodedUrl = originalUrl.addingPercentEncoding(withAllowedCharacters: allowedCharset)!

let rawRequestPath = "http://192.168.1.12:8080/manifest?url=\(encodedUrl)&referer=ABC"
print("Raw encoded request: \(rawRequestPath)")

// Simulated GCDWebServer request.url
let requestUrl = URL(string: rawRequestPath)!

// Simulated extractQuery
let items = URLComponents(url: requestUrl, resolvingAgainstBaseURL: false)?.queryItems ?? []
var query = [String: String]()
for item in items {
    query[item.name] = item.value ?? ""
}

print("\nDecoded dict:")
print("url = \(query["url"] ?? "nil")")
print("referer = \(query["referer"] ?? "nil")")

