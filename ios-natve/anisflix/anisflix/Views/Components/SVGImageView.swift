import SwiftUI
import WebKit

struct SVGImageView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = false
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.backgroundColor = .clear
        
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Wrap the SVG URL in HTML to control scaling and centering
        
        // Simple HTML wrapper to center and scale the image
        let html = """
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                background-color: transparent; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                width: 100vw;
                overflow: hidden;
            }
            img { 
                max-width: 100%; 
                max-height: 100%; 
                object-fit: contain; 
            }
        </style>
        </head>
        <body>
            <img src="\(url.absoluteString)" />
        </body>
        </html>
        """
        
        // Load the HTML string
        uiView.loadHTMLString(html, baseURL: nil)
    }
}
