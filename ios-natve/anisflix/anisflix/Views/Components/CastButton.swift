//
//  CastButton.swift
//  anisflix
//
//  Created by AI Assistant on 05/12/2025.
//

import SwiftUI
#if canImport(GoogleCast)
import GoogleCast

struct HiddenCastButton: UIViewRepresentable {
    func makeUIView(context: Context) -> GCKUICastButton {
        let button = GCKUICastButton(frame: .zero)
        // We don't hide it completely, just make it tiny/invisible so it's "in the hierarchy"
        button.alpha = 0.01
        return button
    }
    
    func updateUIView(_ uiView: GCKUICastButton, context: Context) {}
}

struct CastButton: View {
    @ObservedObject var castManager = CastManager.shared
    @State private var showDeviceList = false
    var onTap: (() -> Void)? = nil
    
    var body: some View {
        ZStack {
            // Hidden standard button to trigger permissions and SDK behaviors
            HiddenCastButton()
                .frame(width: 1, height: 1)
                .opacity(0)
            
            Button {
                print("🔘 Cast button tapped. Restarting discovery...")
                castManager.restartDiscovery()
                showDeviceList = true
                onTap?()
            } label: {
                if castManager.isConnecting {
                    ProgressView()
                        .tint(.white)
                        .frame(width: 30, height: 30)
                        .padding(8)
                } else {
                    Image("Chromecast")
                        .resizable()
                        .renderingMode(.template)
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 30, height: 30)
                        .foregroundColor(castManager.isConnected ? .blue : .white)
                        .padding(8)
                }
            }
        }
        .sheet(isPresented: $showDeviceList) {
            CastDeviceSelectionView()
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }
}
#else
struct CastButton: View {
    var onTap: (() -> Void)? = nil
    
    var body: some View {
        Button {
            print("⚠️ Google Cast SDK not installed")
            onTap?()
        } label: {
            Image("Chromecast")
                .resizable()
                .renderingMode(.template)
                .aspectRatio(contentMode: .fit)
                .frame(width: 30, height: 30)
                .foregroundColor(.white)
                .padding(8)
        }
    }
}
#endif
