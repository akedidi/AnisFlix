import Foundation
import Darwin

// Compile this script with FrenchAnimeProvidersService.swift and
// JsPackerUnpacker.swift. The app provides a richer version of this delegate;
// the diagnostic only needs a standalone URLSession delegate on macOS.
final class TLSBypassDelegate: NSObject, URLSessionDelegate {}

@main
struct FrenchAnimeProvidersDiagnostic {
    private struct Case {
        let name: String
        let tmdbId: Int
        let mediaType: String
        let season: Int?
        let episode: Int?
    }

    static func main() async {
        let requested = CommandLine.arguments.dropFirst().first
        let cases = [
            Case(name: "Solo Leveling S1E1", tmdbId: 127532, mediaType: "tv", season: 1, episode: 1),
            Case(name: "Death Note S1E1", tmdbId: 13916, mediaType: "tv", season: 1, episode: 1)
        ].filter { requested == nil || $0.name.localizedCaseInsensitiveContains(requested!) }

        guard !cases.isEmpty else {
            print("No matching diagnostic case")
            exit(2)
        }

        var failed = false
        var providersWithPlayableSource = Set<String>()
        for testCase in cases {
            print("\n=== \(testCase.name) ===")
            let service = FrenchAnimeProvidersService.shared
            async let animeSama = service.getAnimeSamaStreams(
                tmdbId: testCase.tmdbId,
                mediaType: testCase.mediaType,
                season: testCase.season,
                episode: testCase.episode
            )
            async let frenchAnime = service.getFrenchAnimeStreams(
                tmdbId: testCase.tmdbId,
                mediaType: testCase.mediaType,
                season: testCase.season,
                episode: testCase.episode
            )
            let results = await [
                "Anime-Sama": animeSama,
                "French-Anime": frenchAnime
            ]
            var titleHasPlayableSource = false
            for provider in ["Anime-Sama", "French-Anime"] {
                let sources = results[provider] ?? []
                print("\(provider): \(sources.count) source(s)")
                var playableCount = 0
                for source in sources {
                    let validation = await validate(source)
                    print("  \(validation.ok ? "✓" : "✗") [\(source.language)] \(source.quality) \(validation.message)")
                    if validation.ok {
                        playableCount += 1
                        titleHasPlayableSource = true
                    }
                }
                if playableCount > 0 { providersWithPlayableSource.insert(provider) }
            }
            if !titleHasPlayableSource { failed = true }
        }

        let missingProviders = Set(["Anime-Sama", "French-Anime"])
            .subtracting(providersWithPlayableSource)
        if failed || !missingProviders.isEmpty {
            if !missingProviders.isEmpty {
                print("\nMissing playable provider(s): \(missingProviders.sorted().joined(separator: ", "))")
            }
            print("FAILED: the local provider validation did not pass")
            exit(1)
        }
        print("\nPASSED: both enabled providers returned a playable source")
    }

    private static func validate(_ source: FrenchAnimeProvidersService.ExtractedSource) async -> (ok: Bool, message: String) {
        guard let url = URL(string: source.url) else { return (false, "invalid URL") }
        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        request.setValue("bytes=0-8191", forHTTPHeaderField: "Range")
        source.headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode) else {
                return (false, "HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0) \(source.url)")
            }
            let text = String(decoding: data.prefix(8192), as: UTF8.self)
            let contentType = http.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""
            let isPlaylist = text.contains("#EXTM3U")
            let isMedia = contentType.hasPrefix("video/") || contentType.contains("octet-stream")
            return (isPlaylist || isMedia, "HTTP \(http.statusCode) \(source.url)")
        } catch {
            return (false, "\(error.localizedDescription) \(source.url)")
        }
    }
}
