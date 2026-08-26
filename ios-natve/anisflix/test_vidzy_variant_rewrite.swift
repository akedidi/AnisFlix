import Foundation

func rewriteLine(_ line: String, baseUrl: URL) -> String {
    guard !line.hasPrefix("#") else {
        if line.hasPrefix("#EXT-X-KEY") || line.hasPrefix("#EXT-X-MAP") || line.hasPrefix("#EXT-X-I-FRAME-STREAM-INF") || line.hasPrefix("#EXT-X-MEDIA") {
            // Simplified rewrite
            return line
        }
        return line
    }
    
    // It's a URI!
    guard let resolvedUrl = URL(string: line, relativeTo: baseUrl) else { return line }
    
    let isPlaylist = resolvedUrl.pathExtension.lowercased() == "m3u8" || resolvedUrl.absoluteString.lowercased().contains(".m3u8")
    let endpoint = isPlaylist ? "/manifest" : "/proxy"
    
    let proxyUrl = "http://localhost:8080\(endpoint)?url=\(resolvedUrl.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)"
    return proxyUrl
}

let variantContent = """
#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-ALLOW-CACHE:YES
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:10.010,
seg-1-v1-a1.ts?t=123
#EXTINF:10.010,
seg-2-v1-a1.ts?t=123
#EXT-X-ENDLIST
"""

let baseUrl = URL(string: "https://u14.vidzy.cc/hls2/index-v1-a1.m3u8")!

let rewritten = variantContent.components(separatedBy: .newlines).map { rewriteLine($0, baseUrl: baseUrl) }.joined(separator: "\n")
print(rewritten)
