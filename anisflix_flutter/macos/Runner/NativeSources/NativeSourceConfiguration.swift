import Foundation

enum NativeSourceConfiguration {
    static var tmdbKey = ""
    static var backend = "https://anisflix.vercel.app"
}

// iOS services log signed URLs. Keep these out of desktop logs.
func sourceEngineLog(_ items: Any..., separator: String = " ", terminator: String = "\n") {}

// Retain the iOS service API while using normal platform certificate validation.
final class TLSBypassDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        completionHandler(.performDefaultHandling, nil)
    }
}
