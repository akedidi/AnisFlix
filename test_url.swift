import Foundation

let resolved = URL(string: "https://storm.vodvidl.site/proxy/file2/QS/MTA4MA==/c2Vn.jpg?headers=%7B%22origin%22%3A%22https%3A%2F%2Fvideostr.net%22%7D&host=https%3A%2F%2Fthunderleaf12.online")!

var components = URLComponents()
components.scheme = "http"
components.host = "192.168.1.12"
components.port = 8080
components.path = "/manifest"

var queryItems = [URLQueryItem(name: "url", value: resolved.absoluteString)]
components.queryItems = queryItems

print("Proxy URL: \n" + (components.url?.absoluteString ?? "nil"))
