//
//  SettingsView.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var theme = AppTheme.shared
    @ObservedObject var traktManager = TraktManager.shared
    @State private var showClearConfirmation = false
    @State private var showClearCacheConfirmation = false
    @State private var showTraktAuth = false
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
            
            // Section Trakt
            Section {
                if traktManager.isConnected {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Connected to Trakt")
                        Spacer()
                    }
                    
                    Button(role: .destructive) {
                        traktManager.disconnect()
                    } label: {
                        HStack {
                            Text("Disconnect")
                            Spacer()
                            Image(systemName: "xmark.circle")
                        }
                    }
                } else {
                    Button {
                        showTraktAuth = true
                        Task {
                            try? await traktManager.startDeviceAuth()
                        }
                    } label: {
                        HStack {
                            Text("Connect to Trakt")
                            Spacer()
                            Image(systemName: "link")
                        }
                    }
                }
            } header: {
                HStack {
                    Image(systemName: "circle.grid.cross")
                    Text("Trakt")
                }
            } footer: {
                Text("Sync your watch progress with Trakt.tv")
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
        .sheet(isPresented: $showTraktAuth) {
            NavigationStack {
                VStack(spacing: 20) {
                    if let userCode = traktManager.userCode, let verificationUrl = traktManager.verificationUrl {
                        Text("Enter this code on Trakt:")
                            .font(.headline)
                        
                        Text(userCode)
                            .font(.system(size: 32, weight: .bold, design: .monospaced))
                            .padding()
                            .background(Color.gray.opacity(0.2))
                            .cornerRadius(8)
                        
                        Button {
                            if let url = URL(string: verificationUrl) {
                                UIApplication.shared.open(url)
                            }
                        } label: {
                            Label("Open Trakt", systemImage: "safari")
                        }
                        .buttonStyle(.borderedProminent)
                        
                        if traktManager.isAuthenticating {
                            ProgressView("Waiting for authorization...")
                                .padding()
                        }
                        
                        Button("Start Polling") {
                            Task {
                                try? await traktManager.pollForToken()
                                showTraktAuth = false
                            }
                        }
                        .buttonStyle(.bordered)
                    } else {
                        ProgressView("Generating code...")
                    }
                }
                .padding()
                .navigationTitle("Connect to Trakt")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            showTraktAuth = false
                            traktManager.disconnect()
                        }
                    }
                }
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
