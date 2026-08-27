#!/usr/bin/env swift
//
// Download-readiness + FULL ffmpeg copy for Vidzy (La captura 2026) and HiAnime (Liar Game S1E1).
// Mirrors DownloadManager extract + HLSFFmpegDownloader (no GCDWebServer).
//
// Run from repo root:
//   swift ios-natve/anisflix/scripts/VidzyHiAnimeDownloadTest.swift
//

import Foundation
import Darwin

setbuf(stdout, nil)

let kBaseURL = "https://anisflix.vercel.app"
let kCaptureTMDB = "1621552" // La captura (2026)
let kLiarGameTMDB = 300126
let kUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
let kTMDBKey = "1865f43a0549ca50d341dd9ab8b29f49"

struct Outcome {
    var name: String
    var extractOK = false
    var manifestOK = false
    var segmentOK = false
    var downloadOK = false
    var b64OK = true
    var notes = ""
    var passed: Bool { extractOK && manifestOK && segmentOK && downloadOK && b64OK }
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

struct HLSProbe {
    var manifestOK = false
    var segmentOK = false
    var downloadURL: String
    var durationSec: Double = 0
    var note = ""
}

func playlistDurationSec(_ text: String) -> Double {
    var total: Double = 0
    for line in text.components(separatedBy: .newlines) {
        guard line.hasPrefix("#EXTINF:") else { continue }
        let payload = line.dropFirst("#EXTINF:".count)
        let part = payload.split(separator: ",", maxSplits: 1).first
        if let part, let s = Double(part) { total += s }
    }
    return total
}

func bestVariantURL(in master: String, base: URL) -> URL? {
    var bestURL: URL?
    var bestBw = -1
    var pendingBw = 0
    var pendingStreamInf = false
    for line in master.split(separator: "\n", omittingEmptySubsequences: false) {
        let s = String(line).trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#EXT-X-STREAM-INF") {
            pendingStreamInf = true
            pendingBw = 0
            if let r = s.range(of: "BANDWIDTH=") {
                let rest = s[r.upperBound...]
                pendingBw = Int(rest.prefix(while: { $0.isNumber })) ?? 0
            }
            continue
        }
        if pendingStreamInf, !s.isEmpty, !s.hasPrefix("#"), let u = URL(string: s, relativeTo: base)?.absoluteURL {
            if pendingBw >= bestBw {
                bestBw = pendingBw
                bestURL = u
            }
        }
        pendingStreamInf = false
    }
    return bestURL ?? firstMediaLine(in: master, base: base)
}

func probeHLS(url: String, headers: [String: String]) async -> HLSProbe {
    var result = HLSProbe(downloadURL: url)
    guard let u = URL(string: url) else {
        result.note = "invalid URL"
        return result
    }
    var hdrs = headers
    hdrs["User-Agent"] = hdrs["User-Agent"] ?? kUA
    hdrs["Accept"] = "application/vnd.apple.mpegurl,application/x-mpegURL,*/*"

    let (code, data, _, err) = await httpGet(u, headers: hdrs)
    if let err {
        result.note = err
        return result
    }
    guard (200..<400).contains(code), let data, let text = String(data: data, encoding: .utf8) else {
        result.note = "manifest HTTP \(code)"
        return result
    }
    if text.prefix(200).lowercased().contains("<html") {
        result.note = "manifest HTML challenge"
        return result
    }
    guard text.contains("#EXT") else {
        result.note = "not m3u8 (\(text.prefix(60)))"
        return result
    }
    result.manifestOK = true

    var playlistURL = u
    var playlist = text
    if text.contains("#EXT-X-STREAM-INF"), let variant = bestVariantURL(in: text, base: u) {
        let (c2, d2, _, _) = await httpGet(variant, headers: hdrs)
        guard (200..<400).contains(c2), let d2, let t2 = String(data: d2, encoding: .utf8), t2.contains("#EXT") else {
            result.note = "variant HTTP \(c2)"
            return result
        }
        playlistURL = variant
        playlist = t2
        result.downloadURL = variant.absoluteString
    }

    result.durationSec = playlistDurationSec(playlist)
    guard let seg = firstMediaLine(in: playlist, base: playlistURL) else {
        result.note = "no media line"
        return result
    }
    var segHdrs = hdrs
    segHdrs["Accept"] = "*/*"
    let (c3, d3, _, _) = await httpGet(seg, headers: segHdrs)
    let bytes = d3?.count ?? 0
    result.segmentOK = (200..<400).contains(c3) && bytes > 1000
    let dur = result.durationSec > 0 ? String(format: "%.0fs", result.durationSec) : "?"
    result.note = "manifest OK | variant/media \(result.downloadURL.contains(".m3u8") ? "yes" : "no") | ~\(dur) | segment HTTP \(c3) \(bytes)B"
    return result
}

func findFFmpeg() -> String? {
    let candidates = [
        "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
    ]
    return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
}

func ffmpegFull(_ url: String, headers: [String: String], output: String, expectedSec: Double, label: String) -> (ok: Bool, note: String) {
    guard let ffmpeg = findFFmpeg() else {
        return (false, "ffmpeg absent")
    }
    try? FileManager.default.removeItem(atPath: output)
    let headerBlock = headers.map { "\($0.key): \($0.value)" }.joined(separator: "\r\n") + "\r\n"
    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: ffmpeg)
    // Same flags as HLSFFmpegDownloader + extension_picky 0 (HiAnime .jpg segments / no LocalServer here)
    proc.arguments = [
        "-hide_banner", "-loglevel", "error", "-stats", "-y",
        "-extension_picky", "0",
        "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_on_http_error", "4xx,5xx",
        "-headers", headerBlock,
        "-analyzeduration", "2000000", "-probesize", "2000000",
        "-i", url,
        "-c", "copy",
        "-bsf:a", "aac_adtstoasc",
        output
    ]
    let errPipe = Pipe()
    proc.standardError = errPipe
    proc.standardOutput = FileHandle.nullDevice
    do {
        try proc.run()
    } catch {
        return (false, "ffmpeg spawn: \(error.localizedDescription)")
    }

    let handle = errPipe.fileHandleForReading
    var lastPct = -1
    var buf = ""
    let regex = try! NSRegularExpression(pattern: "time=\\s*(\\d{2}):(\\d{2}):(\\d{2}\\.\\d+)")
    while proc.isRunning {
        let data = handle.availableData
        if data.isEmpty {
            Thread.sleep(forTimeInterval: 0.4)
            continue
        }
        buf += String(data: data, encoding: .utf8) ?? ""
        let chunks = buf.components(separatedBy: CharacterSet.newlines.union(.init(charactersIn: "\r")))
        buf = chunks.last ?? ""
        for line in chunks.dropLast() {
            let ns = line as NSString
            if let m = regex.firstMatch(in: line, range: NSRange(location: 0, length: ns.length)),
               m.numberOfRanges == 4 {
                let h = Double(ns.substring(with: m.range(at: 1))) ?? 0
                let mi = Double(ns.substring(with: m.range(at: 2))) ?? 0
                let s = Double(ns.substring(with: m.range(at: 3))) ?? 0
                let sec = h * 3600 + mi * 60 + s
                if expectedSec > 0 {
                    let pct = min(Int((sec / expectedSec) * 100), 99)
                    if pct >= lastPct + 5 {
                        lastPct = pct
                        let size = (try? FileManager.default.attributesOfItem(atPath: output)[.size] as? Int) ?? 0
                        print("   ⬇️ [\(label)] \(pct)%  \(Int(sec))s/\(Int(expectedSec))s  \(size / 1_000_000) MB")
                    }
                }
            }
        }
    }
    let leftover = handle.readDataToEndOfFile()
    let err = buf + (String(data: leftover, encoding: .utf8) ?? "")
    let size = (try? FileManager.default.attributesOfItem(atPath: output)[.size] as? Int) ?? 0
    if proc.terminationStatus == 0, size > 100_000 {
        return (true, "FULL download OK (\(size / 1_000_000) MB, \(output))")
    }
    return (false, "ffmpeg exit \(proc.terminationStatus) size=\(size) \(err.suffix(220))")
}

// MARK: - Vidzy (La captura 2026)

func extractVidzy(embed: String) async -> (url: String?, headers: [String: String], raw: String) {
    guard let api = URL(string: "\(kBaseURL)/api/extract") else { return (nil, [:], "bad api") }
    let body = try? JSONSerialization.data(withJSONObject: ["type": "vidzy", "url": embed])
    let hdrs = ["Content-Type": "application/json", "User-Agent": kUA]
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
    print("\n=== VIDZY — La captura (TMDB \(kCaptureTMDB)) ===")
    var o = Outcome(name: "Vidzy / La captura 2026")

    let embed = await fetchVidzyEmbedFromFStream()
    guard let embed else {
        o.notes = "FStream: pas d'embed Vidzy"
        print("❌ \(o.notes)")
        return o
    }
    print("FStream embed: \(embed)")
    let extracted = await extractVidzy(embed: embed)
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
    print("   download URL: \(probe.downloadURL.prefix(120))…")

    if o.extractOK && o.manifestOK && o.segmentOK {
        print("📥 Téléchargement COMPLET Vidzy (pas de limite -t)…")
        let full = ffmpegFull(
            probe.downloadURL,
            headers: extracted.headers,
            output: "/tmp/anisflix_vidzy_lacaptura_full.mp4",
            expectedSec: probe.durationSec,
            label: "Vidzy"
        )
        o.downloadOK = full.ok
        o.notes += " | \(full.note)"
        print(full.ok ? "✅ \(full.note)" : "❌ \(full.note)")
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
    let hdrs = [
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
    print("   download URL: \(probe.downloadURL.prefix(120))…")

    if o.extractOK && o.manifestOK && o.segmentOK {
        print("📥 Téléchargement COMPLET HiAnime (pas de limite -t)…")
        let full = ffmpegFull(
            probe.downloadURL,
            headers: stream.headers,
            output: "/tmp/anisflix_hianime_liargame_full.mp4",
            expectedSec: probe.durationSec,
            label: "HiAnime"
        )
        o.downloadOK = full.ok
        o.notes += " | \(full.note)"
        print(full.ok ? "✅ \(full.note)" : "❌ \(full.note)")
    }
    return o
}

// MARK: - Main

print("=== Vidzy + HiAnime FULL download test ===")
print("Outputs: /tmp/anisflix_vidzy_lacaptura_full.mp4  /tmp/anisflix_hianime_liargame_full.mp4\n")
let vidzy = await testVidzy()
let hianime = await testHiAnime()

print("\n=== SUMMARY ===")
for o in [vidzy, hianime] {
    print("\(o.passed ? "✅" : "❌") \(o.name)  extract=\(o.extractOK) manifest=\(o.manifestOK) segment=\(o.segmentOK) full=\(o.downloadOK) b64=\(o.b64OK)")
    print("   \(o.notes)")
}
exit((vidzy.passed && hianime.passed) ? 0 : 1)
