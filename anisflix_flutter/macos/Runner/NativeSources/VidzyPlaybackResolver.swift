import Foundation
import WebKit

/// Let the provider's own page establish its playback session. A bare signed
/// playlist only exposes the preview segments on current Vidzy pages.
@MainActor
final class VidzyPlaybackResolver: NSObject, WKNavigationDelegate {
    private var webView: WKWebView?
    private var navigationError: Error?

    // Gate and media servers can use different Vidzy domains (currently
    // v6.vidzy.cc and u14.vidzy.org). Only admit the gate actually named by
    // this embed, rather than allowing every third-party resource.
    nonisolated static func gateHosts(in html: String) -> Set<String> {
        let pattern = #"https://([a-zA-Z0-9.-]+)/gate\.php(?:[?'"\s]|$)"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        return Set(regex.matches(in: html, range: NSRange(html.startIndex..., in: html)).compactMap { match in
            guard let range = Range(match.range(at: 1), in: html) else { return nil }
            let host = String(html[range]).lowercased()
            guard
                  ["vidzy.cc", "vidzy.org", "vidzy.live", "vidzy.net"].contains(where: { host == $0 || host.hasSuffix("." + $0) }) else { return nil }
            return host
        })
    }

    nonisolated static func mediaURL(in html: String) -> URL? {
        let pattern = #"(?:file|src)\s*[:=]\s*['"](https?://[^'"]+)['"]"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
        for match in regex.matches(in: html, range: NSRange(html.startIndex..., in: html)) {
            guard let range = Range(match.range(at: 1), in: html) else { continue }
            let value = String(html[range]).replacingOccurrences(of: #"\/"#, with: "/").replacingOccurrences(of: "&amp;", with: "&")
            guard let url = URL(string: value), ["https", "http"].contains(url.scheme),
                  ["m3u8", "mp4", "mkv"].contains(url.pathExtension.lowercased()),
                  !url.path.lowercased().contains("/troll/"), !url.path.lowercased().contains("fake") else { continue }
            return url
        }
        return nil
    }

    func resolve(embed: URL, media: URL? = nil) async throws -> (URL, [String: String]) {
        navigationError = nil
        var request = URLRequest(url: embed)
        request.timeoutInterval = 20
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let html = String(decoding: data, as: UTF8.self)
        let fallbackMedia = Self.mediaURL(in: html) ?? media
        let gateHosts = Self.gateHosts(in: html)
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.mediaTypesRequiringUserActionForPlayback = .all
        let view = WKWebView(frame: CGRect(x: 0, y: 0, width: 960, height: 540), configuration: configuration)
        webView = view
        view.navigationDelegate = self
        defer {
            view.stopLoading()
            view.navigationDelegate = nil
            webView = nil
        }
        // Only the provider and its media hosts are needed. Do not load the
        // advertising/pop-up scripts bundled in the embed page.
        var rules: [[String: Any]] = [["trigger": ["url-filter": ".*"], "action": ["type": "block"]]]
        for host in Set([embed.host, fallbackMedia?.host].compactMap { $0 }).union(gateHosts) {
            rules.append(["trigger": ["url-filter": "^https://\(NSRegularExpression.escapedPattern(for: host))/"],
                          "action": ["type": "ignore-previous-rules"]])
        }
        rules.append(["trigger": ["url-filter": ".*/js/pop\\.js"], "action": ["type": "block"]])
        let encoded = String(decoding: try JSONSerialization.data(withJSONObject: rules), as: UTF8.self)
        guard let list = try await WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "AnisFlixVidzyPlayback", encodedContentRuleList: encoded) else {
            throw URLError(.cannotParseResponse)
        }
        view.configuration.userContentController.add(list)
        view.load(URLRequest(url: embed))
        for _ in 0..<100 {
            try Task.checkCancellation()
            try await Task.sleep(nanoseconds: 200_000_000)
            if let navigationError { throw navigationError }
            guard view.url?.host == embed.host, !view.isLoading else { continue }
            let script = #"(function(){var p=window.player;return {ready:document.readyState,gate:!!document.querySelector('script')&&Array.from(document.scripts).some(s=>s.textContent.includes('/gate.php')),key:window.__vzgk||'',url:p&&p.currentSrc?p.currentSrc():'',agent:navigator.userAgent};})()"#
            guard let state = try? await view.evaluateJavaScript(script) as? [String: Any],
                  state["ready"] as? String == "complete" else { continue }
            let key = state["key"] as? String ?? ""
            let requiresGate = state["gate"] as? Bool ?? false
            if requiresGate && key.isEmpty { continue }
            let current = (state["url"] as? String).flatMap(URL.init(string:))
            let candidate: URL
            if let current, current.path.hasSuffix(".m3u8"), !current.path.contains("/troll/") {
                candidate = current
            } else {
                guard let fallbackMedia else { continue }
                candidate = fallbackMedia
            }
            // Keep the session key on the master URL; Vidzy propagates it into
            // the variant playlist and segment URLs for native HLS clients.
            guard var components = URLComponents(url: candidate, resolvingAgainstBaseURL: false) else {
                throw URLError(.badURL)
            }
            if !key.isEmpty {
                var query = components.queryItems ?? []
                query.removeAll { $0.name == "gk" }
                query.append(URLQueryItem(name: "gk", value: key))
                components.queryItems = query
            }
            guard let url = components.url else { throw URLError(.badURL) }
            var headers = ["Referer": embed.deletingLastPathComponent().absoluteString,
                           "Origin": "\(embed.scheme ?? "https")://\(embed.host ?? "")",
                           "User-Agent": state["agent"] as? String ?? ""]
            let cookies = await view.configuration.websiteDataStore.httpCookieStore.allCookies()
            let mediaCookies = cookies.filter { cookie in
                let domain = cookie.domain.hasPrefix(".") ? String(cookie.domain.dropFirst()) : cookie.domain
                return url.host == domain || url.host?.hasSuffix(".\(domain)") == true
            }
            headers.merge(HTTPCookie.requestHeaderFields(with: mediaCookies)) { _, new in new }
            return (url, headers)
        }
        throw URLError(.timedOut)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        navigationError = error
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        navigationError = error
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Keep the hidden session on the requested embed; reject pop-ups and
        // redirects to unrelated pages while its scripts establish playback.
        if let target = navigationAction.request.url, navigationAction.targetFrame?.isMainFrame == true,
           target.host != webView.url?.host, webView.url != nil {
            decisionHandler(.cancel)
        } else if navigationAction.targetFrame == nil {
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }
}
