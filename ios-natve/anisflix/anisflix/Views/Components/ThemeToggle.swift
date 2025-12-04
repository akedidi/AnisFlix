//
//  ThemeToggle.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct ThemeToggle: View {
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.3)) {
                theme.isDarkMode.toggle()
            }
        } label: {
            Image(systemName: theme.isDarkMode ? "moon.stars.fill" : "sun.max.fill")
                .font(.system(size: 18))
                .foregroundColor(theme.isDarkMode ? .white : .orange)
                .frame(width: 44, height: 44)
                .background(
                    Circle()
                        .fill(theme.cardBackground.opacity(0.5))
                )
        }
    }
}

#Preview {
    ThemeToggle()
        .padding()
        .background(Color.black)
}
