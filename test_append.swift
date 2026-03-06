import Foundation

let url = URL(string: "https://storm.vodvidl.site/proxy/file2/QS4AvnRIH+pTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3+GQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok=/MzYw/index.m3u8")!

let line = "aW5kZXgubTN1OA==.m3u8?headers=abc&def=1"

let test1 = url.deletingLastPathComponent().appendingPathComponent(line).absoluteString
print("appendingPathComponent: \(test1)")

let test2 = URL(string: line, relativeTo: url.deletingLastPathComponent())?.absoluteString ?? ""
print("URL(string:relativeTo:): \(test2)")

