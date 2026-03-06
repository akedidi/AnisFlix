import Foundation
let str = "https://storm.vodvidl.site/proxy/file2.m3u8?headers={\"referer\":\"https://videostr.net/\",\"origin\":\"https://videostr.net\"}&host=https://thunderleaf12.online"
let url = URL(string: str)
print(url != nil ? "Valid: \(url!.absoluteString)" : "INVALID")
