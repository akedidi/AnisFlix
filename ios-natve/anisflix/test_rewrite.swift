import Foundation

func rewriteLine(_ line: String, baseUrl: URL) -> String {
    let uriRegex = try! NSRegularExpression(pattern: "URI=\"([^\"]+)\"")
    var newLine = line
    if let match = uriRegex.firstMatch(in: line, options: [], range: NSRange(location: 0, length: line.utf16.count)) {
        if let range = Range(match.range(at: 1), in: line) {
            let originalUri = String(line[range])
            guard let resolvedUrl = URL(string: originalUri, relativeTo: baseUrl) else { return line }
            
            // Dummy proxy URL
            let proxyUrl = "http://localhost:8080/manifest?url=\(resolvedUrl.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)"
            
            newLine = line.replacingOccurrences(of: originalUri, with: proxyUrl)
        }
    }
    return newLine
}

let line = "#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"audio0\",NAME=\"Français\",LANGUAGE=\"fr\",AUTOSELECT=YES,DEFAULT=YES,CHANNELS=\"2\",URI=\"index-a1.m3u8?t=123\""
let baseUrl = URL(string: "https://u14.vidzy.cc/hls2/master.m3u8")!

print(rewriteLine(line, baseUrl: baseUrl))
