import Cocoa
import FlutterMacOS

/// Flutter uses the existing iOS source engine; extraction stays native on macOS.
final class NativeSourceBridge {
    private let channel: FlutterMethodChannel
    init(messenger: FlutterBinaryMessenger) {
        channel = FlutterMethodChannel(name: "com.anisflix.reconstructed/sources", binaryMessenger: messenger)
        channel.setMethodCallHandler { call, reply in
            guard let args = call.arguments as? [String: Any] else {
                reply(FlutterError(code: "arguments", message: "Paramètres invalides.", details: nil)); return
            }
            if let key = args["tmdbKey"] as? String { NativeSourceConfiguration.tmdbKey = key }
            if let backend = args["backend"] as? String { NativeSourceConfiguration.backend = backend }
            Task {
                do {
                    if call.method == "sources", let id = args["id"] as? Int {
                        let sources: [StreamingSource]
                        if args["type"] as? String == "tv", let season = args["season"] as? Int, let episode = args["episode"] as? Int {
                            sources = try await StreamingService.shared.fetchSeriesSources(seriesId: id, season: season, episode: episode)
                        } else {
                            sources = try await StreamingService.shared.fetchSources(movieId: id)
                        }
                        // Preserve the relative order of ties, as Swift's stable list sort does.
                        let rows = sources.sorted(by: StreamingSourceListOrdering.isSortedBefore).map(Self.row)
                        DispatchQueue.main.async { reply(rows) }
                    } else if call.method == "resolve", let url = args["url"] as? String {
                        let source = StreamingSource(url: url, quality: args["quality"] as? String ?? "Auto", type: args["format"] as? String ?? "embed", provider: args["provider"] as? String ?? "", language: args["language"] as? String ?? "VO", headers: args["headers"] as? [String:String])
                        let resolved = await StreamingService.shared.extractDirectLink(for: source)
                        DispatchQueue.main.async { reply(Self.row(resolved)) }
                    } else {
                        DispatchQueue.main.async { reply(FlutterMethodNotImplemented) }
                    }
                } catch {
                    DispatchQueue.main.async { reply(FlutterError(code:"sources", message:"Impossible de charger les sources natives.", details:nil)) }
                }
            }
        }
    }
    private static func row(_ source: StreamingSource) -> [String:Any] {
        ["url":source.directUrl ?? source.url, "quality":source.quality, "type":source.type,
         "provider":source.provider, "language":source.language, "origin":source.origin ?? "",
         "headers":source.headers ?? [:], "tracks":(source.tracks ?? []).map { ["url":$0.url,"label":$0.label,"language":$0.code] }]
    }
}
