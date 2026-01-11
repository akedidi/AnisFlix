//
//  SubtitleSelectionView.swift
//  anisflix
//
//  Created by AI Assistant on 03/12/2025.
//

import SwiftUI

struct SubtitleSelectionView: View {
    let subtitles: [Subtitle]
    @Binding var selectedSubtitle: Subtitle?
    @Binding var subtitleOffset: Double
    @Binding var subtitleFontSize: Double
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Synchronisation")) {
                    HStack {
                        Text("Décalage")
                        Spacer()
                        Text(String(format: "%.1f s", subtitleOffset))
                            .foregroundColor(.gray)
                    }
                    
                    // Fine adjustment with slider
                    HStack {
                        Button {
                            subtitleOffset = max(-60, subtitleOffset - 0.1)
                        } label: {
                            Image(systemName: "minus.circle.fill")
                                .font(.title2)
                                .foregroundColor(AppTheme.primaryRed)
                        }
                        .buttonStyle(.borderless)
                        
                        Slider(value: $subtitleOffset, in: -60...60, step: 0.1)
                            .tint(AppTheme.primaryRed)
                        
                        Button {
                            subtitleOffset = min(60, subtitleOffset + 0.1)
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                                .foregroundColor(AppTheme.primaryRed)
                        }
                        .buttonStyle(.borderless)
                    }
                }
                
                Section(header: Text("Taille du texte")) {
                    HStack {
                        Text("Taille")
                        Spacer()
                        Text("\(Int(subtitleFontSize))%")
                            .foregroundColor(.gray)
                    }
                    
                    HStack {
                        Button {
                            subtitleFontSize = max(50, subtitleFontSize - 10)
                        } label: {
                            Text("A").font(.caption2)
                                .foregroundColor(AppTheme.primaryRed)
                                .frame(width: 30, height: 30)
                                .background(Circle().fill(Color.gray.opacity(0.2)))
                        }
                        .buttonStyle(.borderless)
                        
                        Slider(value: $subtitleFontSize, in: 50...150, step: 10)
                            .tint(AppTheme.primaryRed)
                        
                        Button {
                            subtitleFontSize = min(150, subtitleFontSize + 10)
                        } label: {
                            Text("A").font(.title3)
                                .foregroundColor(AppTheme.primaryRed)
                                .frame(width: 30, height: 30)
                                .background(Circle().fill(Color.gray.opacity(0.2)))
                        }
                        .buttonStyle(.borderless)
                    }
                }
                
                Section(header: Text("Sous-titres")) {
                    Button {
                        selectedSubtitle = nil
                        dismiss()
                    } label: {
                        HStack {
                            Text("Désactivé")
                            Spacer()
                            if selectedSubtitle == nil {
                                Image(systemName: "checkmark")
                                    .foregroundColor(AppTheme.primaryRed)
                            }
                        }
                    }
                    .foregroundColor(.primary)
                    
                    ForEach(subtitles, id: \.id) { sub in
                        Button {
                            selectedSubtitle = sub
                            dismiss()
                        } label: {
                            HStack {
                                Text(sub.flag)
                                Text(sub.label)
                                Spacer()
                                if selectedSubtitle?.id == sub.id {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(AppTheme.primaryRed)
                                }
                            }
                        }
                        .foregroundColor(.primary)
                    }
                }
            }
            .navigationTitle("Sous-titres")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}
