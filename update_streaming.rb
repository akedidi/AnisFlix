require 'fileutils'
content = File.read("ios-natve/anisflix/anisflix/Services/StreamingService.swift")

old_func = <<-SWIFT
    private func fetchHiAnimeSources(tmdbId: Int, type: String, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        let extractedSources = await HiAnimeService.shared.getStreams(
            tmdbId: tmdbId,
            mediaType: type,
            season: season,
            episode: episode
        )
        
        var streamingSources: [StreamingSource] = []
        for src in extractedSources {
            var subs: [StreamingSource.Subtitle] = []
            for s in src.subtitles {
                subs.append(StreamingSource.Subtitle(url: s.url, language: s.language, isDefault: s.isDefault))
            }
            let streamSource = StreamingSource(
                name: src.name,
                url: src.url,
                quality: src.quality,
                type: src.type,
                provider: "hianime",
                serverType: src.serverType,
                subtitles: subs,
                headers: src.headers
            )
            streamingSources.append(streamSource)
        }
        if !streamingSources.isEmpty {
            print("✅ [StreamingService] HiAnime: \\(streamingSources.count) source(s) for TMDB:\\(tmdbId) S\\(season ?? 1)E\\(episode ?? 1)")
        }
        return streamingSources
    }
SWIFT

new_func = <<-SWIFT
    private func fetchHiAnimeSources(tmdbId: Int, type: String, season: Int? = nil, episode: Int? = nil) async throws -> [StreamingSource] {
        let extractedSources = await HiAnimeService.shared.getStreams(
            tmdbId: tmdbId,
            mediaType: type,
            season: season,
            episode: episode
        )
        
        var streamingSources: [StreamingSource] = []
        for src in extractedSources {
            var subs: [Subtitle] = []
            for s in src.subtitles {
                subs.append(Subtitle(url: s.url, label: s.language, code: s.language, flag: "🇬🇧"))
            }
            let streamSource = StreamingSource(
                url: src.url,
                directUrl: src.url,
                quality: src.quality,
                type: src.type,
                provider: "hianime",
                language: src.serverType,
                origin: "hianime",
                tracks: subs.isEmpty ? nil : subs,
                headers: src.headers
            )
            streamingSources.append(streamSource)
        }
        if !streamingSources.isEmpty {
            print("✅ [StreamingService] HiAnime: \\(streamingSources.count) source(s) for TMDB:\\(tmdbId) S\\(season ?? 1)E\\(episode ?? 1)")
        }
        return streamingSources
    }
SWIFT

content = content.gsub(old_func, new_func)
File.write("ios-natve/anisflix/anisflix/Services/StreamingService.swift", content)
