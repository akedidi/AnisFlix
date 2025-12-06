//
//  AppTheme.swift
//  anisflix
//
//  Created by AI Assistant on 25/11/2025.
//

import SwiftUI
import Combine

/// Gestionnaire de thème pour l'application AnisFlix
/// Thème noir et rouge inspiré de Netflix
class AppTheme: ObservableObject {
    static let shared = AppTheme()
    
    // MARK: - Couleurs principales (Noir et Rouge)
    
    /// Rouge principal (style Netflix)
    static let primaryRed = Color(red: 229/255, green: 9/255, blue: 20/255)
    
    /// Rouge pour hover/pressed
    static let secondaryRed = Color(red: 180/255, green: 0, blue: 0)
    
    /// Fond noir profond
    static let backgroundBlack = Color(red: 0.05, green: 0.05, blue: 0.05)
    
    /// Carte/Card sombre
    static let cardDark = Color(red: 0.12, green: 0.12, blue: 0.12)
    
    /// Gris pour les bordures
    static let borderGray = Color(red: 0.2, green: 0.2, blue: 0.2)
    
    /// Texte principal (blanc)
    static let textPrimary = Color.white
    
    /// Texte secondaire (gris)
    static let textSecondary = Color(red: 0.6, green: 0.6, blue: 0.6)
    
    // MARK: - Theme State
    
    @Published var isDarkMode: Bool {
        didSet {
            UserDefaults.standard.set(isDarkMode, forKey: "isDarkMode")
        }
    }
    
    @Published var selectedLanguage: String {
        didSet {
            UserDefaults.standard.set(selectedLanguage, forKey: "selectedLanguage")
        }
    }
    
    @Published var preferredSourceLanguage: String {
        didSet {
            UserDefaults.standard.set(preferredSourceLanguage, forKey: "preferredSourceLanguage")
        }
    }
    
    init() {
        self.isDarkMode = UserDefaults.standard.object(forKey: "isDarkMode") as? Bool ?? true
        self.selectedLanguage = UserDefaults.standard.string(forKey: "selectedLanguage") ?? "fr"
        self.preferredSourceLanguage = UserDefaults.standard.string(forKey: "preferredSourceLanguage") ?? "VF"
    }
    
    // MARK: - Color Scheme
    
    var colorScheme: ColorScheme {
        isDarkMode ? .dark : .light
    }
    
    // MARK: - Background Colors
    
    var backgroundColor: Color {
        isDarkMode ? Self.backgroundBlack : Color(UIColor.systemBackground)
    }
    
    var cardBackground: Color {
        isDarkMode ? Self.cardDark : Color(UIColor.secondarySystemBackground)
    }
    
    // MARK: - Text Colors
    
    var primaryText: Color {
        isDarkMode ? Self.textPrimary : Color.primary
    }
    
    var secondaryText: Color {
        isDarkMode ? Self.textSecondary : Color.secondary
    }
    
    // MARK: - TMDB Language Code
    
    var tmdbLanguageCode: String {
        switch selectedLanguage {
        case "fr": return "fr-FR"
        case "en": return "en-US"
        case "es": return "es-ES"
        case "ar": return "ar-SA"
        case "de": return "de-DE"
        case "it": return "it-IT"
        case "pt": return "pt-PT"
        default: return "fr-FR"
        }
    }
    
    // MARK: - Supported Languages
    
    static let supportedLanguages: [(code: String, name: String, flag: String)] = [
        ("fr", "Français", "🇫🇷"),
        ("en", "English", "🇬🇧"),
        ("es", "Español", "🇪🇸"),
        ("de", "Deutsch", "🇩🇪"),
        ("it", "Italiano", "🇮🇹"),
        ("pt", "Português", "🇵🇹"),
        ("ar", "العربية", "🇸🇦")
    ]
}

// MARK: - View Extension for easy theme access

extension View {
    func themedBackground() -> some View {
        self.background(AppTheme.shared.backgroundColor.ignoresSafeArea())
    }
    
    func themedCardBackground() -> some View {
        self.background(AppTheme.shared.cardBackground)
    }
}
