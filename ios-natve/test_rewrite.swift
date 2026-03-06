import Foundation

// Simulate exactly what LocalStreamingServer.rewriteUrl does
let originalUrlStr = "https://storm.vodvidl.site/proxy/file2%2FQS4AvnRIH%2BpTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3%2BGQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok%3D%2FcGxheWxpc3QubTN1OA%3D%3D.m3u8?headers={\"referer\":\"https://videostr.net/\",\"origin\":\"https://videostr.net\"}&host=https://thunderleaf12.online"

let originalUrl = URL(string: originalUrlStr)!

// This is what the M3U8 contains - absolute path entries  
let line = "/proxy/file2/QS4AvnRIH+pTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3+GQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok=/MTA4MA==/aW5kZXgubTN1OA==.m3u8?headers=%7B%22origin%22%3A%22https%3A%2F%2Fvideostr.net%22%2C%22referer%22%3A%22https%3A%2F%2Fvideostr.net%2F%22%7D&host=https%3A%2F%2Fthunderleaf12.online"

let baseUrl = originalUrl.deletingLastPathComponent()
print("baseUrl: \(baseUrl.absoluteString.prefix(80))...")

// Step 1: Resolve
guard let resolved = URL(string: line, relativeTo: baseUrl) else {
    print("❌ FAILED to resolve")
    exit(1)
}
print("resolved: \(resolved.absoluteString.prefix(120))...")
print("resolved query: \(resolved.query?.prefix(100) ?? "nil")")

// Step 2: queryItemsToPersist - simulate what happens
let originalQueryItems = URLComponents(url: originalUrl, resolvingAgainstBaseURL: false)?.queryItems
print("\noriginalQueryItems to persist: \(originalQueryItems?.map { $0.name } ?? [])")
print("resolved already has query: \(resolved.query != nil)")

// Step 3: What URLComponents does when setting queryItems
if var comps = URLComponents(url: resolved, resolvingAgainstBaseURL: true) {
    print("\nBEFORE URLComponents queryItems setter:")
    print("  comps.url: \(comps.url?.absoluteString.prefix(120) ?? "nil")...")
    
    var currentItems = comps.queryItems ?? []
    print("  currentItems: \(currentItems.map { "\($0.name)=\($0.value?.prefix(30) ?? "nil")" })")
    
    // This is the persist logic
    if let items = originalQueryItems {
        for item in items {
            if !currentItems.contains(where: { $0.name == item.name }) {
                currentItems.append(item)
            }
        }
    }
    comps.queryItems = currentItems
    
    print("\nAFTER URLComponents queryItems setter:")
    print("  comps.url: \(comps.url?.absoluteString.prefix(120) ?? "nil")...")
    
    // Check if it's still valid
    if let newUrl = comps.url {
        // Now base64 it
        let b64 = newUrl.absoluteString.data(using: .utf8)!.base64EncodedString()
        // Decode it back
        let decoded = String(data: Data(base64Encoded: b64)!, encoding: .utf8)!
        print("\nBase64 round-trip: \(decoded.prefix(120))...")
        
        // Try to create URL from decoded
        if let finalUrl = URL(string: decoded) {
            print("✅ URL created from decoded base64")
            print("   host: \(finalUrl.host ?? "nil")")
            print("   path: \(finalUrl.path.prefix(80))...")
        } else {
            print("❌ URL(string:) FAILED on decoded base64!")
            print("   decoded: \(decoded.prefix(200))")
        }
    }
}
