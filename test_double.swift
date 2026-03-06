import Foundation
let u = URL(string: "https://foo.com/file.m3u8?query=1")!
print("1 absoluteString: \(u.absoluteString)")

let u2 = URL(string: "https://foo.com/file.m3u8?headers=%7B%22a%22%3A%22b%22%7D")!
print("2 absoluteString: \(u2.absoluteString)")
