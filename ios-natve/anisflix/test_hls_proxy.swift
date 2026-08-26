import Foundation

let headers = [
    "Referer": "https://megaplay.buzz/",
    "Origin": "https://megaplay.buzz",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
]

func fetch(url: String) async throws -> (Data, HTTPURLResponse) {
    guard let u = URL(string: url) else { throw URLError(.badURL) }
    var req = URLRequest(url: u)
    let (data, res) = try await URLSession.shared.data(for: req)
    return (data, res as! HTTPURLResponse)
}

Task {
    do {
        // Start LocalStreamingServer
        // Note: we can't easily start GCDWebServer in a standalone swift script 
        // without including all its dependencies (GCDWebServer, etc.)
        print("Need to run this inside Xcode or link GCDWebServer")
        exit(0)
    } catch {
        print("Error: \(error)")
        exit(1)
    }
}
RunLoop.main.run()
