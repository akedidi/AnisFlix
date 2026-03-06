import Foundation

let tmdbId = "1242898"
let encDecApi = "https://enc-dec.app/api"
let vidlinkApi = "https://vidlink.pro/api/b"

// 1. Get Encrypted ID
func test() async throws {
    let url = URL(string: "\(encDecApi)/enc-vidlink?text=\(tmdbId)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    let res = try JSONSerialization.jsonObject(with: data) as! [String: Any]
    let encryptedId = res["result"] as! String

    // 2. Query Vidlink
    let vidlinkUrl = URL(string: "\(vidlinkApi)/movie/\(encryptedId)")!
    var request = URLRequest(url: vidlinkUrl)
    request.allHTTPHeaderFields = [
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://vidlink.pro/"
    ]
    
    let (vData, _) = try await URLSession.shared.data(for: request)
    print("Vidlink Response: \(String(data: vData, encoding: .utf8) ?? "")")
}

let group = DispatchGroup()
group.enter()
Task {
    do { try await test() } catch { print(error) }
    group.leave()
}
group.wait()
