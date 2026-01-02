//
//  CastPlaceholderView.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import SwiftUI

struct CastPlaceholderView: View {
    @ObservedObject var castManager = CastManager.shared
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "tv")
                .font(.system(size: 80))
                .foregroundColor(.gray)
            Text("Casting to \(castManager.deviceName ?? "Chromecast")")
                .font(.title2)
                .foregroundColor(.white)
        }
    }
}
