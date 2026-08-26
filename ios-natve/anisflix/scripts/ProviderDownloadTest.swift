#!/usr/bin/env swift
//
// Standalone download-readiness test for VidMoly, Vidlink, YFlix, MovieBox (AOT S1E1).
// Simulates DownloadManager + LocalStreamingServer upstream fetch (no FFmpeg / no GCDWebServer).
//
// Run from repo root:
//   swift ios-natve/anisflix/scripts/ProviderDownloadTest.swift
//

import Foundation

// MARK: - Config (Attack on Titan S1E1)

let kBaseURL = "https://anisflix.vercel.app"
let kTMDBId = "1429"
let kSeason = 1
let kEpisode = 1
let kVidMolyEmbed = "https://vidmoly.net/embed-u1lzs6cp6r3k.html"

let kUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// MARK: - Models

struct StreamCandidate {
    let provider: String
    let label: String
    let url: String
    let directUrl: String?
    var headers: [String: String]
}

struct TestOutcome {
    let provider: String
    let label: String
    let extractOK: Bool
    let resolvedURL: String
    let manifestHTTP: Int
    let manifestOK: Bool
    let isHLS: Bool
    let segmentHTTP: Int?
    let notes: String
    var passed: Bool { extractOK && manifestOK }
}

// MARK: - HTTP

func httpGet(_ url: URL, headers: [String: String], method: String = "GET", body: Data? = nil) async -> (Int, Data?, String?) {
    var req = URLRequest(url: url)
    req.httpMethod = method
    req.timeoutInterval = 45
    for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
    if let body { req.httpBody = body }
    do {
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        return (code, data, nil)
    } catch {
        return (0, nil, error.localizedDescription)
    }
}

func httpHeadReachable(_ url: URL, headers: [String: String]) async -> (Int, String?) {
    var req = URLRequest(url: url)
    req.httpMethod = "HEAD"
    req.timeoutInterval = 25
    for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
    do {
        let (_, resp) = try await URLSession.shared.data(for: req)
        return ((resp as? HTTPURLResponse)?.statusCode ?? 0, nil)
    } catch {
        return (0, error.localizedDescription)
    }
}

// MARK: - Download URL resolution (mirror DownloadManager.resolveStreamForDownload)

struct ResolvedStream {
    let url: String
    let headers: [String: String]
}

func resolveStreamForDownload(url: String, headers: [String: String], provider: String) -> ResolvedStream {
    var resolvedUrl = url
    var hdrs = headers
    let p = provider.lowercased()

    if resolvedUrl.contains("/api/vidmoly") {
        hdrs["Referer"] = "https://vidmoly.net/"
        hdrs["Origin"] = "https://vidmoly.net"
    } else if p == "vidmoly" || resolvedUrl.contains("vmwesa") {
        hdrs["Referer"] = "https://vidmoly.net/"
        hdrs["Origin"] = "https://vidmoly.net"
    }

    if p == "vidlink" || resolvedUrl.contains("vodvidl.site") {
        if hdrs["Referer"] == nil {
            hdrs["Referer"] = "https://vidlink.pro/"
            hdrs["Origin"] = "https://vidlink.pro"
        }
    }

    if p == "yflix" {
        if resolvedUrl.contains("rapidshare") || resolvedUrl.contains("prime37node") {
            hdrs["Referer"] = "https://rapidshare.cc/"
            hdrs["Origin"] = "https://rapidshare.cc"
        } else {
            hdrs["Referer"] = "https://yflix.to/"
            hdrs["Origin"] = "https://yflix.to"
        }
    }

    if p == "moviebox" {
        if hdrs["Referer"] == nil {
            hdrs["Referer"] = "https://api.inmoviebox.com"
        }
    }

    hdrs["User-Agent"] = hdrs["User-Agent"] ?? kUA
    return ResolvedStream(url: resolvedUrl, headers: hdrs)
}

func isHLSURL(_ url: String) -> Bool {
    url.lowercased().contains(".m3u8")
}

func isDeadRRRHost(_ url: String) -> Bool {
    guard let host = URL(string: url)?.host?.lowercased() else { return false }
    return host.hasPrefix("rrr.")
}

// MARK: - Manifest / segment probes

func probeManifest(url: String, headers: [String: String]) async -> (http: Int, ok: Bool, note: String) {
    guard let u = URL(string: url) else { return (0, false, "invalid URL") }
    if isDeadRRRHost(url) {
        return (0, false, "DNS: host rrr.* (CDN mort)")
    }

    var hdrs = headers
    hdrs["Accept"] = "application/vnd.apple.mpegurl,application/x-mpegURL,*/*"

    let (code, data, err) = await httpGet(u, headers: hdrs)
    if let err { return (code, false, err) }
    guard (200..<400).contains(code), let data, let text = String(data: data, encoding: .utf8) else {
        return (code, false, "HTTP \(code)")
    }
    if text.contains("#EXTM3U") || text.contains("#EXT-X-") {
        let lines = text.split(separator: "\n").filter { !$0.hasPrefix("#") && !$0.isEmpty }
        return (code, true, "m3u8 OK, \(lines.count) media line(s)")
    }
    if text.prefix(200).lowercased().contains("<html") {
        return (code, false, "HTML challenge (not m3u8)")
    }
    return (code, false, "unexpected body (\(text.prefix(80))…)")
}

func firstMediaLine(in m3u8: String, base: URL) -> URL? {
    for line in m3u8.split(separator: "\n") {
        let s = line.trimmingCharacters(in: .whitespaces)
        if s.isEmpty || s.hasPrefix("#") { continue }
        if let u = URL(string: s, relativeTo: base) { return u }
    }
    return nil
}

func probeFirstSegment(masterURL: String, headers: [String: String]) async -> (http: Int, note: String) {
    guard let base = URL(string: masterURL) else { return (0, "bad base") }
    var hdrs = headers
    hdrs["Accept"] = "*/*"
    let (code, data, err) = await httpGet(base, headers: hdrs)
    if let err { return (0, err) }
    guard let data, let text = String(data: data, encoding: .utf8), text.contains("#EXT") else {
        return (code, "no playlist")
    }

    // Master with variants → pick first variant playlist
    if text.contains("#EXT-X-STREAM-INF") {
        var lastInf = false
        for line in text.split(separator: "\n") {
            let s = String(line)
            if s.hasPrefix("#EXT-X-STREAM-INF") { lastInf = true; continue }
            if lastInf, !s.hasPrefix("#"), let variant = URL(string: s, relativeTo: base) {
                let (c2, d2, _) = await httpGet(variant, headers: hdrs)
                guard let d2, let t2 = String(data: d2, encoding: .utf8) else { return (c2, "variant HTTP \(c2)") }
                if let seg = firstMediaLine(in: t2, base: variant) {
                    let (c3, _) = await httpHeadReachable(seg, headers: hdrs)
                    return (c3, "variant→segment HEAD")
                }
                return (c2, "variant ok, no segment line")
            }
            lastInf = false
        }
    }

    if let seg = firstMediaLine(in: text, base: base) {
        let (c, _) = await httpHeadReachable(seg, headers: hdrs)
        return (c, "segment HEAD")
    }
    return (code, "no segment in playlist")
}

// MARK: - Provider fetch

func vidMolyProxyURL(directM3U8: String, referer: String) -> String {
    var allowed = CharacterSet.alphanumerics
    allowed.insert(charactersIn: "-._~")
    let encodedUrl = directM3U8.addingPercentEncoding(withAllowedCharacters: allowed) ?? directM3U8
    let ref = referer.addingPercentEncoding(withAllowedCharacters: allowed) ?? referer
    let ref2 = ref.addingPercentEncoding(withAllowedCharacters: allowed) ?? ref
    return "\(kBaseURL)/api/vidmoly?url=\(encodedUrl)&referer=\(ref2)"
}

func fetchVidMoly() async -> [StreamCandidate] {
    guard let api = URL(string: "\(kBaseURL)/api/extract") else { return [] }
    let body: [String: String] = ["type": "vidmoly", "url": kVidMolyEmbed]
    guard let bodyData = try? JSONEncoder().encode(body) else { return [] }
    var hdrs = ["Content-Type": "application/json", "User-Agent": kUA]
    let (code, data, err) = await httpGet(api, headers: hdrs, method: "POST", body: bodyData)
    guard let data, code == 200,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let ok = json["success"] as? Bool, ok,
          let m3u8 = json["m3u8Url"] as? String else {
        print("  ❌ VidMoly extract: HTTP \(code) \(err ?? "")")
        return []
    }
    let proxy = vidMolyProxyURL(directM3U8: m3u8, referer: kVidMolyEmbed)
    return [
        StreamCandidate(provider: "vidmoly", label: "CDN direct", url: m3u8, directUrl: m3u8,
                        headers: ["Referer": "https://vidmoly.net/", "Origin": "https://vidmoly.net"]),
        StreamCandidate(provider: "vidmoly", label: "Vercel proxy", url: proxy, directUrl: nil,
                        headers: ["Referer": "https://vidmoly.net/", "Origin": "https://vidmoly.net"]),
    ]
}

func fetchMovixProxy(path: String) async -> Data? {
    var comp = URLComponents(string: "\(kBaseURL)/api/movix-proxy")!
    comp.queryItems = [
        URLQueryItem(name: "path", value: path),
        URLQueryItem(name: "tmdbId", value: kTMDBId),
        URLQueryItem(name: "type", value: "tv"),
        URLQueryItem(name: "season", value: String(kSeason)),
        URLQueryItem(name: "episode", value: String(kEpisode)),
    ]
    guard let url = comp.url else { return nil }
    let (code, data, err) = await httpGet(url, headers: ["User-Agent": kUA])
    if code != 200 {
        print("  ❌ movix-proxy/\(path): HTTP \(code) \(err ?? "")")
        return nil
    }
    return data
}

func fetchVidlink() async -> [StreamCandidate] {
    guard let data = await fetchMovixProxy(path: "vidlink"),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let streams = json["streams"] as? [[String: Any]] else { return [] }

    return streams.compactMap { s -> StreamCandidate? in
        guard let url = s["url"] as? String else { return nil }
        let q = s["quality"] as? String ?? "?"
        return StreamCandidate(
            provider: "vidlink",
            label: "Vidlink \(q)",
            url: url,
            directUrl: url,
            headers: ["Referer": "https://vidlink.pro/", "Origin": "https://vidlink.pro"]
        )
    }
}

func fetchYFlix() async -> [StreamCandidate] {
    guard let data = await fetchMovixProxy(path: "yflix"),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let results = json["results"] as? [[String: Any]] else { return [] }

    return results.compactMap { r -> StreamCandidate? in
        guard let url = r["url"] as? String else { return nil }
        let q = r["quality"] as? String ?? "?"
        return StreamCandidate(
            provider: "yflix",
            label: "YFlix \(q)",
            url: url,
            directUrl: url,
            headers: [:]
        )
    }
}

func fetchMovieBox() async -> [StreamCandidate] {
    guard let data = await fetchMovixProxy(path: "moviebox"),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let streams = json["streams"] as? [[String: Any]] else { return [] }

    return streams.prefix(2).compactMap { s -> StreamCandidate? in
        guard let url = s["url"] as? String else { return nil }
        let direct = s["directUrl"] as? String
        let q = s["quality"] as? String ?? "?"
        var hdrs: [String: String] = [:]
        if let h = s["headers"] as? [String: String] { hdrs = h }
        return StreamCandidate(provider: "moviebox", label: "MovieBox \(q)", url: url,
                               directUrl: direct ?? url, headers: hdrs)
    }
}

// MARK: - Run test for one candidate

func runDownloadTest(_ c: StreamCandidate) async -> TestOutcome {
    let testURL = c.directUrl ?? c.url
    // Keep Vercel /api/vidmoly URL for proxy-mode test (do not unwrap to CDN)
    let resolveInput = (c.provider == "vidmoly" && c.label.contains("Vercel")) ? c.url : testURL
    let resolved = resolveStreamForDownload(url: resolveInput, headers: c.headers, provider: c.provider)

    print("\n── \(c.provider.uppercased()) / \(c.label)")
    print("   raw:      \(testURL.prefix(100))…")
    print("   resolved: \(resolved.url.prefix(100))…")
    print("   Referer:  \(resolved.headers["Referer"] ?? "—")")

    if isDeadRRRHost(resolved.url) {
        return TestOutcome(provider: c.provider, label: c.label, extractOK: true,
                           resolvedURL: resolved.url, manifestHTTP: 0, manifestOK: false,
                           isHLS: isHLSURL(resolved.url), segmentHTTP: nil,
                           notes: "rrr.* host — téléchargement impossible (DNS)")
    }

    let probeURL = (c.provider == "vidmoly" && c.label.contains("Vercel")) ? c.url : resolved.url
    let probeHeaders = (c.provider == "vidmoly" && c.label.contains("Vercel"))
        ? ["User-Agent": kUA]
        : resolved.headers

    let hls = isHLSURL(probeURL) || isHLSURL(resolved.url)
    if hls {
        let (mCode, mOK, mNote) = await probeManifest(url: probeURL, headers: probeHeaders)
        var segCode: Int?
        var note = mNote
        if mOK {
            let (sCode, sNote) = await probeFirstSegment(masterURL: probeURL, headers: probeHeaders)
            segCode = sCode
            note += " | \(sNote) HTTP \(sCode)"
            if !(200..<400).contains(sCode) { note += " ⚠️ segment blocked" }
        }

        // VidMoly: wrong referer + optional Vercel proxy playlist fetch
        if c.provider == "vidmoly" {
            var bad = resolved.headers
            bad["Referer"] = kVidMolyEmbed
            let (badCode, _, _) = await probeManifest(url: resolved.url, headers: bad)
            note += " | embed-Referer→HTTP \(badCode)"
            if c.label.contains("Vercel") {
                let (pCode, pOK, pNote) = await probeManifest(url: c.url, headers: ["User-Agent": kUA])
                note += " | proxy-playlist→\(pNote) HTTP \(pCode)"
                if pOK { /* proxy returns rewritten m3u8 */ }
            }
        }

        return TestOutcome(provider: c.provider, label: c.label, extractOK: true,
                           resolvedURL: resolved.url, manifestHTTP: mCode, manifestOK: mOK,
                           isHLS: true, segmentHTTP: segCode, notes: note)
    }

    // MP4 / other
    guard let u = URL(string: resolved.url) else {
        return TestOutcome(provider: c.provider, label: c.label, extractOK: true,
                           resolvedURL: resolved.url, manifestHTTP: 0, manifestOK: false,
                           isHLS: false, segmentHTTP: nil, notes: "invalid URL")
    }
    let (code, err) = await httpHeadReachable(u, headers: resolved.headers)
    let ok = (200..<400).contains(code)
    return TestOutcome(provider: c.provider, label: c.label, extractOK: true,
                       resolvedURL: resolved.url, manifestHTTP: code, manifestOK: ok,
                       isHLS: false, segmentHTTP: code, notes: ok ? "MP4 HEAD OK" : (err ?? "HTTP \(code)"))
}

// MARK: - Main

print("=== Provider Download Test (AOT TMDB \(kTMDBId) S\(kSeason)E\(kEpisode)) ===\n")

var candidates: [StreamCandidate] = []

print("📡 Fetching VidMoly…")
candidates.append(contentsOf: await fetchVidMoly())

print("📡 Fetching Vidlink…")
candidates.append(contentsOf: await fetchVidlink())

print("📡 Fetching YFlix…")
let yflix = await fetchYFlix()
if yflix.isEmpty {
    print("  ⚠️ YFlix: 0 flux (CDN rrr.* souvent mort côté serveur)")
}
candidates.append(contentsOf: yflix)

print("📡 Fetching MovieBox…")
candidates.append(contentsOf: await fetchMovieBox())

if candidates.isEmpty {
    print("\n❌ Aucune source récupérée.")
    exit(1)
}

print("\n📋 \(candidates.count) stream(s) to test\n")

var outcomes: [TestOutcome] = []
for c in candidates {
    outcomes.append(await runDownloadTest(c))
}

func pad(_ s: String, _ width: Int) -> String {
    if s.count >= width { return String(s.prefix(width)) }
    return s + String(repeating: " ", count: width - s.count)
}

print("\n=== SUMMARY ===\n")
print("\(pad("Provider", 10)) \(pad("Label", 18)) \(pad("Extr.", 6)) \(pad("Manifest", 8)) \(pad("HLS", 6)) Notes")
print(String(repeating: "-", count: 95))

var passCount = 0
for o in outcomes {
    let ext = o.extractOK ? "OK" : "FAIL"
    let man = o.manifestOK ? "OK" : "FAIL"
    let hls = o.isHLS ? "yes" : "mp4"
    print("\(pad(o.provider, 10)) \(pad(String(o.label.prefix(18)), 18)) \(pad(ext, 6)) \(pad(man, 8)) \(pad(hls, 6)) \(o.notes)")
    if o.passed { passCount += 1 }
}

print("\n=== \(passCount)/\(outcomes.count) prêts pour téléchargement (manifest/segment accessibles) ===")
print("Note: ce script ne lance pas FFmpeg ni LocalStreamingServer — uniquement l’accès HTTP amont.")
exit(passCount > 0 ? 0 : 1)
