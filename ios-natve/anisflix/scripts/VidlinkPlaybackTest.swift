import Foundation
import MobileVLCKit
import UIKit

private let browserHeaders = [
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Referer": "https://vidlink.pro/",
    "Origin": "https://vidlink.pro",
]

private enum TestFailure: Error, CustomStringConvertible {
    case invalidURL(String)
    case http(Int, String)
    case invalidJSON(String)
    case noStream
    case playback(String)

    var description: String {
        switch self {
        case .invalidURL(let value): return "URL invalide: \(value)"
        case .http(let status, let url): return "HTTP \(status): \(url)"
        case .invalidJSON(let step): return "Réponse JSON invalide: \(step)"
        case .noStream: return "Aucun flux Vidlink utilisable"
        case .playback(let reason): return "Lecture VLC échouée: \(reason)"
        }
    }
}

private func request(_ url: URL, method: String = "GET", headers: [String: String] = [:], body: Data? = nil) throws -> Data {
    let semaphore = DispatchSemaphore(value: 0)
    var result: Result<Data, Error>!
    var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
    request.httpMethod = method
    request.httpBody = body
    headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
    URLSession.shared.dataTask(with: request) { data, response, error in
        defer { semaphore.signal() }
        if let error { result = .failure(error); return }
        let status = (response as? HTTPURLResponse)?.statusCode ?? -1
        guard (200..<300).contains(status) else {
            result = .failure(TestFailure.http(status, url.absoluteString))
            return
        }
        result = .success(data ?? Data())
    }.resume()
    semaphore.wait()
    return try result.get()
}

private func jsonObject(_ data: Data, step: String) throws -> [String: Any] {
    guard let value = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        throw TestFailure.invalidJSON(step)
    }
    return value
}

private func isExpired(_ value: String) -> Bool {
    guard let url = URL(string: value),
          let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
          let raw = components.queryItems?.first(where: { $0.name.lowercased() == "t" })?.value,
          let expiry = TimeInterval(raw) else { return false }
    return expiry <= Date().timeIntervalSince1970
}

private func backendStream(tmdbID: String) throws -> URL? {
    var components = URLComponents(string: "https://anisflix.vercel.app/api/movix-proxy")!
    components.queryItems = [
        URLQueryItem(name: "path", value: "vidlink"),
        URLQueryItem(name: "tmdbId", value: tmdbID),
        URLQueryItem(name: "type", value: "movie"),
        URLQueryItem(name: "client", value: "ios-native-playback-test"),
        URLQueryItem(name: "_", value: String(Int(Date().timeIntervalSince1970))),
    ]
    let payload = try jsonObject(request(components.url!), step: "liste backend")
    let streams = payload["streams"] as? [[String: Any]] ?? []
    print("📡 Liste backend: \(streams.count) flux")
    for stream in streams {
        guard let rawURL = stream["url"] as? String else { continue }
        let quality = stream["quality"] as? String ?? "Auto"
        if isExpired(rawURL) {
            print("⚠️ \(quality): signature expirée, flux ignoré")
            continue
        }
        if let url = URL(string: rawURL) { return url }
    }
    return nil
}

private func base64URL(_ value: String) -> String {
    Data(value.utf8).base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
}

private func discoverWebKitStream(tmdbID: String) throws -> URL {
    let encURL = URL(string: "https://enc-dec.app/api/enc-vidlink?text=\(tmdbID)")!
    let encrypted = try jsonObject(request(encURL), step: "chiffrement")["result"] as? String
    guard let encrypted else { throw TestFailure.invalidJSON("chiffrement") }

    let target = "https://vidlink.pro/api/b/movie/\(encrypted)?multiLang=0"
    var worker = URLComponents(string: "https://anisflix.kedidi-anis.workers.dev/")!
    worker.queryItems = [
        URLQueryItem(name: "path", value: "mob"),
        URLQueryItem(name: "method", value: "GET"),
        URLQueryItem(name: "url", value: target),
    ]
    var upstreamHeaders = browserHeaders
    upstreamHeaders["Accept"] = "application/json,*/*"
    upstreamHeaders["X-Playback-Environment"] = "webkit"
    let body = try JSONSerialization.data(withJSONObject: ["headers": upstreamHeaders, "body": NSNull()])
    let raw = try jsonObject(request(worker.url!, method: "POST", headers: ["Content-Type": "application/json"], body: body), step: "API Vidlink WebKit")

    guard let stream = raw["stream"] as? [String: Any],
          stream["requiresProxy"] as? Bool == true,
          let playlist = stream["playlist"] as? String,
          let source = URL(string: playlist),
          let sourceScheme = source.scheme,
          let sourceHost = source.host,
          let playlistHeaders = stream["playlistHeaders"] as? [String: Any],
          let cookie = (playlistHeaders["Cookie"] ?? playlistHeaders["cookie"]) as? String else {
        throw TestFailure.noStream
    }

    var output = URLComponents()
    output.scheme = "https"
    output.host = "flood.sourcerrr.online"
    output.path = "/sacdn\(source.path)"
    output.queryItems = [
        URLQueryItem(name: "host", value: "\(sourceScheme)://\(sourceHost)"),
        URLQueryItem(name: "sc", value: base64URL(cookie)),
    ]
    guard let url = output.url else { throw TestFailure.invalidURL(output.string ?? "") }
    print("✅ Découverte locale: manifeste WebKit DASH signé")
    return url
}

private final class PlaybackProbe: NSObject, VLCMediaPlayerDelegate {
    let player = VLCMediaPlayer()
    private let drawable = UIView(frame: CGRect(x: 0, y: 0, width: 320, height: 180))
    var finished = false
    var failure: String?

    override init() {
        super.init()
        player.delegate = self
        player.drawable = drawable
    }

    func mediaPlayerStateChanged(_ notification: Notification) {
        let state = VLCMediaPlayerStateToString(player.state)
        print("   VLC: \(state)")
        fflush(stdout)
        if player.state == .error {
            failure = state
            finished = true
        } else if player.state == .ended && player.time.intValue < 1_000 {
            failure = "fin avant 1 seconde"
            finished = true
        }
    }

    func mediaPlayerTimeChanged(_ notification: Notification) {
        let milliseconds = player.time.intValue
        print("   vidéo: \(milliseconds) ms")
        fflush(stdout)
        if milliseconds >= 1_000 { finished = true }
    }
}

private func verifyPlayback(_ url: URL) throws {
    var manifestHeaders = browserHeaders
    manifestHeaders["Accept"] = "application/dash+xml,*/*"
    let manifest = try request(url, headers: manifestHeaders)
    guard String(data: manifest, encoding: .utf8)?.contains("<MPD") == true else {
        throw TestFailure.playback("le manifeste DASH est illisible")
    }
    print("✅ Manifeste accessible: \(manifest.count) octets")

    let probe = PlaybackProbe()
    let media = VLCMedia(url: url)
    media.addOptions([
        "network-caching": 3_000,
        "http-user-agent": browserHeaders["User-Agent"]!,
        "http-referrer": browserHeaders["Referer"]!,
    ])
    probe.player.media = media
    probe.player.audio?.isMuted = true
    probe.player.play()

    let deadline = Date().addingTimeInterval(45)
    while !probe.finished && Date() < deadline {
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))
    }
    let milliseconds = probe.player.time.intValue
    let state = VLCMediaPlayerStateToString(probe.player.state)
    let hasVideoOutput = probe.player.hasVideoOut
    let videoSize = probe.player.videoSize
    probe.player.stop()
    guard milliseconds >= 1_000,
          probe.failure == nil,
          hasVideoOutput,
          videoSize.width > 0,
          videoSize.height > 0 else {
        throw TestFailure.playback(probe.failure ?? "délai dépassé (\(state), \(milliseconds) ms)")
    }
    print("✅ Sortie vidéo active: \(Int(videoSize.width))×\(Int(videoSize.height))")
    print("✅ Playback vidéo atteint \(milliseconds) ms")
}

let tmdbID = CommandLine.arguments.dropFirst().first ?? "1458857"
print("🎬 Test Vidlink iOS — TMDB \(tmdbID)")
do {
    let url = try backendStream(tmdbID: tmdbID) ?? discoverWebKitStream(tmdbID: tmdbID)
    print("🔗 Lecture directe: \(url.host ?? "inconnu")\(url.path)")
    try verifyPlayback(url)
    print("\n✅ TEST RÉUSSI: le flux démarre réellement sur le lecteur iOS")
    exit(0)
} catch {
    print("\n❌ TEST ÉCHOUÉ: \(error)")
    exit(1)
}
