import Foundation
import Darwin

final class TLSBypassDelegate: NSObject, URLSessionDelegate {}

@main
struct StreamzoProviderDiagnostic {
    static func main() async {
        print("=== Paul, la série S1E1 (TMDB 300925) ===")

        let sources = await FrenchAnimeProvidersService.shared.getStreamzoStreams(
            tmdbId: 300925,
            mediaType: "tv",
            season: 1,
            episode: 1
        )

        guard !sources.isEmpty else {
            print("FAILED: Streamzo returned no source")
            exit(1)
        }

        print("Streamzo: \(sources.count) source(s)")
        var failed = false
        for source in sources {
            let result = await validate(source)
            print("  \(result.ok ? "✓" : "✗") [\(source.language)] \(source.quality) \(result.message)")
            if !result.ok { failed = true }
        }

        if failed {
            print("FAILED: at least one Streamzo source is not playable")
            exit(1)
        }
        print("PASSED: every Streamzo source returned for Paul S1E1 is playable")
    }

    private static func validate(
        _ source: FrenchAnimeProvidersService.ExtractedSource
    ) async -> (ok: Bool, message: String) {
        guard let url = URL(string: source.url) else { return (false, "invalid URL") }
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        request.setValue("bytes=0-8191", forHTTPHeaderField: "Range")
        source.headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode) else {
                return (false, "HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0) \(source.url)")
            }

            let contentType = http.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""
            let prefix = String(decoding: data.prefix(8192), as: UTF8.self)
            let isPlaylist = prefix.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("#EXTM3U")
            let isMedia = !data.isEmpty && (
                contentType.hasPrefix("video/")
                    || contentType.contains("octet-stream")
                    || contentType.contains("mp2t")
            )
            guard isPlaylist || isMedia else {
                return (false, "HTTP \(http.statusCode), unexpected content-type: \(contentType)")
            }
            return (true, "HTTP \(http.statusCode) \(contentType) \(source.url)")
        } catch {
            return (false, "\(error.localizedDescription) \(source.url)")
        }
    }
}
