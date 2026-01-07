//
//  NextEpisodeOverlay.swift
//  anisflix
//
//  Created by AI Assistant on 07/01/2026.
//

import SwiftUI

struct NextEpisodeOverlay: View {
    let nextEpisodeTitle: String
    let timeLeft: Int
    let onCancel: () -> Void
    let onPlayNow: () -> Void
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Semi-transparent background for the overlay area
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.black.opacity(0.85))
                .frame(width: 320, height: 140)
                .shadow(radius: 10)
            
            HStack(spacing: 16) {
                // Countdown Circle
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.3), lineWidth: 4)
                    
                    Circle()
                        .trim(from: 0, to: CGFloat(timeLeft) / 10.0)
                        .stroke(AppTheme.primaryRed, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 1), value: timeLeft)
                    
                    Text("\(timeLeft)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                .frame(width: 50, height: 50)
                
                VStack(alignment: .leading, spacing: 6) {
                    Text("Prochain épisode")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .textCase(.uppercase)
                    
                    Text(nextEpisodeTitle)
                        .font(.headline)
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(16)
            .padding(.bottom, 50) // Leaving space for buttons
            .frame(width: 320, height: 140)
            
            // Buttons Row
            HStack(spacing: 0) {
                Button(action: onCancel) {
                    Text("Annuler")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 1, height: 24)
                
                Button(action: onPlayNow) {
                    Text("Lancer")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.primaryRed)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
            }
            .frame(width: 320)
            .background(Color(UIColor.systemGray6)) // Opaque background instead of white.opacity(0.1)
            .cornerRadius(12, corners: [.bottomLeft, .bottomRight])
        }
        .padding(.bottom, 80) // Raise above standard controls
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}


