import Foundation

let path = "/Users/aniskedidi/Documents/perso/AnisFlix/ios-natve/anisflix/anisflix/Services/LocalStreamingServer.swift"
var contents = try String(contentsOfFile: path)

// Fix 1: If bodyLength > 0, set contentLength. Otherwise, let it be chunked (don't set to 0, which breaks stream).
contents = contents.replacingOccurrences(of: """
                // Explicit Content-Length avoids chunked encoding (breaks MP4 seek in AVPlayer)
                streamResponse.contentLength = bodyLength
""", with: """
                // Explicit Content-Length avoids chunked encoding (breaks MP4 seek in AVPlayer)
                if bodyLength > 0 {
                    streamResponse.contentLength = bodyLength
                }
""")

try contents.write(toFile: path, atomically: true, encoding: .utf8)
