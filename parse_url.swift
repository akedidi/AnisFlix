import Foundation

let urlStr = "http://192.168.1.12:8080/manifest?url=https://storm.vodvidl.site/proxy/file2/QS/MTA4MA%3D%3D/c2Vn.jpg?headers%3D%257B%2522origin%2522%253A%2522https%253A%252F%252Fvideostr.net%2522%257D%26host%3Dhttps%253A%252F%252Fthunderleaf12.online"

let comps = URLComponents(string: urlStr)
for item in comps?.queryItems ?? [] {
    print("\(item.name) = \(item.value ?? "nil")")
}
