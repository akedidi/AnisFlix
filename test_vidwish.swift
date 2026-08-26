import Foundation

class HiAnimeService {
    static let shared = HiAnimeService()
    
    private let defaultHeaders: [String: String] = [
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Connection": "keep-alive"
    ]
    
    private func fetch(url: String, headers: [String: String] = [:]) async throws -> (Data, HTTPURLResponse) {
        guard let u = URL(string: url) else { throw URLError(.badURL) }
        var req = URLRequest(url: u)
        for (k, v) in defaultHeaders { req.setValue(v, forHTTPHeaderField: k) }
        for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        return (data, res as! HTTPURLResponse)
    }

    func testVidwish() async throws {
        let realId = "114742" // from One Piece
        let type = "sub"
        let vidPage = "https://vidwish.live/stream/s-2/\(realId)/\(type)"
        let megaUrl = "https://megaplay.buzz/stream/mal/21/1089/sub"
        let (vidData, res) = try await fetch(url: vidPage, headers: ["Referer": megaUrl])
        let vidHtml = String(data: vidData, encoding: .utf8) ?? ""
        print("Vidwish HTTP status: \(res.statusCode)")
        print("Vidwish HTML snippet: \(vidHtml.prefix(200))")
    }
}

Task {
    do {
        try await HiAnimeService.shared.testVidwish()
    } catch {
        print("Error: \(error)")
    }
    exit(0)
}
RunLoop.main.run()
