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
    @State private var showClearCacheConfirmation = false
    @AppStorage("subtitleFontSize") private var subtitleFontSize: Double = 100
    
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
            
            // Section Sous-titres
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Taille du texte")
                        Spacer()
                        Text("\(Int(subtitleFontSize))%")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Button {
                            subtitleFontSize = max(50, subtitleFontSize - 10)
                        } label: {
                            Text("A").font(.caption2)
                                .frame(width: 30, height: 30)
                                .background(Circle().fill(Color.gray.opacity(0.2)))
                        }
                        .buttonStyle(.borderless)
                        
                        Slider(value: $subtitleFontSize, in: 50...150, step: 10)
                        
                        Button {
                            subtitleFontSize = min(150, subtitleFontSize + 10)
                        } label: {
                            Text("A").font(.title3)
                                .frame(width: 30, height: 30)
                                .background(Circle().fill(Color.gray.opacity(0.2)))
                        }
                        .buttonStyle(.borderless)
                    }
                }
            } header: {
                Text("Sous-titres")
            }
            Section {
                Button(role: .destructive) {
                    showClearCacheConfirmation = true
                } label: {
                    HStack {
                        Text("Vider le cache d'images")
                        Spacer()
                        Image(systemName: "photo.on.rectangle.angled")
                    }
                }
                
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
        .alert("Vider le cache ?", isPresented: $showClearCacheConfirmation) {
            Button("Annuler", role: .cancel) { }
            Button("Vider", role: .destructive) {
                ImageCache.shared.clearCache()
            }
        } message: {
            Text("Cela supprimera toutes les images en cache. Elles seront rechargées depuis le réseau.")
        }

    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
}
