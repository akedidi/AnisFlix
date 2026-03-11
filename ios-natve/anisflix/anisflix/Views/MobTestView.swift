import SwiftUI
import AVKit

struct MobTestView: View {
    @State private var urlString = "https://sacdn.hakunaymatata.com/dash/7226344347208668488_0_0_1080_h265_733/index.mpd"
    @State private var useProxy = false
    @State private var useVLC = true
    @State private var sendHeaders = true
    
    var body: some View {
        VStack {
            Text("Mob Link Tester").font(.title).bold()
            
            TextField("Test URL...", text: $urlString)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding()
            
            Toggle("Use Virtual HLS Proxy", isOn: $useProxy)
                .padding()
                
            Toggle("Force VLC Player (Required for .mpd)", isOn: $useVLC)
                .padding()
                
            Toggle("Send Mock Headers (Referer/UA)", isOn: $sendHeaders)
                .padding()
            
            Button("🏁 Play Test") {
                launchTest()
            }
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(8)
            
            Spacer()
        }
    }
    
    func launchTest() {
        guard let originalUrl = URL(string: urlString) else { return }
        var finalUrl = originalUrl
        
        if useProxy {
            // Apply Virtual HLS Proxy
            if let serverUrl = LocalStreamingServer.shared.serverUrl {
                var components = URLComponents()
                components.scheme = serverUrl.scheme
                components.host = serverUrl.host
                components.port = serverUrl.port
                components.path = "/manifest"
                
                var queryItems = [URLQueryItem]()
                if let urlData = originalUrl.absoluteString.data(using: .utf8) {
                    queryItems.append(URLQueryItem(name: "url64", value: urlData.base64EncodedString()))
                }
                components.queryItems = queryItems
                
                if let proxyUrl = components.url {
                    finalUrl = proxyUrl
                }
            }
        }
        
        // Find top UIViewController to present the player
        guard let windowScene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
              let rootVC = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController else { return }
        
        var topVC = rootVC
        while let presented = topVC.presentedViewController {
            topVC = presented
        }
        
        if useVLC {
            var mockHeaders: [String: String]? = nil
            if sendHeaders {
                mockHeaders = [
                    "Referer": "https://moovbob.fr/",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
                ]
            }
            let vlcView = VLCPlayerView(url: finalUrl, title: "MOB Test (VLC)", headers: mockHeaders)
            let hosting = UIHostingController(rootView: vlcView)
            hosting.modalPresentationStyle = .fullScreen
            topVC.present(hosting, animated: true)
        } else {
            let playerItem = AVPlayerItem(url: finalUrl)
            let player = AVPlayer(playerItem: playerItem)
            let avController = AVPlayerViewController()
            avController.player = player
            topVC.present(avController, animated: true) {
                player.play()
            }
        }
    }
}

// For preview purpose
struct MobTestView_Previews: PreviewProvider {
    static var previews: some View {
        MobTestView()
    }
}
