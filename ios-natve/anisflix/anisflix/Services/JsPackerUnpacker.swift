//
//  JsPackerUnpacker.swift
//  anisflix
//
//  Dean Edwards packer (Luluvid/Lulustream jwplayer embed pages).
//  Regex aligned with api/_services/universalvo/extractors/utils/packer.js
//

import Foundation

enum JsPackerUnpacker {
    
    static func isPacked(_ text: String) -> Bool {
        text.contains("eval(function(p,a,c,k,e,d)")
    }
    
    /// Unpacks Dean Edwards `eval(function(p,a,c,k,e,d){while(c--)...}('payload',radix,count,'dict'.split('|')))`.
    static func unpack(_ packedCode: String) -> String? {
        guard let evalStart = packedCode.range(of: "eval(function(") else { return nil }
        let slice = packedCode[evalStart.lowerBound...]
        let ns = String(slice) as NSString
        let fullRange = NSRange(location: 0, length: ns.length)
        
        // Same pattern as packer.js — payload may contain quotes; do not use [\s\S]*?
        let pattern = #"\}\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\.)*)'\.split\('\|'\)"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: String(slice), options: [], range: fullRange),
              match.numberOfRanges >= 5 else {
            return nil
        }
        
        let p = ns.substring(with: match.range(at: 1))
        guard let radix = Int(ns.substring(with: match.range(at: 2))),
              let count = Int(ns.substring(with: match.range(at: 3))) else {
            return nil
        }
        
        let dict = ns.substring(with: match.range(at: 4))
            .split(separator: "|", omittingEmptySubsequences: false)
            .map(String.init)
        
        var result = p
        var idx = count
        while idx >= 0 {
            if idx < dict.count, !dict[idx].isEmpty {
                let token = toBase(idx, radix: radix)
                guard !token.isEmpty,
                      let tokenRegex = try? NSRegularExpression(
                          pattern: "\\b" + NSRegularExpression.escapedPattern(for: token) + "\\b"
                      ) else {
                    idx -= 1
                    continue
                }
                let range = NSRange(result.startIndex..., in: result)
                result = tokenRegex.stringByReplacingMatches(
                    in: result,
                    options: [],
                    range: range,
                    withTemplate: dict[idx]
                )
            }
            idx -= 1
        }
        return result.contains(".m3u8") || result.contains("sources:") ? result : nil
    }
    
    static func extractPackedEvalBlocks(from html: String) -> [String] {
        var blocks: [String] = []
        let marker = "eval(function(p,a,c,k,e,d)"
        var searchStart = html.startIndex
        while searchStart < html.endIndex,
              let range = html.range(of: marker, range: searchStart..<html.endIndex) {
            let slice = html[range.lowerBound...]
            if let splitRange = slice.range(of: ".split('|')"),
               let closeRange = slice.range(of: "))", range: splitRange.upperBound..<slice.endIndex) {
                blocks.append(String(slice[..<closeRange.upperBound]))
                searchStart = closeRange.upperBound
            } else {
                searchStart = range.upperBound
            }
        }
        return blocks
    }
    
    static func unpackAll(in html: String) -> String {
        var combined = html
        for block in extractPackedEvalBlocks(from: html) {
            if let unpacked = unpack(block) {
                combined += "\n" + unpacked
            }
        }
        if let unpacked = unpack(html) {
            combined += "\n" + unpacked
        }
        return combined
    }
    
    private static func toBase(_ value: Int, radix: Int) -> String {
        let digits = Array("0123456789abcdefghijklmnopqrstuvwxyz")
        guard radix >= 2, radix <= digits.count else { return String(value) }
        if value == 0 { return "0" }
        var n = value
        var out = ""
        while n > 0 {
            out = String(digits[n % radix]) + out
            n /= radix
        }
        return out
    }
}
