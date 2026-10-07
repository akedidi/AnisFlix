import Foundation

// VidlinkService uses the app's URLSession delegate. The standalone test only
// needs the same type name; certificate handling stays managed by URLSession.
final class TLSBypassDelegate: NSObject, URLSessionDelegate, @unchecked Sendable {}

private struct TestCase {
    let label: String
    let tmdbId: String
    let mediaType: String
    let season: Int?
    let episode: Int?
}

private enum ValidationError: LocalizedError {
    case noSources
    case invalidURL(String)
    case nonHTTPResponse(String)
    case badStatus(Int, String)
    case invalidManifest(String)
    case unexpectedContentType(String, String)

    var errorDescription: String? {
        switch self {
        case .noSources:
            return "Vidlink did not return any source"
        case .invalidURL(let value):
            return "Invalid source URL: \(value)"
        case .nonHTTPResponse(let value):
            return "No HTTP response for: \(value)"
        case .badStatus(let status, let value):
            return "HTTP \(status) for: \(value)"
        case .invalidManifest(let value):
            return "The response is not a readable HLS manifest: \(value)"
        case .unexpectedContentType(let contentType, let value):
            return "Unexpected content type '\(contentType)' for: \(value)"
        }
    }
}

private let vidlinkHeaders = [
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Referer": "https://vidlink.pro/",
    "Origin": "https://vidlink.pro"
]

private func validate(_ source: VidlinkService.ExtractedSource) async throws {
    guard let url = URL(string: source.url) else {
        throw ValidationError.invalidURL(source.url)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.timeoutInterval = 30
    request.allHTTPHeaderFields = vidlinkHeaders

    let pathSuggestsHLS = url.pathExtension.lowercased() == "m3u8"
    if !pathSuggestsHLS {
        request.setValue("bytes=0-4095", forHTTPHeaderField: "Range")
    }

    let config = URLSessionConfiguration.ephemeral
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 45
    let session = URLSession(configuration: config, delegate: TLSBypassDelegate(), delegateQueue: nil)
    defer { session.invalidateAndCancel() }

    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse else {
        throw ValidationError.nonHTTPResponse(source.url)
    }
    guard (200...299).contains(http.statusCode) else {
        throw ValidationError.badStatus(http.statusCode, source.url)
    }

    let contentType = (http.value(forHTTPHeaderField: "Content-Type") ?? "").lowercased()
    let prefix = String(data: data.prefix(128), encoding: .utf8) ?? ""
    let isHLS = pathSuggestsHLS || contentType.contains("mpegurl") || prefix.contains("#EXTM3U")

    if isHLS {
        guard prefix.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("#EXTM3U") else {
            throw ValidationError.invalidManifest(source.url)
        }
    } else {
        let accepted = contentType.hasPrefix("video/")
            || contentType.contains("octet-stream")
            || contentType.contains("mp2t")
        guard accepted, !data.isEmpty else {
            throw ValidationError.unexpectedContentType(contentType, source.url)
        }
    }

    print("   ✅ \(source.name) [\(source.quality ?? "Unknown")] HTTP \(http.statusCode), \(contentType.isEmpty ? "content-type absent" : contentType)")
}

@main
struct VidlinkProviderTest {
    static func main() async {
        let cases = [
            TestCase(
                label: "LIAR GAME (2026) S1E20",
                tmdbId: "300126",
                mediaType: "tv",
                season: 1,
                episode: 20
            )
        ]

        do {
            for test in cases {
                print("\n🧪 \(test.label)")
                let sources = try await VidlinkService.shared.getStreams(
                    tmdbId: test.tmdbId,
                    mediaType: test.mediaType,
                    season: test.season,
                    episode: test.episode
                )
                guard !sources.isEmpty else { throw ValidationError.noSources }

                print("   Vidlink returned \(sources.count) source(s)")
                for source in sources {
                    try await validate(source)
                }
            }

            print("\nPASSED: Vidlink returned only playable sources")
        } catch {
            fputs("\nFAILED: \(error.localizedDescription)\n", stderr)
            exit(1)
        }
    }
}
