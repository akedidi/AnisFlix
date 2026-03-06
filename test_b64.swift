import Foundation

let originalUrl = "https://storm.vodvidl.site/proxy/file2/QS4AvnRIH+pTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3+GQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok=/MzYw/aW5kZXgubTN1OA==.m3u8?headers={\"referer\":\"https://videostr.net/\",\"origin\":\"https://videostr.net\"}&host=https://thunderleaf12.online"

// Encode
let b64 = originalUrl.data(using: .utf8)?.base64EncodedString() ?? ""
print("b64: \(b64)")

var components = URLComponents()
components.scheme = "http"
components.host = "192.168.1.12"
components.port = 8080
components.path = "/manifest"
components.queryItems = [URLQueryItem(name: "url64", value: b64)]

let proxyUrlStr = components.url!.absoluteString
print("proxy URL: \(proxyUrlStr)")

// Server Receive
let incomingUrl = URL(string: proxyUrlStr)!
let incomingComps = URLComponents(url: incomingUrl, resolvingAgainstBaseURL: false)
let incomingB64 = incomingComps?.queryItems?.first(where: { $0.name == "url64" })?.value ?? ""

print("incomingB64: \(incomingB64)")
let data = Data(base64Encoded: incomingB64)!
let decoded = String(data: data, encoding: .utf8)!

print("decoded: \(decoded)")
print("Matches? \(originalUrl == decoded)")
