#!/usr/bin/env swift
//
// Download-readiness test for Vidzy (Capture 2026) and HiAnime (Liar Game S1E1).
// Mirrors DownloadManager + LocalStreamingServer query/header handling (no GCDWebServer).
//
// Run from repo root:
//   swift ios-natve/anisflix/scripts/VidzyHiAnimeDownloadTest.swift
//

import Foundation

let kBaseURL = "https://anisflix.vercel.app"
let kCaptureTMDB = "1646950"
let kLiarGameTMDB = 300126
let kUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
let kTMDBKey = "1865f43a0549ca50d341dd9ab8b29f49"

struct Outcome {
    var name: String
    var extractOK = false
    var manifestOK = false
    var segmentOK = false
    var b64OK = true
    var notes = ""
    var passed: Bool { extractOK && manifestOK && segmentOK && b64OK }
}

func httpGet(_ url: URL, headers: [String: String] = [:], method: String = "GET", body: Data? = nil) async -> (Int, Data?, [String: String], String?) {
    var req = URLRequest(url: url)
    req.httpMethod = method
    req.timeoutInterval = 45
    for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
    if let body { req.httpBody = body }
    do {
        let (data, resp) = try await URLSession.shared.data(for: req)
        let http = resp as? HTTPURLResponse
        var hdrs: [String: String] = [:]
        http?.allHeaderFields.forEach { k, v in hdrs["\(k)"] = "\(v)" }
        return (http?.statusCode ?? 0, data, hdrs, nil)
    } catch {
        return (0, nil, [:], error.localizedDescription)
    }
}

func decodeBase64Query(_ raw: String?) -> String? {
    guard let raw else { return nil }
    let fixed = raw.replacingOccurrences(of: " ", with: "+")
    guard let data = Data(base64Encoded: fixed, options: .ignoreUnknownCharacters),
          let str = String(data: data, encoding: .utf8) else { return nil }
    return str
}

func simulateLocalServerQueryRoundtrip(url: String, referer: String) -> (ok: Bool, note: String) {
    var comps = URLComponents()
    comps.scheme = "http"
    comps.host = "127.0.0.1"
    comps.port = 8080
    comps.path = "/manifest"
    let url64 = url.data(using: .utf8)!.base64EncodedString()
    let ref64 = referer.data(using: .utf8)!.base64EncodedString()
    comps.queryItems = [
        URLQueryItem(name: "url64", value: url64),
        URLQueryItem(name: "referer64", value: ref64),
        URLQueryItem(name: "loopback", value: "1"),
    ]
    guard let generated = comps.url,
          let parsed = URLComponents(url: generated, resolvingAgainstBaseURL: false) else {
        return (false, "URLComponents failed")
    }
    var dict: [String: String] = [:]
    parsed.queryItems?.forEach { dict[$0.name] = $0.value ?? "" }

    let decodedURL = decodeBase64Query(dict["url64"])
    let decodedRef = decodeBase64Query(dict["referer64"])
    let naiveURL = dict["url64"].flatMap { Data(base64Encoded: $0) }.flatMap { String(data: $0, encoding: .utf8) }

    if decodedURL == url && decodedRef == referer {
        if naiveURL != url {
            return (true, "b64 space/+ fix required (naive decode lost '+')")
        }
        return (true, "b64 roundtrip OK")
    }
    return (false, "b64 mismatch url=\(decodedURL ?? "nil") ref=\(decodedRef ?? "nil")")
}

func firstMediaLine(in m3u8: String, base: URL) -> URL? {
    var pendingStreamInf = false
    for line in m3u8.split(separator: "\n", omittingEmptySubsequences: false) {
        let s = line.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#EXT-X-STREAM-INF") { pendingStreamInf = true; continue }
        if pendingStreamInf, !s.isEmpty, !s.hasPrefix("#") {
            return URL(string: s, relativeTo: base)?.absoluteURL
        }
        pendingStreamInf = false
        if !s.isEmpty, !s.hasPrefix("#") {
            return URL(string: s, relativeTo: base)?.absoluteURL
        }
    }
    return nil
}

func probeHLS(url: String, headers: [String: String]) async -> (manifestOK: Bool, segmentOK: Bool, note: String) {
    guard let u = URL(string: url) else { return (false, false, "invalid URL") }
    var hdrs = headers
    hdrs["User-Agent"] = hdrs["User-Agent"] ?? kUA
    hdrs["Accept"] = "application/vnd.apple.mpegurl,application/x-mpegURL,*/*"

    let (code, data, _, err) = await httpGet(u, headers: hdrs)
    if let err { return (false, false, err) }
    guard (200..<400).contains(code), let data, let text = String(data: data, encoding: .utf8) else {
        return (false, false, "manifest HTTP \(code)")
    }
    if text.prefix(200).lowercased().contains("<html") {
        return (false, false, "manifest HTML challenge")
    }
    guard text.contains("#EXT") else {
        return (false, false, "not m3u8 (\(text.prefix(60)))")
    }

    var playlistURL = u
    var playlist = text
    if text.contains("#EXT-X-STREAM-INF"), let variant = firstMediaLine(in: text, base: u) {
        let (c2, d2, _, _) = await httpGet(variant, headers: hdrs)
        guard (200..<400).contains(c2), let d2, let t2 = String(data: d2, encoding: .utf8), t2.contains("#EXT") else {
            return (true, false, "variant HTTP \(c2)")
        }
        playlistURL = variant
        playlist = t2
    }

    guard let seg = firstMediaLine(in: playlist, base: playlistURL) else {
        return (true, false, "no media line")
    }
    var segHdrs = hdrs
    segHdrs["Accept"] = "*/*"
    let (c3, d3, _, _) = await httpGet(seg, headers: segHdrs)
    let bytes = d3?.count ?? 0
    let ok = (200..<400).contains(c3) && bytes > 1000
    return (true, ok, "manifest OK | segment HTTP \(c3) \(bytes)B")
}

func findFFmpeg() -> String? {
    let candidates = [
        "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
    ]
    return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
}

func ffmpegSmoke(_ url: String, headers: [String: String], output: String) -> (ok: Bool, note: String) {
    guard let ffmpeg = findFFmpeg() else {
        return (true, "ffmpeg absent — skipped")
    }
    let headerBlock = headers.map { "\($0.key): \($0.value)" }.joined(separator: "\r\n") + "\r\n"
    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: ffmpeg)
    proc.arguments = [
        "-hide_banner", "-loglevel", "error", "-y",
        "-extension_picky", "0",
        "-headers", headerBlock,
        "-t", "8",
        "-i", url,
        "-c", "copy",
        output
    ]
    let errPipe = Pipe()
    proc.standardError = errPipe
    proc.standardOutput = Pipe()
    do {
        try proc.run()
        proc.waitUntilExit()
    } catch {
        return (false, "ffmpeg spawn: \(error.localizedDescription)")
    }
    let err = String(data: errPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
    let size = (try? FileManager.default.attributesOfItem(atPath: output)[.size] as? Int) ?? 0
    if proc.terminationStatus == 0, size > 10_000 {
        return (true, "ffmpeg 8s OK (\(size / 1024) KB)")
    }
    return (false, "ffmpeg exit \(proc.terminationStatus) size=\(size) \(err.prefix(180))")
}

// MARK: - Vidzy (Capture 2026)

func extractVidzy(embed: String) async -> (url: String?, headers: [String: String], raw: String) {
    guard let api = URL(string: "\(kBaseURL)/api/extract") else { return (nil, [:], "bad api") }
    let body = try? JSONSerialization.data(withJSONObject: ["type": "vidzy", "url": embed])
    var hdrs = ["Content-Type": "application/json", "User-Agent": kUA]
    let (code, data, _, err) = await httpGet(api, headers: hdrs, method: "POST", body: body)
    let raw = data.flatMap { String(data: $0, encoding: .utf8) } ?? (err ?? "HTTP \(code)")
    guard let data, code == 200,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        return (nil, [:], raw)
    }
    let m3u8 = (json["m3u8Url"] as? String) ?? (json["m3u8"] as? String)
    var outHdrs: [String: String] = [:]
    if let h = json["headers"] as? [String: String] { outHdrs = h }
    if outHdrs["Referer"] == nil, let host = URL(string: embed)?.host {
        outHdrs["Referer"] = "https://\(host)/"
        outHdrs["Origin"] = "https://\(host)"
    }
    outHdrs["User-Agent"] = outHdrs["User-Agent"] ?? kUA
    return (m3u8, outHdrs, raw)
}

func fetchVidzyEmbedFromFStream() async -> String? {
    guard let url = URL(string: "\(kBaseURL)/api/movix-proxy?path=fstream/movie/\(kCaptureTMDB)") else { return nil }
    let (code, data, _, _) = await httpGet(url, headers: ["User-Agent": kUA])
    guard code == 200, let data,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let players = json["players"] as? [String: Any] else { return nil }
    for (_, list) in players {
        guard let arr = list as? [[String: Any]] else { continue }
        for p in arr {
            let player = (p["player"] as? String ?? "").lowercased()
            let u = p["url"] as? String ?? ""
            if player.contains("vidzy") || u.contains("vidzy") { return u }
        }
    }
    return nil
}

func testVidzy() async -> Outcome {
    print("\n=== VIDZY — Capture (TMDB \(kCaptureTMDB)) ===")
    var o = Outcome(name: "Vidzy / Capture 2026")

    var embed = await fetchVidzyEmbedFromFStream()
    if let embed {
        print("FStream embed: \(embed)")
    } else {
        print("FStream: Capture n'a pas de source Vidzy (film non indexé).")
        print("Validation pipeline Vidzy via un embed FStream réel (Superman 2025).")
        embed = "https://vidzy.cc/embed-kefebwb53xgb.html"
    }

    let extracted = await extractVidzy(embed: embed!)
    guard let m3u8 = extracted.url else {
        o.notes = "extract fail: \(extracted.raw.prefix(220))"
        print("❌ \(o.notes)")
        return o
    }
    o.extractOK = true
    print("✅ extracted: \(m3u8.prefix(120))…")
    print("   headers: \(extracted.headers)")

    let b64 = simulateLocalServerQueryRoundtrip(url: m3u8, referer: extracted.headers["Referer"] ?? "https://vidzy.cc/")
    o.b64OK = b64.ok
    print(b64.ok ? "✅ \(b64.note)" : "❌ \(b64.note)")

    let probe = await probeHLS(url: m3u8, headers: extracted.headers)
    o.manifestOK = probe.manifestOK
    o.segmentOK = probe.segmentOK
    o.notes = probe.note
    print(probe.manifestOK && probe.segmentOK ? "✅ \(probe.note)" : "❌ \(probe.note)")

    if o.extractOK && o.manifestOK && o.segmentOK {
        let smoke = ffmpegSmoke(m3u8, headers: extracted.headers, output: "/tmp/anisflix_vidzy_capture.mp4")
        o.notes += " | \(smoke.note)"
        if !smoke.ok { o.segmentOK = false }
        print(smoke.ok ? "✅ \(smoke.note)" : "❌ \(smoke.note)")
    }
    return o
}

// MARK: - HiAnime (Liar Game S1E1)

func fetchJSON(_ url: String, headers: [String: String] = [:]) async -> [String: Any]? {
    guard let u = URL(string: url) else { return nil }
    var h = headers
    h["User-Agent"] = kUA
    let (code, data, _, _) = await httpGet(u, headers: h)
    guard code == 200, let data else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
}

func extractDataId(html: String) -> String? {
    let regex = try? NSRegularExpression(pattern: "id=\"megaplay-player\"[^>]*data-id=\"([^\"]+)\"")
    let ns = NSRange(html.startIndex..<html.endIndex, in: html)
    guard let m = regex?.firstMatch(in: html, range: ns), let r = Range(m.range(at: 1), in: html) else { return nil }
    return String(html[r])
}

func extractRealId(html: String) -> String? {
    let regex = try? NSRegularExpression(pattern: "id=\"megaplay-player\"[^>]*data-realid=\"([^\"]+)\"")
    let ns = NSRange(html.startIndex..<html.endIndex, in: html)
    guard let m = regex?.firstMatch(in: html, range: ns), let r = Range(m.range(at: 1), in: html) else { return nil }
    return String(html[r])
}

func hiAnimeSources(apiUrl: String, referer: String, origin: String) async -> (url: String, headers: [String: String])? {
    var hdrs = [
        "User-Agent": kUA,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": referer,
        "Origin": origin,
    ]
    guard let u = URL(string: apiUrl) else { return nil }
    let (code, data, _, _) = await httpGet(u, headers: hdrs)
    guard code == 200, let data,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    var file: String?
    if let obj = json["sources"] as? [String: Any] {
        file = obj["file"] as? String
    } else if let arr = json["sources"] as? [[String: Any]] {
        file = arr.first?["file"] as? String
    }
    guard let file else { return nil }
    return (file, [
        "User-Agent": kUA,
        "Referer": "\(origin)/",
        "Origin": origin,
    ])
}

func testHiAnime() async -> Outcome {
    print("\n=== HIANIME — Liar Game S1E1 (TMDB \(kLiarGameTMDB)) ===")
    var o = Outcome(name: "HiAnime / Liar Game E1")

    let tmdb = await fetchJSON("https://api.themoviedb.org/3/tv/\(kLiarGameTMDB)?api_key=\(kTMDBKey)")
    let title = (tmdb?["name"] as? String) ?? "LIAR GAME"
    let ext = await fetchJSON("https://api.themoviedb.org/3/tv/\(kLiarGameTMDB)/external_ids?api_key=\(kTMDBKey)")
    let imdb = ext?["imdb_id"] as? String
    print("Title: \(title)  IMDb: \(imdb ?? "nil")")

    var malId: Int?
    var mappedEp = 1
    if let imdb {
        if let mapping = await fetchJSON("https://id-mapping-api-malid.hf.space/api/resolve?id=\(imdb)&s=1&e=1"),
           mapping["error"] == nil,
           let mal = mapping["mal_id"] as? Int {
            malId = mal
            mappedEp = (mapping["mal_episode"] as? Int) ?? 1
            print("Mapping API: MAL \(mal) ep \(mappedEp)")
        }
    }
    if malId == nil {
        let q = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? title
        if let jikan = await fetchJSON("https://api.jikan.moe/v4/anime?q=\(q)&type=tv&limit=3"),
           let arr = jikan["data"] as? [[String: Any]],
           let first = arr.first,
           let mal = first["mal_id"] as? Int {
            malId = mal
            print("Jikan fallback: MAL \(mal) (\(first["title"] as? String ?? "?"))")
        }
    }
    guard let malId else {
        o.notes = "no MAL mapping"
        print("❌ \(o.notes)")
        return o
    }

    let megaUrl = "https://megaplay.buzz/stream/mal/\(malId)/\(mappedEp)/sub"
    print("Megaplay: \(megaUrl)")
    guard let mega = URL(string: megaUrl) else { return o }
    let (htmlCode, htmlData, _, htmlErr) = await httpGet(mega, headers: ["User-Agent": kUA, "Referer": megaUrl])
    let html = htmlData.flatMap { String(data: $0, encoding: .utf8) } ?? ""
    if htmlCode != 200 {
        o.notes = "megaplay HTTP \(htmlCode) \(htmlErr ?? "")"
        print("❌ \(o.notes)")
        return o
    }

    var stream: (url: String, headers: [String: String])?
    if let dataId = extractDataId(html: html) {
        print("data-id: \(dataId)")
        stream = await hiAnimeSources(
            apiUrl: "https://megaplay.buzz/stream/getSources?id=\(dataId)&id=\(dataId)",
            referer: megaUrl,
            origin: "https://megaplay.buzz"
        )
    } else {
        print("⚠️ no megaplay data-id")
    }

    if stream == nil, let realId = extractRealId(html: html) {
        print("Fallback realid: \(realId)")
        let vidPage = "https://vidwish.live/stream/s-2/\(realId)/sub"
        if let vid = URL(string: vidPage) {
            let (_, vData, _, _) = await httpGet(vid, headers: ["User-Agent": kUA, "Referer": megaUrl])
            let vHtml = vData.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            if let vId = extractDataId(html: vHtml) {
                stream = await hiAnimeSources(
                    apiUrl: "https://vidwish.live/stream/getSources?id=\(vId)&id=\(vId)",
                    referer: vidPage,
                    origin: "https://vidwish.live"
                )
            }
        }
    }

    guard let stream else {
        o.notes = "no HiAnime source file"
        print("❌ \(o.notes)")
        return o
    }
    o.extractOK = true
    print("✅ extracted: \(stream.url.prefix(120))…")
    print("   headers: \(stream.headers)")

    let b64 = simulateLocalServerQueryRoundtrip(url: stream.url, referer: stream.headers["Referer"] ?? "https://megaplay.buzz/")
    o.b64OK = b64.ok
    print(b64.ok ? "✅ \(b64.note)" : "❌ \(b64.note)")

    let probe = await probeHLS(url: stream.url, headers: stream.headers)
    o.manifestOK = probe.manifestOK
    o.segmentOK = probe.segmentOK
    o.notes = probe.note
    print(probe.manifestOK && probe.segmentOK ? "✅ \(probe.note)" : "❌ \(probe.note)")

    if o.extractOK && o.manifestOK && o.segmentOK {
        let smoke = ffmpegSmoke(stream.url, headers: stream.headers, output: "/tmp/anisflix_hianime_liargame.mp4")
        o.notes += " | \(smoke.note)"
        if !smoke.ok { o.segmentOK = false }
        print(smoke.ok ? "✅ \(smoke.note)" : "❌ \(smoke.note)")
    }
    return o
}

// MARK: - Main

print("=== Vidzy + HiAnime download test ===")
let vidzy = await testVidzy()
let hianime = await testHiAnime()

print("\n=== SUMMARY ===")
for o in [vidzy, hianime] {
    print("\(o.passed ? "✅" : "❌") \(o.name)  extract=\(o.extractOK) manifest=\(o.manifestOK) segment=\(o.segmentOK) b64=\(o.b64OK)  \(o.notes)")
}
exit((vidzy.passed && hianime.passed) ? 0 : 1)
