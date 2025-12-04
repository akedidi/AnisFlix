//
//  TrailerPlayerView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI
import WebKit

struct TrailerPlayerView: UIViewRepresentable {
    let videoID: String
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.isScrollEnabled = false
        webView.backgroundColor = .black
        webView.isOpaque = false
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        guard let url = URL(string: "https://www.youtube.com/embed/\(videoID)?playsinline=1&controls=1&showinfo=0&rel=0&modestbranding=1") else { return }
        let request = URLRequest(url: url)
        uiView.load(request)
    }
}

#Preview {
    TrailerPlayerView(videoID: "dQw4w9WgXcQ")
        .frame(height: 200)
}
