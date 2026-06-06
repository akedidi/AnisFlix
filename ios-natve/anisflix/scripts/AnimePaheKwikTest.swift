#!/usr/bin/env swift
//
// Standalone smoke test for AnimePahe Kwik extraction (AOT S1E1).
// Run: swift ios-natve/anisflix/scripts/AnimePaheKwikTest.swift
//

import Foundation

// MARK: - JS packer unpack (port of api/_services/animepahe/extractors.js)

func unpackJsPacker(code: String) -> String {
    let pattern = #"\}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|['"]\)"#
    guard let regex = try? NSRegularExpression(pattern: pattern),
          let match = regex.firstMatch(in: code, range: NSRange(code.startIndex..., in: code)) else {
        return code
    }

    let ns = code as NSString
    var p = ns.substring(with: match.range(at: 2))
    p = p.replacingOccurrences(of: "\\'", with: "'")
        .replacingOccurrences(of: "\\\"", with: "\"")
        .replacingOccurrences(of: "\\\\", with: "\\")

    guard let a = Int(ns.substring(with: match.range(at: 3))),
          let c = Int(ns.substring(with: match.range(at: 4))) else {
        fputs("  unpack: bad a/c\n", stderr)
        return code
    }

    let kStr = ns.substring(with: match.range(at: 6))
    let k = kStr.split(separator: "|", omittingEmptySubsequences: false).map(String.init)

    func e(_ cVal: Int) -> String {
        // JS: (c2 < a ? '' : e(c2/a)) + ((c2 % a) > 35 ? char : toString(36))
        let head = cVal < a ? "" : e(cVal / a)
        let remainder = cVal % a
        let tail: String
        if remainder > 35 {
            tail = String(UnicodeScalar(remainder + 29)!)
        } else {
            tail = String(remainder, radix: 36)
        }
        return head + tail
    }

    var dict: [String: String] = [:]
    var idx = c
    while idx >= 0 {
        let key = e(idx)
        if idx < k.count, !k[idx].isEmpty {
            dict[key] = k[idx]
        } else {
            dict[key] = key // JS: k[c] || e(c)
        }
        idx -= 1
    }

    return applyWordDictionary(p, dict: dict)
}

/// JS: `p.replace(/\b\w+\b/g, (w) => d[w])` — build fresh string, never mutate while scanning.
func applyWordDictionary(_ p: String, dict: [String: String]) -> String {
    // JS \w = [A-Za-z0-9_] only; Swift \w is Unicode-aware and breaks the packer.
    guard let wordRegex = try? NSRegularExpression(pattern: #"\b[A-Za-z0-9_]+\b"#) else { return p }
    let pNs = p as NSString
    let fullRange = NSRange(location: 0, length: pNs.length)
    let matches = wordRegex.matches(in: p, options: [], range: fullRange)
    guard !matches.isEmpty else { return p }

    var out = ""
    var cursor = 0
    for match in matches {
        let start = match.range.location
        if start > cursor {
            out += pNs.substring(with: NSRange(location: cursor, length: start - cursor))
        }
        let word = pNs.substring(with: match.range(at: 0))
        out += dict[word] ?? word
        cursor = start + match.range.length
    }
    if cursor < pNs.length {
        out += pNs.substring(from: cursor)
    }
    return out
}

func extractPackedBlocks(from html: String) -> [String] {
    var blocks: [String] = []
    let marker = "eval(function(p,a,c,k,e,d)"
    var searchStart = html.startIndex
    while searchStart < html.endIndex,
          let range = html.range(of: marker, range: searchStart..<html.endIndex) {
        let slice = html[range.lowerBound...]
        if let splitRange = slice.range(of: ".split('|')"),
           let closeRange = slice.range(of: "))", range: splitRange.upperBound..<slice.endIndex) {
            let end = closeRange.upperBound
            blocks.append(String(slice[..<end]))
            searchStart = end
        } else {
            searchStart = range.upperBound
        }
    }
    return blocks
}

func findStreamUrl(in script: String) -> String? {
    let patterns = [
        #"source\s*=\s*['"](https?://[^'"]+)['"]"#,
        #"const\s+source\s*=\s*['"](https?://[^'"]+)['"]"#,
        #"var\s+source\s*=\s*['"](https?://[^'"]+)['"]"#,
        #"src\s*:\s*['"](https?://[^'"]+)['"]"#
    ]
    for pattern in patterns {
        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: script, range: NSRange(script.startIndex..., in: script)),
           match.numberOfRanges >= 2,
           let r = Range(match.range(at: 1), in: script) {
            return String(script[r])
        }
    }
    return nil
}

func fetchText(url: URL, referer: String) async throws -> String {
    var req = URLRequest(url: url)
    req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
    req.setValue(referer, forHTTPHeaderField: "Referer")
    let (data, resp) = try await URLSession.shared.data(for: req)
    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
    guard (200..<400).contains(code) else {
        throw NSError(domain: "test", code: code, userInfo: [NSLocalizedDescriptionKey: "HTTP \(code)"])
    }
    guard let text = String(data: data, encoding: .utf8) else {
        throw NSError(domain: "test", code: -1, userInfo: [NSLocalizedDescriptionKey: "utf8"])
    }
    return text
}

func extractKwik(urlString: String) async -> String? {
    guard let url = URL(string: urlString) else { return nil }
    print("→ Kwik fetch \(urlString)")
    let html: String
    do {
        html = try await fetchText(url: url, referer: urlString)
    } catch {
        print("  FAIL fetch: \(error.localizedDescription)")
        return nil
    }
    print("  html \(html.count) chars, eval=\(html.contains("eval(function(p,a,c,k,e,d)"))")

    let blocks = extractPackedBlocks(from: html)
    print("  packed blocks: \(blocks.count)")
    for (i, block) in blocks.enumerated() {
        let unpacked = unpackJsPacker(code: block)
        let changed = unpacked != block
        print("  block[\(i)] unpacked changed=\(changed) len=\(unpacked.count)")
        if let stream = findStreamUrl(in: unpacked) {
            print("  ✅ source: \(stream.prefix(100))...")
            return stream
        }
        if unpacked.contains("source") {
            print("  snippet: \(unpacked.prefix(200))")
        }
    }
    print("  FAIL no source in unpacked")
    return nil
}

func fetchProxyText(_ path: String) async throws -> String {
    let proxy = "https://anisflix.kedidi-anis.workers.dev/?path=animepahe&url="
    let main = "https://animepahe.pw"
    let final = main + path
    var allowed = CharacterSet.alphanumerics
    allowed.insert(charactersIn: "-._~")
    let encoded = final.addingPercentEncoding(withAllowedCharacters: allowed) ?? final
    guard let url = URL(string: proxy + encoded) else { throw URLError(.badURL) }
    var req = URLRequest(url: url)
    req.setValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")
    req.setValue("__ddg2_=1234567890", forHTTPHeaderField: "Cookie")
    req.setValue("https://animepahe.pw/", forHTTPHeaderField: "Referer")
    let (data, _) = try await URLSession.shared.data(for: req)
    guard let t = String(data: data, encoding: .utf8) else { throw URLError(.cannotDecodeContentData) }
    return t
}

func parseButtons(html: String) -> [(url: String, res: String?, audio: String?)] {
    let pattern = #"<button[^>]*\sdata-src=["'](https?://[^"']*kwik[^"']*)["']([^>]*)>([\s\S]*?)</button>"#
    guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else { return [] }
    let ns = html as NSString
    var out: [(String, String?, String?)] = []
    for m in regex.matches(in: html, range: NSRange(location: 0, length: ns.length)) {
        guard m.numberOfRanges >= 3 else { continue }
        let u = ns.substring(with: m.range(at: 1))
        let attrs = ns.substring(with: m.range(at: 2))
        var res: String?
        var audio: String?
        if let re = try? NSRegularExpression(pattern: #"data-resolution="(\d+)""#),
           let mm = re.firstMatch(in: attrs, range: NSRange(attrs.startIndex..., in: attrs)),
           let r = Range(mm.range(at: 1), in: attrs) { res = String(attrs[r]) }
        if let re = try? NSRegularExpression(pattern: #"data-audio="([^"]*)""#),
           let mm = re.firstMatch(in: attrs, range: NSRange(attrs.startIndex..., in: attrs)),
           let r = Range(mm.range(at: 1), in: attrs) { audio = String(attrs[r]) }
        out.append((u, res, audio))
    }
    return out
}

print("=== AnimePahe Kwik Test (AOT S1E1) ===\n")

let animeSession = "a5085021-11a1-c734-eaef-218c570c63fc"
let epSession = "b47554f193c91bd5aaa929e6fd8b6370a759083b51fe83fb4d5128f63742c6b1"

do {
    let playHtml = try await fetchProxyText("/play/\(animeSession)/\(epSession)")
    let buttons = parseButtons(html: playHtml)
    print("Play page: \(playHtml.count) chars, buttons=\(buttons.count)\n")
    guard !buttons.isEmpty else {
        print("FAIL: no buttons")
        exit(1)
    }

    print("Expected: 3 resolutions × (Sub jpn + Dub eng) = 6 buttons\n")
    for (i, btn) in buttons.enumerated() {
        let label = btn.audio == "eng" ? "Dub" : (btn.audio == "jpn" ? "Sub" : btn.audio ?? "?")
        print("[\(i + 1)] \(btn.res ?? "?")p \(label)")
    }
    print()

    var ok = 0
    for btn in buttons {
        if await extractKwik(urlString: btn.url) != nil { ok += 1 }
    }
    print("=== Result: \(ok)/\(buttons.count) Kwik extractions OK ===")
    exit(ok == buttons.count ? 0 : 1)
} catch {
    print("FAIL: \(error)")
    exit(1)
}
