//
//  SettingsView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var theme = AppTheme.shared
    @State private var showClearConfirmation = false
    
    let languages = AppTheme.supportedLanguages
    
    var body: some View {
        Form {
            // Section Apparence
            Section {
                Picker(theme.t("settings.language"), selection: $theme.selectedLanguage) {
                    ForEach(languages, id: \.code) { lang in
                        Text("\(lang.flag) \(lang.name)").tag(lang.code)
                    }
                }
                
                Toggle(theme.t("settings.darkMode"), isOn: $theme.isDarkMode)
            } header: {
                Text(theme.t("settings.appearance"))
            }
            
            // Section Données
            Section {
                Button(role: .destructive) {
                    showClearConfirmation = true
                } label: {
                    HStack {
                        Text(theme.t("settings.clearProgress"))
                        Spacer()
                        Image(systemName: "trash")
                    }
                }
            } header: {
                Text(theme.t("settings.data"))
            } footer: {
                Text(theme.t("settings.clearProgressDesc"))
            }
        }
        .navigationTitle(theme.t("settings.title"))
        .navigationBarTitleDisplayMode(.large)
        .alert(theme.t("settings.clearAlertTitle"), isPresented: $showClearConfirmation) {
            Button(theme.t("settings.cancel"), role: .cancel) { }
            Button(theme.t("settings.delete"), role: .destructive) {
                WatchProgressManager.shared.clearProgress()
            }
        } message: {
            Text(theme.t("settings.clearAlertMessage"))
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                CastButton()
            }
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
}
