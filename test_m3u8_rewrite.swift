import Foundation

let originalUrl = URL(string: "https://storm.vodvidl.site/proxy/file2/QS4AvnRIH+pTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3+GQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok=/MzYw/aW5kZXgubTN1OA==.m3u8?headers=%7B%22origin%22%3A%22https%3A%2F%2Fvideostr.net%22%2C%22referer%22%3A%22https%3A%2F%2Fvideostr.net%2F%22%7D&host=https%3A%2F%2Fthunderleaf12.online")!

let line = "aW5kZXgubTN1OA==.m3u8?headers={\"origin\":\"https://videostr.net\",\"referer\":\"https://videostr.net/\"}&host=https://thunderleaf12.online"

let baseUrl = originalUrl.deletingLastPathComponent()
print("baseUrl: \(baseUrl)")

let resolved = URL(string: line, relativeTo: baseUrl)
print("resolved: \(resolved?.absoluteString ?? "FAILED")")

