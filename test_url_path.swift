import Foundation

let rawStr = "https://storm.vodvidl.site/proxy/file2/QS4AvnRIH+pTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3+GQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok=/MzYw/aW5kZXgubTN1OA==.m3u8?headers={\"origin\":\"https://videostr.net\",\"referer\":\"https://videostr.net/\"}&host=https://thunderleaf12.online"

print("1. Raw (no encoding)")
if let u = URL(string: rawStr) {
    print("URL: \(u.absoluteString)")
    print("path: \(u.path)")
    print("lastPathComponent: \(u.lastPathComponent)")
    print("query: \(u.query ?? "nil")")
} else {
    print("Failed to parse raw")
}

let allowed = CharacterSet.urlQueryAllowed
if let encoded = rawStr.addingPercentEncoding(withAllowedCharacters: allowed) {
    print("\n2. Encoded")
    if let u = URL(string: encoded) {
        print("URL: \(u.absoluteString)")
        print("path: \(u.path)")
        print("lastPathComponent: \(u.lastPathComponent)")
        print("query: \(u.query ?? "nil")")
    }
}

let properlyEncodedStr = "https://storm.vodvidl.site/proxy/file2/QS4AvnRIH+pTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3+GQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok=/MzYw/aW5kZXgubTN1OA==.m3u8?headers=%7B%22origin%22:%22https://videostr.net%22,%22referer%22:%22https://videostr.net/%22%7D&host=https://thunderleaf12.online"

print("\n3. Encoded values")
if let u = URL(string: properlyEncodedStr) {
     print("url: \(u.absoluteString)")
     print("path: \(u.path)")
     print("lastPathComponent: \(u.lastPathComponent)")
     print("query: \(u.query ?? "nil")")
}

