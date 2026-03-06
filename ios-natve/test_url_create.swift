import Foundation

// This is what the API returns (raw, with unencoded {})
let rawUrl = "https://storm.vodvidl.site/proxy/file2%2FQS4AvnRIH%2BpTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3%2BGQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok%3D%2FcGxheWxpc3QubTN1OA%3D%3D.m3u8?headers={\"referer\":\"https://videostr.net/\",\"origin\":\"https://videostr.net\"}&host=https://thunderleaf12.online"

print("1. RAW URL from API:")
if let u = URL(string: rawUrl) {
    print("   ✅ URL(string:) succeeded")
    print("   host: \(u.host ?? "nil")")
    print("   path contains m3u8: \(u.path.contains(".m3u8"))")
    print("   pathExtension: \(u.pathExtension)")
    print("   absoluteString contains .m3u8: \(u.absoluteString.contains(".m3u8"))")
} else {
    print("   ❌ URL(string:) FAILED!")
}

// This is what rewriteUrl produces after URLComponents.queryItems round-trip
let afterComponentsUrl = "https://storm.vodvidl.site/proxy/file2/QS4AvnRIH+pTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3+GQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok=/MTA4MA==/aW5kZXgubTN1OA==.m3u8?headers=%7B%22origin%22:%22https://videostr.net%22,%22referer%22:%22https://videostr.net/%22%7D&host=https://thunderleaf12.online"

print("\n2. After URLComponents round-trip:")
if let u = URL(string: afterComponentsUrl) {
    print("   ✅ URL(string:) succeeded")
    print("   host: \(u.host ?? "nil")")
} else {
    print("   ❌ URL(string:) FAILED!")
}

// Base64 encode AND decode
let b64 = rawUrl.data(using: .utf8)!.base64EncodedString()
let decoded = String(data: Data(base64Encoded: b64)!, encoding: .utf8)!
print("\n3. Base64 round-trip of raw URL:")
if let u = URL(string: decoded) {
    print("   ✅ URL(string:) succeeded")
    print("   host: \(u.host ?? "nil")")
    print("   path: \(u.path.prefix(80))...")
} else {
    print("   ❌ URL(string:) FAILED on decoded!")
    print("   decoded: \(decoded.prefix(200))")
}

// Now test: what does VidlinkService actually produce?
// The playlist URL from API raw JSON has unencoded {} in the query
print("\n4. Testing the ACTUAL URL from test_vidlink_full.swift:")
let actualFromApi = "https://storm.vodvidl.site/proxy/file2%2FQS4AvnRIH%2BpTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3%2BGQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok%3D%2FcGxheWxpc3QubTN1OA%3D%3D.m3u8?headers={\"referer\":\"https://videostr.net/\",\"origin\":\"https://videostr.net\"}&host=https://thunderleaf12.online"

let b64_2 = actualFromApi.data(using: .utf8)!.base64EncodedString()
print("   Base64: \(b64_2.prefix(60))...")

// Simulate what LocalStreamingServer does:
// 1. Receives url64 query param
// 2. Decodes base64
// 3. Creates URL(string:)
let decoded_2 = String(data: Data(base64Encoded: b64_2)!, encoding: .utf8)!
print("   Decoded matches original: \(decoded_2 == actualFromApi)")
if let u = URL(string: decoded_2) {
    print("   ✅ URL created successfully")
    print("   lastPathComponent: \(u.lastPathComponent)")
    
    // Now fetch it!
    let sem = DispatchSemaphore(value: 0)
    var req = URLRequest(url: u)
    req.setValue("https://vidlink.pro/", forHTTPHeaderField: "Referer")
    req.setValue("https://vidlink.pro", forHTTPHeaderField: "Origin")
    req.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", forHTTPHeaderField: "User-Agent")
    
    URLSession.shared.dataTask(with: req) { data, resp, err in
        if let httpResp = resp as? HTTPURLResponse {
            print("   HTTP Status: \(httpResp.statusCode)")
            print("   Size: \(data?.count ?? 0) bytes")
            if let body = data.flatMap({ String(data: $0, encoding: .utf8) }) {
                print("   Preview: \(body.prefix(200))")
            }
        }
        if let err = err { print("   Error: \(err)") }
        sem.signal()
    }.resume()
    sem.wait()
} else {
    print("   ❌ URL(string:) FAILED!")
}
