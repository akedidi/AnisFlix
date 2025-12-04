//
//  LanguagePicker.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct LanguagePicker: View {
    @ObservedObject var theme = AppTheme.shared
    
    // Same languages as web (fr, en, es, de, it, pt) + Arabic
    let languages = AppTheme.supportedLanguages
    
    var currentLanguageFlag: String {
        languages.first(where: { $0.code == theme.selectedLanguage })?.flag ?? "🇫🇷"
    }
    
    var body: some View {
        Menu {
            ForEach(languages, id: \.code) { lang in
                Button {
                    // Update language and trigger reload
                    theme.selectedLanguage = lang.code
                    UserDefaults.standard.set(lang.code, forKey: "selectedLanguage")
                    print("🌍 Language changed to: \(lang.name)")
                } label: {
                    HStack(spacing: 12) {
                        Text(lang.flag)
                            .font(.title3)
                        Text(lang.name)
                            .font(.body)
                        Spacer()
                        if theme.selectedLanguage == lang.code {
                            Image(systemName: "checkmark")
                                .foregroundColor(AppTheme.primaryRed)
                                .font(.body.weight(.semibold))
                        }
                    }
                }
            }
        } label: {
            Text(currentLanguageFlag)
                .font(.title2)
                .frame(width: 40, height: 40)
                .background(
                    Circle()
                        .fill(theme.cardBackground.opacity(0.6))
                )
                .overlay(
                    Circle()
                        .stroke(theme.secondaryText.opacity(0.2), lineWidth: 1)
                )
        }
        .menuStyle(.automatic)
    }
}

#Preview {
    LanguagePicker()
        .padding()
        .background(Color.black)
}
