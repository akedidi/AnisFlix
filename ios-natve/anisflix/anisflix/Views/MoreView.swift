//
//  MoreView.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import SwiftUI

struct MoreView: View {
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink(destination: FavoritesView()) {
                        Label {
                            Text(theme.t("nav.favorites"))
                                .foregroundColor(theme.primaryText)
                        } icon: {
                            Image(systemName: "heart.fill")
                                .foregroundColor(AppTheme.primaryRed)
                        }
                    }
                    
                    NavigationLink(destination: SettingsView()) {
                        Label {
                            Text(theme.t("nav.settings"))
                                .foregroundColor(theme.primaryText)
                        } icon: {
                            Image(systemName: "gearshape.fill")
                                .foregroundColor(.gray)
                        }
                    }
                } header: {
                    Text("Menu")
                }
            }
            .navigationBarHidden(true)
            .scrollContentBackground(.hidden)
            .safeAreaInset(edge: .bottom) {
                Color.clear.frame(height: 150)
            }
            .themedBackground()
        }
    }
}

#Preview {
    MoreView()
}
