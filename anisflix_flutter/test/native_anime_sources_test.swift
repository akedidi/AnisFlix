// Run with tool/test_native_sources.sh. Fixtures never contact live providers.
import Foundation

private final class FixtureProtocol: URLProtocol {
    static var respond: (URLRequest) -> String = { _ in "" }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(Self.respond(request).utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

@main struct NativeAnimeSourcesTest {
    static func check(_ condition: @autoclosure () -> Bool, _ label: String) {
        guard condition() else { fatalError("FAIL: \(label)") }
    }

    static func script(_ episodes: [String]) -> String {
        "var eps1 = [" + episodes.map { "'\($0)'" }.joined(separator: ",") + "];"
    }

    static func main() async {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [FixtureProtocol.self]
        let session = URLSession(configuration: config)
        defer { session.invalidateAndCancel() }
        let service = FrenchAnimeProvidersService(session: session)
        let metadata = #"{"name":"Attack on Titan","original_name":"進撃の巨人","translations":{"translations":[{"iso_639_1":"fr","data":{"name":"L'Attaque des Titans"}}]},"alternative_titles":{"results":[{"type":"romaji","title":"Shingeki no Kyojin"},{"type":"OAD title romaji","title":"Unrelated OAD"}]}}"#

        // A blocked/empty search must not prevent romaji catalogue discovery.
        FixtureProtocol.respond = { request in
            let url = request.url!
            if url.host == "api.themoviedb.org" { return metadata }
            if url.path == "/catalogue/shingeki-no-kyojin" { return "<h1>Shingeki no Kyojin</h1>" }
            if url.path.contains("/shingeki-no-kyojin/saison4/"), url.path.hasSuffix("episodes.js") {
                let language = url.path.contains("/vostfr/") ? "vostfr" : "vf"
                return script((1...30).map { "https://media.example/\(language)/e\($0).m3u8" })
            }
            return ""
        }
        let sources = await service.getAnimeSamaStreams(tmdbId: 1429, mediaType: "tv", season: 4, episode: 30)
        check(sources.count == 2, "romaji fallback discovers both languages")
        check(Set(sources.map { $0.language }) == Set(["VF", "VOSTFR"]), "language labels")
        check(sources.allSatisfy { $0.provider == "animesama" && $0.url.hasSuffix("/e30.m3u8") }, "exact final episode")

        // Split seasons must subtract preceding part lengths at every boundary.
        let parts = ["saison4": Array(1...16), "saison4-2": Array(17...28), "saison4-3": [29], "saison4-4": [30]]
        FixtureProtocol.respond = { request in
            for (path, episodes) in parts where request.url!.path.contains("/\(path)/") {
                return script(episodes.map { "https://media.example/e\($0).m3u8" })
            }
            return ""
        }
        for episode in [1, 16, 17, 28, 29, 30] {
            let players = await service.animeSamaEpisodePlayers(slug: "aot", language: "vf", mediaType: "tv", season: 4, episode: episode)
            check(players == ["https://media.example/e\(episode).m3u8"], "split season boundary E\(episode)")
        }
        let beyond = await service.animeSamaEpisodePlayers(slug: "aot", language: "vf", mediaType: "tv", season: 4, episode: 31)
        check(beyond.isEmpty, "out of range stays empty")

        FixtureProtocol.respond = { request in
            if request.url!.path.contains("/saison4/") { return script((1...16).map { "https://media.example/e\($0).m3u8" }) }
            if request.url!.path.contains("/saison4-3/") { return script(["https://media.example/e29.m3u8"]) }
            return ""
        }
        let gap = await service.animeSamaEpisodePlayers(slug: "aot", language: "vf", mediaType: "tv", season: 4, episode: 17)
        check(gap.isEmpty, "missing part never shifts E29 onto E17")

        FixtureProtocol.respond = { request in
            if request.url!.path.contains("/saison4/") { return script(["", "https://media.example/e2.m3u8"]) }
            return ""
        }
        let hole = await service.animeSamaEpisodePlayers(slug: "aot", language: "vf", mediaType: "tv", season: 4, episode: 1)
        let second = await service.animeSamaEpisodePlayers(slug: "aot", language: "vf", mediaType: "tv", season: 4, episode: 2)
        check(hole.isEmpty && second == ["https://media.example/e2.m3u8"], "empty reader slot preserves episode position")

        FixtureProtocol.respond = { request in
            let path = request.url!.path
            if path == "/catalogue/aot/vf/episodes.js" { return script((1...90).map { "https://media.example/e\($0).m3u8" }) }
            return ""
        }
        let wrongSeason = await service.animeSamaEpisodePlayers(slug: "aot", language: "vf", mediaType: "tv", season: 4, episode: 30)
        check(wrongSeason.isEmpty, "root E30 cannot substitute S4 E30")

        FixtureProtocol.respond = { request in
            if request.url!.host == "api.themoviedb.org" { return #"{"name":"Gate"}"# }
            if request.url!.path.contains("fetch.php") { return #"<a href="/catalogue/steins-gate/">Gate</a>"# }
            if request.url!.path.contains("steins-gate") {
                return request.url!.path.hasSuffix("episodes.js") ? script(["https://media.example/wrong.m3u8"]) : "<h1>Steins;Gate</h1>"
            }
            return ""
        }
        let unrelated = await service.getAnimeSamaStreams(tmdbId: 1, mediaType: "tv", season: 1, episode: 1)
        check(unrelated.isEmpty, "search result title guard rejects unrelated anime")

        FixtureProtocol.respond = { request in
            let url = request.url!
            if url.host == "api.themoviedb.org" { return #"{"title":"Example Anime: The Movie"}"# }
            if url.path.contains("fetch.php") { return #"<a href="/catalogue/example-anime/">Example Anime</a>"# }
            if url.path == "/catalogue/example-anime" { return "<h1>Example Anime</h1>" }
            if url.path.contains("/example-anime/film/") { return script(["https://media.example/movie.m3u8"]) }
            return ""
        }
        let movie = await service.getAnimeSamaStreams(tmdbId: 2, mediaType: "movie")
        check(!movie.isEmpty && movie.allSatisfy { $0.url.hasSuffix("/movie.m3u8") }, "film under parent anime catalogue remains discoverable")

        FixtureProtocol.respond = { request in
            let url = request.url!
            if url.host == "api.themoviedb.org" { return metadata }
            if url.path == "/index.php" {
                return #"<a href="https://french-anime.com/animes-vf/1-shingeki-no-kyojin-saison-4-vf.html">Shingeki no Kyojin</a>"#
            }
            if url.path.hasSuffix(".html") {
                return "<div class=\"eps\">1!https://media.example/e1.m3u8\n30!https://media.example/e30.m3u8</div>"
            }
            if url.host == "media.example" { return "#EXTM3U\n#EXT-X-ENDLIST" }
            return ""
        }
        let frenchDirect = await service.getFrenchAnimeStreams(tmdbId: 1429, mediaType: "tv", season: 4, episode: 30)
        check(frenchDirect.count == 1 && frenchDirect[0].provider == "frenchanime"
              && frenchDirect[0].language == "VF" && frenchDirect[0].url.hasSuffix("/e30.m3u8"),
              "French-Anime keeps the exact episode and original provider")

        // Real catalogue URLs use x- prefixes, contracted elisions, and bare
        // season numbers. Search may be blocked while the public index works.
        var frenchPages: [String] = []
        FixtureProtocol.respond = { request in
            let url = request.url!
            if url.host == "api.themoviedb.org" { return metadata }
            if url.path == "/index.php" { return "Just a moment" }
            if url.path == "/sitemap.xml" {
                return """
                <urlset>
                  <url><loc>https://french-anime.com/animes-vf/87-x-lattaque-des-titans-saison-1-french.html</loc></url>
                  <url><loc>https://french-anime.com/animes-vf/220-x-shingeki-no-kyojin-3-french.html</loc></url>
                  <url><loc>https://french-anime.com/animes-vostfr/293-x-shingeki-no-kyojin-3-vostfr.html</loc></url>
                  <url><loc>https://unrelated.example/animes-vf/1-shingeki-no-kyojin-saison-4-vf.html</loc></url>
                </urlset>
                """
            }
            if url.host == "french-anime.com", url.path.hasSuffix(".html") {
                frenchPages.append(url.path)
                let prefix = url.path.contains("saison-1") ? "s1" : "s3"
                return "<div class=\"eps\">1!//media.example/\(prefix)e1.m3u8, https://media.example/alternate.m3u8,\n2!https://media.example/\(prefix)e2.m3u8</div>"
            }
            if url.host == "media.example" { return "#EXTM3U\n#EXT-X-ENDLIST" }
            return ""
        }
        let frenchS3 = await service.getFrenchAnimeStreams(tmdbId: 1429, mediaType: "tv", season: 3, episode: 1)
        check(!frenchS3.isEmpty && frenchS3.allSatisfy { $0.provider == "frenchanime" && $0.url.hasSuffix("/s3e1.m3u8") },
              "public index resolves original French-Anime sources with protocol-relative players")
        check(frenchPages.count == 2 && frenchPages.allSatisfy { $0.contains("kyojin-3-") }, "bare French season suffix maps to S3")
        frenchPages.removeAll()
        let frenchS1 = await service.getFrenchAnimeStreams(tmdbId: 1429, mediaType: "tv", season: 1, episode: 1)
        check(!frenchS1.isEmpty && frenchS1.allSatisfy { $0.url.hasSuffix("/s1e1.m3u8") }, "old French elision title matches S1")
        check(frenchPages.count == 1 && frenchPages[0].contains("saison-1"), "S3 never substitutes for S1")
        frenchPages.removeAll()
        let missingFrench = await service.getFrenchAnimeStreams(tmdbId: 1429, mediaType: "tv", season: 4, episode: 30)
        check(missingFrench.isEmpty && frenchPages.isEmpty, "missing S4 E30 never substitutes another season")

        // French-Anime unavailable: do not invent a second provider by copying
        // Anime-Sama links and relabelling them.
        FixtureProtocol.respond = { request in
            let url = request.url!
            if url.host == "api.themoviedb.org" { return metadata }
            if url.path == "/catalogue/shingeki-no-kyojin" { return "<h1>Shingeki no Kyojin</h1>" }
            if url.path.contains("/shingeki-no-kyojin/saison4/") {
                return script((1...30).map { "https://media.example/e\($0).m3u8" })
            }
            if url.host == "media.example" { return "#EXTM3U\n#EXT-X-ENDLIST" }
            return ""
        }
        let french = await service.getFrenchAnimeStreams(tmdbId: 1429, mediaType: "tv", season: 4, episode: 30)
        check(french.isEmpty, "unavailable French-Anime returns no mislabeled fallback")

        let info = StreamingService.TmdbSeriesInfo(title: "AOT", seasons: [
            .init(seasonNumber: 1, episodeCount: 25), .init(seasonNumber: 2, episodeCount: 12), .init(seasonNumber: 3, episodeCount: 22)
        ], genreIds: [16])
        func episodes(_ numbers: [Int]) -> [[String: Any]] { numbers.map { ["index": $0, "fixture": $0] } }
        let full: [[String: Any]] = [["name": "Saison 4", "index": 4, "episodes": episodes(Array(1...30))]]
        let split: [[String: Any]] = [
            ["name": "Saison 4 partie 1", "episodes": episodes(Array(1...16))],
            ["name": "Saison 4 partie 2", "episodes": episodes(Array(1...12))],
            ["name": "Saison 4 partie 3", "episodes": episodes([1])],
            ["name": "Saison 4 partie 4", "episodes": episodes([1])]
        ]
        for episode in [1, 16, 17, 28, 29, 30] {
            let whole = StreamingService.movixAnimeEpisode(seasons: full, isAOT: true, season: 4, episode: episode, tmdbInfo: info)
            check(whole?["fixture"] as? Int == episode, "Movix full S4 E\(episode)")
            let part = StreamingService.movixAnimeEpisode(seasons: split, isAOT: true, season: 4, episode: episode, tmdbInfo: info)
            let local = episode <= 16 ? episode : (episode <= 28 ? episode - 16 : 1)
            check(part?["fixture"] as? Int == local, "Movix part E\(episode)")
        }
        for episode in [36, 37] {
            let special = StreamingService.movixAnimeEpisode(seasons: full, isAOT: true, season: 0, episode: episode, tmdbInfo: info)
            check(special?["fixture"] as? Int == episode - 7, "Movix special maps to final chapter")
        }
        let mismatchedIndex: [[String: Any]] = [["name": "Saison 4", "episodes": [["index": 130, "name": "Episode 130"]]]]
        check(StreamingService.movixAnimeEpisode(seasons: mismatchedIndex, isAOT: true, season: 4, episode: 30, tmdbInfo: info) == nil, "E130 never matches E30 by substring")
        print("PASS: native anime catalogue discovery, language labels, episode boundaries and provider identity")
    }
}
